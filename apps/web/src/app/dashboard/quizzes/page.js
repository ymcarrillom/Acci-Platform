import { cookies } from 'next/headers';
import Link from 'next/link';

const API_URL = process.env.API_URL || 'http://localhost:4000';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function QuizzesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
      </div>
    );
  }

  const coursesRes = await fetch(`${API_URL}/courses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const coursesData = await coursesRes.json().catch(() => null);
  const courses = coursesData?.courses || [];

  const quizzes = [];
  for (const course of courses) {
    const activitiesRes = await fetch(`${API_URL}/courses/${course.id}/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const activitiesData = await activitiesRes.json().catch(() => null);
    const activities = activitiesData?.activities || [];
    for (const act of activities) {
      if (act.type === 'QUIZ') {
        quizzes.push({ ...act, courseName: course.name, courseId: course.id });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-violet-500/25 via-sky-500/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-purple-600" />

        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white mb-6">Quizzes ({quizzes.length})</h1>

          {quizzes.length === 0 ? (
            <p className="text-sm font-medium text-slate-200/60">No hay quizzes disponibles.</p>
          ) : (
            <div className="space-y-2">
              {quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/dashboard/cursos/${quiz.courseId}/actividades/${quiz.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full border bg-violet-500/15 text-violet-300 border-violet-400/20 px-2 py-0.5 text-[10px] font-bold">
                        Quiz
                      </span>
                      <span className="text-sm font-bold text-white truncate">{quiz.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{quiz.courseName}</span>
                      {quiz._count?.questions > 0 && <span>{quiz._count.questions} preguntas</span>}
                      {quiz.timeLimit && <span>{quiz.timeLimit} min</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
