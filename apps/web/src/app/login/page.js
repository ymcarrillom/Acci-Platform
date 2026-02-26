'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function roleAccent(role) {
  if (role === 'TEACHER') return 'from-sky-500/25 via-indigo-500/10 to-transparent';
  if (role === 'ADMIN') return 'from-blue-500/25 via-slate-500/10 to-transparent';
  return 'from-emerald-500/25 via-sky-500/10 to-transparent';
}

const ROLE_LABELS = { STUDENT: 'Estudiante', TEACHER: 'Instructor', ADMIN: 'Coordinador' };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white font-bold">Cargando...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const role = (search.get('role') || 'STUDENT').toUpperCase();
  const next = search.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || 'No se pudo iniciar sesión');

      // Verificar que el rol del usuario coincida con el módulo seleccionado
      if (data.role && data.role !== role) {
        const expected = ROLE_LABELS[role] || role;
        throw new Error(
          `Este acceso es para ${expected}s. Selecciona el perfil correcto en la pantalla anterior.`,
        );
      }

      router.replace(next);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="relative rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur-xl p-7 shadow-2xl overflow-hidden">
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${roleAccent(role)} opacity-70`}
          />
          <div className="relative">
            {/* Sello institucional */}
            <div className="flex justify-center mb-5">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-lg ring-1 ring-white/10">
                <Image
                  src="/brand/iglesia.png"
                  alt="Iglesia ACCI"
                  fill
                  className="object-cover"
                  sizes="80px"
                  priority
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-extrabold text-white">Iniciar sesión</div>
                <p className="mt-1 text-sm font-semibold text-slate-200/70">
                  Usa tus credenciales ACCI.
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                {ROLE_LABELS[role] || 'Estudiante'}
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-200">Contraseña</label>
                  <Link
                    href="/olvide-contrasena"
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
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
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300/80">
                ¿Perfil equivocado?
                <a
                  href="/acceso"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/20 hover:text-white transition"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Volver
                </a>
              </div>
            </form>

            <div className="mt-6 text-center text-[11px] font-semibold text-slate-300/60">
              ACCI Platform · Academia de Crecimiento Cristiano Integral
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
