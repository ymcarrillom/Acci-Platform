'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ActivityActions({ courseId, activity, onRemove, onTogglePublish }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePublish() {
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/activities/${activity.id}/publish`, {
        method: 'PATCH',
      });
      if (r.ok) {
        const data = await r.json();
        onTogglePublish?.(activity.id, data.activity.isPublished);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta actividad permanentemente?')) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/activities/${activity.id}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        onRemove?.(activity.id);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1 ml-2 shrink-0">
      <Link
        href={`/dashboard/cursos/${courseId}/actividades/${activity.id}/envios`}
        className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300/70 hover:text-white hover:bg-white/10 transition"
        title="Ver envíos"
      >
        Envíos
      </Link>
      <Link
        href={`/dashboard/cursos/${courseId}/actividades/${activity.id}/editar`}
        className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300/70 hover:text-white hover:bg-white/10 transition"
      >
        Editar
      </Link>
      <button
        onClick={handlePublish}
        disabled={loading}
        className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300/70 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
      >
        {activity.isPublished ? 'Despublicar' : 'Publicar'}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg px-2 py-1 text-xs font-bold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
      >
        Eliminar
      </button>
    </div>
  );
}
