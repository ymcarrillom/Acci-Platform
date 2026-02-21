'use client';

import Image from "next/image";
import Link from "next/link";

/* ─── Mapa de acentos de color por rol ─── */
const roleAccents = {
  STUDENT: {
    glow:   "from-emerald-500/40 via-sky-500/20 to-transparent",
    bar:    "from-emerald-500 to-sky-500",
    btn:    "bg-gradient-to-r from-emerald-500 to-sky-500 shadow-[0_4px_14px_rgba(16,185,129,0.35)]",
    btnHov: "hover:from-emerald-400 hover:to-sky-400",
  },
  TEACHER: {
    glow:   "from-sky-500/40 via-indigo-500/20 to-transparent",
    bar:    "from-sky-500 to-indigo-500",
    btn:    "bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_4px_14px_rgba(14,165,233,0.35)]",
    btnHov: "hover:from-sky-400 hover:to-indigo-400",
  },
  ADMIN: {
    glow:   "from-blue-500/40 via-violet-500/20 to-transparent",
    bar:    "from-blue-500 to-violet-500",
    btn:    "bg-gradient-to-r from-blue-500 to-violet-500 shadow-[0_4px_14px_rgba(37,99,235,0.35)]",
    btnHov: "hover:from-blue-400 hover:to-violet-400",
  },
};

function RoleCard({ title, desc, href, roleKey }) {
  const a = roleAccents[roleKey];

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line-strong
                 bg-[var(--glass-bg)] backdrop-blur-xl shadow-lg
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl
                 hover:border-[var(--line-strong)]"
    >
      {/* Barra de acento superior */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${a.bar} shrink-0`} />

      {/* Glow de rol */}
      <div className={`pointer-events-none absolute -inset-8 opacity-45 blur-3xl bg-gradient-to-br ${a.glow}`} />

      {/* Contenido */}
      <div className="relative flex flex-1 flex-col p-6 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-tight text-fg-primary">
          {title}
        </h2>

        <p className="mt-3 text-sm sm:text-[15px] leading-relaxed font-medium text-fg-secondary">
          {desc}
        </p>

        {/* Botón CTA */}
        <div className="mt-auto pt-6">
          <span
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5
                        text-sm font-extrabold text-white transition-all duration-150
                        group-hover:brightness-110 group-hover:-translate-y-px
                        ${a.btn} ${a.btnHov}`}
          >
            Ingresar
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AccesoPage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-5xl">

        {/* ── Logo ACCI ── */}
        <div className="flex justify-center mb-5">
          <div className="relative h-24 w-[300px] sm:h-28 sm:w-[400px] md:h-[120px] md:w-[480px]">
            <Image
              src="/brand/acci.png"
              alt="ACCI"
              fill
              sizes="(min-width: 768px) 480px, (min-width: 640px) 400px, 300px"
              className="object-contain acci-logo-img"
              priority
            />
          </div>
        </div>

        {/* ── Cabecera ── */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg-primary">
            Acceso a la plataforma ACCI
          </h1>
          <p className="mt-3 text-sm sm:text-base font-semibold text-fg-secondary max-w-xl mx-auto leading-relaxed">
            Selecciona tu perfil para ingresar al entorno académico correspondiente.
          </p>
        </div>

        {/* ── Cards de rol ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          <RoleCard
            title="Estudiante"
            desc="Consulta tus cursos, realiza actividades semanales, repite quizzes sin límite y da seguimiento a tu progreso académico y espiritual."
            href="/login?role=STUDENT"
            roleKey="STUDENT"
          />
          <RoleCard
            title="Instructor"
            desc="Administra cursos, crea actividades, evalúa quizzes y acompaña el crecimiento académico y cristiano de tus estudiantes."
            href="/login?role=TEACHER"
            roleKey="TEACHER"
          />
          <RoleCard
            title="Coordinador"
            desc="Gestiona usuarios, supervisa el avance institucional y administra la plataforma educativa ACCI."
            href="/login?role=ADMIN"
            roleKey="ADMIN"
          />
        </div>

        {/* ── Footer compacto ── */}
        <p className="mt-8 text-center text-xs font-semibold text-fg-muted">
          ACCI Platform · Academia de Crecimiento Cristiano Integral
        </p>

      </div>
    </div>
  );
}
