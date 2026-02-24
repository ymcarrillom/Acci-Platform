import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';

const router = Router({ mergeParams: true });

// ===== Middleware: verify course access =====
async function verifyCourseAccess(req, res, next) {
  try {
    const { courseId } = req.params;
    const { role, sub } = req.user;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    if (role === 'TEACHER' && course.teacherId !== sub) {
      return res.status(403).json({ message: 'Sin permisos' });
    }

    if (role === 'STUDENT') {
      const enrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: sub } },
      });
      if (!enrolled) return res.status(403).json({ message: 'Sin permisos' });
    }

    req.course = course;
    next();
  } catch (err) {
    next(err);
  }
}

// ===== Zod Schema =====
const reflectionSchema = z.object({
  content: z.string().min(1, 'El contenido es requerido'),
  actionType: z.enum(['oracion', 'servicio', 'reflexion']).optional(),
});

// ===== GET / — List reflections =====
router.get('/', authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { role, sub } = req.user;
    const { page: pageQ, limit: limitQ } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 20), 100);
    const skip = (page - 1) * limit;

    const where = { courseId };
    // Students only see their own reflections
    if (role === 'STUDENT') where.studentId = sub;

    const [reflections, total] = await Promise.all([
      prisma.spiritualReflection.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.spiritualReflection.count({ where }),
    ]);

    return res.json({ reflections, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ===== POST / — Create reflection (STUDENT only) =====
router.post(
  '/',
  authRequired,
  requireRole('STUDENT'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const parsed = reflectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.flatten() });
      }

      const reflection = await prisma.spiritualReflection.create({
        data: {
          studentId: req.user.sub,
          courseId,
          content: parsed.data.content,
          actionType: parsed.data.actionType || null,
        },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
      });

      return res.status(201).json({ reflection });
    } catch (err) {
      next(err);
    }
  }
);

// ===== GET /:id — Get single reflection =====
router.get('/:id', authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, sub } = req.user;

    const reflection = await prisma.spiritualReflection.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!reflection) return res.status(404).json({ message: 'Reflexion no encontrada' });
    if (role === 'STUDENT' && reflection.studentId !== sub) {
      return res.status(403).json({ message: 'Sin permisos' });
    }

    return res.json({ reflection });
  } catch (err) {
    next(err);
  }
});

// ===== PUT /:id — Edit own reflection (STUDENT only) =====
router.put(
  '/:id',
  authRequired,
  requireRole('STUDENT'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const existing = await prisma.spiritualReflection.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Reflexion no encontrada' });
      if (existing.studentId !== req.user.sub) {
        return res.status(403).json({ message: 'Sin permisos' });
      }

      const parsed = reflectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.flatten() });
      }

      const reflection = await prisma.spiritualReflection.update({
        where: { id },
        data: {
          content: parsed.data.content,
          actionType: parsed.data.actionType || null,
        },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
      });

      return res.json({ reflection });
    } catch (err) {
      next(err);
    }
  }
);

// ===== DELETE /:id — Delete own reflection (STUDENT only) =====
router.delete(
  '/:id',
  authRequired,
  requireRole('STUDENT'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const existing = await prisma.spiritualReflection.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Reflexion no encontrada' });
      if (existing.studentId !== req.user.sub) {
        return res.status(403).json({ message: 'Sin permisos' });
      }

      await prisma.spiritualReflection.delete({ where: { id } });

      return res.json({ message: 'Reflexion eliminada' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
