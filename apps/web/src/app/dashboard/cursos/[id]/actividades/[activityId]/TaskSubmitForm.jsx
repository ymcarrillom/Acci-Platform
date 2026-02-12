"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TaskSubmitForm({ courseId, activityId }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && !file) {
      setError("Escribe un texto o adjunta un archivo");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      let r;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (content.trim()) formData.append("content", content);

        r = await fetch(`/api/courses/${courseId}/activities/${activityId}/submit`, {
          method: "POST",
          body: formData,
        });
      } else {
        r = await fetch(`/api/courses/${courseId}/activities/${activityId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      }

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

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 20 * 1024 * 1024) {
      setError("El archivo no puede superar 20 MB");
      e.target.value = "";
      return;
    }
    setError("");
    setFile(selected);
  }

  function removeFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Tu entrega</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe tu respuesta o entrega aquí..."
          rows={6}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-amber-400/50 focus:outline-none"
        />
      </div>

      {/* File upload */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Adjuntar archivo (opcional)</label>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:border-white/30 transition">
            <span>{file ? "Cambiar archivo" : "Seleccionar archivo"}</span>
            <input
              ref={fileRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.zip"
              className="hidden"
            />
          </label>
          {file && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-1.5">
              <span className="text-xs font-semibold text-amber-200 max-w-[200px] truncate">{file.name}</span>
              <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              <button type="button" onClick={removeFile} className="text-red-400 hover:text-red-300 text-xs font-bold ml-1">
                x
              </button>
            </div>
          )}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">PDF, Word, Excel, PowerPoint, imagenes, ZIP. Max 20 MB.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-amber-500/25 transition disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Entregar tarea"}
      </button>
    </form>
  );
}
