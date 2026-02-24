import 'dotenv/config';

// Sentry must be initialized before any other imports
import { initSentry, Sentry } from './config/sentry.js';
initSentry();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { prisma } from './utils/prisma.js';
import { logger } from './utils/logger.js';
import { swaggerSpec } from './config/swagger.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import usersRoutes from './routes/users.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import activitiesRoutes from './routes/activities.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import reflectionRoutes from './routes/reflection.routes.js';
import periodosRoutes from './routes/periodos.routes.js';
import recoveryVideosRoutes from './routes/recovery-videos.routes.js';
import auditRoutes from './routes/audit.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const isTest = env.NODE_ENV === 'test';

if (!isTest) {
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isTest ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/refresh', authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth/reset-password', authLimiter);

app.use('/uploads/recovery-videos', (req, res) => {
  res.status(403).json({ message: 'Use la API para acceder a los videos' });
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Estado del servicio
 *     security: []
 *     responses:
 *       200:
 *         description: API y base de datos operativas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 db: { type: string, example: connected }
 *       503:
 *         description: Base de datos no disponible
 */
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'connected' });
  } catch {
    res.status(503).json({ ok: false, db: 'disconnected' });
  }
});

// ===== Swagger UI — solo en desarrollo =====
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
}

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', usersRoutes);
app.use('/periodos', periodosRoutes);
app.use('/courses', coursesRoutes);
app.use('/courses/:courseId/activities', activitiesRoutes);
app.use('/courses/:courseId/attendance', attendanceRoutes);
app.use('/courses/:courseId/reflections', reflectionRoutes);
app.use('/courses/:courseId/recovery-videos', recoveryVideosRoutes);
app.use('/audit-logs', auditRoutes);

// Sentry error handler — must be before your own error handler
Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (!isTest) {
    logger.error({ err, method: req.method, url: req.originalUrl, status }, 'Request error');
  }
  const message =
    status === 500 && env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message || 'Internal Server Error';
  res.status(status).json({ message });
});

export default app;
