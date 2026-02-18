#!/usr/bin/env bash
# =============================================================================
# restore-db.sh — Restaurar backup de PostgreSQL para ACCI Platform
#
# Uso:
#   ./scripts/restore-db.sh /backups/db/acci_db_2026-02-17_03-00-00.sql.gz
#
# ADVERTENCIA: Este script BORRA la base de datos actual y la recrea.
#              Usar solo en una situacion de recuperacion de desastre confirmada.
# =============================================================================

set -euo pipefail

DB_NAME="${DB_NAME:-acci}"
DB_USER="${DB_USER:-acci}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_PREFIX="[restore-db][${TIMESTAMP}]"

log()  { echo "${LOG_PREFIX} INFO  $*"; }
fail() { echo "${LOG_PREFIX} ERROR $*" >&2; exit 1; }

# ── Verificar argumento ────────────────────────────────────────────────────────
BACKUP_FILE="${1:-}"
[ -z "${BACKUP_FILE}" ] && fail "Uso: $0 <ruta_al_backup.sql.gz>"
[ -f "${BACKUP_FILE}" ] || fail "Archivo no encontrado: ${BACKUP_FILE}"

gzip -t "${BACKUP_FILE}" || fail "El archivo de backup esta corrupto o no es un gzip valido."

# ── Confirmacion ───────────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║          RESTAURACION DE BASE DE DATOS               ║"
echo "  ║                                                      ║"
echo "  ║  Base de datos : ${DB_NAME}"
echo "  ║  Host          : ${DB_HOST}:${DB_PORT}"
echo "  ║  Backup        : ${BACKUP_FILE}"
echo "  ║                                                      ║"
echo "  ║  ADVERTENCIA: Se borraran todos los datos actuales.  ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""
read -r -p "  Escribe 'SI RESTAURAR' para confirmar: " CONFIRM
[ "${CONFIRM}" = "SI RESTAURAR" ] || fail "Restauracion cancelada por el usuario."

# ── Restaurar ──────────────────────────────────────────────────────────────────
log "Iniciando restauracion desde ${BACKUP_FILE}"

# Terminar conexiones activas
psql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="postgres" \
  --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

# Drop y recrear la base de datos
psql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="postgres" \
  --command="DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

log "Base de datos recreada."

# Restaurar desde el dump
gunzip -c "${BACKUP_FILE}" | psql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --quiet

log "--- RESTAURACION COMPLETADA OK ---"
log "Verifica la integridad ejecutando: npx prisma db pull"
