import { cookies } from "next/headers";
import Link from "next/link";
import CourseForm from "../CourseForm";

const API_URL = process.env.API_URL || "http://localhost:4000";

export default async function NuevoCursoPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
        <a href="/acceso" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Ir a /acceso
        </a>
      </div>
    );
  }

  // Verificar que es ADMIN
  const r = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await r.json().catch(() => null);

  if (data?.role !== "ADMIN") {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sin permisos</div>
        <p className="text-slate-200/80 mt-2">Solo administradores pueden crear cursos.</p>
        <Link href="/dashboard/cursos" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Volver a cursos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/cursos" className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
          ← Volver a cursos
        </Link>
      </div>
      <CourseForm />
    </div>
  );
}
