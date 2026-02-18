#!/usr/bin/env bash
# =============================================================================
# backup-files.sh — Backup automatico de uploads (archivos y videos) ACCI
#
# Uso:
#   ./scripts/backup-files.sh
#
# Variables de entorno:
#   UPLOADS_DIR   Directorio de uploads a respaldar  (default: /srv/acci/uploads)
#   BACKUP_DIR    Directorio destino                 (default: /backups/files)
#   RETENTION     Dias a conservar backups            (default: 14)
#   REMOTE_DEST   Destino rsync remoto (opcional)
#                 Ej: "backup@192.168.1.100:/backups/acci-files"
#                 Si se define, se sincroniza al remoto ademas del local.
#
# Crontab sugerido (3:30 AM todos los dias):
#   30 3 * * * /ruta/scripts/backup-files.sh >> /var/log/acci-backup-files.log 2>&1
# =============================================================================

set -euo pipefail

# ── Cargar config de produccion si existe ─────────────────────────────────────
[ -f /etc/acci-backup.env ] && . /etc/acci-backup.env

# ── Configuracion ─────────────────────────────────────────────────────────────
# El env file usa BACKUP_DIR_FILES y RETENTION_FILES; aceptar ambas formas.
UPLOADS_DIR="${UPLOADS_DIR:-/srv/acci/uploads}"
BACKUP_DIR="${BACKUP_DIR:-${BACKUP_DIR_FILES:-/backups/files}}"
RETENTION="${RETENTION:-${RETENTION_FILES:-14}}"
REMOTE_DEST="${REMOTE_DEST:-}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="acci_files_${TIMESTAMP}.tar.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
LOG_PREFIX="[backup-files][${TIMESTAMP}]"

# ── Funciones ─────────────────────────────────────────────────────────────────
log()  { echo "${LOG_PREFIX} INFO  $*"; }
warn() { echo "${LOG_PREFIX} WARN  $*" >&2; }
fail() { echo "${LOG_PREFIX} ERROR $*" >&2; exit 1; }

# ── Verificaciones ─────────────────────────────────────────────────────────────
[ -d "${UPLOADS_DIR}" ] || { warn "Directorio uploads no existe: ${UPLOADS_DIR} — nada que respaldar."; exit 0; }
mkdir -p "${BACKUP_DIR}" || fail "No se pudo crear ${BACKUP_DIR}"

# ── Backup ────────────────────────────────────────────────────────────────────
UPLOAD_SIZE=$(du -sh "${UPLOADS_DIR}" 2>/dev/null | cut -f1 || echo "?")
log "Iniciando backup de uploads (${UPLOAD_SIZE}) → ${FILEPATH}"

tar -czf "${FILEPATH}" \
  --exclude="*.tmp" \
  -C "$(dirname "${UPLOADS_DIR}")" \
  "$(basename "${UPLOADS_DIR}")"

BACKUP_SIZE=$(du -sh "${FILEPATH}" | cut -f1)
log "Backup completado. Tamaño comprimido: ${BACKUP_SIZE}"

# ── Verificacion de integridad ─────────────────────────────────────────────────
gzip -t "${FILEPATH}" || fail "El archivo de backup esta corrupto: ${FILEPATH}"
log "Integridad verificada OK"

# ── Sync remoto (opcional) ─────────────────────────────────────────────────────
if [ -n "${REMOTE_DEST}" ]; then
  if command -v rsync >/dev/null 2>&1; then
    log "Sincronizando al remoto: ${REMOTE_DEST}"
    rsync -avz --delete "${BACKUP_DIR}/" "${REMOTE_DEST}/" \
      && log "Sync remoto completado" \
      || warn "Sync remoto fallo — backup local disponible en ${FILEPATH}"
  else
    warn "rsync no encontrado — sync remoto omitido."
  fi
fi

# ── Rotacion ──────────────────────────────────────────────────────────────────
DELETED=$(find "${BACKUP_DIR}" -maxdepth 1 -name "acci_files_*.tar.gz" -mtime +${RETENTION} -print -delete | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  log "Rotacion: ${DELETED} backup(s) eliminado(s) (mas de ${RETENTION} dias)"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
TOTAL=$(find "${BACKUP_DIR}" -maxdepth 1 -name "acci_files_*.tar.gz" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1 || echo "?")
log "Backups almacenados: ${TOTAL} | Espacio total backups: ${TOTAL_SIZE}"
log "--- BACKUP FILES FINALIZADO OK ---"
