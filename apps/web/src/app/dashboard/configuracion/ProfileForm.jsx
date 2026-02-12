"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none";

export default function ProfileForm({ currentName }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(currentName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    const body = {};
    if (fullName.trim() && fullName !== currentName) body.fullName = fullName.trim();
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    if (Object.keys(body).length === 0) {
      setError("No hay cambios para guardar");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setError(data?.message || "Error al guardar");
        return;
      }

      setSuccess("Perfil actualizado correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-sm font-bold text-slate-400">Editar perfil</h3>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre completo</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Tu nombre"
          className={inputClass}
        />
      </div>

      <div className="border-t border-white/10 pt-4">
        <h4 className="text-xs font-bold text-slate-400 mb-3">Cambiar contraseña (opcional)</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg hover:shadow-sky-500/25 transition disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
