import { cookies } from 'next/headers';
import ProfileForm from './ProfileForm';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export default async function ConfiguracionPage() {
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

  const r = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const data = await r.json().catch(() => null);
  const user = data?.user;

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Error al cargar perfil</div>
      </div>
    );
  }

  const roleLabels = { STUDENT: 'Estudiante', TEACHER: 'Instructor', ADMIN: 'Coordinador' };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/25 via-indigo-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Mi perfil</h1>
            <p className="text-sm text-slate-400 mt-1">Gestiona tu información personal</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Email</div>
              <div className="mt-1 text-sm font-bold text-white">{user.email}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Rol</div>
              <div className="mt-1 text-sm font-bold text-white">
                {roleLabels[user.role] || user.role}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-slate-400">Estado</div>
              <div
                className={`mt-1 text-sm font-bold ${user.isActive ? 'text-emerald-300' : 'text-red-300'}`}
              >
                {user.isActive ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          </div>

          <ProfileForm />
        </div>
      </div>
    </div>
  );
}
