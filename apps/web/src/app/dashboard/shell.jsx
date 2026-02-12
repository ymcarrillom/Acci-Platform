import Link from "next/link";

function roleLabel(role) {
  if (role === "TEACHER") return "Docente";
  if (role === "ADMIN") return "Coordinador";
  return "Estudiante";
}

function navByRole(role) {
  const common = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/dashboard/cursos", label: "Cursos" },
    { href: "/dashboard/actividades", label: "Actividades" },
    { href: "/dashboard/quizzes", label: "Quizzes" },
  ];

  if (role === "TEACHER") {
    return [
      ...common,
      { href: "/dashboard/revision", label: "Revisión" },
      { href: "/dashboard/reportes", label: "Reportes" },
    ];
  }

  if (role === "ADMIN") {
    return [
      ...common,
      { href: "/dashboard/usuarios", label: "Usuarios" },
      { href: "/dashboard/reportes", label: "Reportes" },
      { href: "/dashboard/configuracion", label: "Configuración" },
    ];
  }

  return [...common, { href: "/dashboard/progreso", label: "Progreso" }];
}

export default function DashboardShell({ me, children }) {
  const items = navByRole(me.role);

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="text-white font-extrabold text-lg leading-tight">
              {me.name || me.email}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-100/70">
              {roleLabel(me.role)}
            </div>
          </div>

          <nav className="p-3">
            <div className="grid gap-2">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/90 hover:bg-white/10 transition"
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-white/10">
            <form action="/api/auth/logout" method="POST">
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white hover:bg-white/10 transition">
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
