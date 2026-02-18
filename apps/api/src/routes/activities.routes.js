import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { authRequired, requireRole } from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma.js";
import { audit, getIp } from "../utils/audit.js";
import { env } from "../config/env.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { access, mkdir } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router({ mergeParams: true });

// ===== File upload config =====
const uploadsDir = path.resolve(__dirname, "../../uploads");
(async () => {
  try { await access(uploadsDir); } catch { await mkdir(uploadsDir, { recursive: true }); }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".zip"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error("Tipo de archivo no permitido"));
  },
});

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
const questionOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
  order: z.number().int().default(0),
});

const questionSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "MULTIPLE_ANSWERS", "TRUE_FALSE", "OPEN_ENDED"]),
  text: z.string().min(1),
  order: z.number().int().default(0),
  points: z.number().positive().default(1),
  options: z.array(questionOptionSchema).optional(),
});

const activitySchema = z.object({
  type: z.enum(["QUIZ", "TASK", "MATERIAL"]),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  order: z.number().int().default(0),
  dueDate: z.string().nullable().optional(),
  isPublished: z.boolean().default(false),
  showScore: z.boolean().default(true),
  showAnswers: z.boolean().default(false),
  timeLimit: z.number().int().positive().nullable().optional(),
  maxAttempts: z.number().int().min(0).default(1),
  questions: z.array(questionSchema).optional(),
});

const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string().optional(),
      selectedOptionIds: z.array(z.string()).optional(),
      answerText: z.string().optional(),
    })
  ),
});

const submitTaskSchema = z.object({
  content: z.string().optional(),
});

const gradeSchema = z.object({
  grade: z.number().min(0).max(10),
  feedback: z.string().optional(),
});

// ===== GET / — List activities =====
router.get("/", authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { role, sub } = req.user;
    const { page: pageQ, limit: limitQ } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 20), 100);
    const skip = (page - 1) * limit;

    const where = { courseId };
    if (role === "STUDENT") {
      where.isPublished = true;
      where.isActive = true;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          _count: { select: { questions: true, submissions: true } },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    // For students, attach whether they have submitted each activity
    if (role === "STUDENT") {
      const activityIds = activities.map((a) => a.id);
      const submissions = await prisma.submission.findMany({
        where: { studentId: sub, activityId: { in: activityIds } },
        select: { activityId: true, grade: true },
      });
      const submittedMap = {};
      for (const s of submissions) {
        submittedMap[s.activityId] = { submitted: true, graded: s.grade !== null };
      }
      for (const act of activities) {
        act.studentStatus = submittedMap[act.id] || { submitted: false, graded: false };
      }
    }

    return res.json({ activities, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ===== GET /:activityId — Activity detail =====
router.get("/:activityId", authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const { role, sub } = req.user;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: { orderBy: { order: "asc" } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!activity || activity.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    if (role === "STUDENT" && (!activity.isPublished || !activity.isActive)) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    // For students: strip isCorrect from options if showAnswers is false
    if (role === "STUDENT" && !activity.showAnswers) {
      activity.questions = activity.questions.map((q) => ({
        ...q,
        options: q.options.map(({ isCorrect, ...opt }) => opt),
      }));
    }

    // Attach student's submissions (latest first)
    let submissions = [];
    let submission = null;
    if (role === "STUDENT") {
      submissions = await prisma.submission.findMany({
        where: { activityId, studentId: sub },
        include: {
          answers: {
            include: { selectedOption: true },
          },
        },
        orderBy: { attempt: "desc" },
      });
      submission = submissions[0] || null;
    }

    const attemptCount = submissions.length;
    const canRetry = activity.maxAttempts === 0 || attemptCount < activity.maxAttempts;

    return res.json({ activity, submission, submissions, attemptCount, canRetry });
  } catch (err) {
    next(err);
  }
});

// ===== POST / — Create activity =====
router.post("/", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    }

    const { type, title, description, order, dueDate, isPublished, showScore, showAnswers, timeLimit, maxAttempts, questions } = parsed.data;

    const activity = await prisma.activity.create({
      data: {
        courseId: req.params.courseId,
        type,
        title,
        description,
        order,
        dueDate: dueDate ? new Date(dueDate) : null,
        isPublished,
        showScore,
        showAnswers,
        timeLimit: type === "QUIZ" ? timeLimit : null,
        maxAttempts: type === "QUIZ" ? (maxAttempts ?? 1) : 1,
        questions: type === "QUIZ" && questions?.length
          ? {
              create: questions.map((q) => ({
                type: q.type,
                text: q.text,
                order: q.order,
                points: q.points,
                options: q.options?.length
                  ? { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })) }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
});

// ===== PUT /:activityId — Update activity =====
router.put("/:activityId", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId } = req.params;

    const existing = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!existing || existing.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    }

    const { type, title, description, order, dueDate, isPublished, showScore, showAnswers, timeLimit, maxAttempts, questions } = parsed.data;

    const activity = await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { activityId } });

      return tx.activity.update({
        where: { id: activityId },
        data: {
          type,
          title,
          description,
          order,
          dueDate: dueDate ? new Date(dueDate) : null,
          isPublished,
          showScore,
          showAnswers,
          timeLimit: type === "QUIZ" ? timeLimit : null,
          maxAttempts: type === "QUIZ" ? (maxAttempts ?? 1) : 1,
          questions: type === "QUIZ" && questions?.length
            ? {
                create: questions.map((q) => ({
                  type: q.type,
                  text: q.text,
                  order: q.order,
                  points: q.points,
                  options: q.options?.length
                    ? { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })) }
                    : undefined,
                })),
              }
            : undefined,
        },
        include: {
          questions: {
            include: { options: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    return res.json({ activity });
  } catch (err) {
    next(err);
  }
});

// ===== PATCH /:activityId/publish — Toggle publish =====
router.patch("/:activityId/publish", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId } = req.params;

    const existing = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!existing || existing.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: { isPublished: !existing.isPublished },
      select: { id: true, title: true, isPublished: true },
    });

    return res.json({
      activity,
      message: activity.isPublished ? "Actividad publicada" : "Actividad despublicada",
    });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /:activityId — Delete activity =====
router.delete("/:activityId", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId } = req.params;

    const existing = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!existing || existing.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    await prisma.activity.delete({ where: { id: activityId } });
    return res.json({ message: "Actividad eliminada" });
  } catch (err) {
    next(err);
  }
});

// ===== POST /:activityId/upload — Upload file for material =====
router.post("/:activityId/upload", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, upload.single("file"), async (req, res, next) => {
  try {
    const { activityId } = req.params;

    const existing = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!existing || existing.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó archivo" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: { fileUrl },
    });

    return res.json({ activity, fileUrl });
  } catch (err) {
    next(err);
  }
});

// ===== POST /:activityId/start — Issue a signed start token for a timed quiz =====
router.post("/:activityId/start", authRequired, requireRole("STUDENT"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const studentId = req.user.sub;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, courseId: true, type: true, isPublished: true, isActive: true, maxAttempts: true, timeLimit: true },
    });

    if (!activity || activity.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }
    if (!activity.isPublished || !activity.isActive) {
      return res.status(400).json({ message: "Actividad no disponible" });
    }
    if (activity.type !== "QUIZ") {
      return res.status(400).json({ message: "Solo disponible para quizzes" });
    }

    // Check attempts remaining
    const existingCount = await prisma.submission.count({ where: { activityId, studentId } });
    if (activity.maxAttempts > 0 && existingCount >= activity.maxAttempts) {
      return res.status(409).json({ message: `Has alcanzado el máximo de ${activity.maxAttempts} intento(s)` });
    }

    // Sign a start token — expires with enough margin to cover the time limit
    const expiresIn = activity.timeLimit ? `${activity.timeLimit * 60 + 120}s` : "24h";
    const startToken = jwt.sign(
      { activityId, studentId, startedAt: Date.now() },
      env.JWT_ACCESS_SECRET,
      { expiresIn }
    );

    return res.json({ startToken, timeLimit: activity.timeLimit });
  } catch (err) {
    next(err);
  }
});

// ===== POST /:activityId/submit — Submit quiz or task =====
router.post("/:activityId/submit", authRequired, requireRole("STUDENT"), verifyCourseAccess, upload.single("file"), async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const studentId = req.user.sub;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!activity || activity.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    if (!activity.isPublished || !activity.isActive) {
      return res.status(400).json({ message: "Actividad no disponible" });
    }

    if (activity.type === "MATERIAL") {
      return res.status(400).json({ message: "No se puede enviar un material" });
    }

    // Validate start token for timed quizzes
    if (activity.type === "QUIZ" && activity.timeLimit) {
      const { startToken } = req.body;
      if (!startToken) {
        return res.status(400).json({ message: "Token de inicio requerido para quizzes con tiempo límite" });
      }
      try {
        const decoded = jwt.verify(startToken, env.JWT_ACCESS_SECRET);
        if (decoded.activityId !== activityId || decoded.studentId !== studentId) {
          return res.status(400).json({ message: "Token de inicio inválido" });
        }
        const elapsedSeconds = (Date.now() - decoded.startedAt) / 1000;
        const limitSeconds = activity.timeLimit * 60;
        if (elapsedSeconds > limitSeconds + 30) { // 30 seconds grace period
          return res.status(400).json({ message: `Tiempo límite superado (${activity.timeLimit} min)` });
        }
      } catch {
        return res.status(400).json({ message: "Token de inicio inválido o expirado" });
      }
    }

    if (activity.type === "QUIZ") {
      const parsed = submitQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
      }

      const { answers } = parsed.data;

      // Auto-grade (pure computation — done before transaction to minimize lock time)
      let grade = 0;
      let maxGrade = 0;
      const answerData = [];

      for (const question of activity.questions) {
        maxGrade += question.points;
        const studentAnswer = answers.find((a) => a.questionId === question.id);

        if (question.type === "OPEN_ENDED") {
          answerData.push({
            questionId: question.id,
            answerText: studentAnswer?.answerText || "",
            isCorrect: null,
          });
        } else if (question.type === "MULTIPLE_ANSWERS") {
          const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
          const selectedIds = (studentAnswer?.selectedOptionIds || []).slice().sort();
          const isCorrect = correctIds.length === selectedIds.length && correctIds.every((id, idx) => id === selectedIds[idx]);

          if (isCorrect) grade += question.points;

          answerData.push({
            questionId: question.id,
            selectedOptionIds: JSON.stringify(studentAnswer?.selectedOptionIds || []),
            isCorrect,
          });
        } else {
          const correctOption = question.options.find((o) => o.isCorrect);
          const selectedOptionId = studentAnswer?.selectedOptionId || null;
          const isCorrect = correctOption && selectedOptionId === correctOption.id;

          if (isCorrect) grade += question.points;

          answerData.push({
            questionId: question.id,
            selectedOptionId,
            isCorrect,
          });
        }
      }

      // Atomic: count + create inside transaction to prevent race conditions
      let submission;
      try {
        submission = await prisma.$transaction(async (tx) => {
          const existingCount = await tx.submission.count({ where: { activityId, studentId } });
          if (activity.maxAttempts > 0 && existingCount >= activity.maxAttempts) {
            const err = new Error(`Has alcanzado el máximo de ${activity.maxAttempts} intento(s)`);
            err.status = 409;
            throw err;
          }
          return tx.submission.create({
            data: {
              activityId,
              studentId,
              attempt: existingCount + 1,
              grade,
              maxGrade,
              answers: { create: answerData },
            },
            include: {
              answers: { include: { selectedOption: true } },
            },
          });
        });
      } catch (txErr) {
        if (txErr.status === 409) {
          return res.status(409).json({ message: txErr.message });
        }
        throw txErr;
      }

      return res.status(201).json({ submission });
    }

    // TASK submission — supports text content + optional file
    const content = req.body?.content || null;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!content && !fileUrl) {
      return res.status(400).json({ message: "Debes escribir un texto o adjuntar un archivo" });
    }

    // Atomic: count + create inside transaction to prevent race conditions
    let submission;
    try {
      submission = await prisma.$transaction(async (tx) => {
        const existingCount = await tx.submission.count({ where: { activityId, studentId } });
        if (activity.maxAttempts > 0 && existingCount >= activity.maxAttempts) {
          const err = new Error(`Has alcanzado el máximo de ${activity.maxAttempts} intento(s)`);
          err.status = 409;
          throw err;
        }
        return tx.submission.create({
          data: {
            activityId,
            studentId,
            attempt: existingCount + 1,
            content,
            fileUrl,
          },
        });
      });
    } catch (txErr) {
      if (txErr.status === 409) {
        return res.status(409).json({ message: txErr.message });
      }
      throw txErr;
    }

    return res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
});

// ===== GET /:activityId/submissions — List submissions (TEACHER) =====
router.get("/:activityId/submissions", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId } = req.params;

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity || activity.courseId !== req.params.courseId) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    const { page: pageQ, limit: limitQ } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 50), 200);
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { activityId },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ submittedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: { activityId } }),
    ]);

    return res.json({ submissions, activity, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ===== GET /:activityId/submissions/:submissionId — Submission detail =====
router.get("/:activityId/submissions/:submissionId", authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId, submissionId } = req.params;
    const { role, sub } = req.user;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        gradedBy: { select: { id: true, fullName: true } },
        answers: {
          include: {
            question: {
              include: { options: true },
            },
            selectedOption: true,
          },
        },
        activity: true,
      },
    });

    if (!submission || submission.activityId !== activityId) {
      return res.status(404).json({ message: "Envío no encontrado" });
    }

    if (role === "STUDENT" && submission.studentId !== sub) {
      return res.status(403).json({ message: "Sin permisos" });
    }

    return res.json({ submission });
  } catch (err) {
    next(err);
  }
});

// ===== PATCH /:activityId/submissions/:submissionId/grade — Grade submission =====
router.patch("/:activityId/submissions/:submissionId/grade", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId, submissionId } = req.params;

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.activityId !== activityId) {
      return res.status(404).json({ message: "Envío no encontrado" });
    }

    const parsed = gradeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: parsed.data.grade,
        feedback: parsed.data.feedback,
        gradedAt: new Date(),
        gradedById: req.user.sub,
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        gradedBy: { select: { id: true, fullName: true } },
      },
    });

    await audit({ userId: req.user.sub, action: "SUBMISSION_GRADED", entity: "Submission", entityId: submissionId, detail: { grade: parsed.data.grade, studentId: submission.studentId, studentName: updated.student.fullName, activityId }, ip: getIp(req) });

    return res.json({ submission: updated });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /:activityId/submissions/:submissionId/reset — Teacher reset submission =====
router.delete("/:activityId/submissions/:submissionId/reset", authRequired, requireRole("TEACHER", "ADMIN"), verifyCourseAccess, async (req, res, next) => {
  try {
    const { activityId, submissionId } = req.params;

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.activityId !== activityId) {
      return res.status(404).json({ message: "Envío no encontrado" });
    }

    await prisma.submission.delete({ where: { id: submissionId } });
    return res.json({ message: "Envío reseteado, el estudiante puede reintentar" });
  } catch (err) {
    next(err);
  }
});

export default router;
