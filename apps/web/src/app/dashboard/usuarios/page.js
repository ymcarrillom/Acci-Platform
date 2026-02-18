import { cookies } from "next/headers";
import Link from "next/link";
import UserSearch from "./UserSearch";

const API_URL = process.env.API_URL || "http://localhost:4000";

async function getUsers(token, { search = "", role = "", page = "1" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  params.set("page", page);
  params.set("limit", "12");

  const r = await fetch(`${API_URL}/users?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

async function getUserRole(token) {
  const r = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.role;
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isActive
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
          : "bg-red-500/15 text-red-300 border border-red-400/20"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function RoleBadge({ role }) {
  const styles = {
    ADMIN: "bg-blue-500/15 text-blue-200 border-blue-400/20",
    TEACHER: "bg-sky-500/15 text-sky-200 border-sky-400/20",
    STUDENT: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  };
  const labels = {
    ADMIN: "Coordinador",
    TEACHER: "Instructor",
    STUDENT: "Estudiante",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        styles[role] || styles.STUDENT
      }`}
    >
      {labels[role] || role}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ROLE_ORDER = ["ADMIN", "TEACHER", "STUDENT"];
const ROLE_LABELS = {
  ADMIN: "Coordinadores",
  TEACHER: "Instructores",
  STUDENT: "Estudiantes",
};
const ROLE_GRADIENTS = {
  ADMIN: "from-blue-500 to-indigo-600",
  TEACHER: "from-sky-500 to-blue-600",
  STUDENT: "from-emerald-500 to-green-600",
};
const ROLE_GLOWS = {
  ADMIN: "from-blue-500/30 via-indigo-500/15 to-transparent",
  TEACHER: "from-sky-500/30 via-blue-500/15 to-transparent",
  STUDENT: "from-emerald-500/30 via-green-500/15 to-transparent",
};

function UserCard({ user }) {
  return (
    <Link
      href={`/dashboard/usuarios/${user.id}`}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl transition hover:-translate-y-1 hover:shadow-3xl"
    >
      <div className={`pointer-events-none absolute -inset-16 opacity-50 blur-3xl bg-gradient-to-br ${ROLE_GLOWS[user.role] || ROLE_GLOWS.STUDENT}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
      <div className={`h-[3px] w-full bg-gradient-to-r ${ROLE_GRADIENTS[user.role] || ROLE_GRADIENTS.STUDENT}`} />

      <div className="relative p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-white truncate group-hover:text-sky-200 transition">
              {user.fullName}
            </h3>
            <p className="text-sm font-medium text-slate-200/70 truncate">
              {user.email}
            </p>
          </div>
          <StatusBadge isActive={user.isActive} />
        </div>

        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
        </div>

        <div className="text-xs font-semibold text-slate-200/60">
          <span className="text-slate-400">Creado:</span>{" "}
          <span className="text-slate-200/90">{formatDate(user.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function UsuariosPage({ searchParams }) {
  const sp = await searchParams;
  const currentSearch = sp?.search || "";
  const currentRole = sp?.role || "";
  const currentPage = sp?.page || "1";

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sesión no válida</div>
        <p className="text-slate-200/80 mt-2">Vuelve a ingresar.</p>
        <a href="/acceso" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Ir a /acceso
        </a>
      </div>
    );
  }

  const [data, role] = await Promise.all([
    getUsers(accessToken, { search: currentSearch, role: currentRole, page: currentPage }),
    getUserRole(accessToken),
  ]);

  if (role !== "ADMIN") {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="text-white font-extrabold text-xl">Sin permisos</div>
        <p className="text-slate-200/80 mt-2">Solo administradores pueden gestionar usuarios.</p>
        <Link href="/dashboard" className="inline-block mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const users = data?.users || [];
  const total = data?.total || users.length;
  const totalPages = data?.totalPages || 1;
  const pageNum = parseInt(currentPage) || 1;

  // Agrupar usuarios por rol
  const grouped = {};
  for (const u of users) {
    if (!grouped[u.role]) grouped[u.role] = [];
    grouped[u.role].push(u);
  }

  // Roles que tienen usuarios, en orden definido
  const activeRoles = ROLE_ORDER.filter((r) => grouped[r]?.length > 0);

  function buildPageUrl(page) {
    const params = new URLSearchParams();
    if (currentSearch) params.set("search", currentSearch);
    if (currentRole) params.set("role", currentRole);
    params.set("page", String(page));
    return `/dashboard/usuarios?${params}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Usuarios</h1>
          <p className="mt-1 text-sm font-medium text-slate-200/70">
            Gestiona todos los usuarios de la plataforma — {total} en total.
          </p>
        </div>

        <Link
          href="/dashboard/usuarios/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-extrabold text-white hover:from-sky-400 hover:to-blue-500 transition"
        >
          + Crear usuario
        </Link>
      </div>

      {/* Search */}
      <UserSearch />

      {/* Usuarios agrupados por rol */}
      {users.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-10 shadow-2xl text-center">
          <div className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br from-sky-500/30 via-blue-500/15 to-transparent" />
          <div className="relative">
            <div className="text-lg font-extrabold text-white">
              {currentSearch ? "Sin resultados" : "Sin usuarios"}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-200/70">
              {currentSearch ? `No se encontraron usuarios para "${currentSearch}"` : "Crea tu primer usuario para comenzar."}
            </p>
          </div>
        </div>
      ) : (
        activeRoles.map((r) => (
          <div key={r} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-extrabold text-white">
                {ROLE_LABELS[r]}
              </h2>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-slate-300">
                {grouped[r].length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {grouped[r].map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {pageNum > 1 && (
            <Link
              href={buildPageUrl(pageNum - 1)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10 transition"
            >
              Anterior
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildPageUrl(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                p === pageNum
                  ? "bg-sky-500/20 border border-sky-400/30 text-sky-200"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {p}
            </Link>
          ))}
          {pageNum < totalPages && (
            <Link
              href={buildPageUrl(pageNum + 1)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10 transition"
            >
              Siguiente
            </Link>
          )}
        </div>
      )}

      <div className="text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-300/70 hover:text-white transition"
        >
          ← Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
