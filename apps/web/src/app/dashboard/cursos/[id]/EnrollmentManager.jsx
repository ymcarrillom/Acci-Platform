'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnrollmentManager({ courseId, initialStudents }) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents || []);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users/students')
      .then((r) => r.json())
      .then((d) => setAllStudents(d.students || []))
      .catch(() => {});
  }, []);

  // Filtrar estudiantes no inscritos
  const enrolledIds = new Set(students.map((s) => s.id));
  const available = allStudents.filter((s) => !enrolledIds.has(s.id));

  async function enroll() {
    if (!selectedStudent) return;
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || 'Error al inscribir');

      // Refresh student list
      const r2 = await fetch(`/api/courses/${courseId}/students`);
      const d2 = await r2.json().catch(() => ({}));
      setStudents(d2.students || []);
      setSelectedStudent('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function unenroll(studentId) {
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/enroll/${studentId}`, {
        method: 'DELETE',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || 'Error al desinscribir');

      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Enroll form */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
        >
          <option value="">Seleccionar estudiante...</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} ({s.email})
            </option>
          ))}
        </select>
        <button
          onClick={enroll}
          disabled={loading || !selectedStudent}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-extrabold text-white hover:from-emerald-400 hover:to-green-500 transition disabled:opacity-60"
        >
          {loading ? '...' : 'Inscribir'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Student list */}
      {students.length === 0 ? (
        <p className="text-sm font-medium text-slate-200/60">No hay estudiantes inscritos.</p>
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <span className="text-sm font-bold text-white">{s.fullName}</span>
                <span className="ml-2 text-xs text-slate-300/70">{s.email}</span>
              </div>
              <button
                onClick={() => unenroll(s.id)}
                disabled={loading}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition disabled:opacity-60"
              >
                Desinscribir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
