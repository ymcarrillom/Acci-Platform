import { cookies } from 'next/headers';
import Link from 'next/link';
import CourseForm from '../../CourseForm';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export default async function EditarCursoPage({ params }) {
  const { id } = await params;
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

  // Verify ADMIN
  const dashRes = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const dashData = await dashRes.json().catch(() => null);

  if (dashData?.role !== 'ADMIN') {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sin permisos</div>
        <Link
          href={`/dashboard/cursos/${id}`}
          className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
        >
          Volver al curso
        </Link>
      </div>
    );
  }

  // Fetch course
  const courseRes = await fetch(`${API_URL}/courses/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const courseData = await courseRes.json().catch(() => null);
  const course = courseData?.course;

  if (!course) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/cursos"
          className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver a cursos
        </Link>
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="text-white font-extrabold text-xl">Curso no encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/cursos/${id}`}
        className="text-sm font-semibold text-slate-300/70 hover:text-white transition"
      >
        ← Volver al curso
      </Link>
      <CourseForm course={course} />
    </div>
  );
}
