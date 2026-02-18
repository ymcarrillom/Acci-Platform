#!/usr/bin/env bash
# =============================================================================
# setup-production.sh — Configura backups automaticos y Nginx en el servidor
#
# Uso (ejecutar como root o con sudo):
#   sudo bash scripts/setup-production.sh
#
# Hace:
#   1. Crea directorios de backup y asigna permisos
#   2. Instala los scripts de backup en /usr/local/bin/
#   3. Configura crontab del sistema para los backups
#   4. Verifica que Nginx y Certbot esten instalados (no los instala)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_USER="${SUDO_USER:-$(whoami)}"
LOG_DIR="/var/log"
BACKUP_DB_DIR="/backups/db"
BACKUP_FILES_DIR="/backups/files"

log()  { echo "[setup] INFO  $*"; }
fail() { echo "[setup] ERROR $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Ejecutar con sudo: sudo bash $0"

# ── 1. Directorios de backup ──────────────────────────────────────────────────
log "Creando directorios de backup..."
mkdir -p "${BACKUP_DB_DIR}" "${BACKUP_FILES_DIR}"
chmod 750 "${BACKUP_DB_DIR}" "${BACKUP_FILES_DIR}"
chown root:root "${BACKUP_DB_DIR}" "${BACKUP_FILES_DIR}"
log "  ${BACKUP_DB_DIR}"
log "  ${BACKUP_FILES_DIR}"

# ── 2. Instalar scripts en /usr/local/bin ─────────────────────────────────────
log "Instalando scripts de backup..."
install -m 750 "${SCRIPT_DIR}/backup-db.sh"    /usr/local/bin/acci-backup-db
install -m 750 "${SCRIPT_DIR}/backup-files.sh" /usr/local/bin/acci-backup-files
install -m 750 "${SCRIPT_DIR}/restore-db.sh"   /usr/local/bin/acci-restore-db
log "  /usr/local/bin/acci-backup-db"
log "  /usr/local/bin/acci-backup-files"
log "  /usr/local/bin/acci-restore-db"

# ── 3. Variables de entorno de backup ─────────────────────────────────────────
# Leer DATABASE_URL del .env del proyecto para extraer credenciales
ENV_FILE="${PROJECT_ROOT}/apps/api/.env"
DB_USER="acci"
DB_NAME="acci"
DB_HOST="localhost"
DB_PORT="5432"
PGPASSWORD_VAL=""

if [ -f "${ENV_FILE}" ]; then
  DB_URL=$(grep -E '^DATABASE_URL=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"'"'" || true)
  if [ -n "${DB_URL}" ]; then
    # Parsear: postgresql://user:pass@host:port/dbname
    DB_USER=$(echo "${DB_URL}" | sed 's|.*://\([^:]*\):.*|\1|')
    PGPASSWORD_VAL=$(echo "${DB_URL}" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
    DB_HOST=$(echo "${DB_URL}" | sed 's|.*@\([^:/]*\).*|\1|')
    DB_PORT=$(echo "${DB_URL}" | sed 's|.*:\([0-9]*\)/.*|\1|')
    DB_NAME=$(echo "${DB_URL}" | sed 's|.*/\([^?]*\).*|\1|')
    log "Credenciales DB extraidas del .env"
  fi
fi

# Crear archivo de config de backup
cat > /etc/acci-backup.env << EOF
# Generado por setup-production.sh — modificar si cambian las credenciales
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
PGPASSWORD=${PGPASSWORD_VAL}
BACKUP_DIR_DB=${BACKUP_DB_DIR}
BACKUP_DIR_FILES=${BACKUP_FILES_DIR}
UPLOADS_DIR=${PROJECT_ROOT}/apps/api/uploads
RETENTION_DB=30
RETENTION_FILES=14
EOF
chmod 600 /etc/acci-backup.env
log "Archivo de config creado: /etc/acci-backup.env"

# ── 4. Crontab del sistema ────────────────────────────────────────────────────
log "Configurando crontab..."
CRON_FILE="/etc/cron.d/acci-backups"
cat > "${CRON_FILE}" << 'CRON'
# ACCI Platform — Backups automaticos
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Backup DB: todos los dias a las 3:00 AM
0 3 * * * root . /etc/acci-backup.env && PGPASSWORD=$PGPASSWORD DB_NAME=$DB_NAME DB_USER=$DB_USER DB_HOST=$DB_HOST DB_PORT=$DB_PORT BACKUP_DIR=$BACKUP_DIR_DB RETENTION=$RETENTION_DB acci-backup-db >> /var/log/acci-backup-db.log 2>&1

# Backup archivos: todos los dias a las 3:30 AM
30 3 * * * root . /etc/acci-backup.env && UPLOADS_DIR=$UPLOADS_DIR BACKUP_DIR=$BACKUP_DIR_FILES RETENTION=$RETENTION_FILES acci-backup-files >> /var/log/acci-backup-files.log 2>&1
CRON
chmod 644 "${CRON_FILE}"
log "Crontab instalado: ${CRON_FILE}"

# ── 5. Crear archivos de log ───────────────────────────────────────────────────
touch /var/log/acci-backup-db.log /var/log/acci-backup-files.log
chmod 640 /var/log/acci-backup-db.log /var/log/acci-backup-files.log
log "Archivos de log creados en /var/log/"

# ── 6. Logrotate ──────────────────────────────────────────────────────────────
cat > /etc/logrotate.d/acci-backups << 'LOGROTATE'
/var/log/acci-backup-db.log /var/log/acci-backup-files.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 640 root root
}
LOGROTATE
log "Logrotate configurado: /etc/logrotate.d/acci-backups"

# ── 7. Verificar Nginx ────────────────────────────────────────────────────────
echo ""
log "=== Verificando dependencias de Nginx ==="
if command -v nginx >/dev/null 2>&1; then
  log "Nginx: $(nginx -v 2>&1)"
else
  echo "[setup] WARN  Nginx no encontrado. Instalar con: apt install nginx"
fi

if command -v certbot >/dev/null 2>&1; then
  log "Certbot: $(certbot --version 2>&1)"
else
  echo "[setup] WARN  Certbot no encontrado. Instalar con: apt install certbot python3-certbot-nginx"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Setup de produccion completado"
echo ""
echo "  BACKUPS:"
echo "    DB    → ${BACKUP_DB_DIR}  (diario 3:00 AM, 30 dias)"
echo "    Files → ${BACKUP_FILES_DIR}  (diario 3:30 AM, 14 dias)"
echo "    Logs  → /var/log/acci-backup-*.log"
echo ""
echo "  NGINX — Pasos manuales pendientes:"
echo "    1. Editar /etc/nginx/sites-available/acci:"
echo "       Reemplazar 'acci.example.com' con tu dominio real"
echo "    2. cp nginx/acci.conf /etc/nginx/sites-available/acci"
echo "    3. ln -s /etc/nginx/sites-available/acci /etc/nginx/sites-enabled/acci"
echo "    4. certbot --nginx -d tudominio.com -d api.tudominio.com"
echo "    5. nginx -t && systemctl reload nginx"
echo ""
echo "  PROBAR BACKUP AHORA:"
echo "    sudo acci-backup-db"
echo "    sudo acci-backup-files"
echo "════════════════════════════════════════════════════════"
