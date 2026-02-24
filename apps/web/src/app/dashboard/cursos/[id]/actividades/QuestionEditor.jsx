'use client';

const questionTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Opción múltiple' },
  { value: 'MULTIPLE_ANSWERS', label: 'Múltiples respuestas' },
  { value: 'TRUE_FALSE', label: 'Verdadero/Falso' },
  { value: 'OPEN_ENDED', label: 'Respuesta abierta' },
];

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-violet-400/50 focus:outline-none';

export default function QuestionEditor({ questions, onChange }) {
  function addQuestion() {
    onChange([
      ...questions,
      {
        type: 'MULTIPLE_CHOICE',
        text: '',
        order: questions.length + 1,
        points: 1,
        options: [
          { text: '', isCorrect: true, order: 1 },
          { text: '', isCorrect: false, order: 2 },
        ],
      },
    ]);
  }

  function removeQuestion(index) {
    onChange(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index, field, value) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };

    // When changing type, reset options
    if (field === 'type') {
      if (value === 'TRUE_FALSE') {
        updated[index].options = [
          { text: 'Verdadero', isCorrect: true, order: 1 },
          { text: 'Falso', isCorrect: false, order: 2 },
        ];
      } else if (value === 'OPEN_ENDED') {
        updated[index].options = [];
      } else if (
        value === 'MULTIPLE_CHOICE' &&
        (!updated[index].options?.length || updated[index].options.length < 2)
      ) {
        updated[index].options = [
          { text: '', isCorrect: true, order: 1 },
          { text: '', isCorrect: false, order: 2 },
        ];
      } else if (
        value === 'MULTIPLE_ANSWERS' &&
        (!updated[index].options?.length || updated[index].options.length < 2)
      ) {
        updated[index].options = [
          { text: '', isCorrect: false, order: 1 },
          { text: '', isCorrect: false, order: 2 },
        ];
      }
    }

    onChange(updated);
  }

  function addOption(qIndex) {
    const updated = [...questions];
    const q = updated[qIndex];
    q.options = [
      ...(q.options || []),
      { text: '', isCorrect: false, order: (q.options?.length || 0) + 1 },
    ];
    onChange(updated);
  }

  function removeOption(qIndex, oIndex) {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    onChange(updated);
  }

  function updateOption(qIndex, oIndex, field, value) {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[oIndex] = { ...opts[oIndex], [field]: value };

    // If marking as correct, unmark others (single correct for MC/TF only)
    if (field === 'isCorrect' && value === true && updated[qIndex].type !== 'MULTIPLE_ANSWERS') {
      opts.forEach((o, i) => {
        if (i !== oIndex) o.isCorrect = false;
      });
    }

    updated[qIndex].options = opts;
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qIndex) => (
        <div key={qIndex} className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Pregunta {qIndex + 1}</span>
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              className="text-xs font-bold text-red-400/70 hover:text-red-300 transition"
            >
              Eliminar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={q.type}
              onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
              className={inputClass}
            >
              {questionTypes.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={q.points}
              onChange={(e) => updateQuestion(qIndex, 'points', parseFloat(e.target.value) || 1)}
              placeholder="Puntos"
              className={inputClass}
            />
          </div>

          <textarea
            value={q.text}
            onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
            placeholder="Texto de la pregunta..."
            rows={2}
            className={inputClass}
          />

          {/* Options for MC, MA and TF */}
          {q.type !== 'OPEN_ENDED' && (
            <div className="space-y-2 ml-4">
              <span className="text-xs font-semibold text-slate-500">
                {q.type === 'MULTIPLE_ANSWERS'
                  ? 'Opciones (marca las correctas)'
                  : 'Opciones (marca la correcta)'}
              </span>
              {(q.options || []).map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  {q.type === 'MULTIPLE_ANSWERS' ? (
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={(e) => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)}
                      className="accent-violet-500"
                    />
                  ) : (
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={opt.isCorrect}
                      onChange={() => updateOption(qIndex, oIndex, 'isCorrect', true)}
                      className="accent-violet-500"
                    />
                  )}
                  <input
                    value={opt.text}
                    onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                    placeholder={`Opción ${oIndex + 1}`}
                    className={`flex-1 ${inputClass}`}
                    disabled={q.type === 'TRUE_FALSE'}
                  />
                  {(q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_ANSWERS') &&
                    q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        className="text-xs text-red-400/60 hover:text-red-300"
                      >
                        x
                      </button>
                    )}
                </div>
              ))}
              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_ANSWERS') && (
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="text-xs font-bold text-violet-400/70 hover:text-violet-300 transition"
                >
                  + Agregar opción
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full rounded-xl border border-dashed border-white/20 bg-white/3 px-4 py-3 text-sm font-bold text-slate-300/70 hover:text-white hover:border-violet-400/30 hover:bg-white/5 transition"
      >
        + Agregar pregunta
      </button>
    </div>
  );
}
