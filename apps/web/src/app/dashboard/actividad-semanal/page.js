'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QuestionEditor from '../cursos/[id]/actividades/QuestionEditor';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none';

export default function ActividadSemanalPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState('');

  // step: 1=General, 2=Preguntas, 3=Resumen
  const [step, setStep] = useState(1);

  // toggles
  const [enableMaterial, setEnableMaterial] = useState(true);
  const [enableQuiz, setEnableQuiz] = useState(true);
  const [enableTask, setEnableTask] = useState(false);

  // general
  const [weekTitle, setWeekTitle] = useState('');

  // material
  const [materialDesc, setMaterialDesc] = useState('');
  const fileRef = useRef(null);

  // quiz
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDueDate, setQuizDueDate] = useState('');
  const [questions, setQuestions] = useState([]);

  // task/ensayo
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => setCourses(data?.courses || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function validate() {
    if (!courseId) return 'Selecciona un curso';
    if (!weekTitle.trim()) return 'El tema semanal es requerido';
    if (!enableMaterial && !enableQuiz && !enableTask)
      return 'Habilita al menos un tipo de actividad';
    if (enableQuiz && questions.length === 0) return 'Agrega al menos una pregunta al quiz';
    if (enableTask && !taskTitle.trim()) return 'El ensayo necesita un titulo';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) return setError(validationError);

    setSaving(true);
    const created = [];

    try {
      // 1. Material
      if (enableMaterial) {
        const matRes = await fetch(`/api/courses/${courseId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'MATERIAL',
            title: `${weekTitle} — Material de lectura`,
            description: materialDesc || `Material de lectura para: ${weekTitle}`,
            isPublished: true,
          }),
        });
        if (!matRes.ok) {
          const err = await matRes.json().catch(() => null);
          return setError(err?.message || 'Error al crear material');
        }
        const matData = await matRes.json();
        created.push('Material');

        // upload file if selected
        const file = fileRef.current?.files?.[0];
        if (file) {
          const fd = new FormData();
          fd.append('file', file);
          const upRes = await fetch(
            `/api/courses/${courseId}/activities/${matData.id || matData.activity?.id}/upload`,
            { method: 'POST', body: fd }
          );
          if (!upRes.ok) {
            const err = await upRes.json().catch(() => null);
            return setError(err?.message || 'Error al subir archivo');
          }
        }
      }

      // 2. Quiz
      if (enableQuiz) {
        const quizRes = await fetch(`/api/courses/${courseId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'QUIZ',
            title: quizTitle.trim() || `${weekTitle} — Quiz`,
            description: `Evaluacion sobre: ${weekTitle}`,
            dueDate: quizDueDate || null,
            maxAttempts: 0,
            showScore: true,
            showAnswers: true,
            isPublished: true,
            questions,
          }),
        });
        if (!quizRes.ok) {
          const err = await quizRes.json().catch(() => null);
          return setError(err?.message || 'Error al crear quiz');
        }
        created.push('Quiz');
      }

      // 3. Tarea / Ensayo
      if (enableTask) {
        const taskRes = await fetch(`/api/courses/${courseId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TASK',
            title: taskTitle.trim() || `${weekTitle} — Ensayo`,
            description: taskDesc || `Tarea para: ${weekTitle}`,
            dueDate: taskDueDate || null,
            isPublished: true,
          }),
        });
        if (!taskRes.ok) {
          const err = await taskRes.json().catch(() => null);
          return setError(err?.message || 'Error al crear tarea');
        }
        created.push('Ensayo');
      }

      setSuccess(`${created.join(' + ')} publicados.`);
      setTimeout(() => router.push(`/dashboard/cursos/${courseId}`), 1500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-white/60 font-semibold">Cargando cursos...</div>
      </div>
    );
  }

  const selectedFile = fileRef.current?.files?.[0];
  const summaryItems = [];
  if (enableMaterial)
    summaryItems.push(`Material${selectedFile ? ` (+ archivo: ${selectedFile.name})` : ''}`);
  if (enableQuiz) summaryItems.push(`Quiz (${questions.length} preguntas)`);
  if (enableTask) summaryItems.push(`Ensayo: ${taskTitle || '(sin titulo)'}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/60 via-indigo-500/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500/60 via-indigo-500/35 to-transparent" />
        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white">Crear actividad semanal</h1>
          <p className="mt-1 text-sm font-semibold text-slate-100/70">
            Publica Material, Quiz y/o Ensayo en un solo flujo.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {['1. General', `2. Preguntas (${questions.length})`, '3. Resumen'].map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i + 1)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                step === i + 1 ? 'bg-white/10 text-white' : 'text-slate-300/70 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* STEP 1: General */}
        {step === 1 && (
          <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            {/* Course + Week title */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Curso</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className={inputClass}
              >
                <option value="" className="bg-slate-900 text-white">
                  — Selecciona un curso —
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Tema de la semana
              </label>
              <input
                value={weekTitle}
                onChange={(e) => setWeekTitle(e.target.value)}
                placeholder="Ej: Semana 4 — El fruto del Espiritu"
                className={inputClass}
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { label: 'Material', checked: enableMaterial, set: setEnableMaterial },
                { label: 'Quiz', checked: enableQuiz, set: setEnableQuiz },
                { label: 'Ensayo / Tarea', checked: enableTask, set: setEnableTask },
              ].map(({ label, checked, set }) => (
                <label
                  key={label}
                  className="flex items-center gap-2 text-sm font-semibold text-white cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => set(e.target.checked)}
                    className="accent-sky-500 w-4 h-4"
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Material section */}
            {enableMaterial && (
              <div className="space-y-3 border-t border-white/5 pt-4">
                <h3 className="text-sm font-bold text-sky-300">Material de estudio</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Contenido / descripcion
                  </label>
                  <textarea
                    value={materialDesc}
                    onChange={(e) => setMaterialDesc(e.target.value)}
                    placeholder="Instrucciones de lectura, enlaces, texto..."
                    rows={3}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Archivo adjunto (opcional)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                    className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
                  />
                </div>
              </div>
            )}

            {/* Quiz general fields */}
            {enableQuiz && (
              <div className="space-y-3 border-t border-white/5 pt-4">
                <h3 className="text-sm font-bold text-sky-300">Quiz</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Titulo del quiz (opcional)
                  </label>
                  <input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder={weekTitle ? `${weekTitle} — Quiz` : 'Se genera automaticamente'}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Fecha de entrega del quiz
                  </label>
                  <input
                    type="date"
                    value={quizDueDate}
                    onChange={(e) => setQuizDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Task / Ensayo fields */}
            {enableTask && (
              <div className="space-y-3 border-t border-white/5 pt-4">
                <h3 className="text-sm font-bold text-sky-300">Ensayo / Tarea</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Titulo de la tarea
                  </label>
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ej: Ensayo — Aplicacion del tema"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Instrucciones para el estudiante
                  </label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Describe lo que el estudiante debe entregar..."
                    rows={3}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Fecha de entrega
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Questions */}
        {step === 2 && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
            {enableQuiz ? (
              <QuestionEditor questions={questions} onChange={setQuestions} />
            ) : (
              <div className="text-center py-8 text-slate-400 font-semibold text-sm">
                El quiz esta deshabilitado. Activalo en el paso 1 para agregar preguntas.
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === 3 && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Resumen de la semana</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <p>
                <span className="text-slate-400">Curso:</span>{' '}
                {courses.find((c) => c.id === courseId)?.name || '—'}
              </p>
              <p>
                <span className="text-slate-400">Tema:</span> {weekTitle || '—'}
              </p>
            </div>
            {summaryItems.length > 0 ? (
              <ul className="space-y-2">
                {summaryItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-emerald-300 font-semibold"
                  >
                    <span className="text-emerald-400">&#10003;</span> {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-amber-300 font-semibold">
                No hay actividades habilitadas.
              </p>
            )}
          </div>
        )}

        {/* Errors / Success */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            {success}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
            >
              Anterior
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-xl bg-white/10 border border-white/10 px-5 py-2 text-sm font-bold text-white hover:bg-white/15 transition"
            >
              Siguiente
            </button>
          )}
          {step === 3 && (
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg hover:shadow-sky-500/25 transition disabled:opacity-50"
            >
              {saving ? 'Publicando...' : 'Publicar semana'}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
