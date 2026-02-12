"use client";

export default function QuizResults({ activity, submission }) {
  const { showScore, showAnswers } = activity;

  if (!showScore && !showAnswers) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-lg font-extrabold text-white">Tu respuesta fue registrada</div>
        <p className="mt-2 text-sm text-slate-400">El profesor revisará tus respuestas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showScore && submission.grade != null && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-center">
          <div className="text-xs font-semibold text-slate-400">Tu calificación</div>
          <div className="text-3xl font-extrabold text-emerald-300 mt-1">
            {submission.grade} / {submission.maxGrade}
          </div>
          {submission.feedback && (
            <p className="mt-3 text-sm text-slate-300">{submission.feedback}</p>
          )}
        </div>
      )}

      {showAnswers && submission.answers?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400">Revisión de respuestas</h3>
          {submission.answers.map((ans, i) => {
            const question = activity.questions?.find((q) => q.id === ans.questionId);
            return (
              <div key={ans.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {i + 1}. {question?.text || ans.question?.text || "Pregunta"}
                  </p>
                  {ans.isCorrect != null && (
                    <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${
                      ans.isCorrect
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
                        : "bg-red-500/15 text-red-300 border border-red-400/20"
                    }`}>
                      {ans.isCorrect ? "Correcta" : "Incorrecta"}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  {ans.selectedOptionIds ? (() => {
                    let ids = [];
                    try { ids = JSON.parse(ans.selectedOptionIds); } catch {}
                    if (!ids.length) return <span className="text-slate-400">Sin respuesta</span>;
                    const optTexts = ids.map((id) => {
                      const opt = question?.options?.find((o) => o.id === id);
                      return opt?.text || id;
                    });
                    return <span>Tus respuestas: {optTexts.join(", ")}</span>;
                  })() : ans.selectedOption ? (
                    <span>Tu respuesta: {ans.selectedOption.text}</span>
                  ) : ans.answerText ? (
                    <span>{ans.answerText}</span>
                  ) : (
                    <span className="text-slate-400">Sin respuesta</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
