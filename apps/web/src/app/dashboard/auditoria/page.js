import { cookies } from "next/headers";
import Link from "next/link";

const API_URL = process.env.API_URL || "http://localhost:4000";

export default async function AuditoriaPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

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

  const dashRes = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const dashData = await dashRes.json().catch(() => null);

  if (dashData?.role !== "ADMIN") {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Acceso denegado</div>
        <Link href="/dashboard" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const metrics = dashData.metrics || {};

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
        ← Volver al dashboard
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-blue-500/25 via-cyan-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 to-cyan-600" />

        <div className="relative p-7 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Auditoría y seguridad</h1>
            <p className="text-sm text-slate-400 mt-1">Sesiones activas y control de accesos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs font-semibold text-slate-400">Sesiones activas</div>
              <div className="text-3xl font-extrabold text-white mt-2">{metrics.sessionsActive ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">Refresh tokens vigentes</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs font-semibold text-slate-400">Usuarios activos</div>
              <div className="text-3xl font-extrabold text-white mt-2">{metrics.activeUsers ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">Cuentas habilitadas</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs font-semibold text-slate-400">Total usuarios</div>
              <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalUsers ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">Registrados en plataforma</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">
              El sistema implementa autenticación JWT con refresh tokens, RBAC por roles, y cookies httpOnly para mayor seguridad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
