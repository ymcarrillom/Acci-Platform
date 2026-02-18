# ACCI Platform

**Sistema de Gestión de Aprendizaje (LMS) privado** para la Academia de Crecimiento Cristiano Integral.

Plataforma web completa que digitaliza la operación académica: cursos, actividades, quizzes con control de intentos, asistencia, calificaciones, videos de recuperación y reflexiones espirituales. Diseñada para operar con disponibilidad 24/7 e integridad académica garantizada.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express 4 |
| ORM / DB | Prisma 5 + PostgreSQL 16 |
| Frontend | Next.js 14 (App Router) |
| Autenticación | JWT — access token httpOnly cookie + refresh token hash en DB |
| Estilos | Tailwind CSS — diseño glassmorphic oscuro |
| Logs | Pino + pino-http (JSON estructurado) |
| Validación | Zod (backend) |
| Uploads | Multer (disco local) |
| PDF | PDFKit |
| Gestor de paquetes | pnpm (monorepo con workspaces) |

---

## Estructura del proyecto

```
plataforma-ACCI/
├── apps/
│   ├── api/                        # Backend Express
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Modelos y relaciones
│   │   │   └── seed.js             # Datos iniciales
│   │   ├── src/
│   │   │   ├── config/env.js       # Variables de entorno validadas
│   │   │   ├── middlewares/        # auth, roles
│   │   │   ├── routes/             # Un archivo por módulo
│   │   │   └── utils/              # prisma, logger, audit
│   │   └── uploads/                # Archivos subidos (gitignored)
│   └── web/                        # Frontend Next.js
│       └── src/app/
│           ├── acceso/             # Selector de perfil
│           ├── login/              # Formulario de autenticación
│           └── dashboard/          # Panel principal (todos los roles)
├── nginx/
│   └── acci.conf                   # Configuración Nginx + SSL
├── scripts/
│   ├── backup-db.sh                # Backup PostgreSQL automatizado
│   ├── backup-files.sh             # Backup de uploads automatizado
│   ├── restore-db.sh               # Restauración de backup
│   └── setup-production.sh         # Configuración inicial del servidor
├── docker-compose.yml              # PostgreSQL local (desarrollo)
├── DEPLOY.md                       # Guía completa de despliegue
└── pnpm-workspace.yaml
```

---

## Roles del sistema

| Rol | Label en UI | Descripción |
|-----|-------------|-------------|
| `STUDENT` | Estudiante | Accede a cursos inscritos, realiza actividades y quizzes, consulta asistencia y calificaciones |
| `TEACHER` | Instructor | Administra sus cursos, crea actividades, califica entregas, registra asistencia y gestiona videos de recuperación |
| `ADMIN` | Coordinador | Control total: usuarios, cursos, períodos, auditoría y configuración institucional |

---

## Módulos y funcionalidades

### Autenticación
- Login por rol con validación de credenciales (bcrypt)
- Access token JWT en cookie `httpOnly` (expira en 4h por defecto)
- Refresh token rotativo almacenado como hash SHA-256 en base de datos
- Rotación atómica del refresh token (transacción DB)
- Revocación inmediata en logout y al desactivar una cuenta
- Rate limiting: 15 intentos / 15 minutos en login y refresh
- Auditoría de todos los eventos de sesión (éxito, fallo, bloqueo, logout)

### Dashboard
- Métricas adaptadas al rol del usuario autenticado
- **Coordinador:** usuarios totales, cursos activos, actividades publicadas, entregas pendientes de calificación, sesiones vigentes
- **Instructor:** cursos a cargo, estudiantes inscritos, actividades publicadas, entregas por calificar
- **Estudiante:** cursos inscritos, quizzes completados, porcentaje de avance, asistencia general

### Cursos
- CRUD completo (crear, editar, desactivar)
- Asignación de instructor y período académico
- Gestión de inscripciones: alta/baja de estudiantes con constraint único en DB
- Listado filtrado por rol (instructor ve sus cursos, estudiante ve los suyos)
- Vista de detalle con actividades, inscritos y videos de recuperación
- Exportación de información del curso

### Actividades
Tres tipos de actividades por curso:

**Quiz**
- Preguntas de opción múltiple, múltiple respuesta, verdadero/falso y pregunta abierta
- Tiempo límite configurable — validado en el backend mediante token firmado (JWT) al iniciar
- Control de intentos en base de datos (transacción atómica para prevenir doble envío)
- Calificación automática de preguntas objetivas; preguntas abiertas marcadas para revisión manual
- Resultado visible al estudiante según configuración del instructor (`showScore`, `showAnswers`)

**Tarea**
- Entrega de texto y/o archivo adjunto (hasta 20 MB)
- Formatos permitidos: PDF, Word, PowerPoint, Excel, imágenes, video, ZIP
- Calificación manual con retroalimentación escrita
- Auditoría de cada calificación registrada

**Material**
- Publicación de recursos descargables para el estudiante
- Soporte para los mismos formatos que tareas

### Asistencia
- Registro masivo por sesión (bulk upsert en transacción)
- Estados: Presente, Ausente, Tardanza, Excusado
- Validación de que todos los estudiantes estén inscritos antes de guardar
- Constraint único `(curso, estudiante, fecha)` — previene duplicados
- Resumen por estudiante con porcentaje de asistencia
- Vista de historial individual accesible por el propio estudiante
- Exportación a PDF con tabla completa y resumen institucional (PDFKit)

### Videos de Recuperación
- Subida de videos (hasta 2 GB) en formatos MP4, WebM y MOV
- Streaming por rango (`Range` headers) con autenticación obligatoria
- Acceso restringido por asignación individual a estudiante con fecha de expiración
- El acceso puede habilitarse o revocarse en cualquier momento
- Registro de visualización (`viewedAt`)
- Bloqueo completo de acceso directo a archivos (`/uploads/recovery-videos` → 403)
- Nombres de archivo aleatorios en disco (nunca predecibles)

### Reflexiones Espirituales
- El estudiante registra reflexiones vinculadas a un curso
- Categorías: oración, servicio, reflexión
- Solo el propio estudiante puede ver, editar y eliminar sus reflexiones
- El instructor ve todas las reflexiones de su curso

### Usuarios (solo Coordinador)
- CRUD completo de usuarios con asignación de rol
- Activación y desactivación de cuentas (soft delete)
- Al desactivar: la sesión activa se revoca en el siguiente refresh
- Búsqueda por nombre, email y rol

### Períodos Académicos
- Creación y gestión de períodos con fechas de inicio y fin
- Asociación de cursos a un período activo
- Solo un período puede estar activo a la vez

### Auditoría (solo Coordinador)
- Registro automático de acciones críticas en base de datos
- Eventos auditados: login, logout, fallo de autenticación, cuenta bloqueada, calificaciones
- Filtros por acción, entidad, usuario y rango de fechas
- Almacenamiento de IP del cliente en cada evento

---

## Seguridad

| Control | Implementación |
|---------|---------------|
| RBAC | Middleware `authRequired` + `requireRole()` en todos los endpoints |
| Rate limiting | 15/15min en auth · 20/hora en uploads · 200/min general |
| JWT | Secrets obligatorios en producción (app no arranca sin ellos) |
| Cookies | `httpOnly`, `Secure` en producción, `SameSite` configurable |
| Headers HTTP | Helmet + cabeceras adicionales en Nginx (HSTS, CSP, X-Frame-Options) |
| CORS | Solo el origen `WEB_ORIGIN` está permitido |
| Path traversal | `safeFilePath()` verifica que las rutas de archivos queden dentro del directorio autorizado |
| Payload | JSON limitado a 10 MB; uploads a 20 MB; videos a 2 GB |
| Errores | Detalles internos ocultados en producción |

---

## Infraestructura y operación

### Health check
```
GET /health
→ { ok: true, db: "connected" }   (200)
→ { ok: false, db: "disconnected" } (503)
```

### Monitor de disco
Verificación automática cada hora. Alertas en log si el espacio libre cae por debajo de 20 GB (warn) o 5 GB (error crítico).

### Backups automáticos
Configurados con `sudo bash scripts/setup-production.sh`:

| Script | Destino | Hora | Retención |
|--------|---------|------|-----------|
| `acci-backup-db` | `/backups/db/` | 3:00 AM | 30 días |
| `acci-backup-files` | `/backups/files/` | 3:30 AM | 14 días |

Cada backup verifica su propia integridad (`gzip -t`) tras la creación. Incluye rotación automática.

Para restaurar la base de datos:
```bash
sudo acci-restore-db /backups/db/acci_db_FECHA.sql.gz
```

### Nginx + SSL
Configuración lista en `nginx/acci.conf`:
- Redirección HTTP → HTTPS
- SSL con Let's Encrypt (Certbot)
- Rate limiting adicional por zona (auth, API, uploads)
- Bloqueo de acceso directo a videos en capa de Nginx
- Streaming de uploads sin buffering (`proxy_request_buffering off`)

---

## Puesta en marcha local

### Requisitos
- Node.js 20+
- pnpm 9+
- Docker (para PostgreSQL local)

### 1. Clonar y instalar dependencias
```bash
git clone <repo-url>
cd plataforma-ACCI
pnpm install
```

### 2. Levantar la base de datos
```bash
docker compose up -d db
```

### 3. Configurar el backend
```bash
cd apps/api
cp .env.example .env
# Editar .env con las credenciales locales si es necesario
```

### 4. Aplicar migraciones y seed
```bash
pnpm --filter @acci/api prisma:migrate
pnpm --filter @acci/api prisma:seed
```

### 5. Iniciar el backend
```bash
pnpm --filter @acci/api dev
# API disponible en http://localhost:4000
# Health: http://localhost:4000/health
```

### 6. Iniciar el frontend
```bash
cd apps/web
# Crear .env.local con:
# API_URL=http://localhost:4000
pnpm dev
# Web disponible en http://localhost:3000
```

---

## Variables de entorno

### Backend (`apps/api/.env`)

| Variable | Requerida en prod | Descripción |
|----------|:-----------------:|-------------|
| `DATABASE_URL` | Sí | URL de conexión PostgreSQL |
| `JWT_ACCESS_SECRET` | Sí | Secreto para firmar access tokens |
| `JWT_REFRESH_SECRET` | Sí | Secreto para refresh tokens |
| `WEB_ORIGIN` | Sí | URL del frontend (CORS) |
| `JWT_ACCESS_EXPIRES_IN` | No | Duración del access token (default: `4h`) |
| `REFRESH_EXPIRES_DAYS` | No | Días de validez del refresh token (default: `30`) |
| `COOKIE_SECURE` | No | `true` en producción (HTTPS) |
| `COOKIE_SAMESITE` | No | `lax` o `none` según configuración de dominios |
| `NODE_ENV` | No | `production` en servidor real |
| `PORT` | No | Puerto del servidor (default: `4000`) |

### Frontend (`apps/web/.env.local`)

| Variable | Descripción |
|----------|-------------|
| `API_URL` | URL del backend (server-side: API routes, SSR) |
| `NEXT_PUBLIC_API_URL` | URL del backend (client-side: enlaces a archivos) |

Para generar secretos seguros:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Despliegue en producción

Ver [DEPLOY.md](./DEPLOY.md) para la guía completa que incluye:
- Configuración de variables de entorno
- Pasos para Nginx + SSL con Certbot
- Configuración automática de backups
- Checklist pre-deploy

---

## Comandos útiles

```bash
# Backup manual de la base de datos
sudo acci-backup-db

# Backup manual de archivos subidos
sudo acci-backup-files

# Restaurar base de datos desde backup
sudo acci-restore-db /backups/db/acci_db_FECHA.sql.gz

# Ver logs de backup
tail -f /var/log/acci-backup-db.log
tail -f /var/log/acci-backup-files.log

# Prisma Studio (explorar la DB visualmente)
pnpm --filter @acci/api prisma:studio

# Resetear contraseña de administrador
pnpm --filter @acci/api reset-admin
```

---

## Licencia

Uso interno — Academia de Crecimiento Cristiano Integral (ACCI).
Todos los derechos reservados.
