"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-violet-400/50 focus:outline-none";

export default function QuizPlayer({ courseId, activity }) {
  const router = useRouter();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(activity.timeLimit ? activity.timeLimit * 60 : null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiAnswer(questionId, optionId) {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);

    try {
      const answerList = activity.questions.map((q) => {
        const ans = { questionId: q.id };
        if (q.type === "OPEN_ENDED") {
          ans.answerText = answers[q.id] || "";
        } else if (q.type === "MULTIPLE_ANSWERS") {
          ans.selectedOptionIds = answers[q.id] || [];
        } else {
          ans.selectedOptionId = answers[q.id] || undefined;
        }
        return ans;
      });

      const r = await fetch(`/api/courses/${courseId}/activities/${activity.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setError(data?.message || "Error al enviar");
        return;
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {timeLeft !== null && (
        <div className={`sticky top-0 z-10 rounded-xl border px-4 py-2 text-sm font-bold text-center ${
          timeLeft < 60
            ? "border-red-400/30 bg-red-500/15 text-red-300"
            : "border-white/10 bg-slate-950/80 text-white"
        }`}>
          Tiempo restante: {formatTime(timeLeft)}
        </div>
      )}

      {activity.questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-bold text-white">
              {i + 1}. {q.text}
            </p>
            <span className="shrink-0 text-xs font-semibold text-slate-400">
              {q.points} pts
            </span>
          </div>

          {q.type === "OPEN_ENDED" ? (
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Escribe tu respuesta..."
              rows={4}
              className={inputClass}
            />
          ) : q.type === "MULTIPLE_ANSWERS" ? (
            <div className="space-y-2">
              {q.options?.map((opt) => {
                const selected = (answers[q.id] || []).includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition ${
                      selected
                        ? "border-violet-400/40 bg-violet-500/10 text-white"
                        : "border-white/10 bg-white/3 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMultiAnswer(q.id, opt.id)}
                      className="accent-violet-500"
                    />
                    <span className="text-sm font-medium">{opt.text}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {q.options?.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition ${
                    answers[q.id] === opt.id
                      ? "border-violet-400/40 bg-violet-500/10 text-white"
                      : "border-white/10 bg-white/3 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswer(q.id, opt.id)}
                    className="accent-violet-500"
                  />
                  <span className="text-sm font-medium">{opt.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-violet-500/25 transition disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar respuestas"}
      </button>
    </form>
  );
}
