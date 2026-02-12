"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/auth";

function roleLabel(role) {
  if (role === "TEACHER") return "Docente";
  if (role === "ADMIN") return "Coordinador";
  return "Estudiante";
}

function roleAccent(role) {
  if (role === "TEACHER") return "from-sky-500/25 via-indigo-500/10 to-transparent";
  if (role === "ADMIN") return "from-blue-500/25 via-slate-500/10 to-transparent";
  return "from-emerald-500/25 via-sky-500/10 to-transparent";
}

function getRedirectPath(role) {
  return "/dashboard";
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white font-bold">Cargando...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const role = (search.get("role") || "STUDENT").toUpperCase();
  const next = search.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "No se pudo iniciar sesión");
      
      // Guardar el rol en localStorage
      if (data.role) {
        auth.setTokens({ 
          accessToken: data.user?.accessToken || "",
          refreshToken: data.user?.refreshToken || "",
          role: data.role 
        });
      }
      
      // Redirigir según el rol
      const redirectPath = getRedirectPath(data.role || role);
      router.replace(redirectPath);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="relative rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur-xl p-7 shadow-2xl overflow-hidden">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${roleAccent(role)} opacity-70`} />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-extrabold text-white">Iniciar sesión</div>
                <p className="mt-1 text-sm text-slate-200/70">Usa tus credenciales ACCI.</p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                {roleLabel(role)}
              </span>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">Contraseña</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-extrabold text-white hover:from-sky-400 hover:to-blue-500 transition disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              <div className="text-xs text-slate-300/80 text-center">
                ¿Perfil equivocado?{" "}
                <a className="underline hover:text-white" href="/acceso">
                  Volver
                </a>
              </div>
            </form>

            <div className="mt-6 text-center text-[11px] text-slate-300/60">
              ACCI Platform · Academia de Crecimiento Cristiano Integral
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
