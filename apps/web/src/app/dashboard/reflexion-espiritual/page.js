'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-emerald-400/50 focus:outline-none';

const actionTypes = [
  { value: 'oracion', label: 'Oracion' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'reflexion', label: 'Reflexion' },
];

const actionBadge = {
  oracion: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  servicio: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  reflexion: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function ReflexionEspiritualPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [actionType, setActionType] = useState('reflexion');
  const [content, setContent] = useState('');
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editActionType, setEditActionType] = useState('');
  const [message, setMessage] = useState(null);

  // Load enrolled courses
  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => {
        const list = data?.courses || [];
        setCourses(list);
        if (list.length > 0) setSelectedCourse(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load reflections when course changes
  useEffect(() => {
    if (!selectedCourse) return;
    setReflections([]);
    fetch(`/api/courses/${selectedCourse}/reflections`)
      .then((r) => r.json())
      .then((data) => setReflections(data?.reflections || []))
      .catch(() => {});
  }, [selectedCourse]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || !selectedCourse) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const r = await fetch(`/api/courses/${selectedCourse}/reflections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), actionType }),
      });
      if (r.ok) {
        const data = await r.json();
        setReflections((prev) => [data.reflection, ...prev]);
        setContent('');
        setMessage({ type: 'ok', text: 'Reflexion guardada correctamente.' });
      } else {
        const err = await r.json().catch(() => null);
        setMessage({ type: 'err', text: err?.message || 'Error al guardar.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Error de conexion.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id) {
    if (!editContent.trim()) return;
    try {
      const r = await fetch(`/api/courses/${selectedCourse}/reflections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim(), actionType: editActionType }),
      });
      if (r.ok) {
        const data = await r.json();
        setReflections((prev) => prev.map((ref) => (ref.id === id ? data.reflection : ref)));
        setEditingId(null);
      }
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Eliminar esta reflexion?')) return;
    try {
      const r = await fetch(`/api/courses/${selectedCourse}/reflections/${id}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        setReflections((prev) => prev.filter((ref) => ref.id !== id));
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-white/60 font-semibold">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-emerald-500/55 via-sky-500/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500/55 via-sky-500/35 to-transparent" />
        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white">Aplicacion Espiritual</h1>
          <p className="mt-1 text-sm font-semibold text-slate-100/70">
            Registra una accion practica: oracion, servicio o reflexion. Crecimiento integral: fe +
            caracter.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-30 blur-3xl bg-gradient-to-br from-emerald-500/35 via-sky-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="relative p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-200/80 mb-1">Curso</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className={inputClass}
                >
                  {courses.length === 0 && <option value="">Sin cursos inscritos</option>}
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-200/80 mb-1">
                  Tipo de accion
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className={inputClass}
                >
                  {actionTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-200/80 mb-1">Tu reflexion</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe tu reflexion, oracion o accion de servicio..."
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>

            {message && (
              <div
                className={`text-sm font-semibold ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !content.trim() || !selectedCourse}
              className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-5 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Guardando...' : 'Guardar reflexion'}
            </button>
          </form>
        </div>
      </div>

      {/* History */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-30 blur-3xl bg-gradient-to-br from-sky-500/35 via-emerald-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="relative p-7">
          <h2 className="text-lg font-extrabold text-white mb-4">Historial de reflexiones</h2>

          {reflections.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center">
              <div className="text-white/70 font-bold">Sin reflexiones aun</div>
              <p className="text-sm text-slate-300/60 mt-1">
                Escribe tu primera reflexion espiritual.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reflections.map((ref) => (
                <div
                  key={ref.id}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-5"
                >
                  {editingId === ref.id ? (
                    <div className="space-y-3">
                      <select
                        value={editActionType}
                        onChange={(e) => setEditActionType(e.target.value)}
                        className={`${inputClass} max-w-xs`}
                      >
                        {actionTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(ref.id)}
                          className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {ref.actionType && (
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${actionBadge[ref.actionType] || actionBadge.reflexion}`}
                          >
                            {actionTypes.find((t) => t.value === ref.actionType)?.label ||
                              ref.actionType}
                          </span>
                        )}
                        <span className="text-xs text-slate-400/70">
                          {new Date(ref.createdAt).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-100/85 whitespace-pre-wrap">{ref.content}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(ref.id);
                            setEditContent(ref.content);
                            setEditActionType(ref.actionType || 'reflexion');
                          }}
                          className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/10 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(ref.id)}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-bold text-red-400/80 hover:bg-red-500/20 transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
