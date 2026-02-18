import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { authRequired, requireRole } from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router({ mergeParams: true });

// ===== Middleware: verify course access =====
async function verifyCourseAccess(req, res, next) {
  try {
    const { courseId } = req.params;
    const { role, sub } = req.user;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    if (role === "TEACHER" && course.teacherId !== sub) {
      return res.status(403).json({ message: "Sin permisos" });
    }

    if (role === "STUDENT") {
      const enrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: sub } },
      });
      if (!enrolled) {
        return res.status(403).json({ message: "Sin permisos" });
      }
    }

    req.course = course;
    next();
  } catch (err) {
    next(err);
  }
}

// ===== Zod Schemas =====
const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  notes: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  records: z.array(attendanceRecordSchema).min(1),
});

// ===== GET / — List attendance (filtrable by ?date=YYYY-MM-DD) =====
router.get("/", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { date, page: pageQ, limit: limitQ } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 50), 200);
    const skip = (page - 1) * limit;

    const where = { courseId };

    if (date) {
      const parsed = new Date(date + "T00:00:00.000Z");
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "Fecha inválida" });
      }
      where.date = parsed;
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ date: "desc" }, { student: { fullName: "asc" } }],
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return res.json({ attendance, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ===== POST / — Bulk upsert attendance =====
router.post("/", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const parsed = bulkAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    }

    const { date, records } = parsed.data;
    const dateObj = new Date(date + "T00:00:00.000Z");

    // Verify all students are enrolled
    const studentIds = records.map((r) => r.studentId);
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId, studentId: { in: studentIds } },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.studentId));

    const notEnrolled = studentIds.filter((id) => !enrolledIds.has(id));
    if (notEnrolled.length > 0) {
      return res.status(400).json({
        message: `Estudiantes no inscritos en el curso: ${notEnrolled.join(", ")}`,
      });
    }

    const results = await prisma.$transaction(
      records.map((record) =>
        prisma.attendance.upsert({
          where: {
            courseId_studentId_date: {
              courseId,
              studentId: record.studentId,
              date: dateObj,
            },
          },
          update: {
            status: record.status,
            notes: record.notes || null,
          },
          create: {
            courseId,
            studentId: record.studentId,
            date: dateObj,
            status: record.status,
            notes: record.notes || null,
          },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
          },
        })
      )
    );

    return res.json({ attendance: results, message: "Asistencia registrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// ===== GET /summary — Attendance summary per student =====
router.get("/summary", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Use groupBy to aggregate at DB level instead of loading all records
    const [grouped, enrollments] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["studentId", "status"],
        where: { courseId },
        _count: { id: true },
      }),
      prisma.courseEnrollment.findMany({
        where: { courseId },
        include: { student: { select: { id: true, fullName: true, email: true } } },
      }),
    ]);

    // Build summary from groupBy results
    const studentMap = {};
    for (const e of enrollments) {
      studentMap[e.studentId] = {
        student: e.student,
        total: 0, present: 0, absent: 0, late: 0, excused: 0,
      };
    }

    for (const row of grouped) {
      const entry = studentMap[row.studentId];
      if (!entry) continue;
      const count = row._count.id;
      entry.total += count;
      switch (row.status) {
        case "PRESENT": entry.present += count; break;
        case "ABSENT": entry.absent += count; break;
        case "LATE": entry.late += count; break;
        case "EXCUSED": entry.excused += count; break;
      }
    }

    const summary = Object.values(studentMap).map((s) => ({
      ...s,
      attendanceRate: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
    }));

    summary.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName));

    return res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// ===== GET /export — Export attendance as PDF =====
router.get("/export", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = req.course;

    const teacher = await prisma.user.findUnique({
      where: { id: course.teacherId },
      select: { fullName: true },
    });

    // Get all enrolled students
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      include: { student: { select: { id: true, fullName: true, email: true } } },
      orderBy: { student: { fullName: "asc" } },
    });

    // Get all attendance records
    const attendance = await prisma.attendance.findMany({
      where: { courseId },
      orderBy: { date: "asc" },
    });

    // Get unique dates
    const datesSet = new Set(attendance.map((a) => a.date.toISOString().split("T")[0]));
    const dates = [...datesSet].sort();

    // Build summary per student
    const studentMap = {};
    for (const e of enrollments) {
      studentMap[e.student.id] = {
        name: e.student.fullName,
        email: e.student.email,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        byDate: {},
      };
    }

    for (const record of attendance) {
      const s = studentMap[record.studentId];
      if (!s) continue;
      const dateKey = record.date.toISOString().split("T")[0];
      s.total++;
      s.byDate[dateKey] = record.status;
      switch (record.status) {
        case "PRESENT": s.present++; break;
        case "ABSENT": s.absent++; break;
        case "LATE": s.late++; break;
        case "EXCUSED": s.excused++; break;
      }
    }

    const students = Object.values(studentMap);

    // Status abbreviations
    const statusLabel = { PRESENT: "P", ABSENT: "A", LATE: "T", EXCUSED: "E" };

    // Generate PDF
    const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="asistencia-${course.code}.pdf"`);
    doc.pipe(res);

    // ── Helpers ──
    const tableLeft = 40;
    const border = 0.5;
    const borderColor = "#cbd5e1";
    const headerBg = "#1e293b";
    const headerFg = "#ffffff";
    const zebraBg = "#f8fafc";
    const rowH = 18;
    const headerH = 22;

    function drawCell(doc, x, y, w, h, text, opts = {}) {
      const { bg, fg = "#1e293b", align = "left", bold = false, fontSize = 8 } = opts;
      if (bg) { doc.save().rect(x, y, w, h).fill(bg).restore(); }
      doc.save().rect(x, y, w, h).lineWidth(border).stroke(borderColor).restore();
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).fill(fg);
      const pad = align === "left" ? 5 : 2;
      doc.text(text, x + pad, y + (h - fontSize) / 2, { width: w - pad * 2, align, lineBreak: false });
    }

    // ── Page header ──
    doc.fontSize(16).font("Helvetica-Bold").fill("#1e293b").text("Reporte de Asistencia", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(9).font("Helvetica").fill("#64748b").text("Academia de Crecimiento Cristiano Integral (ACCI)", { align: "center" });
    doc.moveDown(0.6);

    // ── Course info table ──
    const infoW = 360;
    let iy = doc.y;
    const infoRows = [
      ["Curso", `${course.name} (${course.code})`],
      ["Docente", teacher?.fullName || "-"],
      ["Fecha", new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })],
      ["Inscritos", `${enrollments.length}`],
      ["Sesiones", `${dates.length}`],
    ];
    for (const [label, value] of infoRows) {
      drawCell(doc, tableLeft, iy, 100, 16, label, { bg: "#f1f5f9", bold: true, fontSize: 8 });
      drawCell(doc, tableLeft + 100, iy, infoW - 100, 16, value, { fontSize: 8 });
      iy += 16;
    }
    doc.y = iy;
    doc.moveDown(0.4);

    // ── Legend table ──
    const legendY = doc.y;
    const legendItems = [
      ["P", "Presente", "#059669"],
      ["A", "Ausente", "#dc2626"],
      ["T", "Tardanza", "#d97706"],
      ["E", "Excusado", "#2563eb"],
    ];
    let lx = tableLeft;
    for (const [code, label, color] of legendItems) {
      drawCell(doc, lx, legendY, 20, 16, code, { bg: color, fg: "#ffffff", bold: true, align: "center", fontSize: 8 });
      drawCell(doc, lx + 20, legendY, 65, 16, label, { fontSize: 7 });
      lx += 85;
    }
    doc.y = legendY + 16;
    doc.moveDown(0.6);

    // ── Attendance table config ──
    const nameColW = 140;
    const rateColW = 50;
    const dateColW = 30;
    const availableW = doc.page.width - 80 - nameColW - rateColW;
    const datesPerPage = Math.max(1, Math.floor(availableW / dateColW));

    const dateChunks = [];
    for (let i = 0; i < dates.length; i += datesPerPage) {
      dateChunks.push(dates.slice(i, i + datesPerPage));
    }
    if (dateChunks.length === 0) dateChunks.push([]);

    function drawAttHeader(y, datesToShow) {
      drawCell(doc, tableLeft, y, nameColW, headerH, "Estudiante", { bg: headerBg, fg: headerFg, bold: true });
      let x = tableLeft + nameColW;
      for (const d of datesToShow) {
        const parts = d.split("-");
        const label = `${parts[2]}/${parts[1]}`;
        drawCell(doc, x, y, dateColW, headerH, label, { bg: headerBg, fg: headerFg, bold: true, align: "center", fontSize: 7 });
        x += dateColW;
      }
      drawCell(doc, x, y, rateColW, headerH, "% Asis.", { bg: headerBg, fg: headerFg, bold: true, align: "center" });
    }

    // ── Render attendance pages ──
    for (let chunkIdx = 0; chunkIdx < dateChunks.length; chunkIdx++) {
      const datesToShow = dateChunks[chunkIdx];

      if (chunkIdx > 0) doc.addPage();

      if (dateChunks.length > 1) {
        doc.fontSize(8).font("Helvetica").fill("#64748b")
          .text(`Sesiones ${chunkIdx * datesPerPage + 1} a ${chunkIdx * datesPerPage + datesToShow.length} de ${dates.length}`, tableLeft);
        doc.moveDown(0.3);
      }

      let y = doc.y;
      drawAttHeader(y, datesToShow);
      y += headerH;

      for (let i = 0; i < students.length; i++) {
        const student = students[i];

        if (y + rowH > doc.page.height - 50) {
          doc.addPage();
          y = 40;
          drawAttHeader(y, datesToShow);
          y += headerH;
        }

        const bg = i % 2 === 0 ? zebraBg : undefined;
        drawCell(doc, tableLeft, y, nameColW, rowH, student.name, { bg, bold: true });

        let x = tableLeft + nameColW;
        for (const d of datesToShow) {
          const status = student.byDate[d];
          if (status) {
            const label = statusLabel[status] || "-";
            const color = status === "PRESENT" ? "#059669" : status === "ABSENT" ? "#dc2626" : status === "LATE" ? "#d97706" : "#2563eb";
            drawCell(doc, x, y, dateColW, rowH, label, { bg, fg: color, bold: true, align: "center" });
          } else {
            drawCell(doc, x, y, dateColW, rowH, "-", { bg, fg: "#94a3b8", align: "center" });
          }
          x += dateColW;
        }

        const rate = student.total > 0 ? Math.round(((student.present + student.late) / student.total) * 100) : 0;
        const rateFg = rate >= 80 ? "#059669" : rate >= 60 ? "#d97706" : "#dc2626";
        drawCell(doc, x, y, rateColW, rowH, `${rate}%`, { bg, fg: rateFg, bold: true, align: "center" });
        y += rowH;
      }
    }

    // ── Summary page ──
    doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").fill("#1e293b").text("Resumen General de Asistencia", tableLeft);
    doc.moveDown(0.5);

    const sCols = [160, 50, 55, 55, 55, 60, 55];
    const sLabels = ["Estudiante", "Total", "Presente", "Ausente", "Tardanza", "Excusado", "% Asis."];
    let sy = doc.y;

    // Summary header helper
    function drawSummaryHeader(atY) {
      let sx = tableLeft;
      for (let c = 0; c < sCols.length; c++) {
        drawCell(doc, sx, atY, sCols[c], headerH, sLabels[c], { bg: headerBg, fg: headerFg, bold: true, align: c === 0 ? "left" : "center" });
        sx += sCols[c];
      }
    }
    drawSummaryHeader(sy);
    sy += headerH;

    // Summary rows
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (sy + rowH > doc.page.height - 50) {
        doc.addPage();
        sy = 40;
        drawSummaryHeader(sy);
        sy += headerH;
      }

      const bg = i % 2 === 0 ? zebraBg : undefined;
      let sx = tableLeft;
      drawCell(doc, sx, sy, sCols[0], rowH, s.name, { bg, bold: true });
      sx += sCols[0];
      drawCell(doc, sx, sy, sCols[1], rowH, `${s.total}`, { bg, align: "center" });
      sx += sCols[1];
      drawCell(doc, sx, sy, sCols[2], rowH, `${s.present}`, { bg, fg: "#059669", bold: true, align: "center" });
      sx += sCols[2];
      drawCell(doc, sx, sy, sCols[3], rowH, `${s.absent}`, { bg, fg: "#dc2626", bold: true, align: "center" });
      sx += sCols[3];
      drawCell(doc, sx, sy, sCols[4], rowH, `${s.late}`, { bg, fg: "#d97706", bold: true, align: "center" });
      sx += sCols[4];
      drawCell(doc, sx, sy, sCols[5], rowH, `${s.excused}`, { bg, fg: "#2563eb", bold: true, align: "center" });
      sx += sCols[5];

      const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
      const rateFg = rate >= 80 ? "#059669" : rate >= 60 ? "#d97706" : "#dc2626";
      drawCell(doc, sx, sy, sCols[6], rowH, `${rate}%`, { bg, fg: rateFg, bold: true, align: "center" });
      sy += rowH;
    }

    // ── Footer ──
    doc.fontSize(7).fill("#94a3b8").text("Generado automaticamente por ACCI Platform", tableLeft, doc.page.height - 30, { align: "center", width: doc.page.width - 80 });

    doc.end();
  } catch (err) {
    next(err);
  }
});

// ===== GET /student/:studentId — Student attendance history =====
router.get("/student/:studentId", authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId, studentId } = req.params;
    const { role, sub } = req.user;

    // Students can only see their own attendance
    if (role === "STUDENT" && sub !== studentId) {
      return res.status(403).json({ message: "Sin permisos" });
    }

    const attendance = await prisma.attendance.findMany({
      where: { courseId, studentId },
      orderBy: { date: "desc" },
    });

    return res.json({ attendance });
  } catch (err) {
    next(err);
  }
});

export default router;
