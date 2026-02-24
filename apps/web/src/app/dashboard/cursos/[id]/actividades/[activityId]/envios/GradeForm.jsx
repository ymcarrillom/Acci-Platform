'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GradeForm({
  courseId,
  activityId,
  submissionId,
  currentGrade,
  currentFeedback,
  maxGrade,
}) {
  const router = useRouter();
  const [grade, setGrade] = useState(currentGrade ?? '');
  const [feedback, setFeedback] = useState(currentFeedback || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (grade === '' || isNaN(parseFloat(grade))) {
      setError('Ingresa una calificación válida');
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(
        `/api/courses/${courseId}/activities/${activityId}/submissions/${submissionId}/grade`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade: parseFloat(grade), feedback }),
        }
      );
      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setError(data?.message || 'Error al calificar');
        return;
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 mt-4 rounded-xl border border-white/10 bg-white/3 p-4"
    >
      <h3 className="text-sm font-bold text-white">Calificar envío</h3>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Calificación (máx: {maxGrade || 10})
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            max={maxGrade || 10}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Retroalimentación</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Comentarios para el estudiante..."
          rows={3}
          className={inputClass}
        />
      </div>

      {error && <div className="text-sm font-semibold text-red-300">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2 text-sm font-bold text-white shadow-lg hover:shadow-emerald-500/25 transition disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar calificación'}
      </button>
    </form>
  );
}
