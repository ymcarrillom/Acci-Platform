"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PeriodoForm({ period }) {
  const router = useRouter();
  const isEdit = Boolean(period);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(period?.name || "");
  const [startDate, setStartDate] = useState(
    period?.startDate ? period.startDate.slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    period?.endDate ? period.endDate.slice(0, 10) : ""
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name || !startDate || !endDate) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const body = { name, startDate, endDate };

      const url = isEdit ? `/api/periodos/${period.id}` : "/api/periodos";
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Error al guardar");

      router.push(`/dashboard/periodos/${data.periodo?.id || period?.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
      <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/35 via-purple-500/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
      <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

      <div className="relative p-7">
        <h2 className="text-lg font-extrabold text-white">
          {isEdit ? "Editar periodo" : "Crear periodo"}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-200/70">
          {isEdit
            ? "Modifica los datos del periodo academico."
            : "Completa los datos para crear un nuevo periodo."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Nombre del periodo *
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: 2026-1"
              maxLength={50}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Fecha de inicio *
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
                Fecha de fin *
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
              className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-2.5 text-sm font-extrabold text-white hover:from-violet-400 hover:to-purple-500 transition disabled:opacity-60"
            >
              {loading
                ? "Guardando..."
                : isEdit
                ? "Guardar cambios"
                : "Crear periodo"}
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
