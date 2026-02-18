'use client';

import Image from "next/image";
import Link from "next/link";

function RoleCard({ title, desc, href, accent }) {
  return (
    <Link
      href={href}
      className="group relative rounded-3xl border border-white/15 bg-slate-950/50 backdrop-blur-xl
                 p-8 shadow-2xl transition hover:-translate-y-1 hover:shadow-3xl overflow-hidden"
    >
      {/* fondo gradiente */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-70`}
      />

      {/* ✅ flex para alinear CTA en el fondo en todas */}
      <div className="relative flex h-full min-h-[260px] flex-col">
        {/* Título más notorio */}
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
          {title}
        </h2>

        {/* ✅ contenido más gruesito y legible */}
        <p className="mt-3 text-[15px] md:text-[15.5px] leading-relaxed font-medium text-slate-100/90">
          {desc}
        </p>

        {/* ✅ CTA alineado abajo */}
        <div className="mt-auto pt-6">
          <span
            className="inline-flex items-center justify-center gap-2 rounded-xl
                       border border-white/20 bg-white/10
                       px-5 py-2.5 text-sm font-extrabold text-white
                       group-hover:bg-white/20 transition"
          >
            Ingresar <span aria-hidden className="text-base">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AccesoPage() {
  return (
    <div className="px-6 flex items-start justify-center pt-8">
      <div className="w-full max-w-6xl relative">
        {/* Logo ACCI */}
        <div className="flex justify-center mb-6 mt-3">
          <div className="relative h-28 w-[380px] md:h-32 md:w-[520px]">
            <Image
              src="/brand/acci.png"
              alt="ACCI"
              fill
              sizes="(min-width: 768px) 520px, 380px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Acceso a la plataforma ACCI
          </h1>

          {/* ✅ más gruesita y más visible */}
          <p className="mt-4 text-base md:text-[17px] font-bold text-slate-100/90 max-w-2xl mx-auto">
            Selecciona tu perfil para ingresar al entorno académico correspondiente.
          </p>
        </div>

        {/* ✅ Grid más ancho (cards menos “apretadas”) */}
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 md:gap-9">
            <RoleCard
              title="Estudiante"
              desc="Consulta tus cursos, realiza actividades semanales, repite quizzes sin límite y da seguimiento a tu progreso académico y espiritual."
              href="/login?role=STUDENT"
              accent="from-emerald-500/35 via-sky-500/15 to-transparent"
            />

            <RoleCard
              title="Instructor"
              desc="Administra cursos, crea actividades, evalúa quizzes y acompaña el crecimiento académico y cristiano de tus estudiantes."
              href="/login?role=TEACHER"
              accent="from-sky-500/35 via-indigo-500/15 to-transparent"
            />

            <RoleCard
              title="Coordinador"
              desc="Gestiona usuarios, supervisa el avance institucional y administra la plataforma educativa ACCI."
              href="/login?role=ADMIN"
              accent="from-blue-500/35 via-slate-500/15 to-transparent"
            />
          </div>
        </div>

        {/* halo difuso debajo de las cards */}
        <div className="pointer-events-none absolute left-1/2 w-full max-w-5xl -translate-x-1/2 -bottom-40 h-48 blur-3xl bg-sky-500/10" />

        <div className="mt-12 text-center text-xs font-semibold text-slate-200/70">
          ACCI Platform · Academia de Crecimiento Cristiano Integral
        </div>
      </div>
    </div>
  );
}
