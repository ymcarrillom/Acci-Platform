import { cookies } from "next/headers";
import Link from "next/link";

const API_URL = process.env.API_URL || "http://localhost:4000";

async function getDashboardData() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return null;
  }

  const r = await fetch(`${API_URL}/dashboard`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!r.ok) {
    console.error("Dashboard API error:", r.status);
    return null;
  }

  return r.json();
}

function StatCard({ title, value, hint, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-2xl">
      <div className={`pointer-events-none absolute -inset-16 opacity-70 blur-3xl bg-gradient-to-br ${accent}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/40" />
      <div className={`h-[3px] w-full bg-gradient-to-r ${accent}`} />

      <div className="relative p-6">
        <div className="text-sm font-semibold text-slate-100/85">{title}</div>
        <div className="mt-2 text-4xl font-black text-white">{String(value ?? "-")}</div>
        {hint ? <div className="mt-2 text-xs font-semibold text-slate-200/70">{hint}</div> : null}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-2xl">
      <div className={`pointer-events-none absolute -inset-20 opacity-50 blur-3xl bg-gradient-to-br ${accent}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/7 via-transparent to-black/45" />
      <div className={`h-[3px] w-full bg-gradient-to-r ${accent}`} />

      <div className="relative p-7">
        <div className="flex flex-col gap-1">
          <div className="text-lg font-extrabold text-white">{title}</div>
          {subtitle ? <div className="text-sm font-semibold text-slate-100/70">{subtitle}</div> : null}
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function ActionCard({ title, desc, meta, accent, href }) {
  const content = (
    <>
      <div className={`pointer-events-none absolute -inset-12 opacity-45 blur-2xl bg-gradient-to-br ${accent}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/40" />
      <div className="relative">
        <div className="font-extrabold text-white">{title}</div>
        <p className="mt-2 text-sm font-medium text-slate-100/85">{desc}</p>
        {meta ? <div className="mt-3 text-xs font-semibold text-slate-200/70">{meta}</div> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 block hover:bg-white/8 transition">
        {content}
      </Link>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
      {content}
    </div>
  );
}

const typeLabels = { QUIZ: "Quiz", TASK: "Tarea", MATERIAL: "Material" };
const typeBadge = {
  QUIZ: "bg-violet-500/15 text-violet-300 border-violet-400/20",
  TASK: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  MATERIAL: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="text-white font-extrabold text-xl">Sesión no válida</div>
          <p className="text-slate-200/80 mt-2 font-medium">Vuelve a ingresar desde la selección de perfil.</p>
          <a
            className="inline-block mt-5 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            href="/acceso"
          >
            Ir a /acceso
          </a>
        </div>
      </div>
    );
  }

  const { role, metrics = {}, recentCourses = [], recentActivities = [] } = data;

  const A =
    role === "STUDENT"
      ? {
          main: "from-emerald-500/55 via-sky-500/35 to-transparent",
          alt: "from-sky-500/55 via-emerald-500/35 to-transparent",
          soft: "from-emerald-500/35 via-sky-500/20 to-transparent",
        }
      : role === "TEACHER"
      ? {
          main: "from-sky-500/60 via-indigo-500/35 to-transparent",
          alt: "from-indigo-500/60 via-sky-500/30 to-transparent",
          soft: "from-sky-500/35 via-indigo-500/20 to-transparent",
        }
      : {
          main: "from-blue-500/60 via-cyan-500/30 to-transparent",
          alt: "from-cyan-500/55 via-blue-500/30 to-transparent",
          soft: "from-blue-500/35 via-cyan-500/18 to-transparent",
        };

  return (
    <div className="space-y-8">
      {role === "STUDENT" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard
              title="Cursos inscritos"
              value={metrics.enrolledCourses ?? 0}
              hint="Cursos en los que participas"
              accent={A.main}
            />
            <StatCard
              title="Quizzes completados"
              value={metrics.quizzesDone ?? 0}
              hint="Total de evaluaciones realizadas"
              accent={A.alt}
            />
            <StatCard
              title="Avance del modulo"
              value={metrics.monthProgress ?? "0%"}
              hint="Progreso estimado del mes actual"
              accent={A.main}
            />
          </div>

          <Panel
            title="Mi panel"
            subtitle="Accede a tus recursos academicos."
            accent={A.soft}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionCard
                title="Mis cursos"
                desc="Consulta los cursos en los que estas inscrito."
                meta={`${metrics.enrolledCourses ?? 0} curso${(metrics.enrolledCourses ?? 0) !== 1 ? "s" : ""} activo${(metrics.enrolledCourses ?? 0) !== 1 ? "s" : ""}`}
                accent={A.main}
                href="/dashboard/cursos"
              />
              <ActionCard
                title="Mis actividades"
                desc="Revisa tus quizzes, tareas y materiales."
                meta={`${metrics.quizzesDone ?? 0} quiz${(metrics.quizzesDone ?? 0) !== 1 ? "zes" : ""} completado${(metrics.quizzesDone ?? 0) !== 1 ? "s" : ""}`}
                accent={A.alt}
                href="/dashboard/actividades"
              />
              <ActionCard
                title="Mi asistencia"
                desc={metrics.attendancePct !== null ? `${metrics.attendancePct}% de asistencia general.` : "Sin registros de asistencia aun."}
                meta={metrics.attendanceTotal > 0 ? `${metrics.attendancePresent} de ${metrics.attendanceTotal} clases` : "Se actualizara cuando el docente registre asistencia."}
                accent={A.main}
                href="/dashboard/mi-asistencia"
              />
            </div>
          </Panel>
        </>
      ) : null}

      {role === "TEACHER" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Cursos a cargo"
              value={metrics.assignedCourses ?? 0}
              hint="Asignaciones activas"
              accent={A.main}
            />
            <StatCard
              title="Estudiantes totales"
              value={metrics.totalStudents ?? 0}
              hint="Inscritos en tus cursos"
              accent={A.alt}
            />
            <StatCard
              title="Por calificar"
              value={metrics.pendingGrading ?? 0}
              hint="Quizzes + tareas sin calificar"
              accent={A.main}
            />
            <StatCard
              title="Actividades publicadas"
              value={metrics.totalActivities ?? 0}
              hint="Material, quizzes y tareas"
              accent={A.alt}
            />
          </div>

          <Panel
            title="Acciones rapidas"
            subtitle="Herramientas esenciales para gestion academica."
            accent={A.soft}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionCard
                title="Crear actividad semanal"
                desc="Publica lectura, recurso opcional y quiz para tu curso."
                meta="Sugerencia: 10-15 preguntas por tema."
                accent={A.main}
                href="/dashboard/actividad-semanal"
              />
              <ActionCard
                title="Retroalimentacion"
                desc="Guia con comentarios claros y motivadores."
                meta={`${metrics.pendingGrading ?? 0} entrega${(metrics.pendingGrading ?? 0) !== 1 ? "s" : ""} pendiente${(metrics.pendingGrading ?? 0) !== 1 ? "s" : ""}`}
                accent={A.alt}
                href="/dashboard/retroalimentacion"
              />
              <ActionCard
                title="Seguimiento del grupo"
                desc="Identifica avances y estudiantes que necesitan apoyo."
                meta={`${metrics.totalStudents ?? 0} estudiante${(metrics.totalStudents ?? 0) !== 1 ? "s" : ""}`}
                accent={A.main}
                href="/dashboard/seguimiento"
              />
            </div>
          </Panel>

          <Panel
            title="Mis cursos"
            subtitle="Cursos asignados a tu cargo."
            accent={A.soft}
          >
            {recentCourses.length === 0 ? (
              <p className="text-sm font-medium text-slate-200/60">No tienes cursos asignados.</p>
            ) : (
              <div className="space-y-2">
                {recentCourses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/cursos/${c.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white">{c.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{c.code}</span>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {c._count?.enrollments ?? 0} inscritos
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {recentActivities.length > 0 && (
            <Panel
              title="Actividades recientes"
              subtitle="Ultimas actividades publicadas en tus cursos."
              accent={A.alt}
            >
              <div className="space-y-2">
                {recentActivities.map((act) => (
                  <Link
                    key={act.id}
                    href={`/dashboard/cursos/${act.courseId}/actividades/${act.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition"
                  >
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${typeBadge[act.type] || typeBadge.MATERIAL}`}>
                        {typeLabels[act.type] || act.type}
                      </span>
                      <span className="text-sm font-bold text-white truncate">{act.title}</span>
                    </div>
                    <div className="shrink-0 text-xs text-slate-400 ml-2">
                      {act.course?.name} {act.createdAt ? `· ${formatDate(act.createdAt)}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </>
      ) : null}

      {role === "ADMIN" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Usuarios registrados"
              value={metrics.totalUsers ?? 0}
              hint="Total en la plataforma"
              accent={A.main}
            />
            <StatCard
              title="Cursos activos"
              value={metrics.totalCourses ?? 0}
              hint="Cursos en la plataforma"
              accent={A.alt}
            />
            <StatCard
              title="Actividades publicadas"
              value={metrics.totalActivities ?? 0}
              hint="Material, quizzes y tareas"
              accent={A.main}
            />
            <StatCard
              title="Por calificar"
              value={metrics.pendingGrading ?? 0}
              hint="Entregas sin calificar"
              accent={A.alt}
            />
          </div>

          <Panel
            title="Administracion"
            subtitle="Control institucional, seguridad y seguimiento."
            accent={A.soft}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionCard
                title="Gestion de usuarios"
                desc="Alta/baja, roles y permisos (RBAC)."
                meta={`${metrics.totalUsers ?? 0} usuarios · ${metrics.activeUsers ?? 0} activos`}
                accent={A.main}
                href="/dashboard/usuarios"
              />
              <ActionCard
                title="Reportes institucionales"
                desc="Vision general de actividad y progreso."
                meta={`${metrics.totalCourses ?? 0} cursos activos`}
                accent={A.alt}
                href="/dashboard/reportes"
              />
              <ActionCard
                title="Auditoria y seguridad"
                desc="Sesiones activas y control de accesos."
                meta={`${metrics.sessionsActive ?? 0} sesiones vigentes`}
                accent={A.main}
                href="/dashboard/auditoria"
              />
            </div>
          </Panel>

          <Panel
            title="Cursos"
            subtitle="Cursos activos en la plataforma."
            accent={A.soft}
          >
            {recentCourses.length === 0 ? (
              <p className="text-sm font-medium text-slate-200/60">No hay cursos activos.</p>
            ) : (
              <div className="space-y-2">
                {recentCourses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/cursos/${c.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white">{c.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{c.code}</span>
                      {c.teacher && <span className="ml-2 text-xs text-slate-500">({c.teacher.fullName})</span>}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {c._count?.enrollments ?? 0} inscritos
                    </span>
                  </Link>
                ))}
                <Link
                  href="/dashboard/cursos"
                  className="block text-center text-xs font-bold text-sky-400/80 hover:text-sky-300 transition pt-2"
                >
                  Ver todos los cursos
                </Link>
              </div>
            )}
          </Panel>

          {recentActivities.length > 0 && (
            <Panel
              title="Actividades recientes"
              subtitle="Ultimas actividades publicadas en la plataforma."
              accent={A.alt}
            >
              <div className="space-y-2">
                {recentActivities.map((act) => (
                  <Link
                    key={act.id}
                    href={`/dashboard/cursos/${act.courseId}/actividades/${act.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition"
                  >
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${typeBadge[act.type] || typeBadge.MATERIAL}`}>
                        {typeLabels[act.type] || act.type}
                      </span>
                      <span className="text-sm font-bold text-white truncate">{act.title}</span>
                    </div>
                    <div className="shrink-0 text-xs text-slate-400 ml-2">
                      {act.course?.name} {act.createdAt ? `· ${formatDate(act.createdAt)}` : ""}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/dashboard/actividades"
                  className="block text-center text-xs font-bold text-sky-400/80 hover:text-sky-300 transition pt-2"
                >
                  Ver todas las actividades
                </Link>
              </div>
            </Panel>
          )}
        </>
      ) : null}

      <div className="text-center text-xs font-semibold text-slate-200/70">
        ACCI Platform · Academia de Crecimiento Cristiano Integral
      </div>
    </div>
  );
}
