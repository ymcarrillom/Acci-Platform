"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CourseForm({ course }) {
  const router = useRouter();
  const isEdit = Boolean(course);

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState(course?.code || "");
  const [name, setName] = useState(course?.name || "");
  const [description, setDescription] = useState(course?.description || "");
  const [teacherId, setTeacherId] = useState(course?.teacherId || "");
  const [startDate, setStartDate] = useState(
    course?.startDate ? course.startDate.slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    course?.endDate ? course.endDate.slice(0, 10) : ""
  );

  useEffect(() => {
    fetch("/api/users/teachers")
      .then((r) => r.json())
      .then((d) => setTeachers(d.teachers || []))
      .catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!code || !name || !teacherId || !startDate || !endDate) {
      setError("Todos los campos obligatorios deben completarse.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        code,
        name,
        description,
        teacherId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };

      const url = isEdit ? `/api/courses/${course.id}` : "/api/courses";
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Error al guardar");

      router.push(`/dashboard/cursos/${data.course?.id || course?.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
      <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/35 via-indigo-500/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
      <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

      <div className="relative p-7">
        <h2 className="text-lg font-extrabold text-white">
          {isEdit ? "Editar curso" : "Crear curso"}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-200/70">
          {isEdit
            ? "Modifica los datos del curso."
            : "Completa los datos para crear un nuevo curso."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Código *
              </label>
              <input
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: BIB-101"
                maxLength={20}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Nombre *
              </label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Introducción Bíblica"
                maxLength={100}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Descripción
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del curso..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Docente *
            </label>
            <select
              className={inputClass}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
            >
              <option value="">Seleccionar docente...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Fecha inicio *
              </label>
              <input
                className={inputClass}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Fecha fin *
              </label>
              <input
                className={inputClass}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-extrabold text-white hover:from-sky-400 hover:to-blue-500 transition disabled:opacity-60"
            >
              {loading
                ? "Guardando..."
                : isEdit
                ? "Guardar cambios"
                : "Crear curso"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
