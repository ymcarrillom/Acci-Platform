import { cookies } from "next/headers";
import Link from "next/link";

const API_URL = process.env.API_URL || "http://localhost:4000";

async function getCourses(token) {
  const r = await fetch(`${API_URL}/courses`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

async function getUserRole(token) {
  const r = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.role;
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isActive
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
          : "bg-red-500/15 text-red-300 border border-red-400/20"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CursosPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
        <p className="text-slate-200/80 mt-2">Vuelve a ingresar.</p>
        <a href="/acceso" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Ir a /acceso
        </a>
      </div>
    );
  }

  const [data, role] = await Promise.all([
    getCourses(accessToken),
    getUserRole(accessToken),
  ]);

  const courses = data?.courses || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Cursos</h1>
          <p className="mt-1 text-sm font-medium text-slate-200/70">
            {role === "ADMIN"
              ? "Gestiona todos los cursos de la plataforma."
              : role === "TEACHER"
              ? "Cursos asignados a tu cargo."
              : "Cursos en los que estás inscrito."}
          </p>
        </div>

        {role === "ADMIN" && (
          <Link
            href="/dashboard/cursos/nuevo"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-extrabold text-white hover:from-sky-400 hover:to-blue-500 transition"
          >
            + Crear curso
          </Link>
        )}
      </div>

      {/* Courses grid */}
      {courses.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-10 shadow-2xl text-center">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/30 via-blue-500/15 to-transparent" />
          <div className="relative">
            <div className="text-lg font-extrabold text-white">Sin cursos</div>
            <p className="mt-2 text-sm font-medium text-slate-200/70">
              {role === "ADMIN"
                ? "Crea tu primer curso para comenzar."
                : "No tienes cursos asignados aún."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/cursos/${course.id}`}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl transition hover:-translate-y-1 hover:shadow-3xl"
            >
              <div className="pointer-events-none absolute -inset-16 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/30 via-indigo-500/15 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
              <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

              <div className="relative p-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-sky-300/80">{course.code}</span>
                    <h3 className="mt-1 text-lg font-extrabold text-white truncate group-hover:text-sky-200 transition">
                      {course.name}
                    </h3>
                  </div>
                  <StatusBadge isActive={course.isActive} />
                </div>

                {course.description && (
                  <p className="text-sm font-medium text-slate-200/70 line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="space-y-1.5 text-xs font-semibold text-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Docente:</span>
                    <span className="text-slate-200/90">{course.teacher?.fullName || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Periodo:</span>
                    <span className="text-slate-200/90">
                      {formatDate(course.startDate)} - {formatDate(course.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Inscritos:</span>
                    <span className="text-slate-200/90">{course._count?.enrollments ?? 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
