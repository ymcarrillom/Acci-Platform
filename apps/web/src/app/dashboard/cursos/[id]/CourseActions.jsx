"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CourseActions({ courseId, isActive }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = isActive ? "desactivar" : "activar";
    if (!confirm(`¿${isActive ? "Desactivar" : "Activar"} este curso?`)) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}`, { method: "PATCH" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        alert(data?.message || `Error al ${action}`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este curso PERMANENTEMENTE?\nEsta acción no se puede deshacer.")) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        alert(data?.message || "Error al eliminar");
        return;
      }
      router.push("/dashboard/cursos");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`/dashboard/cursos/${courseId}/editar`}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
      >
        Editar curso
      </Link>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
          isActive
            ? "border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
        }`}
      >
        {loading ? "Procesando..." : isActive ? "Desactivar" : "Activar"}
      </button>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20 transition disabled:opacity-60"
      >
        {loading ? "Procesando..." : "Eliminar permanentemente"}
      </button>
    </div>
  );
}
