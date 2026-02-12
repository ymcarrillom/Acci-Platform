"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const statusConfig = {
  PRESENT: { label: "Presente", color: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30", active: "bg-emerald-500 text-white border-emerald-500" },
  ABSENT: { label: "Ausente", color: "bg-red-500/15 text-red-300 border-red-400/30", active: "bg-red-500 text-white border-red-500" },
  LATE: { label: "Tardanza", color: "bg-amber-500/15 text-amber-300 border-amber-400/30", active: "bg-amber-500 text-white border-amber-500" },
  EXCUSED: { label: "Excusado", color: "bg-blue-500/15 text-blue-300 border-blue-400/30", active: "bg-blue-500 text-white border-blue-500" },
};

function todayStr() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function AttendanceForm({ courseId, students }) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Initialize records for all students
  useEffect(() => {
    const initial = {};
    for (const s of students) {
      initial[s.id] = { status: "PRESENT", notes: "" };
    }
    setRecords(initial);
  }, [students]);

  // Fetch existing attendance when date changes
  useEffect(() => {
    if (!date) return;

    async function fetchAttendance() {
      setLoadingData(true);
      setMessage("");
      setError("");
      try {
        const r = await fetch(`/api/courses/${courseId}/attendance?date=${date}`);
        const data = await r.json().catch(() => null);

        if (r.ok && data?.attendance?.length > 0) {
          const updated = {};
          for (const s of students) {
            const existing = data.attendance.find((a) => a.studentId === s.id);
            updated[s.id] = existing
              ? { status: existing.status, notes: existing.notes || "" }
              : { status: "PRESENT", notes: "" };
          }
          setRecords(updated);
        } else {
          // Reset to default
          const initial = {};
          for (const s of students) {
            initial[s.id] = { status: "PRESENT", notes: "" };
          }
          setRecords(initial);
        }
      } catch {
        // Keep current state on error
      } finally {
        setLoadingData(false);
      }
    }

    fetchAttendance();
  }, [date, courseId, students]);

  function updateStatus(studentId, status) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }

  function updateNotes(studentId, notes) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  }

  // Quick actions: mark all
  function markAll(status) {
    setRecords((prev) => {
      const updated = {};
      for (const id of Object.keys(prev)) {
        updated[id] = { ...prev[id], status };
      }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const body = {
        date,
        records: Object.entries(records).map(([studentId, data]) => ({
          studentId,
          status: data.status,
          ...(data.notes ? { notes: data.notes } : {}),
        })),
      };

      const r = await fetch(`/api/courses/${courseId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        setError(data?.message || "Error al guardar asistencia");
        return;
      }

      setMessage(data?.message || "Asistencia guardada correctamente");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (students.length === 0) {
    return (
      <p className="text-sm font-medium text-slate-200/60">
        No hay estudiantes inscritos en este curso.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          />
        </div>

        {/* Quick actions */}
        <div className="flex items-end gap-2">
          <span className="text-xs font-semibold text-slate-400 mb-2.5">Marcar todos:</span>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => markAll(key)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${cfg.color} hover:opacity-80`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {loadingData && (
        <div className="text-sm text-slate-400">Cargando asistencia...</div>
      )}

      {/* Student list */}
      <div className="space-y-2">
        {students.map((student) => {
          const record = records[student.id];
          if (!record) return null;

          return (
            <div
              key={student.id}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Student name */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white">{student.fullName}</span>
                  <span className="ml-2 text-xs text-slate-300/70">{student.email}</span>
                </div>

                {/* Status buttons */}
                <div className="flex items-center gap-1.5">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateStatus(student.id, key)}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                        record.status === key ? cfg.active : cfg.color
                      } hover:opacity-80`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes (collapsible) */}
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Notas (opcional)"
                  value={record.notes}
                  onChange={(e) => updateNotes(student.id, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || loadingData}
        className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-extrabold text-white hover:from-sky-400 hover:to-blue-500 transition disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Guardar asistencia"}
      </button>
    </form>
  );
}
