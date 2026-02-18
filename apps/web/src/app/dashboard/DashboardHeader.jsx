"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function roleLabel(role) {
  if (role === "TEACHER") return "Instructor";
  if (role === "ADMIN") return "Coordinador";
  return "Estudiante";
}

function roleBadge(role) {
  if (role === "TEACHER") return "bg-sky-500/15 text-sky-200 border-sky-400/20";
  if (role === "ADMIN") return "bg-blue-500/15 text-blue-200 border-blue-400/20";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
}

export default function DashboardHeader({ role, fullName }) {
  const router = useRouter();
  const pathname = usePathname();

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      router.replace("/acceso");
      router.refresh();
    }
  }

  const navLinks = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/dashboard/cursos", label: "Cursos" },
    ...(role === "ADMIN"
      ? [
          { href: "/dashboard/usuarios", label: "Usuarios" },
          { href: "/dashboard/auditoria", label: "Auditoría" },
        ]
      : []),
    { href: "/dashboard/configuracion", label: "Perfil" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {/* Sello institucional de la iglesia */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-lg ring-1 ring-white/10">
            <Image
              src="/brand/iglesia.png"
              alt="Iglesia ACCI"
              fill
              className="object-cover"
              sizes="56px"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="text-lg md:text-xl font-bold tracking-tight text-white truncate">
              {fullName ? `Hola, ${fullName.split(" ")[0]}` : "Dashboard"}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${roleBadge(
                  role
                )}`}
              >
                {roleLabel(role)}
              </span>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/90">
                ACCI Platform
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onLogout}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 transition"
          >
            Cerrar sesion
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-300/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
