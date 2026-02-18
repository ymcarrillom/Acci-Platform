import { Router } from "express";
import { authRequired, requireRole } from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// ===== GET /audit-logs — List audit logs (ADMIN only) =====
router.get("/", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { page: pageQ, limit: limitQ, action, entity, userId } = req.query;
    const page  = Math.max(1, parseInt(pageQ)  || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 50), 100);
    const skip  = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

export default router;
