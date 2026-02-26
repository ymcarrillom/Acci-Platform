'use client';

import { useState } from 'react';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none';

export default function ProfileForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Debes ingresar tu contraseña actual');
      return;
    }

    if (!newPassword) {
      setError('Debes ingresar una nueva contraseña');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSaving(true);
    try {
      const r = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setError(data?.message || 'Error al guardar');
        return;
      }

      setSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-sm font-bold text-slate-400">Cambiar contraseña</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Contraseña actual
          </label>
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
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Confirmar contraseña
            </label>
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
        {saving ? 'Guardando...' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
