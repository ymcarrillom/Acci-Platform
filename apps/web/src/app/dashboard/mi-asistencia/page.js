'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const statusConfig = {
  PRESENT: { label: 'Presente', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ABSENT: { label: 'Ausente', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  LATE: { label: 'Tarde', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  EXCUSED: { label: 'Excusado', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function MiAsistenciaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/my-attendance')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-white/60 font-semibold">Cargando asistencia...</div>
      </div>
    );
  }

  if (!data || !data.courses) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sin datos de asistencia</div>
        <Link
          href="/dashboard"
          className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const { globalPct, totalClasses, presentClasses, courses } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header con stat global */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-emerald-500/55 via-sky-500/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-sky-500" />
        <div className="relative p-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-white">Mi asistencia</h1>
              <p className="mt-1 text-sm font-semibold text-slate-100/70">
                Registro de asistencia en todos tus cursos.
              </p>
            </div>
            <div className="text-center">
              <div
                className={`text-4xl font-black ${globalPct !== null && globalPct < 60 ? 'text-red-300' : 'text-emerald-300'}`}
              >
                {globalPct !== null ? `${globalPct}%` : '--'}
              </div>
              <div className="text-xs font-semibold text-slate-400 mt-1">
                {presentClasses} de {totalClasses} clases
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Por curso */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center">
          <div className="text-white font-bold">Sin cursos inscritos</div>
          <p className="text-sm text-slate-300/70 mt-1">
            Inscribete en un curso para ver tu asistencia.
          </p>
        </div>
      ) : (
        courses.map((c) => (
          <div
            key={c.course.id}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl"
          >
            <div className="pointer-events-none absolute -inset-20 opacity-30 blur-3xl bg-gradient-to-br from-sky-500/35 via-emerald-500/20 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
            <div className="relative p-7">
              {/* Curso header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Link
                    href={`/dashboard/cursos/${c.course.id}`}
                    className="text-sm font-extrabold text-white hover:text-sky-300 transition"
                  >
                    {c.course.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">{c.course.code}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-lg font-black ${c.pct !== null && c.pct < 60 ? 'text-red-300' : 'text-emerald-300'}`}
                  >
                    {c.pct !== null ? `${c.pct}%` : '--'}
                  </span>
                  <div className="text-[10px] text-slate-500">
                    {c.present + c.late}/{c.total} clases
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              {c.total > 0 && (
                <div className="w-full h-2 rounded-full bg-white/10 mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${c.pct >= 60 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${c.pct || 0}%` }}
                  />
                </div>
              )}

              {/* Stats mini */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Presente', val: c.present, cls: 'text-emerald-300' },
                  { label: 'Tarde', val: c.late, cls: 'text-amber-300' },
                  { label: 'Ausente', val: c.absent, cls: 'text-red-300' },
                  { label: 'Excusado', val: c.excused, cls: 'text-sky-300' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-center"
                  >
                    <div className={`text-lg font-black ${s.cls}`}>{s.val}</div>
                    <div className="text-[10px] font-semibold text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Historial */}
              {c.records.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">Historial</h4>
                  {c.records.map((r, i) => {
                    const cfg = statusConfig[r.status] || statusConfig.ABSENT;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/3 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-slate-300">
                          {formatDate(r.date)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {c.total === 0 && (
                <p className="text-sm text-slate-400 text-center">
                  Sin registros de asistencia aun.
                </p>
              )}
            </div>
          </div>
        ))
      )}

      <div className="text-center">
        <Link
          href="/dashboard"
          className="inline-block rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
