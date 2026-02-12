"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none";

function StatMini({ label, value, alert }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/3"}`}>
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-black ${alert ? "text-red-300" : "text-white"}`}>{value ?? "—"}</div>
    </div>
  );
}

export default function SeguimientoPage() {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseId, setCourseId] = useState("");
  const [tracking, setTracking] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setCourses(data?.courses || data || []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!courseId) { setTracking(null); return; }
    setLoadingTracking(true);
    fetch(`/api/dashboard/group-tracking/${courseId}`)
      .then((r) => r.json())
      .then((data) => setTracking(data))
      .catch(() => setTracking(null))
      .finally(() => setLoadingTracking(false));
  }, [courseId]);

  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-white/60 font-semibold">Cargando cursos...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/60 via-indigo-500/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500/60 via-indigo-500/35 to-transparent" />
        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white">Seguimiento del grupo</h1>
          <p className="mt-1 text-sm font-semibold text-slate-100/70">
            Identifica avances y estudiantes que necesitan apoyo.
          </p>
        </div>
      </div>

      {/* Course selector */}
      <div>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`${inputClass} max-w-md`}>
          <option value="">— Selecciona un curso —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loadingTracking && (
        <div className="text-white/60 font-semibold text-center py-8">Cargando datos del grupo...</div>
      )}

      {tracking && !loadingTracking && (
        <>
          {/* Group summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatMini label="Estudiantes" value={tracking.totalStudents} />
            <StatMini
              label="Asistencia promedio"
              value={tracking.groupAttendanceAvg !== null ? `${tracking.groupAttendanceAvg}%` : "—"}
              alert={tracking.groupAttendanceAvg !== null && tracking.groupAttendanceAvg < 60}
            />
            <StatMini
              label="Calificación promedio"
              value={tracking.groupGradeAvg !== null ? tracking.groupGradeAvg : "—"}
              alert={tracking.groupGradeAvg !== null && tracking.groupGradeAvg < 60}
            />
            <StatMini
              label="Estudiantes en riesgo"
              value={tracking.students?.filter((s) => s.risk).length ?? 0}
              alert={tracking.students?.some((s) => s.risk)}
            />
          </div>

          {/* Student table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold text-slate-400 uppercase">
                  <th className="px-4 py-3 text-left">Estudiante</th>
                  <th className="px-4 py-3 text-center">Asistencia</th>
                  <th className="px-4 py-3 text-center">Promedio</th>
                  <th className="px-4 py-3 text-center">Pendientes</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tracking.students?.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{s.fullName}</div>
                      <div className="text-xs text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${s.attendance?.pct !== null && s.attendance.pct < 60 ? "text-red-300" : "text-white"}`}>
                        {s.attendance?.pct !== null ? `${s.attendance.pct}%` : "—"}
                      </span>
                      {s.attendance?.total > 0 && (
                        <div className="text-xs text-slate-500">{s.attendance.present}/{s.attendance.total}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${s.grades?.avg !== null && s.grades.avg < 60 ? "text-red-300" : "text-white"}`}>
                        {s.grades?.avg !== null ? s.grades.avg : "—"}
                      </span>
                      {s.grades?.count > 0 && (
                        <div className="text-xs text-slate-500">{s.grades.count} eval.</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${s.pending > 0 ? "text-amber-300" : "text-white"}`}>
                        {s.pending}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.risk ? (
                        <span className="inline-block rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-300">
                          En riesgo
                        </span>
                      ) : (
                        <span className="inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-300">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!tracking.students || tracking.students.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-semibold">
                      Sin estudiantes inscritos en este curso.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!courseId && !loadingTracking && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center">
          <div className="text-white font-bold">Selecciona un curso</div>
          <p className="text-sm text-slate-300/70 mt-1">Elige un curso para ver el seguimiento de los estudiantes.</p>
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
