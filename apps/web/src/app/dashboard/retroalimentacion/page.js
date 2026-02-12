"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none";

const typeBadge = {
  QUIZ: { label: "Quiz", cls: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  TASK: { label: "Tarea", cls: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  MATERIAL: { label: "Material", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

export default function RetroalimentacionPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/pending-feedback")
      .then((r) => r.json())
      .then((data) => setSubmissions(data?.submissions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Unique courses from submissions
  const courses = useMemo(() => {
    const map = new Map();
    submissions.forEach((s) => {
      if (s.activity?.courseId && !map.has(s.activity.courseId)) {
        map.set(s.activity.courseId, s.activity.course?.name || s.activity.courseId);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (filterCourse && s.activity?.courseId !== filterCourse) return false;
      if (filterType && s.activity?.type !== filterType) return false;
      return true;
    });
  }, [submissions, filterCourse, filterType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-white/60 font-semibold">Cargando entregas pendientes...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-indigo-500/60 via-sky-500/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500/60 via-sky-500/30 to-transparent" />
        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white">Retroalimentación</h1>
          <p className="mt-1 text-sm font-semibold text-slate-100/70">
            {submissions.length} entrega{submissions.length !== 1 ? "s" : ""} sin calificar.
            Guía con comentarios claros y motivadores.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="">Todos los tipos</option>
          <option value="QUIZ">Quiz</option>
          <option value="TASK">Tarea</option>
        </select>
      </div>

      {/* Submission list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center">
          <div className="text-white font-bold">Sin entregas pendientes</div>
          <p className="text-sm text-slate-300/70 mt-1">Todas las entregas han sido calificadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const badge = typeBadge[sub.activity?.type] || typeBadge.TASK;
            const gradeUrl = `/dashboard/cursos/${sub.activity?.courseId}/actividades/${sub.activity?.id}/envios/${sub.id}`;

            return (
              <Link
                key={sub.id}
                href={gradeUrl}
                className="block relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-5 hover:bg-white/5 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-extrabold text-white truncate">{sub.activity?.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-300/70">
                      <span className="font-semibold text-slate-200/80">{sub.student?.fullName}</span>
                      {" · "}
                      {sub.activity?.course?.name}
                      {" · "}
                      Intento #{sub.attempt}
                    </div>
                    <div className="mt-1 text-xs text-slate-400/70">
                      Enviado: {new Date(sub.submittedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-bold text-sky-400/80">
                    Calificar →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <Link
          href="/dashboard"
          className="inline-block rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
