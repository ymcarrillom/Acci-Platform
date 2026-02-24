'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || 'No se pudo procesar la solicitud');
      setSent(true);
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

            {sent ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-400/20">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-sky-400"
                      aria-hidden="true"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-base font-bold text-white">Revisa tu correo</p>
                  <p className="mt-2 text-sm font-medium text-slate-300/80">
                    Si el correo está registrado, recibirás un enlace para restablecer tu
                    contraseña. Puede tardar unos minutos.
                  </p>
                </div>
                <Link
                  href="/acceso"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-400 hover:text-sky-300 transition"
                >
                  <svg
                    width="14"
                    height="14"
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
                  Volver al inicio
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-lg font-extrabold text-white">Recuperar contraseña</div>
                  <p className="mt-1 text-sm font-semibold text-slate-200/70">
                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200">
                      Correo electrónico
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="tu@correo.com"
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
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300/80">
                    ¿Recordaste tu contraseña?
                    <Link
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
                    </Link>
                  </div>
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
