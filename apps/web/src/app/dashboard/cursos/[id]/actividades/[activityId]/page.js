import { cookies } from 'next/headers';
import Link from 'next/link';
import QuizPlayer from './QuizPlayer';
import QuizResults from './QuizResults';
import TaskSubmitForm from './TaskSubmitForm';

const API_URL = process.env.API_URL || 'http://localhost:4000';

const typeLabels = { QUIZ: 'Quiz', TASK: 'Tarea', MATERIAL: 'Material' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function ActivityDetailPage({ params, searchParams }) {
  const { id, activityId } = await params;
  const sp = await searchParams;
  const retryMode = sp?.retry === '1';
  const cookieStore = await cookies();
  const raw = cookieStore.get('accessToken')?.value;
  const accessToken = raw ? decodeURIComponent(raw) : null;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
        <a
          href="/acceso"
          className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Ir a /acceso
        </a>
      </div>
    );
  }

  const [actRes, dashRes] = await Promise.all([
    fetch(`${API_URL}/courses/${id}/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
    fetch(`${API_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
  ]);

  const actData = await actRes.json().catch(() => null);
  const dashData = await dashRes.json().catch(() => null);
  const activity = actData?.activity;
  const submission = actData?.submission;
  const submissions = actData?.submissions || [];
  const canRetry = actData?.canRetry ?? false;
  const attemptCount = actData?.attemptCount ?? 0;
  const role = dashData?.role;

  if (!activity) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/cursos/${id}`}
          className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver al curso
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Actividad no encontrada</div>
        </div>
      </div>
    );
  }

  const isTeacher = role === 'TEACHER' || role === 'ADMIN';
  const isStudent = role === 'STUDENT';

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/cursos/${id}`}
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver al curso
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/25 via-sky-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

        <div className="relative p-7 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-bold text-violet-300/80">
                {typeLabels[activity.type]}
              </span>
              <h1 className="mt-1 text-2xl font-extrabold text-white">{activity.title}</h1>
              {activity.dueDate && (
                <p className="mt-1 text-xs text-slate-400">
                  Fecha de entrega: {formatDate(activity.dueDate)}
                </p>
              )}
              {activity.timeLimit && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Tiempo límite: {activity.timeLimit} minutos
                </p>
              )}
            </div>
            {isTeacher && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/cursos/${id}/actividades/${activityId}/envios`}
                  className="rounded-xl bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition"
                >
                  Ver envíos
                </Link>
                <Link
                  href={`/dashboard/cursos/${id}/actividades/${activityId}/editar`}
                  className="rounded-xl bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition"
                >
                  Editar
                </Link>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white whitespace-pre-wrap">{activity.description}</p>
            </div>
          )}

          {/* === Material: show file === */}
          {activity.type === 'MATERIAL' && activity.fileUrl && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-cyan-300">Documento adjunto</div>
                <p className="text-xs text-slate-400 mt-0.5">{activity.fileUrl.split('/').pop()}</p>
              </div>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${activity.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-cyan-500/20 border border-cyan-400/20 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 transition"
              >
                Descargar
              </a>
            </div>
          )}

          {/* === Material: no content fallback === */}
          {activity.type === 'MATERIAL' && !activity.fileUrl && !activity.description && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-5 text-center">
              <div className="text-sm font-bold text-amber-300">Material sin contenido aun</div>
              <p className="text-xs text-slate-400 mt-1">
                El docente todavia no ha subido un archivo ni agregado descripcion a este material.
              </p>
            </div>
          )}

          {/* === Task: show professor's attached file === */}
          {activity.type === 'TASK' && activity.fileUrl && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-cyan-300">Documento adjunto</div>
                <p className="text-xs text-slate-400 mt-0.5">{activity.fileUrl.split('/').pop()}</p>
              </div>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${activity.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-cyan-500/20 border border-cyan-400/20 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 transition"
              >
                Descargar
              </a>
            </div>
          )}

          {/* === Student views === */}
          {isStudent && activity.type === 'QUIZ' && (!submission || (retryMode && canRetry)) && (
            <QuizPlayer courseId={id} activity={activity} />
          )}

          {isStudent && activity.type === 'QUIZ' && submission && !retryMode && (
            <div className="space-y-4">
              <QuizResults activity={activity} submission={submission} />

              {/* Attempt info + retry */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-slate-400">
                  Intento {attemptCount} de{' '}
                  {activity.maxAttempts === 0 ? 'ilimitados' : activity.maxAttempts}
                </div>
                {canRetry && (
                  <a
                    href={`/dashboard/cursos/${id}/actividades/${activityId}?retry=1`}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:shadow-violet-500/25 transition"
                  >
                    Reintentar quiz
                  </a>
                )}
              </div>

              {/* Previous attempts */}
              {submissions.length > 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-400">Historial de intentos</h3>
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300">Intento {sub.attempt}</span>
                      <span className="text-slate-400">{formatDate(sub.submittedAt)}</span>
                      {activity.showScore && sub.grade != null && (
                        <span className="font-bold text-emerald-300">
                          {sub.grade}/{sub.maxGrade}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isStudent && activity.type === 'TASK' && !submission && (
            <TaskSubmitForm courseId={id} activityId={activityId} />
          )}

          {isStudent && activity.type === 'TASK' && submission && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="text-sm font-bold text-emerald-300">Tarea entregada</div>
                <p className="mt-1 text-xs text-slate-400">
                  Enviada el {formatDate(submission.submittedAt)}
                </p>
              </div>

              {submission.content && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="text-xs font-semibold text-slate-400">Tu entrega</span>
                  <p className="mt-1 text-sm text-white whitespace-pre-wrap">
                    {submission.content}
                  </p>
                </div>
              )}

              {submission.fileUrl && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-amber-300">Archivo adjunto</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {submission.fileUrl.split('/').pop()}
                    </p>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${submission.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-amber-500/20 border border-amber-400/20 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition"
                  >
                    Descargar
                  </a>
                </div>
              )}

              {activity.showScore && submission.grade != null && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-center">
                  <div className="text-xs font-semibold text-slate-400">Calificación</div>
                  <div className="text-2xl font-extrabold text-emerald-300 mt-1">
                    {submission.grade}
                  </div>
                </div>
              )}

              {submission.feedback && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="text-xs font-semibold text-slate-400">Retroalimentación</span>
                  <p className="mt-1 text-sm text-white whitespace-pre-wrap">
                    {submission.feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Teacher: show questions preview for QUIZ */}
          {isTeacher && activity.type === 'QUIZ' && activity.questions?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400">
                Preguntas ({activity.questions.length})
              </h3>
              {activity.questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">
                    {i + 1}. {q.text}
                    <span className="ml-2 text-xs text-slate-400">({q.points} pts)</span>
                  </p>
                  {q.options?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`text-xs px-2 py-1 rounded ${opt.isCorrect ? 'text-emerald-300 bg-emerald-500/10' : 'text-slate-400'}`}
                        >
                          {opt.isCorrect ? '✓' : '○'} {opt.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
