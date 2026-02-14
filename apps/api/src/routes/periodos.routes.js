import { Router } from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// ===== Validation =====
const periodoSchema = z.object({
  name: z.string().min(2).max(50),
  startDate: z.string(),
  endDate: z.string(),
});

// ===== GET /periodos — Listar periodos (ADMIN) =====
router.get("/", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const periodos = await prisma.academicPeriod.findMany({
      include: {
        _count: { select: { courses: true } },
      },
      orderBy: { startDate: "desc" },
    });

    return res.json({ periodos });
  } catch (err) {
    next(err);
  }
});

// ===== GET /periodos/active — Obtener periodo activo (cualquier rol) =====
router.get("/active", authRequired, async (req, res, next) => {
  try {
    const periodo = await prisma.academicPeriod.findFirst({
      where: { isActive: true },
      include: {
        _count: { select: { courses: true } },
      },
    });

    if (!periodo) return res.status(404).json({ message: "No hay periodo activo" });
    return res.json({ periodo });
  } catch (err) {
    next(err);
  }
});

// ===== GET /periodos/:id — Detalle de periodo (ADMIN) =====
router.get("/:id", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const periodo = await prisma.academicPeriod.findUnique({
      where: { id: req.params.id },
      include: {
        courses: {
          include: {
            teacher: { select: { id: true, fullName: true, email: true } },
            _count: { select: { enrollments: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!periodo) return res.status(404).json({ message: "Periodo no encontrado" });
    return res.json({ periodo });
  } catch (err) {
    next(err);
  }
});

// ===== POST /periodos — Crear periodo (ADMIN) =====
router.post("/", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = periodoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.flatten() });
    }

    const { name, startDate, endDate } = parsed.data;

    // Verificar nombre unico
    const existing = await prisma.academicPeriod.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: "Ya existe un periodo con ese nombre" });
    }

    const periodo = await prisma.academicPeriod.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return res.status(201).json({ periodo });
  } catch (err) {
    next(err);
  }
});

// ===== PUT /periodos/:id — Editar periodo (ADMIN) =====
router.put("/:id", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const existing = await prisma.academicPeriod.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Periodo no encontrado" });

    const parsed = periodoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.flatten() });
    }

    const { name, startDate, endDate } = parsed.data;

    // Verificar nombre unico (excepto el mismo)
    const duplicate = await prisma.academicPeriod.findFirst({
      where: { name, id: { not: req.params.id } },
    });
    if (duplicate) {
      return res.status(409).json({ message: "Ya existe un periodo con ese nombre" });
    }

    const periodo = await prisma.academicPeriod.update({
      where: { id: req.params.id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return res.json({ periodo });
  } catch (err) {
    next(err);
  }
});

// ===== PATCH /periodos/:id/activate — Activar periodo (ADMIN) =====
router.patch("/:id/activate", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const existing = await prisma.academicPeriod.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Periodo no encontrado" });

    // Transaccion: desactivar todos, luego activar este
    const periodo = await prisma.$transaction(async (tx) => {
      await tx.academicPeriod.updateMany({
        data: { isActive: false },
      });
      return tx.academicPeriod.update({
        where: { id: req.params.id },
        data: { isActive: true },
      });
    });

    return res.json({ periodo, message: "Periodo activado" });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /periodos/:id — Eliminar periodo (ADMIN) =====
router.delete("/:id", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const existing = await prisma.academicPeriod.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { courses: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Periodo no encontrado" });

    if (existing._count.courses > 0) {
      return res.status(409).json({
        message: "No se puede eliminar un periodo con cursos asociados",
      });
    }

    await prisma.academicPeriod.delete({ where: { id: req.params.id } });
    return res.json({ message: "Periodo eliminado" });
  } catch (err) {
    next(err);
  }
});

export default router;
