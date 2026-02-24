'use client';

import { useState } from 'react';
import Link from 'next/link';
import ActivityActions from './[activityId]/ActivityActions';

const typeConfig = {
  QUIZ: {
    label: 'Quiz',
    color: 'bg-violet-500/15 text-violet-300 border-violet-400/20',
    accent: 'from-violet-500 to-purple-600',
  },
  TASK: {
    label: 'Tarea',
    color: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
    accent: 'from-amber-500 to-orange-600',
  },
  MATERIAL: {
    label: 'Material',
    color: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20',
    accent: 'from-cyan-500 to-teal-600',
  },
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ActivityList({ activities: initial, courseId, role }) {
  const [activities, setActivities] = useState(initial);

  function handleRemove(activityId) {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }

  function handleTogglePublish(activityId, isPublished) {
    setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, isPublished } : a)));
  }

  if (!activities.length) {
    return (
      <p className="text-sm font-medium text-slate-200/60">No hay actividades en este curso.</p>
    );
  }

  const grouped = {
    MATERIAL: activities.filter((a) => a.type === 'MATERIAL'),
    QUIZ: activities.filter((a) => a.type === 'QUIZ'),
    TASK: activities.filter((a) => a.type === 'TASK'),
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => {
        if (!items.length) return null;
        const cfg = typeConfig[type];
        return (
          <div key={type}>
            <h3 className="text-sm font-bold text-slate-400 mb-3">
              {cfg.label}s ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((activity) => {
                const done = activity.studentStatus?.submitted;
                return (
                  <div
                    key={activity.id}
                    className={`group relative flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-white/8 transition ${
                      done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Link
                      href={`/dashboard/cursos/${courseId}/actividades/${activity.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {activity.title}
                        </span>
                        {!activity.isPublished && (
                          <span className="inline-flex items-center rounded-full bg-slate-500/20 text-slate-400 border border-slate-400/20 px-2 py-0.5 text-[10px] font-bold">
                            Borrador
                          </span>
                        )}
                        {done && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Realizada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {activity.dueDate && <span>Entrega: {formatDate(activity.dueDate)}</span>}
                        {activity._count?.questions > 0 && (
                          <span>{activity._count.questions} preguntas</span>
                        )}
                        {activity._count?.submissions > 0 && (
                          <span>{activity._count.submissions} envios</span>
                        )}
                      </div>
                    </Link>

                    {done && (
                      <div className="shrink-0 ml-3 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <svg
                          className="w-5 h-5 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {(role === 'TEACHER' || role === 'ADMIN') && (
                      <ActivityActions
                        courseId={courseId}
                        activity={activity}
                        onRemove={handleRemove}
                        onTogglePublish={handleTogglePublish}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
