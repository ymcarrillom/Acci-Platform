import { Router } from 'express';
import { authRequired, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags: [Audit]
 *     summary: Listar logs de auditoría (ADMIN)
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string, example: LOGIN_SUCCESS }
 *         description: Filtrar por acción
 *       - in: query
 *         name: entity
 *         schema: { type: string, example: User }
 *         description: Filtrar por entidad
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Filtrar por usuario
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *     responses:
 *       200:
 *         description: Lista paginada de logs de auditoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       action: { type: string }
 *                       entity: { type: string }
 *                       entityId: { type: string }
 *                       detail: { type: object }
 *                       ip: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       user: { $ref: '#/components/schemas/User' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { description: No autenticado }
 *       403: { description: Solo ADMIN }
 */
// ===== GET /audit-logs — List audit logs (ADMIN only) =====
router.get('/', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page: pageQ, limit: limitQ, action, entity, userId } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 50), 100);
    const skip = (page - 1) * limit;

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
        orderBy: { createdAt: 'desc' },
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
