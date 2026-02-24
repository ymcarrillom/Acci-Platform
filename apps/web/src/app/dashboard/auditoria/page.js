'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const ACTION_LABELS = {
  LOGIN_SUCCESS: { label: 'Inicio sesión', color: 'text-emerald-400' },
  LOGIN_FAILED: { label: 'Login fallido', color: 'text-red-400' },
  LOGIN_BLOCKED: { label: 'Login bloqueado', color: 'text-orange-400' },
  LOGOUT: { label: 'Cierre sesión', color: 'text-slate-300' },
  USER_CREATED: { label: 'Usuario creado', color: 'text-sky-400' },
  USER_UPDATED: { label: 'Usuario editado', color: 'text-blue-400' },
  USER_DELETED: { label: 'Usuario eliminado', color: 'text-red-400' },
  USER_ACTIVATED: { label: 'Usuario activado', color: 'text-emerald-400' },
  USER_DEACTIVATED: { label: 'Usuario desactivado', color: 'text-orange-400' },
  COURSE_CREATED: { label: 'Curso creado', color: 'text-sky-400' },
  COURSE_UPDATED: { label: 'Curso editado', color: 'text-blue-400' },
  COURSE_DELETED: { label: 'Curso eliminado', color: 'text-red-400' },
  COURSE_ACTIVATED: { label: 'Curso activado', color: 'text-emerald-400' },
  COURSE_DEACTIVATED: { label: 'Curso desactivado', color: 'text-orange-400' },
  STUDENT_ENROLLED: { label: 'Estudiante inscrito', color: 'text-emerald-400' },
  STUDENT_UNENROLLED: { label: 'Estudiante desinscrito', color: 'text-orange-400' },
  SUBMISSION_GRADED: { label: 'Envío calificado', color: 'text-purple-400' },
};

function getAfectado(log) {
  const d = log.detail;
  if (!d) return null;

  switch (log.action) {
    case 'USER_CREATED':
    case 'USER_DELETED':
      return d.fullName ? { name: d.fullName, sub: d.email } : null;
    case 'USER_UPDATED':
      return d.changes?.fullName ? { name: d.changes.fullName, sub: d.changes.email } : null;
    case 'USER_ACTIVATED':
    case 'USER_DEACTIVATED':
      return d.fullName ? { name: d.fullName } : null;
    case 'COURSE_CREATED':
    case 'COURSE_UPDATED':
    case 'COURSE_DELETED':
      return d.name ? { name: d.name, sub: d.code } : null;
    case 'COURSE_ACTIVATED':
    case 'COURSE_DEACTIVATED':
      return d.name ? { name: d.name } : null;
    case 'STUDENT_ENROLLED':
    case 'STUDENT_UNENROLLED':
      return d.studentName ? { name: d.studentName, sub: d.courseName } : null;
    case 'SUBMISSION_GRADED':
      return d.studentName ? { name: d.studentName, sub: `Nota: ${d.grade}` } : null;
    default:
      return null;
  }
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('');
  const [metrics, setMetrics] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (filterAction) params.set('action', filterAction);

      const r = await fetchWithAuth(`/api/audit?${params}`);
      if (r.status === 401 || r.status === 403) {
        setError('Sin permisos para ver auditoría.');
        return;
      }
      const data = await r.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError('Error cargando los registros de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction]);

  useEffect(() => {
    // Fetch dashboard metrics for the top cards
    fetchWithAuth('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setMetrics(d.metrics || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleFilterChange(action) {
    setFilterAction(action);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver al dashboard
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-blue-500/25 via-cyan-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 to-cyan-600" />

        <div className="relative p-7 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Auditoría y seguridad</h1>
            <p className="text-sm text-slate-400 mt-1">
              Registro de acciones críticas en la plataforma
            </p>
          </div>

          {/* Metric cards */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-xs font-semibold text-slate-400">Sesiones activas</div>
                <div className="text-3xl font-extrabold text-white mt-2">
                  {metrics.sessionsActive ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Refresh tokens vigentes</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-xs font-semibold text-slate-400">Usuarios activos</div>
                <div className="text-3xl font-extrabold text-white mt-2">
                  {metrics.activeUsers ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Cuentas habilitadas</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-xs font-semibold text-slate-400">Total registros</div>
                <div className="text-3xl font-extrabold text-white mt-2">{total}</div>
                <p className="text-xs text-slate-500 mt-1">Eventos auditados</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-slate-400">Filtrar:</span>
            {[
              '',
              'LOGIN_SUCCESS',
              'LOGIN_FAILED',
              'USER_CREATED',
              'USER_DELETED',
              'COURSE_CREATED',
              'SUBMISSION_GRADED',
            ].map((action) => (
              <button
                key={action}
                onClick={() => handleFilterChange(action)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition border ${
                  filterAction === action
                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                    : 'bg-white/5 border-white/10 text-slate-300/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {action ? (ACTION_LABELS[action]?.label ?? action) : 'Todos'}
              </button>
            ))}
          </div>

          {/* Table */}
          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando registros...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No hay registros de auditoría.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Realizado por
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Afectado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => {
                    const actionMeta = ACTION_LABELS[log.action] || {
                      label: log.action,
                      color: 'text-slate-300',
                    };
                    const afectado = getAfectado(log);
                    return (
                      <tr key={log.id} className="hover:bg-white/3 transition">
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${actionMeta.color}`}>
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/80">
                          {log.user ? (
                            <div>
                              <div className="font-semibold">{log.user.fullName}</div>
                              <div className="text-slate-500">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {afectado ? (
                            <div>
                              <div className="font-semibold text-white/90">{afectado.name}</div>
                              {afectado.sub && (
                                <div className="text-slate-500 mt-0.5">{afectado.sub}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          {log.ip || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Página {page} de {totalPages} — {total} registros
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:bg-white/10 transition"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:bg-white/10 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
