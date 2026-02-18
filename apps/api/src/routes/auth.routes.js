import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { env } from "../config/env.js";
import { audit, getIp } from "../utils/audit.js";

const router = Router();

// ===== Helpers =====
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SECURE,
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

// ===== Schemas =====
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ===== Routes =====
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await audit({ action: "LOGIN_FAILED", entity: "User", detail: { email }, ip: getIp(req) });
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!user.isActive) {
      await audit({ userId: user.id, action: "LOGIN_BLOCKED", entity: "User", entityId: user.id, detail: { reason: "account_disabled" }, ip: getIp(req) });
      return res.status(403).json({ message: "Tu cuenta ha sido desactivada. Contacta al administrador." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await audit({ userId: user.id, action: "LOGIN_FAILED", entity: "User", entityId: user.id, detail: { email }, ip: getIp(req) });
      return res.status(401).json({ message: "No autorizado" });
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

    await audit({ userId: user.id, action: "LOGIN_SUCCESS", entity: "User", entityId: user.id, detail: { role: user.role }, ip: getIp(req) });

    return res.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.fullName },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshRaw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshRaw) return res.status(401).json({ message: "No autorizado" });

    const tokenHash = sha256(refreshRaw);

    const found = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!found?.user) return res.status(401).json({ message: "No autorizado" });

    if (!found.user.isActive) {
      await prisma.refreshToken.update({
        where: { id: found.id },
        data: { revokedAt: new Date() },
      });
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
      return res.status(403).json({ message: "Tu cuenta ha sido desactivada." });
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

router.post("/logout", async (req, res, next) => {
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

    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    if (logoutUserId) {
      await audit({ userId: logoutUserId, action: "LOGOUT", entity: "User", entityId: logoutUserId, ip: getIp(req) });
    }
    return res.json({ ok: true });
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
      const { logger } = await import("../utils/logger.js");
      logger.info({ count: result.count }, "Expired/revoked refresh tokens cleaned up");
    }
  } catch (err) {
    const { logger } = await import("../utils/logger.js");
    logger.error({ err }, "Error cleaning refresh tokens");
  }
}

export default router;
