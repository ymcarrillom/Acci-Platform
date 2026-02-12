"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetButton({ courseId, activityId, submissionId, studentName }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/activities/${activityId}/submissions/${submissionId}/reset`, {
        method: "DELETE",
      });

      if (r.ok) {
        router.push(`/dashboard/cursos/${courseId}/actividades/${activityId}/envios`);
        router.refresh();
      }
    } finally {
      setResetting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
      >
        Resetear envío
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 space-y-3">
      <p className="text-sm text-red-200">
        ¿Eliminar el envío de <strong>{studentName}</strong>? El estudiante podrá reintentar.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
        >
          {resetting ? "Eliminando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
