# Guia de Administracion — Plataforma ACCI
> Mantén este archivo en el repo. Es tu referencia completa para operar el servidor en producción.

---

## ACCESO AL SERVIDOR

```bash
ssh root@72.61.91.25
```

| Dato | Valor |
|---|---|
| IP del VPS | 72.61.91.25 |
| Usuario SSH | root |
| Directorio del proyecto | /var/www/acci/Acci-Platform |
| Puerto API (Express) | 4000 |
| Puerto Web (Next.js) | 3100 |
| Dominio web | https://acciapp.duckdns.org |
| Dominio API | https://acciapi.duckdns.org |

---

## SERVICIOS Y SU ESTADO

```bash
# Ver todos los servicios de la app
pm2 status

# Ver nginx
systemctl status nginx

# Ver PostgreSQL
systemctl status postgresql
```

| Servicio | Nombre PM2 | Tecnología |
|---|---|---|
| Backend / API | acci-api | Express + Prisma (puerto 4000) |
| Frontend | acci-web | Next.js (puerto 3100) |
| Base de datos | — (systemd) | PostgreSQL |
| Proxy inverso | — (systemd) | nginx |

---

## ARCHIVOS CLAVE EN EL SERVIDOR

| Archivo | Ruta |
|---|---|
| Variables de entorno API | /var/www/acci/Acci-Platform/apps/api/.env |
| Variables de entorno Web | /var/www/acci/Acci-Platform/apps/web/.env.local |
| Config nginx | /etc/nginx/sites-available/ |
| Logs PM2 | /root/.pm2/logs/ |
| Videos subidos | /var/www/acci/Acci-Platform/apps/api/uploads/recovery-videos/ |
| Backups BD | /root/backups/ |

---

## VARIABLES DE ENTORNO DE PRODUCCION

### API (`apps/api/.env`)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://acci:PASSWORD@localhost:5432/acci
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
WEB_ORIGIN=https://acciapp.duckdns.org
COOKIE_SECURE=true
COOKIE_SAMESITE=none
COOKIE_DOMAIN=.duckdns.org
```

### Web (`apps/web/.env.local`)
```
API_URL=http://localhost:4000           # interno — NO cambiar a dominio externo
NEXT_PUBLIC_API_URL=https://acciapi.duckdns.org
```

> **IMPORTANTE:** `API_URL` siempre debe apuntar a `http://localhost:4000`.
> Si se cambia al dominio externo, el SSR da timeout y las páginas no cargan.

---

## MONITOREO DIARIO (2 minutos)

```bash
# Estado de servicios
pm2 status

# Uso de disco — alerta si supera 80% (Use%)
df -h /

# Uso de memoria
free -h

# Espacio que ocupan los videos
du -sh /var/www/acci/Acci-Platform/apps/api/uploads/

# Errores recientes de la API
pm2 logs acci-api --lines 30 --err

# Errores recientes del frontend
pm2 logs acci-web --lines 30 --err
```

---

## ACTUALIZAR LA PLATAFORMA (deploy)

Cada vez que haya cambios en GitHub:

```bash
cd /var/www/acci/Acci-Platform

# 1. Bajar cambios
git pull origin main

# 2. Instalar dependencias nuevas (solo si cambió package.json)
pnpm install --frozen-lockfile

# 3. Aplicar migraciones si hay cambios en la BD
cd apps/api && npx prisma migrate deploy && cd ../..

# 4. Recompilar el frontend (SIEMPRE que haya cambios en apps/web)
pnpm --filter web build

# 5. Reiniciar servicios
pm2 restart acci-api
pm2 restart acci-web

# 6. Verificar que arrancaron bien
pm2 logs --lines 20
```

> Si hay conflictos con git (`error: Your local changes...`):
> ```bash
> git diff apps/api/src/app.js   # ver qué tiene el servidor
> git checkout -- <archivo>       # descartar cambio local si GitHub tiene la versión correcta
> git pull origin main
> ```

---

## BASE DE DATOS

### Conectarse e inspeccionar

```bash
# Conectarse como superusuario (sin contraseña)
sudo -u postgres psql -d acci

# Conectarse como usuario acci (requiere .pgpass configurado)
psql -U acci -d acci -h localhost
```

Una vez dentro del prompt `acci=#` puedes usar estos comandos:

```sql
-- Ver todas las tablas
\dt

-- Ver columnas de una tabla
\d "User"
\d "Course"
\d "RecoveryVideo"

-- Contar registros de cualquier tabla
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Course";
SELECT COUNT(*) FROM "RecoveryVideo";
SELECT COUNT(*) FROM "AuditLog";

-- Ver todos los usuarios de la plataforma
SELECT id, "fullName", email, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC;

-- Ver todos los cursos
SELECT id, title, "teacherId", "createdAt" FROM "Course" ORDER BY "createdAt" DESC;

-- Ver videos subidos
SELECT id, title, "courseId", "fileUrl", "createdAt" FROM "RecoveryVideo" ORDER BY "createdAt" DESC;

-- Ver accesos a videos (quién puede ver qué)
SELECT rva."studentId", rva."recoveryVideoId", rva.enabled, rva."expiresAt", rva."viewedAt"
FROM "RecoveryVideoAccess" rva ORDER BY rva."createdAt" DESC LIMIT 20;

-- Ver intentos de login fallidos (usuarios bloqueados)
SELECT email, "failedLoginAttempts", "lockedUntil" FROM "User"
WHERE "failedLoginAttempts" > 0 OR "lockedUntil" IS NOT NULL;

-- Desbloquear un usuario manualmente
UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE email = 'correo@ejemplo.com';

-- Salir de psql
\q
```

### Ver tamaño de tablas
```bash
sudo -u postgres psql -d acci -c "
SELECT tablename,
  pg_size_pretty(pg_total_relation_size('\"' || tablename || '\"')) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('\"' || tablename || '\"') DESC;"
```

### Ver tamaño total de la base de datos
```bash
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('acci'));"
```

### VACUUM — limpiar espacio interno (mensual)
```bash
sudo -u postgres psql -d acci -c "VACUUM ANALYZE;"
```

### Tabla AuditLog — limpiar registros viejos
La tabla AuditLog crece indefinidamente. Limpiar cada mes:
```bash
# Ver cuántos registros hay
sudo -u postgres psql -d acci -c "SELECT COUNT(*) FROM \"AuditLog\";"

# Borrar registros de más de 90 días
sudo -u postgres psql -d acci -c "
DELETE FROM \"AuditLog\" WHERE \"createdAt\" < NOW() - INTERVAL '90 days';"

# Liberar espacio después del borrado
sudo -u postgres psql -d acci -c "VACUUM ANALYZE \"AuditLog\";"
```

---

## BACKUPS

### Backup manual
```bash
mkdir -p /root/backups

# Crear backup comprimido
pg_dump -U acci -d acci -h localhost | gzip > /root/backups/acci_$(date +%Y%m%d_%H%M).sql.gz

# Verificar que se creó
ls -lh /root/backups/
```

### Restaurar backup
```bash
gunzip -c /root/backups/acci_20260301_0200.sql.gz | sudo -u postgres psql -d acci
```

### Backup automático semanal (configurar una sola vez)
```bash
mkdir -p /root/backups
crontab -e
```
Agregar al final del crontab:
```
# Backup BD todos los domingos a las 2am
0 2 * * 0 pg_dump -U acci -d acci -h localhost | gzip > /root/backups/acci_$(date +\%Y\%m\%d).sql.gz

# Eliminar backups de más de 30 días (para no llenar el disco)
0 3 * * 0 find /root/backups/ -name "*.sql.gz" -mtime +30 -delete

# Limpiar AuditLog el día 1 de cada mes a las 3am
0 3 1 * * psql -U acci -d acci -h localhost -c "DELETE FROM \"AuditLog\" WHERE \"createdAt\" < NOW() - INTERVAL '90 days';"
```

---

## LOGS — Ver y limpiar

```bash
# Ver logs en tiempo real
pm2 logs

# Ver solo errores
pm2 logs acci-api --err
pm2 logs acci-web --err

# Ver últimas N líneas
pm2 logs acci-api --lines 50

# Cuánto ocupan los logs
du -sh /root/.pm2/logs/

# Limpiar todos los logs de PM2 (los archivos se vacían, no se borran)
pm2 flush

# Logs de nginx
du -sh /var/log/nginx/
cat /var/log/nginx/error.log | tail -50

# Limpiar logs de nginx manualmente
> /var/log/nginx/access.log
> /var/log/nginx/error.log
```

---

## CUANDO LA PLATAFORMA SE CAE

### Diagnóstico rápido (en orden)

```bash
# 1. ¿Qué servicio está caído?
pm2 status

# 2. Ver el error exacto
pm2 logs acci-api --lines 50 --err
pm2 logs acci-web --lines 50 --err

# 3. ¿Nginx está bien?
systemctl status nginx

# 4. ¿PostgreSQL está bien?
systemctl status postgresql

# 5. ¿Hay espacio en disco?
df -h /

# 6. ¿Hay memoria disponible?
free -h
```

### Soluciones según el síntoma

| Síntoma | Comando |
|---|---|
| API caída | `pm2 restart acci-api` |
| Web caída | `pm2 restart acci-web` |
| Nginx caído | `systemctl restart nginx` |
| PostgreSQL caído | `systemctl restart postgresql` |
| Todo caído | `pm2 restart all && systemctl restart nginx` |
| Disco lleno | `pm2 flush` y/o borrar videos viejos |
| App no arranca tras reinicio del VPS | `pm2 resurrect` |

### Si el VPS se reinicia (arranque automático)
```bash
# Configurar PM2 para arrancar solo (ejecutar una sola vez)
pm2 startup
pm2 save
```

---

## GESTIONAR ESPACIO EN DISCO

```bash
# Ver uso general
df -h /

# Ver qué carpetas ocupan más espacio
du -sh /var/www/acci/Acci-Platform/apps/api/uploads/recovery-videos/
du -sh /root/.pm2/logs/
du -sh /root/backups/
du -sh /var/log/

# Listar videos subidos con su tamaño
ls -lh /var/www/acci/Acci-Platform/apps/api/uploads/recovery-videos/

# Ver los 10 archivos más grandes del sistema
find / -type f -printf '%s %p\n' 2>/dev/null | sort -rn | head -10
```

> **Regla:** Si `df -h /` muestra Use% > 80%, actúa.
> Primero limpia: logs de PM2, logs de nginx, backups viejos.
> Si aún falta espacio, revisa videos huérfanos (sin registro en BD).

---

## DOMINIO DUCKDNS — Mantenimiento

Tu dominio es gratuito vía DuckDNS. Requiere renovación periódica.

| Dato | Valor |
|---|---|
| Dominio web | acciapp.duckdns.org |
| Dominio API | acciapi.duckdns.org |
| Panel DuckDNS | https://www.duckdns.org |
| Login | con tu cuenta Google/GitHub/Reddit |

### ¿Cuándo puede caer el dominio?
- Si no entras al panel de DuckDNS en meses (sin actividad)
- Si la IP del VPS cambia (Hostinger puede cambiarla si reinicias el plan)

### Verificar que el dominio apunta a la IP correcta
```bash
# Desde el VPS
curl -s https://api.duckdns.org/update?domains=acciapp&token=TU_TOKEN&ip=

# Desde cualquier terminal
nslookup acciapp.duckdns.org
nslookup acciapi.duckdns.org
```

### Actualización automática de IP — YA CONFIGURADA
El cron actualiza la IP cada 5 minutos automáticamente. Para verificar que funciona:
```bash
cat /root/duckdns.log   # debe decir "OK"
```

### Cambiar el token de DuckDNS
Si regeneras el token en duckdns.org, actualízalo así:
```bash
crontab -e
# Busca la línea con duckdns.org/update y reemplaza el token viejo por el nuevo
```
Luego prueba:
```bash
curl -s "https://www.duckdns.org/update?domains=acciapp,acciapi&token=TOKEN_NUEVO&ip="
# Debe responder: OK
```

---

## CERTIFICADO SSL (HTTPS) — Renovación

Hostinger/nginx usa Let's Encrypt. El certificado expira cada 90 días pero se renueva automáticamente. Verificar que la renovación automática funciona:

```bash
# Ver cuándo expira el certificado
certbot certificates

# Forzar renovación manual si es necesario
certbot renew --dry-run    # prueba sin renovar
certbot renew              # renueva de verdad
```

> Si el sitio muestra "certificado expirado", corre `certbot renew` y `systemctl restart nginx`.

---

## NGINX — Configuración

```bash
# Ver archivos de configuración
ls /etc/nginx/sites-available/
ls /etc/nginx/sites-enabled/

# Ver configuración de un sitio
cat /etc/nginx/sites-available/acciapp

# Verificar sintaxis antes de recargar
nginx -t

# Recargar sin cortar conexiones
systemctl reload nginx

# Reiniciar completamente
systemctl restart nginx
```

> **Parámetros críticos para videos grandes en nginx.conf o en el sitio:**
> ```nginx
> client_max_body_size 2100m;   # permite subir videos de hasta 2GB
> proxy_read_timeout 600s;       # tiempo para que el servidor procese el upload
> proxy_send_timeout 600s;
> ```
> Si al subir videos grandes da error 413 o timeout, revisar estos valores.

---

## BUGS COMUNES Y SOLUCIONES

| Error | Causa probable | Solución |
|---|---|---|
| "Error al subir video" (parcial) | Rate limit o timeout nginx | Verificar `client_max_body_size` en nginx |
| "Sin acceso a este video" | Acceso expirado o deshabilitado | Revisar fecha de expiración en el panel |
| Página no carga (timeout) | `API_URL` apunta al dominio externo | Verificar que `API_URL=http://localhost:4000` |
| 429 Too Many Requests | Rate limiter por IP incorrecta | Verificar `trust proxy` en app.js |
| ERR_ERL_UNEXPECTED_X_FORWARDED_FOR | `trust proxy` no configurado | `app.set('trust proxy', 1)` en app.js |
| Video se corta al reproducir | Rate limit en streaming | El endpoint /stream debe estar en skip del limiter |
| "Failed to find Server Action" | Usuario con tab vieja tras deploy | Se resuelve solo al recargar la página |
| BD no conecta | PostgreSQL caído | `systemctl restart postgresql` |
| PM2 no arranca tras reinicio VPS | Startup no configurado | `pm2 startup && pm2 save` |
| Disco lleno | Logs o backups acumulados | `pm2 flush` + limpiar `/root/backups/` + videos viejos |

---

## SEGURIDAD — Verificaciones periódicas

```bash
# Ver intentos de login fallidos al SSH
journalctl -u ssh | grep "Failed" | tail -20

# Ver IPs bloqueadas (si tienes fail2ban)
fail2ban-client status sshd

# Ver puertos abiertos
ss -tlnp

# Actualizar paquetes del sistema (mensual)
apt update && apt upgrade -y
```

---

## CALENDARIO DE MANTENIMIENTO

| Frecuencia | Tarea |
|---|---|
| **Diario** | `pm2 status` + `df -h /` |
| **Semanal** | Revisar logs de errores, verificar que backup se creó |
| **Mensual** | `VACUUM ANALYZE`, limpiar AuditLog +90 días, `pm2 flush`, `apt upgrade` |
| **Cada 3 meses** | Probar restaurar un backup en BD de prueba, verificar certificado SSL |
| **Si IP cambia** | Actualizar en DuckDNS y verificar nginx |

---

## CONTACTO Y RECURSOS

| Recurso | URL |
|---|---|
| Panel Hostinger VPS | https://hpanel.hostinger.com |
| DuckDNS | https://www.duckdns.org |
| Repositorio GitHub | https://github.com/ymcarrillom/Acci-Platform |
| PM2 documentación | https://pm2.keymetrics.io/docs |
| Prisma migraciones | https://www.prisma.io/docs/concepts/components/prisma-migrate |
