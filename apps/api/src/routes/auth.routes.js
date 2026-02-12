import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../utils/prisma.js";

const router = Router();

// ===== Helpers =====
function signAccessToken(user) {
  const secret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
  const expiresIn = process.env.JWT_ACCESS_EXPIRES || "4h";

  return jwt.sign(
    { sub: user.id, role: user.role },
    secret,
    { expiresIn }
  );
}

function signRefreshTokenPayload(user) {
  // el refresh REAL lo generamos random (no JWT) para poder hashearlo en BD
  return { userId: user.id };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Cookie options (dev)
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // en prod: true
  path: "/",
};

// ===== Schemas =====
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ===== Routes =====
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "No autorizado" });

  if (!user.isActive) return res.status(403).json({ message: "Tu cuenta ha sido desactivada. Contacta al administrador." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "No autorizado" });

  // ✅ Access token (JWT)
  const accessToken = signAccessToken(user);

  // ✅ Refresh token (random) -> guardamos hash en BD
  const refreshRaw = crypto.randomUUID();
  const tokenHash = sha256(refreshRaw);
  const expiresAt = addDays(new Date(), Number(process.env.REFRESH_DAYS || 30));

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  // cookie refresh
  res.cookie(REFRESH_COOKIE_NAME, refreshRaw, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_DAYS || 30),
  });

  return res.json({
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
    accessToken,
  });
});

router.post("/refresh", async (req, res) => {
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

  // rotación de refresh (buena práctica)
  await prisma.refreshToken.update({
    where: { id: found.id },
    data: { revokedAt: new Date() },
  });

  const newRefreshRaw = crypto.randomUUID();
  const newHash = sha256(newRefreshRaw);
  const expiresAt = addDays(new Date(), Number(process.env.REFRESH_DAYS || 30));

  await prisma.refreshToken.create({
    data: {
      tokenHash: newHash,
      userId: found.user.id,
      expiresAt,
    },
  });

  res.cookie(REFRESH_COOKIE_NAME, newRefreshRaw, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_DAYS || 30),
  });

  const accessToken = signAccessToken(found.user);

  return res.json({
    accessToken,
    user: {
      id: found.user.id,
      email: found.user.email,
      role: found.user.role,
      name: found.user.name,
    },
  });
});

router.post("/logout", async (req, res) => {
  const refreshRaw = req.cookies?.[REFRESH_COOKIE_NAME];

  if (refreshRaw) {
    const tokenHash = sha256(refreshRaw);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
});

export default router;
