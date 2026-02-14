# Guia de Despliegue - Plataforma ACCI

Esta guia describe todas las variables de entorno necesarias para desplegar la plataforma en produccion.

---

## 1. Base de Datos (PostgreSQL)

Necesitas una instancia PostgreSQL accesible desde internet. Opciones recomendadas:

| Proveedor | Donde obtener la URL |
|-----------|---------------------|
| **Supabase** | Project Settings > Database > Connection string (URI) |
| **Render** | Dashboard > PostgreSQL > External Database URL |
| **Railway** | Variables > `DATABASE_URL` |
| **Neon** | Dashboard > Connection Details > Connection string |

El formato de la URL es:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

> Si usas Supabase, asegurate de usar el **connection string con pgBouncer** (puerto `6543`) para produccion.

---

## 2. Variables de Entorno - API (`apps/api`)

Configura estas variables en el servicio donde despliegues el backend (Render, Railway, etc.):

| Variable | Desarrollo | Produccion | Descripcion |
|----------|-----------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Entorno de ejecucion |
| `PORT` | `4000` | `4000` (o el que asigne el proveedor) | Puerto del servidor Express |
| `DATABASE_URL` | `postgresql://acci:acci_password@localhost:55432/acci?schema=public` | **(ver seccion 1)** | URL de conexion a PostgreSQL |
| `WEB_ORIGIN` | `http://localhost:3100` | `https://tu-dominio.vercel.app` | Origen permitido para CORS y cookies |
| `JWT_ACCESS_SECRET` | `acci_dev_access_secret_2026` | **Generar secreto seguro** | Clave para firmar access tokens |
| `JWT_REFRESH_SECRET` | `acci_dev_refresh_secret_2026` | **Generar secreto seguro** | Clave para firmar refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | `15m` | Duracion del access token |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | `30d` | Duracion del refresh token |
| `COOKIE_SECURE` | `false` | `true` | Cookies solo por HTTPS |
| `COOKIE_SAMESITE` | `lax` | `none` | Politica SameSite (usar `none` si API y Web estan en dominios distintos) |
| `COOKIE_DOMAIN` | *(no definido)* | `.tu-dominio.com` o no definirlo | Dominio para las cookies (opcional) |

### Generar secretos JWT

Ejecuta esto dos veces (una para access, otra para refresh):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Notas sobre CORS y Cookies

- Si el frontend (Vercel) y el backend (Render) estan en **dominios diferentes**, usa `COOKIE_SAMESITE=none` y `COOKIE_SECURE=true`.
- Si estan en el **mismo dominio** (ej. subdominio), puedes usar `COOKIE_SAMESITE=lax` y definir `COOKIE_DOMAIN=.tu-dominio.com`.

---

## 3. Variables de Entorno - Web (`apps/web`)

Configura estas variables en Vercel (Settings > Environment Variables):

| Variable | Desarrollo | Produccion | Descripcion |
|----------|-----------|------------|-------------|
| `API_URL` | `http://localhost:4000` | `https://tu-api.onrender.com` | URL del backend (usada en server-side: API routes, middleware, SSR) |
| `NEXT_PUBLIC_API_URL` | *(no definido)* | `https://tu-api.onrender.com` | URL del backend (usada en client-side: links a archivos, etc.) |

> `API_URL` se usa en las API routes de Next.js (server-side). `NEXT_PUBLIC_API_URL` se expone al navegador y se usa para enlaces directos a archivos del backend.

---

## 4. Ejemplo de Configuracion Completa

### API (Render / Railway)

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/acci?schema=public
WEB_ORIGIN=https://acci.vercel.app
JWT_ACCESS_SECRET=a1b2c3...tu_secreto_access...
JWT_REFRESH_SECRET=d4e5f6...tu_secreto_refresh...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

### Web (Vercel)

```env
API_URL=https://acci-api.onrender.com
NEXT_PUBLIC_API_URL=https://acci-api.onrender.com
```

---

## 5. Pasos de Despliegue

### Backend (ej. Render)

1. Crear un **Web Service** conectado al repo, con root directory `apps/api`.
2. Build command: `npm install && npx prisma generate`
3. Start command: `node src/index.js`
4. Agregar todas las variables de entorno de la seccion 2.
5. Verificar que la BD es accesible desde el servicio.
6. Ejecutar migraciones: `npx prisma migrate deploy` (puede ser un job de Render o ejecutarlo manualmente via shell).

### Frontend (Vercel)

1. Importar el repo en Vercel, con root directory `apps/web`.
2. Framework preset: **Next.js** (se detecta automaticamente).
3. Agregar las variables de entorno de la seccion 3.
4. Desplegar.

### Base de Datos

1. Crear la instancia PostgreSQL en el proveedor elegido.
2. Copiar la connection string y usarla como `DATABASE_URL`.
3. Ejecutar `npx prisma migrate deploy` desde el backend para aplicar el schema.

---

## 6. Checklist Pre-Despliegue

- [ ] Secretos JWT generados con valores unicos y seguros
- [ ] `DATABASE_URL` apunta a la BD de produccion
- [ ] `WEB_ORIGIN` coincide exactamente con la URL del frontend (sin `/` al final)
- [ ] `API_URL` y `NEXT_PUBLIC_API_URL` apuntan a la URL del backend
- [ ] `COOKIE_SECURE=true` en produccion
- [ ] `COOKIE_SAMESITE` configurado segun si los dominios son iguales o distintos
- [ ] Migraciones de Prisma ejecutadas en la BD de produccion
- [ ] El backend responde en `/auth/login` (o cualquier ruta conocida)
- [ ] El frontend carga y puede hacer login correctamente
