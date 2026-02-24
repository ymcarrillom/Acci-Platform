import { prisma } from './prisma.js';
import { logger } from './logger.js';

/**
 * Write an audit log entry. Never throws — failures are logged but don't block the request.
 */
export async function audit({ userId, action, entity, entityId, detail, ip } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        detail: detail || null,
        ip: ip || null,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Audit log write failed');
  }
}

/** Extract real client IP from request */
export function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}
