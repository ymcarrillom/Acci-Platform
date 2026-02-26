import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authRequired, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { audit, getIp } from '../utils/audit.js';

const router = Router();

const PROTECTED_EMAIL = 'recovery@acci.com';

// ===== Validation =====
const createUserSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Obtener perfil del usuario autenticado
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: No autenticado }
 */
// ===== GET /users/me — Usuario actual =====
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, role: true, fullName: true, isActive: true },
    });

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ===== PUT /users/me — Editar perfil propio =====
router.put('/me', authRequired, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: req.user.sub },
      data: { passwordHash },
      select: { id: true, email: true, role: true, fullName: true, isActive: true },
    });

    return res.json({ user: updated, message: 'Contraseña actualizada' });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/teachers:
 *   get:
 *     tags: [Users]
 *     summary: Listar docentes activos (ADMIN)
 *     responses:
 *       200:
 *         description: Lista de docentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 teachers:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 */
// ===== GET /users/teachers — Lista de docentes (ADMIN) =====
router.get('/teachers', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER', isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });
    return res.json({ teachers });
  } catch (err) {
    next(err);
  }
});

// ===== GET /users/students — Lista de estudiantes (ADMIN) =====
router.get('/students', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });
    return res.json({ students });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuarios (ADMIN)
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [STUDENT, TEACHER, ADMIN] }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 */
// ===== GET /users — Listar todos los usuarios (ADMIN) =====
router.get('/', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role, active, search, page = '1', limit = '20' } = req.query;
    const where = {};

    if (role) where.role = role;
    if (active !== undefined) where.isActive = active === 'true';
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { fullName: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Detalle de usuario (ADMIN)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del usuario con cursos asociados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       404: { description: Usuario no encontrado }
 */
// ===== GET /users/:id — Detalle de usuario (ADMIN) =====
router.get('/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        coursesTeaching: {
          select: { id: true, code: true, name: true, isActive: true },
          orderBy: { name: 'asc' },
        },
        coursesEnrolled: {
          select: {
            enrolledAt: true,
            course: {
              select: { id: true, code: true, name: true, isActive: true },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Crear usuario (ADMIN)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, role]
 *             properties:
 *               fullName: { type: string, minLength: 2, example: 'Juan Pérez' }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [STUDENT, TEACHER, ADMIN] }
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400: { description: Datos inválidos }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       409: { description: Email ya registrado }
 */
// ===== POST /users — Crear usuario (ADMIN) =====
router.post('/', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { fullName, email, password, role } = parsed.data;

    // Verificar email único
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { fullName, email, passwordHash, role },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await audit({
      userId: req.user.sub,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      detail: { fullName, email, role },
      ip: getIp(req),
    });

    return res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Editar usuario (ADMIN)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, role]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [STUDENT, TEACHER, ADMIN] }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Usuario actualizado }
 *       400: { description: Datos inválidos }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       404: { description: Usuario no encontrado }
 *       409: { description: Email ya registrado }
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar usuario permanentemente (ADMIN)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Usuario eliminado }
 *       400: { description: No puedes eliminarte a ti mismo }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos o cuenta protegida }
 *       404: { description: Usuario no encontrado }
 */
// ===== PUT /users/:id — Editar usuario (ADMIN) =====
router.put('/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { fullName, email, password, role, isActive } = parsed.data;

    // Cuenta de recuperación protegida
    if (existing.email === PROTECTED_EMAIL) {
      return res
        .status(403)
        .json({ message: 'Esta cuenta está protegida y no puede ser modificada' });
    }

    // No permitir editar datos propios críticos desde el panel admin
    if (req.params.id === req.user.sub) {
      if (role !== existing.role) {
        return res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
      }
      if (email !== existing.email) {
        return res
          .status(400)
          .json({ message: 'No puedes cambiar tu propio correo desde aquí. Usa tu perfil.' });
      }
      if (isActive === false) {
        return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
      }
    }

    // Verificar email único (excepto el mismo usuario)
    const duplicate = await prisma.user.findFirst({
      where: { email, id: { not: req.params.id } },
    });
    if (duplicate) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const data = { fullName, email, role };
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await audit({
      userId: req.user.sub,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user.id,
      detail: { changes: { fullName, email, role, passwordChanged: !!password } },
      ip: getIp(req),
    });

    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ===== PATCH /users/:id/toggle — Activar/desactivar usuario (ADMIN) =====
router.patch('/:id/toggle', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ message: 'No puedes cambiar tu propio estado' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (existing.email === PROTECTED_EMAIL) {
      return res
        .status(403)
        .json({ message: 'Esta cuenta está protegida y no puede ser modificada' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      select: { id: true, fullName: true, isActive: true },
    });

    await audit({
      userId: req.user.sub,
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: user.id,
      detail: { fullName: user.fullName },
      ip: getIp(req),
    });

    return res.json({
      user,
      message: user.isActive ? 'Usuario activado' : 'Usuario desactivado',
    });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /users/:id — Eliminar usuario permanentemente (ADMIN) =====
router.delete('/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (existing.email === PROTECTED_EMAIL) {
      return res
        .status(403)
        .json({ message: 'Esta cuenta está protegida y no puede ser eliminada' });
    }

    // Eliminar registros relacionados que no tienen onDelete: Cascade
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });

    await prisma.user.delete({ where: { id: req.params.id } });

    await audit({
      userId: req.user.sub,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: req.params.id,
      detail: { fullName: existing.fullName, email: existing.email },
      ip: getIp(req),
    });

    return res.json({ message: 'Usuario eliminado permanentemente' });
  } catch (err) {
    next(err);
  }
});

export default router;
