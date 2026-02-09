import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
