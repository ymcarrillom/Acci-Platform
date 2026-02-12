import { verifyAccessToken } from "../utils/jwt.js";

export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ message: "No autorizado" });

    const payload = verifyAccessToken(token); // usa JWT_ACCESS_SECRET
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

export const authMiddleware = authRequired;

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Sin permisos" });
    }
    next();
  };
}
