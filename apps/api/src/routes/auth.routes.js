import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { audit, getIp } from '../utils/audit.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const router = Router();

// ===== Helpers =====
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SECURE,
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

// ===== Schemas =====
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ===== Constants =====
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ===== Routes =====

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: admin@acci.com }
 *               password: { type: string, minLength: 6, example: Admin123! }
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna accessToken y setea cookie refreshToken.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Datos inválidos }
 *       401: { description: Credenciales incorrectas }
 *       403: { description: Cuenta desactivada }
 *       429: { description: Cuenta bloqueada por intentos fallidos }
 */
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos' });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await audit({ action: 'LOGIN_FAILED', entity: 'User', detail: { email }, ip: getIp(req) });
      return res.status(401).json({ message: 'No autorizado' });
    }

    if (!user.isActive) {
      await audit({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        entity: 'User',
        entityId: user.id,
        detail: { reason: 'account_disabled' },
        ip: getIp(req),
      });
      return res
        .status(403)
        .json({ message: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
    }

    // Verificar bloqueo temporal por intentos fallidos
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      await audit({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        entity: 'User',
        entityId: user.id,
        detail: { reason: 'account_locked', minutesLeft },
        ip: getIp(req),
      });
      return res.status(429).json({
        message: `Cuenta bloqueada por demasiados intentos fallidos. Intenta en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`,
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock ? addDays(new Date(), 0) : null;
      if (shouldLock && lockedUntil) {
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_MINUTES);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(shouldLock ? { lockedUntil } : {}),
        },
      });

      await audit({
        userId: user.id,
        action: shouldLock ? 'LOGIN_BLOCKED' : 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        detail: { email, attempts: newAttempts, locked: shouldLock },
        ip: getIp(req),
      });

      if (shouldLock) {
        return res.status(429).json({
          message: `Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos tras ${MAX_FAILED_ATTEMPTS} intentos fallidos.`,
        });
      }
      return res.status(401).json({
        message: `No autorizado. Intentos fallidos: ${newAttempts}/${MAX_FAILED_ATTEMPTS}.`,
      });
    }

    // Resetear contador de intentos al hacer login exitoso
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const accessToken = signAccessToken(user);

    const refreshRaw = crypto.randomUUID();
    const tokenHash = sha256(refreshRaw);
    const expiresAt = addDays(new Date(), env.REFRESH_EXPIRES_DAYS);

    await prisma.refreshToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshRaw, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_EXPIRES_DAYS,
    });

    await audit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      detail: { role: user.role },
      ip: getIp(req),
    });

    return res.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.fullName },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token usando refresh token (cookie)
 *     security: []
 *     responses:
 *       200:
 *         description: Nuevo access token generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Sin cookie de refresh o token inválido }
 *       403: { description: Cuenta desactivada }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshRaw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshRaw) return res.status(401).json({ message: 'No autorizado' });

    const tokenHash = sha256(refreshRaw);

    const found = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!found?.user) return res.status(401).json({ message: 'No autorizado' });

    if (!found.user.isActive) {
      await prisma.refreshToken.update({
        where: { id: found.id },
        data: { revokedAt: new Date() },
      });
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return res.status(403).json({ message: 'Tu cuenta ha sido desactivada.' });
    }

    // Rotacion atomica: revocar viejo + crear nuevo en transaccion
    const newRefreshRaw = crypto.randomUUID();
    const newHash = sha256(newRefreshRaw);
    const expiresAt = addDays(new Date(), env.REFRESH_EXPIRES_DAYS);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: found.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: { tokenHash: newHash, userId: found.user.id, expiresAt },
      }),
    ]);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshRaw, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_EXPIRES_DAYS,
    });

    const accessToken = signAccessToken(found.user);

    return res.json({
      accessToken,
      user: {
        id: found.user.id,
        email: found.user.email,
        role: found.user.role,
        name: found.user.fullName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión (revoca refresh token)
 *     security: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 */
router.post('/logout', async (req, res, next) => {
  try {
    const refreshRaw = req.cookies?.[REFRESH_COOKIE_NAME];

    let logoutUserId = null;
    if (refreshRaw) {
      const tokenHash = sha256(refreshRaw);
      const token = await prisma.refreshToken.findFirst({ where: { tokenHash, revokedAt: null } });
      logoutUserId = token?.userId || null;
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    if (logoutUserId) {
      await audit({
        userId: logoutUserId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: logoutUserId,
        ip: getIp(req),
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ===== Schemas para password reset =====
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const RESET_TOKEN_EXPIRY_MINUTES = 60;

// ===== POST /auth/forgot-password =====
router.post('/forgot-password', async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    const { email } = parsed.data;
    // Siempre responde 200 para no revelar si el email existe
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      // Invalidar tokens previos no usados
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date() },
      });

      const rawToken = crypto.randomUUID();
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const resetUrl = `${env.WEB_ORIGIN}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail({ to: email, fullName: user.fullName, resetUrl });
      } catch (emailErr) {
        // El email falló (SMTP caído, credenciales erróneas, etc.)
        // Logeamos el error pero NO exponemos el fallo al cliente
        // para no revelar si el email existe ni romper la UX
        logger.error({ err: emailErr, to: email }, 'Failed to send password reset email');
      }

      await audit({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'User',
        entityId: user.id,
        ip: getIp(req),
      });
    }

    return res.json({
      message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
    });
  } catch (err) {
    next(err);
  }
});

// ===== POST /auth/reset-password =====
router.post('/reset-password', async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { token, password } = parsed.data;
    const tokenHash = sha256(token);

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!resetToken) {
      return res
        .status(400)
        .json({ message: 'El enlace de recuperación es inválido o ha expirado.' });
    }

    if (!resetToken.user.isActive) {
      return res
        .status(403)
        .json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revocar todos los refresh tokens existentes (sesiones activas)
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await audit({
      userId: resetToken.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: resetToken.userId,
      ip: getIp(req),
    });

    return res.json({
      message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    });
  } catch (err) {
    next(err);
  }
});

// ===== Cleanup expired/revoked refresh tokens =====
export async function cleanupExpiredTokens() {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revokedAt: { not: null },
            createdAt: { lt: addDays(new Date(), -7) },
          },
        ],
      },
    });
    if (result.count > 0) {
      const { logger } = await import('../utils/logger.js');
      logger.info({ count: result.count }, 'Expired/revoked refresh tokens cleaned up');
    }
  } catch (err) {
    const { logger } = await import('../utils/logger.js');
    logger.error({ err }, 'Error cleaning refresh tokens');
  }
}

export default router;
