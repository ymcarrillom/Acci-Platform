'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white font-bold">Cargando...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || 'No se pudo restablecer la contraseña');
      setDone(true);
      setTimeout(() => router.replace('/acceso'), 3000);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-md text-center space-y-4">
          <p className="text-red-300 font-semibold">Enlace de recuperación inválido.</p>
          <Link href="/acceso" className="text-sky-400 hover:text-sky-300 text-sm font-semibold">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="relative rounded-3xl border border-white/10 bg-slate-950/45 backdrop-blur-xl p-7 shadow-2xl overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-transparent opacity-70" />
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

            {done ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-400"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-base font-bold text-white">Contraseña restablecida</p>
                  <p className="mt-2 text-sm font-medium text-slate-300/80">
                    Ya puedes iniciar sesión con tu nueva contraseña. Redirigiendo...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-lg font-extrabold text-white">Nueva contraseña</div>
                  <p className="mt-1 text-sm font-semibold text-slate-200/70">
                    Crea una contraseña segura de al menos 8 caracteres.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200">
                      Nueva contraseña
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200">
                      Confirmar contraseña
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type="password"
                      required
                      minLength={8}
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
                    {loading ? 'Guardando...' : 'Restablecer contraseña'}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center text-[11px] font-semibold text-slate-300/60">
              ACCI Platform · Academia de Crecimiento Cristiano Integral
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
