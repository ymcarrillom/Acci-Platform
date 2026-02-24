import { cookies } from 'next/headers';
import Link from 'next/link';

const API_URL = process.env.API_URL || 'http://localhost:4000';

const typeConfig = {
  QUIZ: { label: 'Quiz', color: 'bg-violet-500/15 text-violet-300 border-violet-400/20' },
  TASK: { label: 'Tarea', color: 'bg-amber-500/15 text-amber-300 border-amber-400/20' },
  MATERIAL: { label: 'Material', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20' },
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function ActividadesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
      </div>
    );
  }

  // Get user's courses, then fetch activities for each
  const coursesRes = await fetch(`${API_URL}/courses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const coursesData = await coursesRes.json().catch(() => null);
  const courses = coursesData?.courses || [];

  const allActivities = [];
  for (const course of courses) {
    const activitiesRes = await fetch(`${API_URL}/courses/${course.id}/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const activitiesData = await activitiesRes.json().catch(() => null);
    const activities = activitiesData?.activities || [];
    for (const act of activities) {
      allActivities.push({ ...act, courseName: course.name, courseId: course.id });
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/25 via-sky-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white mb-6">
            Todas las actividades ({allActivities.length})
          </h1>

          {allActivities.length === 0 ? (
            <p className="text-sm font-medium text-slate-200/60">No hay actividades disponibles.</p>
          ) : (
            <div className="space-y-2">
              {allActivities.map((act) => {
                const cfg = typeConfig[act.type] || typeConfig.MATERIAL;
                const done = act.studentStatus?.submitted;
                return (
                  <Link
                    key={act.id}
                    href={`/dashboard/cursos/${act.courseId}/actividades/${act.id}`}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-white/8 transition ${
                      done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-sm font-bold text-white truncate">{act.title}</span>
                        {!act.isPublished && (
                          <span className="inline-flex items-center rounded-full bg-slate-500/20 text-slate-400 border border-slate-400/20 px-2 py-0.5 text-[10px] font-bold">
                            Borrador
                          </span>
                        )}
                        {done && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Realizada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{act.courseName}</span>
                        {act.dueDate && <span>Entrega: {formatDate(act.dueDate)}</span>}
                      </div>
                    </div>
                    {done && (
                      <div className="shrink-0 ml-3 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <svg
                          className="w-5 h-5 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
