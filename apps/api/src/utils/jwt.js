import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken({ userId, role }) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

export function signRefreshToken({ userId, refreshTokenId, plainRt }) {
  return jwt.sign({ sub: userId, rtid: refreshTokenId, rt: plainRt }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
