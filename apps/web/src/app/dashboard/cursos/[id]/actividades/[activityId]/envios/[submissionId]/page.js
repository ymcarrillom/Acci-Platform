import { cookies } from 'next/headers';
import Link from 'next/link';
import GradeForm from '../GradeForm';
import ResetButton from '../ResetButton';

const API_URL = process.env.API_URL || 'http://localhost:4000';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function SubmissionDetailPage({ params }) {
  const { id, activityId, submissionId } = await params;
  const cookieStore = await cookies();
  const raw = cookieStore.get('accessToken')?.value;
  const accessToken = raw ? decodeURIComponent(raw) : null;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
      </div>
    );
  }

  // Fetch submission + dashboard role
  const [subRes, dashRes] = await Promise.all([
    fetch(`${API_URL}/courses/${id}/activities/${activityId}/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
    fetch(`${API_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
  ]);

  const subData = await subRes.json().catch(() => null);
  const dashData = await dashRes.json().catch(() => null);
  const submission = subData?.submission;
  const role = dashData?.role;

  if (!submission) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/cursos/${id}/actividades/${activityId}/envios`}
          className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver a envíos
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Envío no encontrado</div>
        </div>
      </div>
    );
  }

  const isTeacher = role === 'TEACHER' || role === 'ADMIN';

  return (
    <div className="space-y-6">
      <Link
        href={
          isTeacher
            ? `/dashboard/cursos/${id}/actividades/${activityId}/envios`
            : `/dashboard/cursos/${id}/actividades/${activityId}`
        }
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/25 via-indigo-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7 space-y-6">
          <div>
            <h1 className="text-xl font-extrabold text-white">
              Envío de {submission.student?.fullName}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {submission.activity?.title} | Enviado: {formatDate(submission.submittedAt)}
            </p>
          </div>

          {/* Grade info */}
          <div className="flex items-center gap-4 flex-wrap">
            {submission.grade != null && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
                <span className="text-xs font-semibold text-slate-400">Calificación</span>
                <div className="text-lg font-extrabold text-emerald-300">
                  {submission.grade} / {submission.maxGrade || '-'}
                </div>
              </div>
            )}
            {submission.gradedBy && (
              <div className="text-xs text-slate-400">
                Calificado por {submission.gradedBy.fullName} el {formatDate(submission.gradedAt)}
              </div>
            )}
          </div>

          {submission.feedback && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs font-semibold text-slate-400">Retroalimentación</span>
              <p className="mt-1 text-sm text-white whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          )}

          {/* Task content */}
          {submission.content && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs font-semibold text-slate-400">Contenido de la tarea</span>
              <p className="mt-1 text-sm text-white whitespace-pre-wrap">{submission.content}</p>
            </div>
          )}

          {/* Attached file */}
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

          {/* Quiz answers */}
          {submission.answers?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400">Respuestas</h2>
              {submission.answers.map((ans, i) => (
                <div key={ans.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {i + 1}. {ans.question?.text}
                    </p>
                    {ans.isCorrect != null && (
                      <span
                        className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${
                          ans.isCorrect
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                            : 'bg-red-500/15 text-red-300 border border-red-400/20'
                        }`}
                      >
                        {ans.isCorrect ? 'Correcta' : 'Incorrecta'}
                      </span>
                    )}
                    {ans.isCorrect == null && (
                      <span className="shrink-0 text-xs font-bold rounded-full px-2 py-0.5 bg-slate-500/20 text-slate-400 border border-slate-400/20">
                        Abierta
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    {ans.selectedOption ? (
                      <span>Respuesta: {ans.selectedOption.text}</span>
                    ) : ans.answerText ? (
                      <span className="whitespace-pre-wrap">{ans.answerText}</span>
                    ) : (
                      <span className="text-slate-400">Sin respuesta</span>
                    )}
                  </div>
                  {isTeacher && ans.question?.options?.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      Correcta: {ans.question.options.find((o) => o.isCorrect)?.text || '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Grade form for teacher */}
          {isTeacher && (
            <GradeForm
              courseId={id}
              activityId={activityId}
              submissionId={submissionId}
              currentGrade={submission.grade}
              currentFeedback={submission.feedback}
              maxGrade={submission.maxGrade}
            />
          )}

          {/* Reset button for teacher */}
          {isTeacher && (
            <ResetButton
              courseId={id}
              activityId={activityId}
              submissionId={submissionId}
              studentName={submission.student?.fullName || 'estudiante'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
