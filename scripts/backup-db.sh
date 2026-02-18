#!/usr/bin/env bash
# =============================================================================
# backup-db.sh — Backup automatico de PostgreSQL para ACCI Platform
#
# Uso:
#   ./scripts/backup-db.sh
#
# Variables de entorno requeridas (o editar las de abajo):
#   DB_NAME       Nombre de la base de datos      (default: acci)
#   DB_USER       Usuario de PostgreSQL            (default: acci)
#   DB_HOST       Host de PostgreSQL               (default: localhost)
#   DB_PORT       Puerto de PostgreSQL             (default: 5432)
#   BACKUP_DIR    Directorio donde guardar dumps   (default: /backups/db)
#   RETENTION     Dias a conservar backups         (default: 30)
#   PGPASSWORD    Password (exportar antes de correr este script)
#
# Crontab sugerido (3 AM todos los dias):
#   0 3 * * * PGPASSWORD="tu_password" /ruta/scripts/backup-db.sh >> /var/log/acci-backup-db.log 2>&1
# =============================================================================

set -euo pipefail

# ── Cargar config de produccion si existe ─────────────────────────────────────
# El archivo /etc/acci-backup.env es generado por setup-production.sh
# y contiene las credenciales reales del servidor.
[ -f /etc/acci-backup.env ] && . /etc/acci-backup.env
# pg_dump necesita PGPASSWORD exportada para no pedir password interactivo
export PGPASSWORD="${PGPASSWORD:-}"

# ── Configuracion ─────────────────────────────────────────────────────────────
# El env file usa BACKUP_DIR_DB y RETENTION_DB; aceptar ambas formas.
DB_NAME="${DB_NAME:-acci}"
DB_USER="${DB_USER:-acci}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-${BACKUP_DIR_DB:-/backups/db}}"
RETENTION="${RETENTION:-${RETENTION_DB:-30}}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="acci_db_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
LOG_PREFIX="[backup-db][${TIMESTAMP}]"

# ── Funciones ─────────────────────────────────────────────────────────────────
log()  { echo "${LOG_PREFIX} INFO  $*"; }
warn() { echo "${LOG_PREFIX} WARN  $*" >&2; }
fail() { echo "${LOG_PREFIX} ERROR $*" >&2; exit 1; }

# ── Verificaciones previas ─────────────────────────────────────────────────────
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump no encontrado. Instala postgresql-client."
command -v gzip    >/dev/null 2>&1 || fail "gzip no encontrado."

mkdir -p "${BACKUP_DIR}" || fail "No se pudo crear ${BACKUP_DIR}"

# ── Backup ────────────────────────────────────────────────────────────────────
log "Iniciando backup de ${DB_NAME}@${DB_HOST}:${DB_PORT} → ${FILEPATH}"

pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${FILEPATH}"

SIZE=$(du -sh "${FILEPATH}" | cut -f1)
log "Backup completado. Tamaño: ${SIZE}"

# ── Verificacion de integridad ─────────────────────────────────────────────────
gzip -t "${FILEPATH}" || fail "El archivo de backup esta corrupto: ${FILEPATH}"
log "Integridad verificada OK"

# ── Rotacion (eliminar backups mas viejos que RETENTION dias) ──────────────────
DELETED=$(find "${BACKUP_DIR}" -maxdepth 1 -name "acci_db_*.sql.gz" -mtime +${RETENTION} -print -delete | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  log "Rotacion: ${DELETED} backup(s) eliminado(s) (mas de ${RETENTION} dias)"
fi

# ── Resumen final ──────────────────────────────────────────────────────────────
TOTAL=$(find "${BACKUP_DIR}" -maxdepth 1 -name "acci_db_*.sql.gz" | wc -l)
OLDEST=$(find "${BACKUP_DIR}" -maxdepth 1 -name "acci_db_*.sql.gz" | sort | head -1)
log "Backups almacenados: ${TOTAL} | Mas antiguo: ${OLDEST:-ninguno}"
log "--- BACKUP DB FINALIZADO OK ---"
