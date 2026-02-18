import { cookies } from "next/headers";
import Link from "next/link";
import CourseActions from "./CourseActions";
import EnrollmentManager from "./EnrollmentManager";
import ActivityList from "./actividades/ActivityList";
import RecoveryVideoManager from "./RecoveryVideoManager";

const API_URL = process.env.API_URL || "http://localhost:4000";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CourseDetailPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const raw = cookieStore.get("accessToken")?.value;
  const accessToken = raw ? decodeURIComponent(raw) : null;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
        <a href="/acceso" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Ir a /acceso
        </a>
      </div>
    );
  }

  // Fetch all data in parallel (students fetch returns 403 for STUDENT role — handled gracefully)
  const headers = { Authorization: `Bearer ${accessToken}` };
  const opts = { headers, cache: "no-store" };

  const [courseRes, dashRes, studentsRes, activitiesRes, recoveryRes] = await Promise.all([
    fetch(`${API_URL}/courses/${id}`, opts),
    fetch(`${API_URL}/dashboard`, opts),
    fetch(`${API_URL}/courses/${id}/students`, opts),
    fetch(`${API_URL}/courses/${id}/activities`, opts),
    fetch(`${API_URL}/courses/${id}/recovery-videos`, opts),
  ]);

  const [courseData, dashData, studentsData, activitiesData, recoveryData] = await Promise.all([
    courseRes.json().catch(() => null),
    dashRes.json().catch(() => null),
    studentsRes.ok ? studentsRes.json().catch(() => null) : null,
    activitiesRes.json().catch(() => null),
    recoveryRes.json().catch(() => null),
  ]);

  const role = dashData?.role;
  const course = courseData?.course;
  const students = (role === "ADMIN" || role === "TEACHER") ? (studentsData?.students || []) : [];
  const activities = activitiesData?.activities || [];
  const recoveryVideos = recoveryData?.videos || [];

  if (!course) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/cursos" className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
          ← Volver a cursos
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Curso no encontrado</div>
          <p className="text-slate-200/80 mt-2">El curso no existe o no tienes acceso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/cursos" className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
        ← Volver a cursos
      </Link>

      {/* Course info panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/35 via-indigo-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-bold text-sky-300/80">{course.code}</span>
              <h1 className="mt-1 text-2xl font-extrabold text-white">{course.name}</h1>
              {course.description && (
                <p className="mt-2 text-sm font-medium text-slate-200/70 max-w-2xl">
                  {course.description}
                </p>
              )}
            </div>

            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                course.isActive
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
                  : "bg-red-500/15 text-red-300 border border-red-400/20"
              }`}
            >
              {course.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Instructor</div>
              <div className="mt-1 text-sm font-bold text-white">{course.teacher?.fullName || "-"}</div>
              <div className="text-xs text-slate-300/60">{course.teacher?.email || ""}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Periodo</div>
              <div className="mt-1 text-sm font-bold text-white">
                {formatDate(course.startDate)} - {formatDate(course.endDate)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Inscritos</div>
              <div className="mt-1 text-sm font-bold text-white">{course._count?.enrollments ?? 0}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            {role === "ADMIN" && (
              <CourseActions courseId={course.id} isActive={course.isActive} />
            )}
            {(role === "TEACHER" || role === "ADMIN") && (
              <Link
                href={`/dashboard/cursos/${course.id}/asistencia`}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:shadow-sky-500/25 transition"
              >
                Tomar asistencia
              </Link>
            )}
            {(role === "TEACHER" || role === "ADMIN") && (
              <a
                href={`/api/courses/${course.id}/grades/export`}
                download
                className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition"
              >
                Exportar calificaciones (PDF)
              </a>
            )}
            {(role === "TEACHER" || role === "ADMIN") && (
              <a
                href={`/api/courses/${course.id}/attendance/export`}
                download
                className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition"
              >
                Exportar asistencia (PDF)
              </a>
            )}
            {(role === "TEACHER" || role === "ADMIN") && (
              <a
                href={`/api/courses/${course.id}/students/export`}
                download
                className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition"
              >
                Exportar estudiantes (PDF)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Activities panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/25 via-sky-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

        <div className="relative p-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-white">
              Actividades ({activities.length})
            </h2>
            {(role === "TEACHER" || role === "ADMIN") && (
              <Link
                href={`/dashboard/cursos/${id}/actividades/nueva`}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:shadow-violet-500/25 transition"
              >
                + Crear actividad
              </Link>
            )}
          </div>

          <ActivityList activities={activities} courseId={id} role={role} />
        </div>
      </div>

      {/* Recovery Videos panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-amber-500/25 via-orange-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-amber-500 to-orange-600" />

        <div className="relative p-7">
          <h2 className="text-lg font-extrabold text-white mb-4">
            {role === "STUDENT" ? "Clases por Recuperar" : "Clases de Recuperación"} ({recoveryVideos.length})
          </h2>

          <RecoveryVideoManager
            courseId={id}
            initialVideos={recoveryVideos}
            students={students}
            role={role}
          />
        </div>
      </div>

      {/* Students panel — ADMIN & TEACHER */}
      {(role === "ADMIN" || role === "TEACHER") && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-emerald-500/25 via-sky-500/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-green-600" />

          <div className="relative p-7">
            <h2 className="text-lg font-extrabold text-white">
              Estudiantes inscritos ({students.length})
            </h2>

            {role === "ADMIN" ? (
              <div className="mt-4">
                <EnrollmentManager courseId={course.id} initialStudents={students} />
              </div>
            ) : (
              /* TEACHER: read-only list */
              <div className="mt-4">
                {students.length === 0 ? (
                  <p className="text-sm font-medium text-slate-200/60">No hay estudiantes inscritos.</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-bold text-white">{s.fullName}</span>
                          <span className="ml-2 text-xs text-slate-300/70">{s.email}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Inscrito {formatDate(s.enrolledAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
