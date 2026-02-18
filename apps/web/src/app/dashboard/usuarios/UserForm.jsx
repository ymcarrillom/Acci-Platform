"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserForm({ user }) {
  const router = useRouter();
  const isEdit = Boolean(user);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "STUDENT");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!fullName || !email || (!isEdit && !password)) {
      setError("Todos los campos obligatorios deben completarse.");
      return;
    }

    if (!isEdit && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const body = { fullName, email, role };
      if (password) body.password = password;

      const url = isEdit ? `/api/users/${user.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Error al guardar");

      router.push(`/dashboard/usuarios/${data.user?.id || user?.id}`);
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
          {isEdit ? "Editar usuario" : "Crear usuario"}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-200/70">
          {isEdit
            ? "Modifica los datos del usuario."
            : "Completa los datos para crear un nuevo usuario."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Nombre completo *
              </label>
              <input
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Email *
              </label>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: juan@acci.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Contraseña {isEdit ? "(dejar vacío para no cambiar)" : "*"}
              </label>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
                minLength={isEdit ? 0 : 6}
                required={!isEdit}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Rol *
              </label>
              <select
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="STUDENT">Estudiante</option>
                <option value="TEACHER">Instructor</option>
                <option value="ADMIN">Coordinador</option>
              </select>
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
                : "Crear usuario"}
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
