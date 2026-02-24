import { cookies } from 'next/headers';
import Link from 'next/link';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export default async function ReportesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
        <a
          href="/acceso"
          className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Ir a /acceso
        </a>
      </div>
    );
  }

  const dashRes = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const dashData = await dashRes.json().catch(() => null);

  if (dashData?.role !== 'ADMIN') {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Acceso denegado</div>
        <Link
          href="/dashboard"
          className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  // Fetch additional report data
  const [coursesRes, usersRes] = await Promise.all([
    fetch(`${API_URL}/courses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
    fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
  ]);

  const coursesData = await coursesRes.json().catch(() => ({ courses: [] }));
  const usersData = await usersRes.json().catch(() => ({ users: [] }));
  const courses = coursesData.courses || [];
  const users = usersData.users || [];

  const metrics = dashData.metrics || {};
  const students = users.filter((u) => u.role === 'STUDENT');
  const teachers = users.filter((u) => u.role === 'TEACHER');

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver al dashboard
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-cyan-500/25 via-blue-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-cyan-500 to-blue-600" />

        <div className="relative p-7 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Reportes institucionales</h1>
            <p className="text-sm text-slate-400 mt-1">Visión general de actividad y progreso</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400">Usuarios</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {metrics.totalUsers ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400">Estudiantes</div>
              <div className="text-2xl font-extrabold text-emerald-300 mt-1">{students.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400">Profesores</div>
              <div className="text-2xl font-extrabold text-sky-300 mt-1">{teachers.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400">Cursos</div>
              <div className="text-2xl font-extrabold text-violet-300 mt-1">
                {metrics.totalCourses ?? 0}
              </div>
            </div>
          </div>

          {/* Courses summary */}
          {courses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400">Cursos activos</h2>
              <div className="space-y-2">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{c.name}</div>
                      <div className="text-xs text-slate-400">
                        {c.code} | Profesor: {c.teacher?.fullName || '-'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {c._count?.enrollments ?? 0} inscritos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
