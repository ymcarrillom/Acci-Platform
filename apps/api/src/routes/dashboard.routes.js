import { Router } from 'express';
import { authRequired, requireRole } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Métricas del dashboard según el rol del usuario
 *     description: |
 *       Retorna métricas distintas por rol:
 *       - **ADMIN**: usuarios totales, sesiones activas, cursos, pendientes de calificación, actividades recientes
 *       - **TEACHER**: cursos asignados, estudiantes, pendientes de calificación, actividades recientes
 *       - **STUDENT**: progreso mensual, quizzes completados, cursos matriculados, asistencia
 *     responses:
 *       200:
 *         description: Métricas del dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role: { type: string, enum: [ADMIN, TEACHER, STUDENT] }
 *                 fullName: { type: string }
 *                 metrics: { type: object }
 *                 recentCourses: { type: array, items: { type: object } }
 *                 recentActivities: { type: array, items: { type: object } }
 *       401: { description: No autenticado }
 */
router.get('/', authRequired, async (req, res, next) => {
  try {
    const role = req.user.role;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { fullName: true },
    });
    const fullName = currentUser?.fullName || null;

    if (role === 'ADMIN') {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      const sessionsActive = await prisma.refreshToken.count();
      const totalCourses = await prisma.course.count({ where: { isActive: true } });

      // Recent courses for admin panel
      const recentCourses = await prisma.course.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          teacher: { select: { fullName: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Recent activities across all courses
      const recentActivities = await prisma.activity.findMany({
        where: { isActive: true, isPublished: true },
        select: {
          id: true,
          title: true,
          type: true,
          courseId: true,
          createdAt: true,
          course: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Pending grading across all courses
      const pendingGrading = await prisma.submission.count({
        where: { grade: null, activity: { isActive: true, type: { in: ['QUIZ', 'TASK'] } } },
      });

      // Total published activities
      const totalActivities = await prisma.activity.count({
        where: { isActive: true, isPublished: true },
      });

      return res.json({
        role,
        fullName,
        metrics: {
          totalUsers,
          activeUsers,
          sessionsActive,
          totalCourses,
          pendingGrading,
          totalActivities,
        },
        recentCourses,
        recentActivities,
      });
    }

    if (role === 'TEACHER') {
      const teacherCourseIds = (
        await prisma.course.findMany({
          where: { teacherId: req.user.sub, isActive: true },
          select: { id: true },
        })
      ).map((c) => c.id);

      const assignedCourses = teacherCourseIds.length;

      // All ungraded submissions (quizzes + tasks combined)
      const pendingGrading = await prisma.submission.count({
        where: {
          grade: null,
          activity: {
            courseId: { in: teacherCourseIds },
            type: { in: ['QUIZ', 'TASK'] },
          },
        },
      });

      // Total students enrolled in teacher's courses
      const totalStudents = await prisma.courseEnrollment.count({
        where: { courseId: { in: teacherCourseIds } },
      });

      // Total published activities in teacher's courses
      const totalActivities = await prisma.activity.count({
        where: {
          courseId: { in: teacherCourseIds },
          isPublished: true,
          isActive: true,
        },
      });

      // Recent courses for teacher panel
      const recentCourses = await prisma.course.findMany({
        where: { teacherId: req.user.sub, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Recent activities across teacher's courses
      const recentActivities = await prisma.activity.findMany({
        where: { courseId: { in: teacherCourseIds }, isActive: true, isPublished: true },
        select: {
          id: true,
          title: true,
          type: true,
          courseId: true,
          createdAt: true,
          course: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      return res.json({
        role,
        fullName,
        metrics: { assignedCourses, totalStudents, pendingGrading, totalActivities },
        recentCourses,
        recentActivities,
      });
    }

    // STUDENT
    const enrolledCourses = await prisma.courseEnrollment.count({
      where: { studentId: req.user.sub },
    });

    const quizzesDone = await prisma.submission.count({
      where: {
        studentId: req.user.sub,
        activity: { type: 'QUIZ' },
      },
    });

    // Progress: completed activities / total published activities in enrolled courses
    const enrolledCourseIds = (
      await prisma.courseEnrollment.findMany({
        where: { studentId: req.user.sub },
        select: { courseId: true },
      })
    ).map((e) => e.courseId);

    const totalActivities = await prisma.activity.count({
      where: {
        courseId: { in: enrolledCourseIds },
        isPublished: true,
        isActive: true,
        type: { in: ['QUIZ', 'TASK'] },
      },
    });

    const completedActivities = await prisma.submission.groupBy({
      by: ['activityId'],
      where: {
        studentId: req.user.sub,
        activity: {
          courseId: { in: enrolledCourseIds },
          isPublished: true,
          isActive: true,
        },
      },
    });

    const progress =
      totalActivities > 0 ? Math.round((completedActivities.length / totalActivities) * 100) : 0;

    // Attendance stats
    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId: req.user.sub, courseId: { in: enrolledCourseIds } },
      select: { status: true },
    });
    const attendanceTotal = attendanceRecords.length;
    const attendancePresent = attendanceRecords.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const attendancePct =
      attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : null;

    return res.json({
      role,
      fullName,
      metrics: {
        monthProgress: `${progress}%`,
        quizzesDone,
        enrolledCourses,
        attendancePct,
        attendancePresent,
        attendanceTotal,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== GET /pending-feedback — Ungraded submissions for teacher =====
router.get(
  '/pending-feedback',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const teacherCourseIds = (
        await prisma.course.findMany({
          where:
            req.user.role === 'ADMIN'
              ? { isActive: true }
              : { teacherId: req.user.sub, isActive: true },
          select: { id: true },
        })
      ).map((c) => c.id);

      const { page: pageQ, limit: limitQ } = req.query;
      const page = Math.max(1, parseInt(pageQ) || 1);
      const limit = Math.min(Math.max(1, parseInt(limitQ) || 20), 100);
      const skip = (page - 1) * limit;

      const where = {
        grade: null,
        activity: {
          courseId: { in: teacherCourseIds },
          isActive: true,
        },
      };

      const [submissions, total] = await Promise.all([
        prisma.submission.findMany({
          where,
          include: {
            activity: {
              select: {
                id: true,
                title: true,
                type: true,
                courseId: true,
                course: { select: { name: true } },
              },
            },
            student: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.submission.count({ where }),
      ]);

      return res.json({ submissions, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      next(err);
    }
  }
);

// ===== GET /group-tracking/:courseId — Full tracking for a course =====
router.get(
  '/group-tracking/:courseId',
  authRequired,
  requireRole('TEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { courseId } = req.params;

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) return res.status(404).json({ message: 'Curso no encontrado' });
      if (req.user.role === 'TEACHER' && course.teacherId !== req.user.sub) {
        return res.status(403).json({ message: 'Sin permisos' });
      }

      // Enrolled students
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseId },
        include: { student: { select: { id: true, fullName: true, email: true } } },
      });
      const students = enrollments.map((e) => e.student);
      const studentIds = students.map((s) => s.id);

      // Attendance records
      const attendance = await prisma.attendance.findMany({
        where: { courseId, studentId: { in: studentIds } },
      });

      // Per-student attendance stats (indexed by studentId for O(1) lookup)
      const attendanceByStudent = {};
      for (const s of students) {
        attendanceByStudent[s.id] = { total: 0, present: 0, pct: null };
      }
      for (const a of attendance) {
        const entry = attendanceByStudent[a.studentId];
        if (!entry) continue;
        entry.total++;
        if (a.status === 'PRESENT' || a.status === 'LATE') entry.present++;
      }
      for (const s of students) {
        const entry = attendanceByStudent[s.id];
        entry.pct = entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : null;
      }

      // Graded submissions (for grade averages)
      const submissions = await prisma.submission.findMany({
        where: {
          studentId: { in: studentIds },
          activity: { courseId, isActive: true },
        },
        include: { activity: { select: { id: true, title: true, type: true } } },
      });

      // Per-student grade averages + pending (single pass)
      const gradesByStudent = {};
      const pendingByStudent = {};
      for (const s of students) {
        gradesByStudent[s.id] = { count: 0, sum: 0, avg: null };
        pendingByStudent[s.id] = 0;
      }
      for (const sub of submissions) {
        if (sub.grade !== null) {
          const entry = gradesByStudent[sub.studentId];
          if (entry) {
            entry.count++;
            entry.sum += sub.grade;
          }
        } else {
          if (pendingByStudent[sub.studentId] !== undefined) pendingByStudent[sub.studentId]++;
        }
      }
      for (const s of students) {
        const entry = gradesByStudent[s.id];
        entry.avg = entry.count > 0 ? Math.round(entry.sum / entry.count) : null;
      }

      // Build per-student summary
      const studentSummaries = students.map((s) => ({
        ...s,
        attendance: attendanceByStudent[s.id],
        grades: gradesByStudent[s.id],
        pending: pendingByStudent[s.id],
        risk:
          (attendanceByStudent[s.id].pct !== null && attendanceByStudent[s.id].pct < 60) ||
          (gradesByStudent[s.id].avg !== null && gradesByStudent[s.id].avg < 60),
      }));

      // Group averages
      const allGraded = submissions.filter((s) => s.grade !== null);
      const groupGradeAvg =
        allGraded.length > 0
          ? Math.round(allGraded.reduce((sum, s) => sum + s.grade, 0) / allGraded.length)
          : null;

      const allAttPcts = Object.values(attendanceByStudent)
        .filter((a) => a.pct !== null)
        .map((a) => a.pct);
      const groupAttendanceAvg =
        allAttPcts.length > 0
          ? Math.round(allAttPcts.reduce((a, b) => a + b, 0) / allAttPcts.length)
          : null;

      return res.json({
        course: { id: course.id, name: course.name },
        totalStudents: students.length,
        groupGradeAvg,
        groupAttendanceAvg,
        students: studentSummaries,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ===== GET /my-attendance — Student's own attendance across all courses =====
router.get('/my-attendance', authRequired, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const studentId = req.user.sub;

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId },
      include: { course: { select: { id: true, name: true, code: true } } },
    });

    const courseIds = enrollments.map((e) => e.course.id);

    const records = await prisma.attendance.findMany({
      where: { studentId, courseId: { in: courseIds } },
      orderBy: { date: 'desc' },
    });

    // Group by course
    const byCourse = {};
    for (const e of enrollments) {
      byCourse[e.course.id] = {
        course: e.course,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        records: [],
      };
    }

    for (const r of records) {
      const entry = byCourse[r.courseId];
      if (!entry) continue;
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'ABSENT') entry.absent++;
      else if (r.status === 'LATE') entry.late++;
      else if (r.status === 'EXCUSED') entry.excused++;
      entry.records.push({
        date: r.date,
        status: r.status,
        notes: r.notes || null,
      });
    }

    const courses = Object.values(byCourse).map((c) => ({
      ...c,
      pct: c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : null,
    }));

    // Global stats
    const totalAll = records.length;
    const presentAll = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const globalPct = totalAll > 0 ? Math.round((presentAll / totalAll) * 100) : null;

    return res.json({ globalPct, totalClasses: totalAll, presentClasses: presentAll, courses });
  } catch (err) {
    next(err);
  }
});

export default router;
