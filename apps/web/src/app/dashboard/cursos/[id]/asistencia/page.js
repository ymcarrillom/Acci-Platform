import { cookies } from "next/headers";
import Link from "next/link";
import AttendanceForm from "./AttendanceForm";

const API_URL = process.env.API_URL || "http://localhost:4000";

export default async function AttendancePage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesion no valida</div>
        <a href="/acceso" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Ir a /acceso
        </a>
      </div>
    );
  }

  // Fetch course, role, and students in parallel
  const [courseRes, dashRes, studentsRes, summaryRes] = await Promise.all([
    fetch(`${API_URL}/courses/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${API_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${API_URL}/courses/${id}/students`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${API_URL}/courses/${id}/attendance/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  ]);

  const courseData = await courseRes.json().catch(() => null);
  const dashData = await dashRes.json().catch(() => null);
  const studentsData = await studentsRes.json().catch(() => null);
  const summaryData = await summaryRes.json().catch(() => null);

  const role = dashData?.role;
  const course = courseData?.course;
  const students = studentsData?.students || [];
  const summary = summaryData?.summary || [];

  if (!course) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/cursos" className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
          &larr; Volver a cursos
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Curso no encontrado</div>
        </div>
      </div>
    );
  }

  if (role !== "TEACHER" && role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <Link href={`/dashboard/cursos/${id}`} className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
          &larr; Volver al curso
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Sin permisos</div>
          <p className="text-slate-200/80 mt-2">Solo docentes y administradores pueden gestionar la asistencia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/cursos/${id}`} className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
        &larr; Volver al curso
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold text-sky-300/80">{course.code}</span>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Asistencia — {course.name}</h1>
        </div>
        <a
          href={`/api/courses/${id}/attendance/export`}
          download
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition"
        >
          Exportar asistencia (PDF)
        </a>
      </div>

      {/* Attendance Form */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/35 via-indigo-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7">
          <h2 className="text-lg font-extrabold text-white mb-4">Registrar asistencia</h2>
          <AttendanceForm courseId={id} students={students} />
        </div>
      </div>

      {/* Summary Table */}
      {summary.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-emerald-500/25 via-sky-500/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-green-600" />

          <div className="relative p-7">
            <h2 className="text-lg font-extrabold text-white mb-4">
              Resumen de asistencia
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 text-xs font-bold text-slate-400">Estudiante</th>
                    <th className="text-center py-3 px-3 text-xs font-bold text-slate-400">Clases</th>
                    <th className="text-center py-3 px-3 text-xs font-bold text-emerald-400">Presentes</th>
                    <th className="text-center py-3 px-3 text-xs font-bold text-red-400">Ausentes</th>
                    <th className="text-center py-3 px-3 text-xs font-bold text-amber-400">Tardanzas</th>
                    <th className="text-center py-3 px-3 text-xs font-bold text-blue-400">Excusados</th>
                    <th className="text-center py-3 px-3 text-xs font-bold text-slate-400">% Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.student.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white">{row.student.fullName}</span>
                        <span className="ml-2 text-xs text-slate-400">{row.student.email}</span>
                      </td>
                      <td className="text-center py-3 px-3 text-white font-semibold">{row.total}</td>
                      <td className="text-center py-3 px-3 text-emerald-300 font-semibold">{row.present}</td>
                      <td className="text-center py-3 px-3 text-red-300 font-semibold">{row.absent}</td>
                      <td className="text-center py-3 px-3 text-amber-300 font-semibold">{row.late}</td>
                      <td className="text-center py-3 px-3 text-blue-300 font-semibold">{row.excused}</td>
                      <td className="text-center py-3 px-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          row.attendanceRate >= 80
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
                            : row.attendanceRate >= 60
                            ? "bg-amber-500/15 text-amber-300 border border-amber-400/20"
                            : "bg-red-500/15 text-red-300 border border-red-400/20"
                        }`}>
                          {row.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
