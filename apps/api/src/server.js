import 'dotenv/config';

import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { prisma } from './utils/prisma.js';
import { logger } from './utils/logger.js';
import app from './app.js';
import { cleanupExpiredTokens } from './routes/auth.routes.js';
import { cleanupExpiredVideos } from './routes/recovery-videos.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Process-level error handlers =====
process.on('unhandledRejection', (reason, _promise) => {
  logger.fatal({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  setTimeout(() => process.exit(1), 1000);
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API server started');

  cleanupExpiredVideos();
  cleanupExpiredTokens();
  setInterval(cleanupExpiredVideos, 60 * 60 * 1000);
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

  checkDiskSpace();
  setInterval(checkDiskSpace, 60 * 60 * 1000);
});

// ===== Disk space monitor =====
async function checkDiskSpace() {
  try {
    const { statfs } = await import('fs/promises');
    const stats = await statfs(path.resolve(__dirname, '../../uploads'));
    const freeGB = (stats.bfree * stats.bsize) / 1024 ** 3;
    const totalGB = (stats.blocks * stats.bsize) / 1024 ** 3;
    const usedPct = Math.round(((totalGB - freeGB) / totalGB) * 100);
    if (freeGB < 5)
      logger.error(
        { freeGB: freeGB.toFixed(1), usedPct },
        'DISK SPACE CRITICAL — less than 5GB free'
      );
    else if (freeGB < 20)
      logger.warn(
        { freeGB: freeGB.toFixed(1), usedPct },
        'Disk space warning — less than 20GB free'
      );
    else logger.info({ freeGB: freeGB.toFixed(1), usedPct }, 'Disk space OK');
  } catch {
    // statfs not available in older Node versions — skip silently
  }
}

// ===== Graceful shutdown =====
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — closing server');
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected — shutdown complete');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting DB on shutdown');
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.fatal('Forced shutdown after 15s timeout');
    process.exit(1);
  }, 15000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
