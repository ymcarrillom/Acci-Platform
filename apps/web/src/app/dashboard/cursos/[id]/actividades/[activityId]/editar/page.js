import { cookies } from 'next/headers';
import Link from 'next/link';
import ActivityForm from '../../ActivityForm';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export default async function EditarActividadPage({ params }) {
  const { id, activityId } = await params;
  const cookieStore = await cookies();
  const raw = cookieStore.get('accessToken')?.value;
  const accessToken = raw ? decodeURIComponent(raw) : null;

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

  const r = await fetch(`${API_URL}/courses/${id}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const data = await r.json().catch(() => null);
  const activity = data?.activity;

  if (!activity) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/cursos/${id}`}
          className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver al curso
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Actividad no encontrada</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/cursos/${id}`}
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver al curso
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/35 via-indigo-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white mb-6">Editar actividad</h1>
          <ActivityForm courseId={id} initial={activity} />
        </div>
      </div>
    </div>
  );
}
