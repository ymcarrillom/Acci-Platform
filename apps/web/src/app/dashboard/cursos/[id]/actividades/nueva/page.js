import Link from "next/link";
import ActivityForm from "../ActivityForm";

export default async function NuevaActividadPage({ params }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/cursos/${id}`} className="text-sm font-semibold text-slate-300/70 hover:text-white transition">
        ← Volver al curso
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/35 via-indigo-500/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600" />

        <div className="relative p-7">
          <h1 className="text-xl font-extrabold text-white mb-6">Crear actividad</h1>
          <ActivityForm courseId={id} />
        </div>
      </div>
    </div>
  );
}
