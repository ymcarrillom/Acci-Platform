import { cookies } from "next/headers";
import Link from "next/link";

const API_URL = process.env.API_URL || "http://localhost:4000";

async function getPeriodos(token) {
  const r = await fetch(`${API_URL}/periodos`, {
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

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isActive
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
          : "bg-slate-500/15 text-slate-300 border border-slate-400/20"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

export default async function PeriodosPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesion no valida</div>
        <p className="text-slate-200/80 mt-2">Vuelve a ingresar.</p>
        <a href="/acceso" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Ir a /acceso
        </a>
      </div>
    );
  }

  const [data, role] = await Promise.all([
    getPeriodos(accessToken),
    getUserRole(accessToken),
  ]);

  if (role !== "ADMIN") {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sin permisos</div>
        <p className="text-slate-200/80 mt-2">Solo administradores pueden gestionar periodos.</p>
        <Link href="/dashboard" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const periodos = data?.periodos || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Periodos Academicos</h1>
          <p className="mt-1 text-sm font-medium text-slate-200/70">
            Gestiona los periodos academicos de la plataforma — {periodos.length} en total.
          </p>
        </div>

        <Link
          href="/dashboard/periodos/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-extrabold text-white hover:from-violet-400 hover:to-purple-500 transition"
        >
          + Crear periodo
        </Link>
      </div>

      {/* Periodos grid */}
      {periodos.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-10 shadow-2xl text-center">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/30 via-purple-500/15 to-transparent" />
          <div className="relative">
            <div className="text-lg font-extrabold text-white">Sin periodos</div>
            <p className="mt-2 text-sm font-medium text-slate-200/70">
              Crea tu primer periodo academico para comenzar.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {periodos.map((periodo) => (
            <Link
              key={periodo.id}
              href={`/dashboard/periodos/${periodo.id}`}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl transition hover:-translate-y-1 hover:shadow-3xl"
            >
              <div className="pointer-events-none absolute -inset-16 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/30 via-purple-500/15 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
              <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

              <div className="relative p-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-extrabold text-white truncate group-hover:text-violet-200 transition">
                    {periodo.name}
                  </h3>
                  <StatusBadge isActive={periodo.isActive} />
                </div>

                <div className="space-y-1.5 text-xs font-semibold text-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Inicio:</span>
                    <span className="text-slate-200/90">{formatDate(periodo.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Fin:</span>
                    <span className="text-slate-200/90">{formatDate(periodo.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Cursos:</span>
                    <span className="text-slate-200/90">{periodo._count?.courses ?? 0}</span>
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
