import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { authRequired, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { audit, getIp } from '../utils/audit.js';

const router = Router();

// ===== Validation =====
const courseSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  teacherId: z.string(),
  periodId: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
});

/**
 * @openapi
 * /courses:
 *   get:
 *     tags: [Courses]
 *     summary: Listar cursos (filtrado por rol del usuario)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: periodId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de cursos
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Pagination'
 *                 - type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Course' }
 *       401: { description: No autenticado }
 */
// ===== GET /courses — Listar cursos (filtrado por rol) =====
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { role, sub } = req.user;
    const { periodId, page: pageQ, limit: limitQ } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 20), 100);
    const skip = (page - 1) * limit;

    let where = {};

    if (role === 'TEACHER') {
      where = { teacherId: sub, isActive: true };
    } else if (role === 'STUDENT') {
      where = {
        isActive: true,
        enrollments: { some: { studentId: sub } },
      };
    }
    // ADMIN: sin filtro (ve todos, incluyendo inactivos)

    if (periodId) {
      where.periodId = periodId;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          teacher: { select: { id: true, fullName: true, email: true } },
          period: { select: { id: true, name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    return res.json({ courses, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Detalle de un curso
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del curso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course: { $ref: '#/components/schemas/Course' }
 *       401: { description: No autenticado }
 *       403: { description: Sin permisos }
 *       404: { description: Curso no encontrado }
 */
// ===== GET /courses/:id — Detalle de curso =====
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    // Verificar acceso según rol
    const { role, sub } = req.user;
    if (role === 'TEACHER' && course.teacherId !== sub) {
      return res.status(403).json({ message: 'Sin permisos' });
    }
    if (role === 'STUDENT') {
      const enrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: course.id, studentId: sub } },
      });
      if (!enrolled) return res.status(403).json({ message: 'Sin permisos' });
    }

    return res.json({ course });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /courses:
 *   post:
 *     tags: [Courses]
 *     summary: Crear curso (ADMIN)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, teacherId, startDate, endDate]
 *             properties:
 *               code: { type: string, minLength: 2, maxLength: 20, example: PROG-101 }
 *               name: { type: string, minLength: 3, maxLength: 100, example: Introducción a la Programación }
 *               description: { type: string }
 *               teacherId: { type: string }
 *               periodId: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *     responses:
 *       201: { description: Curso creado }
 *       400: { description: Datos inválidos }
 *       401: { description: No autenticado }
 *       403: { description: Solo ADMIN }
 *       409: { description: Código de curso ya existe }
 */
// ===== POST /courses — Crear curso (ADMIN) =====
router.post('/', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const parsed = courseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { code, name, description, teacherId, periodId, startDate, endDate } = parsed.data;

    // Verificar que el docente existe y tiene rol TEACHER
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(400).json({ message: 'Docente no válido' });
    }

    // Verificar código único
    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ message: 'El código de curso ya existe' });
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        description,
        teacherId,
        periodId: periodId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    });

    await audit({
      userId: req.user.sub,
      action: 'COURSE_CREATED',
      entity: 'Course',
      entityId: course.id,
      detail: { code, name, teacherId },
      ip: getIp(req),
    });

    return res.status(201).json({ course });
  } catch (err) {
    next(err);
  }
});

// ===== PUT /courses/:id — Actualizar curso (ADMIN) =====
router.put('/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Curso no encontrado' });

    const parsed = courseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { code, name, description, teacherId, periodId, startDate, endDate } = parsed.data;

    // Verificar que el docente existe y tiene rol TEACHER
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(400).json({ message: 'Docente no válido' });
    }

    // Verificar código único (excepto el mismo curso)
    const duplicate = await prisma.course.findFirst({
      where: { code, id: { not: req.params.id } },
    });
    if (duplicate) {
      return res.status(409).json({ message: 'El código de curso ya existe' });
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        teacherId,
        periodId: periodId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    });

    await audit({
      userId: req.user.sub,
      action: 'COURSE_UPDATED',
      entity: 'Course',
      entityId: course.id,
      detail: { code, name, teacherId },
      ip: getIp(req),
    });

    return res.json({ course });
  } catch (err) {
    next(err);
  }
});

// ===== PATCH /courses/:id/toggle — Activar/desactivar curso (ADMIN) =====
router.patch('/:id/toggle', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Curso no encontrado' });

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      select: { id: true, name: true, isActive: true },
    });

    await audit({
      userId: req.user.sub,
      action: course.isActive ? 'COURSE_ACTIVATED' : 'COURSE_DEACTIVATED',
      entity: 'Course',
      entityId: course.id,
      detail: { name: course.name },
      ip: getIp(req),
    });

    return res.json({
      course,
      message: course.isActive ? 'Curso activado' : 'Curso desactivado',
    });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /courses/:id — Eliminar curso permanentemente (ADMIN) =====
router.delete('/:id', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Curso no encontrado' });

    await prisma.course.delete({ where: { id: req.params.id } });

    await audit({
      userId: req.user.sub,
      action: 'COURSE_DELETED',
      entity: 'Course',
      entityId: req.params.id,
      detail: { code: existing.code, name: existing.name },
      ip: getIp(req),
    });

    return res.json({ message: 'Curso eliminado permanentemente' });
  } catch (err) {
    next(err);
  }
});

// ===== GET /courses/:id/grades/export — Export grades as PDF =====
router.get(
  '/:id/grades/export',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: { teacher: { select: { fullName: true } } },
      });
      if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

      if (req.user.role === 'TEACHER' && course.teacherId !== req.user.sub) {
        return res.status(403).json({ message: 'Sin permisos' });
      }

      const activities = await prisma.activity.findMany({
        where: { courseId: req.params.id, type: { in: ['QUIZ', 'TASK'] } },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, type: true },
      });

      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseId: req.params.id },
        include: { student: { select: { id: true, fullName: true, email: true } } },
        orderBy: { student: { fullName: 'asc' } },
      });

      const activityIds = activities.map((a) => a.id);
      const submissions = await prisma.submission.findMany({
        where: { activityId: { in: activityIds } },
        orderBy: { attempt: 'desc' },
      });

      // Index submissions by activityId+studentId for O(1) lookup
      const subsMap = new Map();
      for (const s of submissions) {
        const key = `${s.activityId}:${s.studentId}`;
        if (!subsMap.has(key)) subsMap.set(key, []);
        subsMap.get(key).push(s);
      }

      // Build student rows
      const studentRows = enrollments.map((e) => {
        const student = e.student;
        const grades = activities.map((act) => {
          const subs = subsMap.get(`${act.id}:${student.id}`) || [];
          if (subs.length === 0) return '-';
          const best = subs.reduce(
            (max, s) =>
              s.grade !== null && s.grade !== undefined && s.grade > max ? s.grade : max,
            -1
          );
          return best >= 0 ? best.toFixed(1) : 'Pend.';
        });

        const numericGrades = grades.filter((g) => g !== '-' && g !== 'Pend.').map(Number);
        const avg =
          numericGrades.length > 0
            ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1)
            : '-';

        return { name: student.fullName, email: student.email, grades, avg };
      });

      // Generate PDF
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 40 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="calificaciones-${course.code}.pdf"`
      );
      doc.pipe(res);

      // ── Helpers ──
      const tableLeft = 40;
      const border = 0.5;
      const borderColor = '#cbd5e1';
      const headerBg = '#1e293b';
      const headerFg = '#ffffff';
      const zebraBg = '#f8fafc';
      const rowH = 20;
      const headerH = 22;

      function drawCell(doc, x, y, w, h, text, opts = {}) {
        const { bg, fg = '#1e293b', align = 'left', bold = false, borderC = borderColor } = opts;
        if (bg) {
          doc.save().rect(x, y, w, h).fill(bg).restore();
        }
        doc.save().rect(x, y, w, h).lineWidth(border).stroke(borderC).restore();
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8)
          .fill(fg);
        const pad = align === 'left' ? 5 : 3;
        doc.text(text, x + pad, y + (h - 8) / 2, { width: w - pad * 2, align, lineBreak: false });
      }

      // ── Page header ──
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fill('#1e293b')
        .text('Reporte de Calificaciones', { align: 'center' });
      doc.moveDown(0.2);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#64748b')
        .text('Academia de Crecimiento Cristiano Integral (ACCI)', { align: 'center' });
      doc.moveDown(0.6);

      // ── Course info table ──
      const infoW = 340;
      let iy = doc.y;
      const infoRows = [
        ['Curso', `${course.name} (${course.code})`],
        ['Docente', course.teacher?.fullName || '-'],
        [
          'Fecha',
          new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        ],
        ['Inscritos', `${enrollments.length}`],
        ['Actividades', `${activities.length}`],
      ];
      for (const [label, value] of infoRows) {
        drawCell(doc, tableLeft, iy, 100, 16, label, { bg: '#f1f5f9', bold: true });
        drawCell(doc, tableLeft + 100, iy, infoW - 100, 16, value);
        iy += 16;
      }
      doc.y = iy;
      doc.moveDown(0.8);

      // ── Grades table config ──
      const nameColW = 150;
      const actColW = 68;
      const avgColW = 55;
      const availableW = doc.page.width - 80 - nameColW - avgColW;
      const actsPerPage = Math.max(1, Math.floor(availableW / actColW));

      const actChunks = [];
      for (let i = 0; i < activities.length; i += actsPerPage) {
        actChunks.push(activities.slice(i, i + actsPerPage));
      }
      if (actChunks.length === 0) actChunks.push([]);

      function drawGradesHeader(y, actsToShow, tableW) {
        drawCell(doc, tableLeft, y, nameColW, headerH, 'Estudiante', {
          bg: headerBg,
          fg: headerFg,
          bold: true,
        });
        let x = tableLeft + nameColW;
        for (const act of actsToShow) {
          const label = act.title.length > 9 ? act.title.slice(0, 8) + '…' : act.title;
          drawCell(doc, x, y, actColW, headerH, label, {
            bg: headerBg,
            fg: headerFg,
            bold: true,
            align: 'center',
          });
          x += actColW;
        }
        drawCell(doc, x, y, avgColW, headerH, 'Promedio', {
          bg: headerBg,
          fg: headerFg,
          bold: true,
          align: 'center',
        });
      }

      for (let chunkIdx = 0; chunkIdx < actChunks.length; chunkIdx++) {
        const actsToShow = actChunks[chunkIdx];
        const startIdx = chunkIdx * actsPerPage;
        const tableW = nameColW + actsToShow.length * actColW + avgColW;

        if (chunkIdx > 0) doc.addPage();

        if (actChunks.length > 1) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fill('#64748b')
            .text(
              `Actividades ${startIdx + 1} a ${startIdx + actsToShow.length} de ${activities.length}`,
              tableLeft
            );
          doc.moveDown(0.3);
        }

        let y = doc.y;
        drawGradesHeader(y, actsToShow, tableW);
        y += headerH;

        for (let i = 0; i < studentRows.length; i++) {
          const row = studentRows[i];

          if (y + rowH > doc.page.height - 50) {
            doc.addPage();
            y = 40;
            drawGradesHeader(y, actsToShow, tableW);
            y += headerH;
          }

          const bg = i % 2 === 0 ? zebraBg : undefined;
          drawCell(doc, tableLeft, y, nameColW, rowH, row.name, { bg, bold: true });

          let x = tableLeft + nameColW;
          for (let ai = 0; ai < actsToShow.length; ai++) {
            const g = row.grades[startIdx + ai];
            const fg = g === '-' ? '#94a3b8' : g === 'Pend.' ? '#d97706' : '#059669';
            drawCell(doc, x, y, actColW, rowH, g, { bg, fg, align: 'center', bold: g !== '-' });
            x += actColW;
          }

          const avgFg =
            row.avg === '-' ? '#94a3b8' : Number(row.avg) >= 6.0 ? '#059669' : '#dc2626';
          drawCell(doc, x, y, avgColW, rowH, row.avg, {
            bg,
            fg: avgFg,
            align: 'center',
            bold: true,
          });
          y += rowH;
        }
      }

      // ── Summary page ──
      doc.addPage();
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fill('#1e293b')
        .text('Resumen de Calificaciones', tableLeft);
      doc.moveDown(0.5);

      const sCols = [160, 70, 110];
      let sy = doc.y;

      function drawSummaryHeader(y) {
        drawCell(doc, tableLeft, y, sCols[0], headerH, 'Estudiante', {
          bg: headerBg,
          fg: headerFg,
          bold: true,
        });
        drawCell(doc, tableLeft + sCols[0], y, sCols[1], headerH, 'Promedio', {
          bg: headerBg,
          fg: headerFg,
          bold: true,
          align: 'center',
        });
        drawCell(
          doc,
          tableLeft + sCols[0] + sCols[1],
          y,
          sCols[2],
          headerH,
          'Calificadas / Total',
          { bg: headerBg, fg: headerFg, bold: true, align: 'center' }
        );
      }

      drawSummaryHeader(sy);
      sy += headerH;

      for (let i = 0; i < studentRows.length; i++) {
        const row = studentRows[i];
        if (sy + rowH > doc.page.height - 50) {
          doc.addPage();
          sy = 40;
          drawSummaryHeader(sy);
          sy += headerH;
        }

        const bg = i % 2 === 0 ? zebraBg : undefined;
        let sx = tableLeft;
        drawCell(doc, sx, sy, sCols[0], rowH, row.name, { bg, bold: true });
        sx += sCols[0];

        const avgFg = row.avg === '-' ? '#94a3b8' : Number(row.avg) >= 6.0 ? '#059669' : '#dc2626';
        drawCell(doc, sx, sy, sCols[1], rowH, row.avg, {
          bg,
          fg: avgFg,
          align: 'center',
          bold: true,
        });
        sx += sCols[1];

        const graded = row.grades.filter((g) => g !== '-' && g !== 'Pend.').length;
        drawCell(doc, sx, sy, sCols[2], rowH, `${graded} / ${activities.length}`, {
          bg,
          align: 'center',
        });
        sy += rowH;
      }

      // ── Footer ──
      doc
        .fontSize(7)
        .fill('#94a3b8')
        .text('Generado automaticamente por ACCI Platform', tableLeft, doc.page.height - 30, {
          align: 'center',
          width: doc.page.width - 80,
        });

      doc.end();
    } catch (err) {
      next(err);
    }
  }
);

// ===== GET /courses/:id/students/export — Export enrolled students as PDF =====
router.get(
  '/:id/students/export',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: { teacher: { select: { fullName: true } } },
      });
      if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

      if (req.user.role === 'TEACHER' && course.teacherId !== req.user.sub) {
        return res.status(403).json({ message: 'Sin permisos' });
      }

      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseId: req.params.id },
        include: { student: { select: { id: true, fullName: true, email: true } } },
        orderBy: { student: { fullName: 'asc' } },
      });

      const students = enrollments.map((e, i) => ({
        num: i + 1,
        name: e.student.fullName,
        email: e.student.email,
        enrolledAt: e.enrolledAt,
      }));

      // Generate PDF
      const doc = new PDFDocument({ size: 'LETTER', margin: 40 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="estudiantes-${course.code}.pdf"`);
      doc.pipe(res);

      // ── Helpers ──
      const tableLeft = 40;
      const border = 0.5;
      const borderColor = '#cbd5e1';
      const headerBg = '#1e293b';
      const headerFg = '#ffffff';
      const zebraBg = '#f8fafc';
      const rowH = 22;
      const headerH = 24;

      function drawCell(doc, x, y, w, h, text, opts = {}) {
        const { bg, fg = '#1e293b', align = 'left', bold = false, borderC = borderColor } = opts;
        if (bg) {
          doc.save().rect(x, y, w, h).fill(bg).restore();
        }
        doc.save().rect(x, y, w, h).lineWidth(border).stroke(borderC).restore();
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fill(fg);
        const pad = align === 'left' ? 6 : 3;
        doc.text(text, x + pad, y + (h - 9) / 2, { width: w - pad * 2, align, lineBreak: false });
      }

      // ── Page header ──
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fill('#1e293b')
        .text('Lista de Estudiantes', { align: 'center' });
      doc.moveDown(0.2);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#64748b')
        .text('Academia de Crecimiento Cristiano Integral (ACCI)', { align: 'center' });
      doc.moveDown(0.6);

      // ── Course info ──
      const infoW = 360;
      let iy = doc.y;
      const infoRows = [
        ['Curso', `${course.name} (${course.code})`],
        ['Docente', course.teacher?.fullName || '-'],
        [
          'Fecha',
          new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        ],
        ['Total inscritos', `${students.length}`],
      ];
      for (const [label, value] of infoRows) {
        drawCell(doc, tableLeft, iy, 110, 18, label, { bg: '#f1f5f9', bold: true });
        drawCell(doc, tableLeft + 110, iy, infoW - 110, 18, value);
        iy += 18;
      }
      doc.y = iy;
      doc.moveDown(0.8);

      // ── Table columns ──
      const colW = [40, 200, 180, 110];
      const tableW = colW.reduce((a, b) => a + b, 0);

      function drawTableHeader(y) {
        const headers = ['#', 'Nombre', 'Correo', 'Inscrito'];
        let x = tableLeft;
        for (let i = 0; i < headers.length; i++) {
          drawCell(doc, x, y, colW[i], headerH, headers[i], {
            bg: headerBg,
            fg: headerFg,
            bold: true,
            align: i === 0 ? 'center' : 'left',
          });
          x += colW[i];
        }
      }

      // ── Draw table ──
      let ty = doc.y;
      drawTableHeader(ty);
      ty += headerH;

      for (let i = 0; i < students.length; i++) {
        if (ty + rowH > doc.page.height - 50) {
          doc.addPage();
          ty = 40;
          drawTableHeader(ty);
          ty += headerH;
        }

        const s = students[i];
        const bg = i % 2 === 0 ? zebraBg : undefined;
        let x = tableLeft;

        drawCell(doc, x, ty, colW[0], rowH, `${s.num}`, { bg, align: 'center' });
        x += colW[0];
        drawCell(doc, x, ty, colW[1], rowH, s.name, { bg, bold: true });
        x += colW[1];
        drawCell(doc, x, ty, colW[2], rowH, s.email, { bg });
        x += colW[2];
        drawCell(
          doc,
          x,
          ty,
          colW[3],
          rowH,
          new Date(s.enrolledAt).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          { bg, align: 'center' }
        );
        ty += rowH;
      }

      if (students.length === 0) {
        drawCell(doc, tableLeft, ty, tableW, rowH, 'No hay estudiantes inscritos', {
          align: 'center',
        });
      }

      // ── Footer ──
      doc
        .fontSize(7)
        .fill('#94a3b8')
        .text('Generado automaticamente por ACCI Platform', tableLeft, doc.page.height - 30, {
          align: 'center',
          width: doc.page.width - 80,
        });

      doc.end();
    } catch (err) {
      next(err);
    }
  }
);

// ===== GET /courses/:id/students — Listar inscritos (ADMIN, TEACHER) =====
router.get(
  '/:id/students',
  authRequired,
  requireRole('ADMIN', 'TEACHER'),
  async (req, res, next) => {
    try {
      const course = await prisma.course.findUnique({ where: { id: req.params.id } });
      if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

      // TEACHER solo puede ver sus propios cursos
      if (req.user.role === 'TEACHER' && course.teacherId !== req.user.sub) {
        return res.status(403).json({ message: 'Sin permisos' });
      }

      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseId: req.params.id },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      const students = enrollments.map((e) => ({
        ...e.student,
        enrolledAt: e.enrolledAt,
        enrollmentId: e.id,
      }));

      return res.json({ students });
    } catch (err) {
      next(err);
    }
  }
);

// ===== POST /courses/:id/enroll — Inscribir estudiante (ADMIN) =====
router.post('/:id/enroll', authRequired, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId requerido' });

    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'STUDENT') {
      return res.status(400).json({ message: 'Estudiante no válido' });
    }

    // Verificar si ya está inscrito
    const existing = await prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId: req.params.id, studentId } },
    });
    if (existing) {
      return res.status(409).json({ message: 'El estudiante ya está inscrito' });
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: { courseId: req.params.id, studentId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
      },
    });

    await audit({
      userId: req.user.sub,
      action: 'STUDENT_ENROLLED',
      entity: 'Course',
      entityId: req.params.id,
      detail: {
        studentId,
        studentName: student.fullName,
        courseName: course.name,
        courseId: req.params.id,
      },
      ip: getIp(req),
    });

    return res.status(201).json({ enrollment });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /courses/:id/enroll/:studentId — Desinscribir (ADMIN) =====
router.delete(
  '/:id/enroll/:studentId',
  authRequired,
  requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      const { id, studentId } = req.params;

      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: id, studentId } },
        include: {
          student: { select: { fullName: true } },
          course: { select: { name: true } },
        },
      });
      if (!enrollment) {
        return res.status(404).json({ message: 'Inscripción no encontrada' });
      }

      await prisma.courseEnrollment.delete({
        where: { id: enrollment.id },
      });

      await audit({
        userId: req.user.sub,
        action: 'STUDENT_UNENROLLED',
        entity: 'Course',
        entityId: id,
        detail: {
          studentId,
          studentName: enrollment.student.fullName,
          courseName: enrollment.course.name,
          courseId: id,
        },
        ip: getIp(req),
      });

      return res.json({ message: 'Estudiante desinscrito' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
