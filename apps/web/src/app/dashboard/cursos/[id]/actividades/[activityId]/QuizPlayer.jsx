"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-violet-400/50 focus:outline-none";

export default function QuizPlayer({ courseId, activity }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startToken, setStartToken] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(activity.timeLimit ? activity.timeLimit * 60 : null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!started) return;
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, started]);

  async function handleStart() {
    setStarting(true);
    setError("");
    try {
      const r = await fetchWithAuth(`/api/courses/${courseId}/activities/${activity.id}/start`, {
        method: "POST",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setError(data?.message || "No se pudo iniciar el quiz");
        setShowModal(false);
        return;
      }
      if (data?.startToken) setStartToken(data.startToken);
      setShowModal(false);
      setStarted(true);
    } catch {
      setError("Error de conexión al iniciar el quiz");
      setShowModal(false);
    } finally {
      setStarting(false);
    }
  }

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

      const r = await fetchWithAuth(`/api/courses/${courseId}/activities/${activity.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList, ...(startToken ? { startToken } : {}) }),
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

  /* ── Pantalla de inicio (antes de comenzar) ── */
  if (!started) {
    return (
      <>
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/8 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-sm font-bold text-violet-300">Información del quiz</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-slate-400">Preguntas</div>
              <div className="mt-0.5 text-lg font-extrabold text-white">{activity.questions.length}</div>
            </div>
            {activity.timeLimit ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-slate-400">Tiempo límite</div>
                <div className="mt-0.5 text-lg font-extrabold text-white">{activity.timeLimit} min</div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-slate-400">Tiempo límite</div>
                <div className="mt-0.5 text-lg font-extrabold text-white">Sin límite</div>
              </div>
            )}
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-slate-400">Intentos permitidos</div>
              <div className="mt-0.5 text-lg font-extrabold text-white">
                {activity.maxAttempts === 0 ? "Ilimitados" : activity.maxAttempts}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-violet-500/25 transition"
          >
            Realizar quiz
          </button>
        </div>

        {/* Modal de confirmación */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-sm mx-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
              <div className="pointer-events-none absolute -inset-20 opacity-40 blur-3xl bg-gradient-to-br from-violet-500/30 via-purple-500/15 to-transparent" />
              <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

              <div className="relative p-7 space-y-4">
                <div className="text-lg font-extrabold text-white">¿Listo para comenzar?</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Vas a iniciar el quiz <span className="font-semibold text-white">"{activity.title}"</span>.
                  {activity.timeLimit
                    ? ` Tendrás ${activity.timeLimit} minutos y el tiempo comenzará al instante.`
                    : " Una vez que comiences podrás tomarte el tiempo que necesites."}
                  {" "}¿Deseas continuar?
                </p>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-violet-500/25 transition disabled:opacity-60"
                  >
                    {starting ? "Iniciando..." : "Sí, comenzar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ── Quiz en curso ── */
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
