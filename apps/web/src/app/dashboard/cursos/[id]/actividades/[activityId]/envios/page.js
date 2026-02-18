import { cookies } from "next/headers";
import Link from "next/link";

const API_URL = process.env.API_URL || "http://localhost:4000";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function EnviosPage({ params }) {
  const { id, activityId } = await params;
  const cookieStore = await cookies();
  const raw = cookieStore.get("accessToken")?.value;
  const accessToken = raw ? decodeURIComponent(raw) : null;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
      </div>
    );
  }

  const r = await fetch(`${API_URL}/courses/${id}/activities/${activityId}/submissions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await r.json().catch(() => null);
  const submissions = data?.submissions || [];
  const activity = data?.activity;

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/cursos/${id}`} className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
        ← Volver al curso
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-amber-500/25 via-sky-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-amber-500 to-orange-600" />

        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white">
            Envíos: {activity?.title || "Actividad"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{submissions.length} envíos recibidos</p>

          {submissions.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-slate-200/60">No hay envíos todavía.</p>
          ) : (
            <div className="mt-6 space-y-2">
              {submissions.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/dashboard/cursos/${id}/actividades/${activityId}/envios/${sub.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition"
                >
                  <div>
                    <span className="text-sm font-bold text-white">{sub.student?.fullName}</span>
                    <span className="ml-2 text-xs text-slate-300/70">{sub.student?.email}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Enviado: {formatDate(sub.submittedAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {sub.grade != null ? (
                      <span className="text-sm font-bold text-emerald-300">
                        {sub.grade}/{sub.maxGrade || "-"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/20 px-2 py-0.5 text-xs font-bold">
                        Sin calificar
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
