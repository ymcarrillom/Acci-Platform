'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionEditor from './QuestionEditor';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none';

export default function ActivityForm({ courseId, initial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    type: initial?.type || 'QUIZ',
    title: initial?.title || '',
    description: initial?.description || '',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
    showScore: initial?.showScore ?? true,
    showAnswers: initial?.showAnswers ?? false,
    timeLimit: initial?.timeLimit || '',
    maxAttempts: initial?.maxAttempts ?? 1,
    isPublished: initial?.isPublished ?? false,
  });

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [questions, setQuestions] = useState(
    initial?.questions?.map((q) => ({
      type: q.type,
      text: q.text,
      order: q.order,
      points: q.points,
      options:
        q.options?.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })) || [],
    })) || []
  );

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('El título es requerido');
      return;
    }

    if (form.type === 'QUIZ' && questions.length === 0) {
      setError('Agrega al menos una pregunta al quiz');
      return;
    }

    setSaving(true);
    try {
      const body = {
        type: form.type,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate || null,
        showScore: form.showScore,
        showAnswers: form.showAnswers,
        timeLimit: form.type === 'QUIZ' && form.timeLimit ? parseInt(form.timeLimit) : null,
        maxAttempts: form.type === 'QUIZ' ? parseInt(form.maxAttempts) || 1 : 1,
        isPublished: form.isPublished,
        questions: form.type === 'QUIZ' ? questions : undefined,
      };

      const url = isEdit
        ? `/api/courses/${courseId}/activities/${initial.id}`
        : `/api/courses/${courseId}/activities`;

      const r = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setError(data?.message || 'Error al guardar');
        return;
      }

      // Upload file for MATERIAL if selected
      const activityId = data?.activity?.id;
      if (form.type === 'MATERIAL' && file && activityId) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch(`/api/courses/${courseId}/activities/${activityId}/upload`, {
          method: 'POST',
          body: fd,
        });
        if (!uploadRes.ok) {
          const upErr = await uploadRes.json().catch(() => null);
          setError(upErr?.message || 'Error al subir archivo');
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      router.push(`/dashboard/cursos/${courseId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step indicator for QUIZ */}
      {form.type === 'QUIZ' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${step === 1 ? 'bg-white/10 text-white' : 'text-slate-300/70 hover:text-white'}`}
          >
            1. General
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${step === 2 ? 'bg-white/10 text-white' : 'text-slate-300/70 hover:text-white'}`}
          >
            2. Preguntas ({questions.length})
          </button>
        </div>
      )}

      {/* Step 1: General info */}
      {(step === 1 || form.type !== 'QUIZ') && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              disabled={isEdit}
              className={inputClass}
            >
              <option value="QUIZ" className="bg-slate-900 text-white">
                Quiz
              </option>
              <option value="TASK" className="bg-slate-900 text-white">
                Tarea
              </option>
              <option value="MATERIAL" className="bg-slate-900 text-white">
                Material
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Título</label>
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ej: Quiz 1 - Fundamentos"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Instrucciones o contenido..."
              rows={4}
              className={inputClass}
            />
          </div>

          {form.type !== 'MATERIAL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Fecha de entrega
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {form.type === 'QUIZ' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tiempo límite (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.timeLimit}
                  onChange={(e) => updateField('timeLimit', e.target.value)}
                  placeholder="Sin límite"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Número de intentos
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.maxAttempts}
                  onChange={(e) => updateField('maxAttempts', e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1">0 = intentos ilimitados</p>
              </div>
            </>
          )}

          {form.type === 'MATERIAL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Documento adjunto
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.zip"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
              />
              {initial?.fileUrl && !file && (
                <p className="text-xs text-emerald-400 mt-1">
                  Archivo actual: {initial.fileUrl.split('/').pop()}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.showScore}
                onChange={(e) => updateField('showScore', e.target.checked)}
                className="accent-sky-500"
              />
              Mostrar calificación al estudiante
            </label>
            {form.type === 'QUIZ' && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.showAnswers}
                  onChange={(e) => updateField('showAnswers', e.target.checked)}
                  className="accent-sky-500"
                />
                Mostrar respuestas correctas
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => updateField('isPublished', e.target.checked)}
                className="accent-sky-500"
              />
              Publicar inmediatamente
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Questions (QUIZ only) */}
      {step === 2 && form.type === 'QUIZ' && (
        <QuestionEditor questions={questions} onChange={setQuestions} />
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        {form.type === 'QUIZ' && step === 1 && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-xl bg-white/10 border border-white/10 px-5 py-2 text-sm font-bold text-white hover:bg-white/15 transition"
          >
            Siguiente: Preguntas
          </button>
        )}

        {(form.type !== 'QUIZ' || step === 2) && (
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg hover:shadow-sky-500/25 transition disabled:opacity-50"
          >
            {uploading
              ? 'Subiendo archivo...'
              : saving
                ? 'Guardando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Crear actividad'}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
