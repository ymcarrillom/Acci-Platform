import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { sha256, randomToken } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: 'Email y password requeridos' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return res.status(401).json({ message: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  const plainRt = randomToken();
  const tokenHash = sha256(plainRt);
  const expiresAt = new Date(Date.now() + env.REFRESH_DAYS * 24 * 60 * 60 * 1000);

  const saved = await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const refreshToken = signRefreshToken({ userId: user.id, refreshTokenId: saved.id, plainRt });

  res.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    accessToken,
    refreshToken,
  });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken requerido' });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(403).json({ message: 'Refresh inválido' });
  }

  const userId = payload.sub;
  const refreshTokenId = payload.rtid;
  const plainRt = payload.rt;

  const row = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });
  if (!row || row.userId !== userId || row.revokedAt) return res.status(403).json({ message: 'Refresh inválido' });
  if (row.expiresAt < new Date()) return res.status(403).json({ message: 'Refresh expirado' });
  if (row.tokenHash !== sha256(plainRt)) return res.status(403).json({ message: 'Refresh inválido' });

  await prisma.refreshToken.update({ where: { id: refreshTokenId }, data: { revokedAt: new Date() } });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return res.status(403).json({ message: 'Usuario inválido' });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  const newPlainRt = randomToken();
  const newHash = sha256(newPlainRt);
  const expiresAt = new Date(Date.now() + env.REFRESH_DAYS * 24 * 60 * 60 * 1000);

  const saved = await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: newHash, expiresAt },
  });

  const newRefreshToken = signRefreshToken({ userId: user.id, refreshTokenId: saved.id, plainRt: newPlainRt });

  res.json({ accessToken, refreshToken: newRefreshToken });
});
