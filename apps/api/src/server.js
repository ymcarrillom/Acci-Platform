import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { prisma } from "./utils/prisma.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes, { cleanupExpiredTokens } from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import usersRoutes from "./routes/users.routes.js";
import coursesRoutes from "./routes/courses.routes.js";
import activitiesRoutes from "./routes/activities.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import reflectionRoutes from "./routes/reflection.routes.js";
import periodosRoutes from "./routes/periodos.routes.js";
import recoveryVideosRoutes, { cleanupExpiredVideos } from "./routes/recovery-videos.routes.js";
import auditRoutes from "./routes/audit.routes.js";

// ===== Process-level error handlers =====
process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ err: reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  // Dar tiempo para flush de logs antes de salir
  setTimeout(() => process.exit(1), 1000);
});

const app = express();

// ===== Security headers =====
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // para servir uploads
}));

// ===== HTTP request logging =====
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })
);

// ===== Rate Limiting =====
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // 15 intentos
  message: { message: "Demasiados intentos. Intenta en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 uploads por hora
  message: { message: "Limite de uploads alcanzado. Intenta en 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // 200 requests por minuto
  message: { message: "Demasiadas solicitudes. Intenta en un momento." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use("/auth/login", authLimiter);
app.use("/auth/refresh", authLimiter);

// Block direct access to recovery videos (must use API stream endpoint)
app.use("/uploads/recovery-videos", (req, res) => {
  res.status(403).json({ message: "Use la API para acceder a los videos" });
});

// Serve uploaded files
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// ===== Health check with DB verification =====
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(503).json({ ok: false, db: "disconnected" });
  }
});

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/users", usersRoutes);
app.use("/periodos", periodosRoutes);
app.use("/courses", coursesRoutes);
app.use("/courses/:courseId/activities", activitiesRoutes);
app.use("/courses/:courseId/attendance", attendanceRoutes);
app.use("/courses/:courseId/reflections", reflectionRoutes);
app.use("/courses/:courseId/recovery-videos", uploadLimiter, recoveryVideosRoutes);
app.use("/audit-logs", auditRoutes);

// ===== Global error handler =====
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error({ err, method: req.method, url: req.originalUrl, status }, "Request error");

  // No exponer detalles internos en produccion
  const message = status === 500 && env.NODE_ENV === "production"
    ? "Error interno del servidor"
    : err.message || "Internal Server Error";

  res.status(status).json({ message });
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "API server started");

  // Auto-cleanup every hour
  cleanupExpiredVideos();
  cleanupExpiredTokens();
  setInterval(cleanupExpiredVideos, 60 * 60 * 1000);
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

  // Disk space check every hour
  checkDiskSpace();
  setInterval(checkDiskSpace, 60 * 60 * 1000);
});

// ===== Disk space monitor =====
async function checkDiskSpace() {
  try {
    const { statfs } = await import("fs/promises");
    const stats = await statfs(path.resolve(__dirname, "../../uploads"));
    const freeGB  = (stats.bfree  * stats.bsize) / (1024 ** 3);
    const totalGB = (stats.blocks * stats.bsize) / (1024 ** 3);
    const usedPct = Math.round(((totalGB - freeGB) / totalGB) * 100);
    if (freeGB < 5)  logger.error({ freeGB: freeGB.toFixed(1), usedPct }, "DISK SPACE CRITICAL — less than 5GB free");
    else if (freeGB < 20) logger.warn({ freeGB: freeGB.toFixed(1), usedPct }, "Disk space warning — less than 20GB free");
    else logger.info({ freeGB: freeGB.toFixed(1), usedPct }, "Disk space OK");
  } catch {
    // statfs not available in older Node versions — skip silently
  }
}

// ===== Graceful shutdown =====
async function gracefulShutdown(signal) {
  logger.info({ signal }, "Shutdown signal received — closing server");
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info("Database disconnected — shutdown complete");
    } catch (err) {
      logger.error({ err }, "Error disconnecting DB on shutdown");
    }
    process.exit(0);
  });
  // Force kill after 15s if connections hang
  setTimeout(() => {
    logger.fatal("Forced shutdown after 15s timeout");
    process.exit(1);
  }, 15000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
