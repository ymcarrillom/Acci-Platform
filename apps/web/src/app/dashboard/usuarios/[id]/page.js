import { cookies } from 'next/headers';
import Link from 'next/link';
import UserActions from './UserActions';

const API_URL = process.env.API_URL || 'http://localhost:4000';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function RoleBadge({ role }) {
  const styles = {
    ADMIN: 'bg-blue-500/15 text-blue-200 border-blue-400/20',
    TEACHER: 'bg-sky-500/15 text-sky-200 border-sky-400/20',
    STUDENT: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20',
  };
  const labels = {
    ADMIN: 'Coordinador',
    TEACHER: 'Instructor',
    STUDENT: 'Estudiante',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        styles[role] || styles.STUDENT
      }`}
    >
      {labels[role] || role}
    </span>
  );
}

export default async function UserDetailPage({ params }) {
  const { id } = await params;
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

  // Fetch user detail + role in parallel
  const [userRes, dashRes] = await Promise.all([
    fetch(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
    fetch(`${API_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
  ]);

  const userData = await userRes.json().catch(() => null);
  const dashData = await dashRes.json().catch(() => null);
  const role = dashData?.role;
  const user = userData?.user;

  if (role !== 'ADMIN') {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sin permisos</div>
        <Link
          href="/dashboard"
          className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/usuarios"
          className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver a usuarios
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Usuario no encontrado</div>
          <p className="text-slate-200/80 mt-2">El usuario no existe o no tienes acceso.</p>
        </div>
      </div>
    );
  }

  const coursesTeaching = user.coursesTeaching || [];
  const coursesEnrolled = (user.coursesEnrolled || []).map((e) => ({
    ...e.course,
    enrolledAt: e.enrolledAt,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/usuarios"
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver a usuarios
      </Link>

      {/* User info panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/35 via-indigo-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white">{user.fullName}</h1>
              <p className="mt-1 text-sm font-medium text-slate-200/70">{user.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <RoleBadge role={user.role} />
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                  user.isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                    : 'bg-red-500/15 text-red-300 border border-red-400/20'
                }`}
              >
                {user.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Rol</div>
              <div className="mt-1 text-sm font-bold text-white">
                {{ ADMIN: 'Coordinador', TEACHER: 'Instructor', STUDENT: 'Estudiante' }[
                  user.role
                ] || user.role}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Fecha de creación</div>
              <div className="mt-1 text-sm font-bold text-white">{formatDate(user.createdAt)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Última actualización</div>
              <div className="mt-1 text-sm font-bold text-white">{formatDate(user.updatedAt)}</div>
            </div>
          </div>

          {/* Admin actions */}
          <div className="mt-5">
            <UserActions userId={user.id} isActive={user.isActive} />
          </div>
        </div>
      </div>

      {/* Courses teaching — TEACHER */}
      {user.role === 'TEACHER' && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/25 via-blue-500/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
          <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

          <div className="relative p-7">
            <h2 className="text-lg font-extrabold text-white">
              Cursos que enseña ({coursesTeaching.length})
            </h2>

            <div className="mt-4">
              {coursesTeaching.length === 0 ? (
                <p className="text-sm font-medium text-slate-200/60">No tiene cursos asignados.</p>
              ) : (
                <div className="space-y-2">
                  {coursesTeaching.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/cursos/${c.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
                    >
                      <div>
                        <span className="text-xs font-bold text-sky-300/80">{c.code}</span>
                        <span className="ml-2 text-sm font-bold text-white">{c.name}</span>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          c.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                            : 'bg-red-500/15 text-red-300 border border-red-400/20'
                        }`}
                      >
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Courses enrolled — STUDENT */}
      {user.role === 'STUDENT' && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-emerald-500/25 via-sky-500/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-green-600" />

          <div className="relative p-7">
            <h2 className="text-lg font-extrabold text-white">
              Cursos inscritos ({coursesEnrolled.length})
            </h2>

            <div className="mt-4">
              {coursesEnrolled.length === 0 ? (
                <p className="text-sm font-medium text-slate-200/60">
                  No está inscrito en ningún curso.
                </p>
              ) : (
                <div className="space-y-2">
                  {coursesEnrolled.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/cursos/${c.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
                    >
                      <div>
                        <span className="text-xs font-bold text-sky-300/80">{c.code}</span>
                        <span className="ml-2 text-sm font-bold text-white">{c.name}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Inscrito {formatDate(c.enrolledAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
