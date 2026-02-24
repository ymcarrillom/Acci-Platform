import { Router } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authRequired, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { storage } from '../utils/storage.js';
import multer from 'multer';
import path from 'path';
import { access, unlink, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router({ mergeParams: true });

// Limiter por usuario (no por IP) — cada docente tiene su propia cuota de 20 uploads/hora
// Se aplica DENTRO del router, después de authRequired, para que req.user.sub esté disponible
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  keyGenerator: (req) => req.user?.sub || ipKeyGenerator(req),
  message: { message: 'Limite de uploads alcanzado. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== Upload config (500MB limit) =====
const videosDir = path.resolve(__dirname, '../../uploads/recovery-videos');
// Ensure upload dir exists (runs once at startup, async IIFE)
(async () => {
  try {
    await access(videosDir);
  } catch {
    await mkdir(videosDir, { recursive: true });
  }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .mp4, .webm o .mov'));
    }
  },
});

// Multer error handler middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'El archivo excede el limite de 2GB' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
}

// ===== Middleware: verify course access =====
async function verifyCourseAccess(req, res, next) {
  try {
    const { courseId } = req.params;
    const { role, sub } = req.user;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    if (role === 'TEACHER' && course.teacherId !== sub) {
      return res.status(403).json({ message: 'Sin permisos' });
    }

    if (role === 'STUDENT') {
      const enrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: sub } },
      });
      if (!enrolled) {
        return res.status(403).json({ message: 'Sin permisos' });
      }
    }

    req.course = course;
    next();
  } catch (err) {
    next(err);
  }
}

// ===== Zod Schemas =====
const accessSchema = z.object({
  studentId: z.string().min(1),
  expiresAt: z
    .string()
    .min(1)
    .refine(
      (val) => {
        const d = new Date(val);
        return !isNaN(d.getTime()) && d > new Date();
      },
      { message: 'La fecha de expiracion debe ser una fecha futura valida' }
    ),
});

const toggleSchema = z.object({
  enabled: z.boolean(),
});

// ===== POST / — Upload recovery video (optionally assign student) =====
router.post(
  '/',
  authRequired,
  uploadLimiter, // keyed por userId — cada docente tiene su cuota independiente
  requireRole('TEACHER', 'ADMIN'),
  verifyCourseAccess,
  upload.single('video'),
  handleMulterError,
  async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const { sub } = req.user;

      if (!req.file) {
        return res.status(400).json({ message: 'Archivo de video requerido' });
      }

      const { title, description, studentId, expiresAt } = req.body;
      if (!title || !title.trim()) {
        await unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: 'El titulo es requerido' });
      }

      // If student is provided, verify enrollment
      if (studentId) {
        if (!expiresAt) {
          await unlink(req.file.path).catch(() => {});
          return res
            .status(400)
            .json({ message: 'Fecha de expiracion requerida al asignar estudiante' });
        }
        const enrolled = await prisma.courseEnrollment.findUnique({
          where: { courseId_studentId: { courseId, studentId } },
        });
        if (!enrolled) {
          await unlink(req.file.path).catch(() => {});
          return res.status(400).json({ message: 'El estudiante no esta inscrito en este curso' });
        }
      }

      // Move file to the configured storage backend (local disk or S3/R2)
      const storageKey = `recovery-videos/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const mimeTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
      const contentType = mimeTypes[ext] || 'video/mp4';

      try {
        await storage.saveUpload(req.file.path, storageKey, contentType);
      } catch (uploadErr) {
        await unlink(req.file.path).catch(() => {});
        return next(uploadErr);
      }

      const video = await prisma.recoveryVideo.create({
        data: {
          courseId,
          uploadedById: sub,
          title: title.trim(),
          description: description?.trim() || null,
          // Key is provider-agnostic; stream/signed-url endpoint resolves actual URL
          fileUrl: storageKey,
          // If student provided, create access grant in same transaction
          ...(studentId && expiresAt
            ? {
                accessGrants: {
                  create: {
                    studentId,
                    expiresAt: new Date(expiresAt),
                  },
                },
              }
            : {}),
        },
        include: {
          uploadedBy: { select: { id: true, fullName: true } },
          accessGrants: {
            include: { student: { select: { id: true, fullName: true, email: true } } },
          },
        },
      });

      return res.status(201).json({ video });
    } catch (err) {
      next(err);
    }
  }
);

// ===== GET / — List recovery videos =====
router.get('/', authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { role, sub } = req.user;
    const { page: pageQ, limit: limitQ } = req.query;
    const page = Math.max(1, parseInt(pageQ) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitQ) || 20), 100);
    const skip = (page - 1) * limit;

    if (role === 'STUDENT') {
      const studentWhere = {
        courseId,
        accessGrants: {
          some: {
            studentId: sub,
            enabled: true,
            expiresAt: { gt: new Date() },
          },
        },
      };
      const [videos, total] = await Promise.all([
        prisma.recoveryVideo.findMany({
          where: studentWhere,
          include: {
            uploadedBy: { select: { id: true, fullName: true } },
            accessGrants: {
              where: {
                studentId: sub,
                enabled: true,
                expiresAt: { gt: new Date() },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.recoveryVideo.count({ where: studentWhere }),
      ]);
      return res.json({ videos, total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    const adminWhere = { courseId };
    const [videos, total] = await Promise.all([
      prisma.recoveryVideo.findMany({
        where: adminWhere,
        include: {
          uploadedBy: { select: { id: true, fullName: true } },
          accessGrants: {
            include: { student: { select: { id: true, fullName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.recoveryVideo.count({ where: adminWhere }),
    ]);

    return res.json({ videos, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ===== GET /:videoId — Video detail =====
router.get('/:videoId', authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { role, sub } = req.user;

    const video = await prisma.recoveryVideo.findUnique({
      where: { id: videoId },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
        accessGrants: {
          include: { student: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    if (!video) {
      return res.status(404).json({ message: 'Video no encontrado' });
    }

    if (role === 'STUDENT') {
      const hasAccess = video.accessGrants.some(
        (g) => g.studentId === sub && g.enabled && new Date(g.expiresAt) > new Date()
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Sin acceso a este video' });
      }
    }

    return res.json({ video });
  } catch (err) {
    next(err);
  }
});

// ===== GET /:videoId/stream — Stream video file (range requests supported) =====
router.get('/:videoId/stream', authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { role, sub } = req.user;

    const video = await prisma.recoveryVideo.findUnique({
      where: { id: videoId },
      include: { accessGrants: true },
    });

    if (!video) {
      return res.status(404).json({ message: 'Video no encontrado' });
    }

    if (role === 'STUDENT') {
      const hasAccess = video.accessGrants.some(
        (g) => g.studentId === sub && g.enabled && new Date(g.expiresAt) > new Date()
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'Sin acceso a este video' });
      }
    }

    const ext = path.extname(video.fileUrl).toLowerCase();
    const mimeTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
    const contentType = mimeTypes[ext] || 'video/mp4';

    // S3/R2: redirect to a pre-signed URL (avoids proxying large files through the API)
    if (storage.type === 's3') {
      const signedUrl = await storage.getSignedUrl(video.fileUrl, { expiresIn: 3600 });
      return res.redirect(302, signedUrl);
    }

    // Local: stream directly with range request support
    let streamResult;
    try {
      streamResult = await storage.getStream(video.fileUrl, req.headers.range);
    } catch {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    if (streamResult.partial) {
      const chunkSize = streamResult.end - streamResult.start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${streamResult.start}-${streamResult.end}/${streamResult.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
    } else {
      res.writeHead(200, {
        'Content-Length': streamResult.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
    }

    streamResult.stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ message: 'Error streaming video' });
    });
    streamResult.stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// ===== PATCH /:videoId/viewed — Student marks video as viewed =====
router.patch('/:videoId/viewed', authRequired, verifyCourseAccess, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { sub } = req.user;

    const access = await prisma.recoveryVideoAccess.findUnique({
      where: { recoveryVideoId_studentId: { recoveryVideoId: videoId, studentId: sub } },
    });

    if (!access || !access.enabled || new Date(access.expiresAt) < new Date()) {
      return res.status(403).json({ message: 'Sin acceso a este video' });
    }

    const updated = await prisma.recoveryVideoAccess.update({
      where: { id: access.id },
      data: { viewedAt: new Date() },
    });

    return res.json({ access: updated, message: 'Video marcado como visto' });
  } catch (err) {
    next(err);
  }
});

// ===== DELETE /:videoId — Delete video + file =====
router.delete(
  '/:videoId',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { videoId } = req.params;

      const video = await prisma.recoveryVideo.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        return res.status(404).json({ message: 'Video no encontrado' });
      }

      // Delete from DB first, then storage — if DB fails, the file remains intact
      await prisma.recoveryVideo.delete({ where: { id: videoId } });

      await storage.delete(video.fileUrl);

      return res.json({ message: 'Video eliminado' });
    } catch (err) {
      next(err);
    }
  }
);

// ===== POST /:videoId/access — Grant access to student =====
router.post(
  '/:videoId/access',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { videoId } = req.params;

      const parsed = accessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.flatten() });
      }

      const { studentId, expiresAt } = parsed.data;

      const video = await prisma.recoveryVideo.findUnique({ where: { id: videoId } });
      if (!video) {
        return res.status(404).json({ message: 'Video no encontrado' });
      }

      const enrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: video.courseId, studentId } },
      });
      if (!enrolled) {
        return res.status(400).json({ message: 'El estudiante no esta inscrito en este curso' });
      }

      const access = await prisma.recoveryVideoAccess.upsert({
        where: { recoveryVideoId_studentId: { recoveryVideoId: videoId, studentId } },
        update: { enabled: true, expiresAt: new Date(expiresAt), viewedAt: null },
        create: {
          recoveryVideoId: videoId,
          studentId,
          expiresAt: new Date(expiresAt),
        },
        include: { student: { select: { id: true, fullName: true, email: true } } },
      });

      return res.status(201).json({ access });
    } catch (err) {
      next(err);
    }
  }
);

// ===== PATCH /:videoId/access/:accessId — Toggle enabled =====
router.patch(
  '/:videoId/access/:accessId',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { accessId } = req.params;

      const parsed = toggleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos' });
      }

      const access = await prisma.recoveryVideoAccess.update({
        where: { id: accessId },
        data: { enabled: parsed.data.enabled },
        include: { student: { select: { id: true, fullName: true, email: true } } },
      });

      return res.json({ access });
    } catch (err) {
      next(err);
    }
  }
);

// ===== DELETE /:videoId/access/:accessId — Remove access =====
router.delete(
  '/:videoId/access/:accessId',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  verifyCourseAccess,
  async (req, res, next) => {
    try {
      const { accessId } = req.params;

      await prisma.recoveryVideoAccess.delete({ where: { id: accessId } });

      return res.json({ message: 'Acceso eliminado' });
    } catch (err) {
      next(err);
    }
  }
);

// Videos never auto-delete — only the instructor can remove them manually.
export async function cleanupExpiredVideos() {}

export default router;
