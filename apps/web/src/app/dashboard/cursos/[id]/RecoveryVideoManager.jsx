"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecoveryVideoManager({ courseId, initialVideos, students, role }) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos || []);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [uploadStudentId, setUploadStudentId] = useState("");
  const [uploadExpiresAt, setUploadExpiresAt] = useState("");
  const [expandedVideo, setExpandedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  // Access management state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);

  const xhrRef = useRef(null);

  // Abort active upload on unmount
  useEffect(() => {
    return () => { xhrRef.current?.abort(); };
  }, []);

  const isTeacherOrAdmin = role === "TEACHER" || role === "ADMIN";

  async function refreshVideos() {
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos`);
      const d = await r.json().catch(() => ({}));
      setVideos(d.videos || []);
    } catch {}
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
    if (file.size > MAX_FILE_SIZE) {
      setError("El archivo excede el limite de 2 GB");
      return;
    }
    if (uploadStudentId && !uploadExpiresAt) {
      setError("Selecciona una fecha de expiracion para el estudiante");
      return;
    }

    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (uploadStudentId) {
        formData.append("studentId", uploadStudentId);
        formData.append("expiresAt", uploadExpiresAt);
      }

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.message || "Error al subir video"));
          } catch {
            reject(new Error("Error al procesar respuesta"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Error de red")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelado")));
        xhr.addEventListener("timeout", () => reject(new Error("Tiempo de espera agotado")));
        xhr.timeout = 600000; // 10 min timeout
        xhr.open("POST", `/api/courses/${courseId}/recovery-videos`);
        xhr.send(formData);
      });

      xhrRef.current = null;
      setTitle("");
      setDescription("");
      setFile(null);
      setUploadStudentId("");
      setUploadExpiresAt("");
      setShowUpload(false);
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDelete(videoId) {
    if (!confirm("Eliminar este video? Esta accion no se puede deshacer.")) return;
    setError("");
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Error al eliminar");
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrantAccess(videoId) {
    if (!selectedStudent || !expiresAt) return;
    setAccessLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudent, expiresAt }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Error al dar acceso");
      setSelectedStudent("");
      setExpiresAt("");
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    } finally {
      setAccessLoading(false);
    }
  }

  async function handleToggleAccess(videoId, accessId, currentEnabled) {
    setError("");
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/access/${accessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Error al actualizar acceso");
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveAccess(videoId, accessId) {
    setError("");
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/access/${accessId}`, {
        method: "DELETE",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Error al eliminar acceso");
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMarkViewed(videoId) {
    setError("");
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/viewed`, {
        method: "PATCH",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Error al marcar como visto");
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    }
  }

  // ===== STUDENT VIEW =====
  if (!isTeacherOrAdmin) {
    return (
      <div className="space-y-4">
        {videos.length === 0 ? (
          <p className="text-sm font-medium text-slate-200/60">No hay clases por recuperar.</p>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => {
              const access = v.accessGrants?.[0];
              const isViewed = !!access?.viewedAt;
              return (
                <div key={v.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{v.title}</h4>
                        {isViewed && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            Visto
                          </span>
                        )}
                      </div>
                      {v.description && (
                        <p className="mt-1 text-xs text-slate-300/70">{v.description}</p>
                      )}
                      {access && (
                        <p className="mt-1 text-xs text-amber-300/80">
                          Disponible hasta: {formatDate(access.expiresAt)}
                        </p>
                      )}
                      {isViewed && (
                        <p className="text-xs text-emerald-300/60">
                          Visto el: {formatDate(access.viewedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!isViewed && (
                        <button
                          onClick={() => handleMarkViewed(v.id)}
                          className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
                        >
                          Marcar visto
                        </button>
                      )}
                      <button
                        onClick={() => setPlayingVideo(playingVideo === v.id ? null : v.id)}
                        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-orange-500 transition"
                      >
                        {playingVideo === v.id ? "Cerrar" : "Ver video"}
                      </button>
                    </div>
                  </div>

                  {playingVideo === v.id && (
                    <video
                      controls
                      className="w-full rounded-lg"
                      src={`/api/courses/${courseId}/recovery-videos/${v.id}/stream`}
                    >
                      Tu navegador no soporta la reproduccion de video.
                    </video>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===== TEACHER/ADMIN VIEW =====
  return (
    <div className="space-y-4">
      {/* Upload button / form */}
      {!showUpload ? (
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-extrabold text-white hover:from-amber-400 hover:to-orange-500 transition"
        >
          + Subir video
        </button>
      ) : (
        <form onSubmit={handleUpload} className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Titulo *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              placeholder="Ej: Clase 5 - Algebra lineal"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripcion</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
              placeholder="Descripcion opcional del video..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Archivo de video * (.mp4, .webm, .mov — max 2GB)</label>
            <input
              type="file"
              accept=".mp4,.webm,.mov"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
              required
            />
          </div>

          {/* Assign student on upload */}
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 space-y-2">
            <label className="block text-xs font-semibold text-amber-300/80">Asignar a estudiante (opcional)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={uploadStudentId}
                onChange={(e) => setUploadStudentId(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              >
                <option value="">Sin asignar (asignar despues)</option>
                {(students || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
                ))}
              </select>
              {uploadStudentId && (
                <input
                  type="datetime-local"
                  value={uploadExpiresAt}
                  onChange={(e) => setUploadExpiresAt(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  required
                />
              )}
            </div>
            {uploadStudentId && (
              <p className="text-[11px] text-slate-400">
                El video se eliminara automaticamente despues de que expire el acceso.
              </p>
            )}
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 font-medium">{uploadProgress}% subido</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white hover:from-amber-400 hover:to-orange-500 transition disabled:opacity-60"
            >
              {uploading ? "Subiendo..." : "Subir video"}
            </button>
            <button
              type="button"
              onClick={() => { setShowUpload(false); setTitle(""); setDescription(""); setFile(null); setUploadStudentId(""); setUploadExpiresAt(""); }}
              disabled={uploading}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Video list */}
      {videos.length === 0 ? (
        <p className="text-sm font-medium text-slate-200/60">No hay clases de recuperación.</p>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => {
            const isExpanded = expandedVideo === v.id;
            const enrolledStudentIds = new Set((v.accessGrants || []).map((g) => g.studentId));
            const availableStudents = (students || []).filter((s) => !enrolledStudentIds.has(s.id));

            return (
              <div key={v.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                {/* Video header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white">{v.title}</h4>
                      {v.description && (
                        <p className="mt-1 text-xs text-slate-300/70">{v.description}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        Subido por {v.uploadedBy?.fullName} el {formatDate(v.createdAt)}
                      </p>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {(v.accessGrants || []).length} acceso(s)
                        </span>
                        <span className="text-xs text-emerald-300/70">
                          {(v.accessGrants || []).filter((g) => g.viewedAt).length} visto(s)
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setPlayingVideo(playingVideo === v.id ? null : v.id)}
                        className="rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition"
                      >
                        {playingVideo === v.id ? "Cerrar" : "Preview"}
                      </button>
                      <button
                        onClick={() => setExpandedVideo(isExpanded ? null : v.id)}
                        className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                      >
                        {isExpanded ? "Cerrar acceso" : "Gestionar acceso"}
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {playingVideo === v.id && (
                    <video
                      controls
                      className="w-full rounded-lg mt-3"
                      src={`/api/courses/${courseId}/recovery-videos/${v.id}/stream`}
                    >
                      Tu navegador no soporta la reproduccion de video.
                    </video>
                  )}
                </div>

                {/* Access management panel */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-white/3 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">Gestionar acceso</h5>

                    {/* Grant access form */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      >
                        <option value="">Seleccionar estudiante...</option>
                        {availableStudents.map((s) => (
                          <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                      <button
                        onClick={() => handleGrantAccess(v.id)}
                        disabled={accessLoading || !selectedStudent || !expiresAt}
                        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white hover:from-amber-400 hover:to-orange-500 transition disabled:opacity-60 whitespace-nowrap"
                      >
                        {accessLoading ? "..." : "Dar acceso"}
                      </button>
                    </div>

                    {/* Access list */}
                    {(v.accessGrants || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No hay accesos otorgados.</p>
                    ) : (
                      <div className="space-y-2">
                        {(v.accessGrants || []).map((g) => {
                          const expired = new Date(g.expiresAt) < new Date();
                          return (
                            <div
                              key={g.id}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                                !g.enabled || expired
                                  ? "border-red-500/20 bg-red-500/5"
                                  : "border-emerald-500/20 bg-emerald-500/5"
                              }`}
                            >
                              <div>
                                <span className="text-sm font-bold text-white">{g.student?.fullName}</span>
                                <span className="ml-2 text-xs text-slate-400">{g.student?.email}</span>
                                <div className="flex gap-2 mt-0.5 flex-wrap">
                                  <span className={`text-xs ${g.enabled ? "text-emerald-300" : "text-red-300"}`}>
                                    {g.enabled ? "Habilitado" : "Deshabilitado"}
                                  </span>
                                  <span className={`text-xs ${expired ? "text-red-300" : "text-slate-400"}`}>
                                    {expired ? "Expirado" : `Hasta: ${formatDate(g.expiresAt)}`}
                                  </span>
                                  {g.viewedAt ? (
                                    <span className="text-xs text-emerald-300">
                                      Visto: {formatDate(g.viewedAt)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-500">No visto</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleToggleAccess(v.id, g.id, g.enabled)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    g.enabled
                                      ? "bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20"
                                      : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {g.enabled ? "Deshabilitar" : "Habilitar"}
                                </button>
                                <button
                                  onClick={() => handleRemoveAccess(v.id, g.id)}
                                  className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
