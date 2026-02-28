'use client';

import { useState, useRef, useEffect } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecoveryVideoManager({ courseId, initialVideos, students, role }) {
  const [videos, setVideos] = useState(initialVideos || []);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  // Upload form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  // Upload assignment mode
  const [uploadMode, setUploadMode] = useState('none'); // "none" | "specific" | "all"
  const [uploadStudentIds, setUploadStudentIds] = useState([]); // for "specific" mode
  const [uploadExpiresAt, setUploadExpiresAt] = useState('');

  // UI states
  const [expandedVideo, setExpandedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  // Per-video access management inputs (keyed by videoId) — prevents cross-video state bleed
  const [accessInputs, setAccessInputs] = useState({}); // { [videoId]: { student, expiresAt } }
  const [accessLoading, setAccessLoading] = useState(null); // videoId currently loading
  const [removingId, setRemovingId] = useState(null); // accessId being removed
  const [togglingId, setTogglingId] = useState(null); // accessId being toggled

  const xhrRef = useRef(null);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
    };
  }, []);

  const isTeacherOrAdmin = role === 'TEACHER' || role === 'ADMIN';

  // Per-video input helpers
  function getInput(videoId) {
    return accessInputs[videoId] || { student: '', expiresAt: '' };
  }

  function setInput(videoId, updates) {
    setAccessInputs((prev) => ({
      ...prev,
      [videoId]: { ...(prev[videoId] || { student: '', expiresAt: '' }), ...updates },
    }));
  }

  function toggleUploadStudent(id) {
    setUploadStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function refreshVideos() {
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos`);
      const d = await r.json().catch(() => ({}));
      setVideos(d.videos || []);
    } catch {}
  }

  // Batch grant access — secuencial de a 3 para no saturar el rate limiter
  async function grantAccessBulk(videoId, studentIds, expiresAt) {
    if (studentIds.length === 0) return;
    let failed = 0;
    const BATCH = 3;
    for (let i = 0; i < studentIds.length; i += BATCH) {
      const chunk = studentIds.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map((studentId) =>
          fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, expiresAt }),
          }).then(async (r) => {
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d.message || 'Error');
            }
          })
        )
      );
      failed += results.filter((r) => r.status === 'rejected').length;
      // Pequeña pausa entre lotes para no saturar
      if (i + BATCH < studentIds.length) {
        await new Promise((res) => setTimeout(res, 200));
      }
    }
    if (failed > 0)
      throw new Error(`${failed} de ${studentIds.length} accesos fallaron al asignar`);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setError('El archivo excede el limite de 2 GB');
      return;
    }
    if (uploadMode === 'specific' && uploadStudentIds.length === 0) {
      setError('Selecciona al menos un estudiante');
      return;
    }
    if ((uploadMode === 'specific' || uploadMode === 'all') && !uploadExpiresAt) {
      setError('Selecciona una fecha de expiracion para el acceso');
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload the video (without studentId — access is granted separately)
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      const data = await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        });
        xhr.addEventListener('load', () => {
          try {
            const d = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(d);
            else reject(new Error(d.message || 'Error al subir video'));
          } catch {
            reject(new Error('Error al procesar respuesta'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Error de red')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelado')));
        xhr.addEventListener('timeout', () => reject(new Error('Tiempo de espera agotado')));
        xhr.timeout = 600000;
        xhr.open('POST', `/api/courses/${courseId}/recovery-videos`);
        xhr.send(formData);
      });
      xhrRef.current = null;

      // Step 2: Grant access to the relevant students
      if (uploadMode !== 'none' && data.video?.id) {
        const ids = uploadMode === 'all' ? (students || []).map((s) => s.id) : uploadStudentIds;
        await grantAccessBulk(data.video.id, ids, uploadExpiresAt);
      }

      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      setUploadMode('none');
      setUploadStudentIds([]);
      setUploadExpiresAt('');
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
    if (!confirm('Eliminar este video? Esta accion no se puede deshacer.')) return;
    setError('');
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}`, {
        method: 'DELETE',
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Error al eliminar');
      if (expandedVideo === videoId) setExpandedVideo(null);
      if (playingVideo === videoId) setPlayingVideo(null);
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrantAccess(videoId) {
    const { student, expiresAt } = getInput(videoId);
    if (!student || !expiresAt) return;
    setAccessLoading(videoId);
    setError('');
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student, expiresAt }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Error al dar acceso');
      setInput(videoId, { student: '', expiresAt: '' });
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    } finally {
      setAccessLoading(null);
    }
  }

  async function handleGrantAll(videoId, expiresAt) {
    if (!expiresAt) {
      setError('Selecciona primero la fecha de expiracion antes de asignar a toda la clase');
      return;
    }
    if (!(students || []).length) {
      setError('No hay estudiantes inscritos en el curso');
      return;
    }
    setAccessLoading(videoId);
    setError('');
    try {
      await grantAccessBulk(
        videoId,
        (students || []).map((s) => s.id),
        expiresAt
      );
      setInput(videoId, { student: '', expiresAt: '' });
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    } finally {
      setAccessLoading(null);
    }
  }

  async function handleToggleAccess(videoId, accessId, currentEnabled) {
    setTogglingId(accessId);
    setError('');
    try {
      const r = await fetch(
        `/api/courses/${courseId}/recovery-videos/${videoId}/access/${accessId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !currentEnabled }),
        }
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Error al actualizar acceso');
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRemoveAccess(videoId, accessId) {
    if (!confirm('Quitar acceso de este estudiante al video?')) return;
    setRemovingId(accessId);
    setError('');
    try {
      const r = await fetch(
        `/api/courses/${courseId}/recovery-videos/${videoId}/access/${accessId}`,
        { method: 'DELETE' }
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || 'Error al eliminar acceso');
      }
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleMarkViewed(videoId) {
    setError('');
    try {
      const r = await fetch(`/api/courses/${courseId}/recovery-videos/${videoId}/viewed`, {
        method: 'PATCH',
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Error al marcar como visto');
      await refreshVideos();
    } catch (err) {
      setError(err.message);
    }
  }

  // ===== STUDENT VIEW =====
  if (!isTeacherOrAdmin) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {videos.length === 0 ? (
          <p className="text-sm font-medium text-slate-200/60">No hay clases por recuperar.</p>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => {
              const access = v.accessGrants?.[0];
              const isViewed = !!access?.viewedAt;
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {playingVideo === v.id ? 'Cerrar' : 'Ver video'}
                      </button>
                    </div>
                  </div>
                  {playingVideo === v.id && (
                    <video
                      controls
                      preload="none"
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

  // ===== TEACHER / ADMIN VIEW =====
  return (
    <div className="space-y-4">
      {/* ── Upload button / form ── */}
      {!showUpload ? (
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-extrabold text-white hover:from-amber-400 hover:to-orange-500 transition"
        >
          + Subir video de clase
        </button>
      ) : (
        <form
          onSubmit={handleUpload}
          className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
        >
          {/* Title */}
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

          {/* Description */}
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

          {/* File */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Archivo de video * (.mp4, .webm, .mov — max 2GB)
            </label>
            <input
              type="file"
              accept=".mp4,.webm,.mov"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
              required
            />
          </div>

          {/* ── Assignment section ── */}
          <div className="rounded-lg border border-white/10 bg-white/3 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-300">A quien va dirigido este video?</p>

            {/* Mode buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  value: 'none',
                  label: 'Sin asignar ahora',
                  sub: 'Asignar despues desde el panel de acceso',
                },
                {
                  value: 'specific',
                  label: 'Recuperacion individual',
                  sub: 'Estudiantes especificos que faltaron a clase',
                },
                {
                  value: 'all',
                  label: 'Clase grabada para todos',
                  sub: 'Toda la clase tiene acceso al video',
                },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setUploadMode(value);
                    if (value !== 'specific') setUploadStudentIds([]);
                  }}
                  className={`rounded-lg border px-3 py-2.5 text-left transition ${
                    uploadMode === value
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold">{label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70 leading-snug">{sub}</div>
                </button>
              ))}
            </div>

            {/* Expiry date (shown for specific and all modes) */}
            {uploadMode !== 'none' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fecha limite de acceso *
                </label>
                <input
                  type="datetime-local"
                  value={uploadExpiresAt}
                  onChange={(e) => setUploadExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            )}

            {/* Checkboxes for specific mode */}
            {uploadMode === 'specific' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Seleccionar estudiantes
                    {uploadStudentIds.length > 0 && (
                      <span className="ml-1 text-amber-300">
                        ({uploadStudentIds.length} seleccionado
                        {uploadStudentIds.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  {(students || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setUploadStudentIds(
                          uploadStudentIds.length === (students || []).length
                            ? []
                            : (students || []).map((s) => s.id)
                        )
                      }
                      className="text-[11px] text-amber-300/70 hover:text-amber-300 transition"
                    >
                      {uploadStudentIds.length === (students || []).length
                        ? 'Deseleccionar todos'
                        : 'Seleccionar todos'}
                    </button>
                  )}
                </div>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/50 p-1.5 space-y-0.5">
                  {(students || []).length === 0 ? (
                    <p className="px-2 py-3 text-xs text-slate-500 text-center">
                      No hay estudiantes inscritos en este curso
                    </p>
                  ) : (
                    (students || []).map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-white/5 transition"
                      >
                        <input
                          type="checkbox"
                          checked={uploadStudentIds.includes(s.id)}
                          onChange={() => toggleUploadStudent(s.id)}
                          className="h-3.5 w-3.5 rounded border-white/20 accent-amber-500 shrink-0"
                        />
                        <span className="text-sm text-white font-medium">{s.fullName}</span>
                        <span className="text-xs text-slate-400 truncate">({s.email})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Info for "all" mode */}
            {uploadMode === 'all' && (students || []).length > 0 && (
              <p className="text-xs text-slate-400">
                El video estara disponible para los {(students || []).length} estudiante
                {(students || []).length !== 1 ? 's' : ''} inscritos en el curso.
              </p>
            )}
          </div>

          {/* Progress bar */}
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

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white hover:from-amber-400 hover:to-orange-500 transition disabled:opacity-60"
            >
              {uploading ? 'Subiendo...' : 'Subir video'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUpload(false);
                setTitle('');
                setDescription('');
                setFile(null);
                setUploadMode('none');
                setUploadStudentIds([]);
                setUploadExpiresAt('');
              }}
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

      {/* ── Video list ── */}
      {videos.length === 0 ? (
        <p className="text-sm font-medium text-slate-200/60">No hay clases de recuperacion.</p>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => {
            const isExpanded = expandedVideo === v.id;
            const grantedIds = new Set((v.accessGrants || []).map((g) => g.studentId));
            const availableStudents = (students || []).filter((s) => !grantedIds.has(s.id));
            const input = getInput(v.id);
            const isAccessLoading = accessLoading === v.id;

            return (
              <div
                key={v.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Video header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white">{v.title}</h4>
                      {v.description && (
                        <p className="mt-1 text-xs text-slate-300/70">{v.description}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        Subido por {v.uploadedBy?.fullName} el {formatDate(v.createdAt)}
                      </p>
                      {/* Resumen de accesos y quién vio */}
                      {(() => {
                        const total = (v.accessGrants || []).length;
                        const viewers = (v.accessGrants || []).filter((g) => g.viewedAt);
                        return (
                          <div className="mt-1 space-y-1">
                            <span className="text-xs text-slate-400">
                              {total} acceso{total !== 1 ? 's' : ''} otorgado
                              {total !== 1 ? 's' : ''}
                            </span>
                            {total > 0 &&
                              (viewers.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  Nadie ha visto el video aun
                                </p>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-xs font-semibold text-emerald-400">
                                    Visto por:
                                  </span>
                                  {viewers.map((g) => (
                                    <span
                                      key={g.id}
                                      title={`Visto el ${formatDate(g.viewedAt)}`}
                                      className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
                                    >
                                      {g.student?.fullName}
                                    </span>
                                  ))}
                                  {viewers.length < total && (
                                    <span className="text-xs text-slate-500">
                                      · {total - viewers.length} sin ver
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => setPlayingVideo(playingVideo === v.id ? null : v.id)}
                        className="rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition"
                      >
                        {playingVideo === v.id ? 'Cerrar' : 'Preview'}
                      </button>
                      <button
                        onClick={() => setExpandedVideo(isExpanded ? null : v.id)}
                        className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                      >
                        {isExpanded ? 'Cerrar' : 'Gestionar acceso'}
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
                      preload="none"
                      className="w-full rounded-lg mt-3"
                      src={`/api/courses/${courseId}/recovery-videos/${v.id}/stream`}
                    >
                      Tu navegador no soporta la reproduccion de video.
                    </video>
                  )}
                </div>

                {/* ── Access management panel ── */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/20 p-4 space-y-4">
                    <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Gestionar acceso al video
                    </h5>

                    {/* Grant access section */}
                    <div className="space-y-2">
                      {/* Individual: student select + date + button */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={input.student}
                          onChange={(e) => setInput(v.id, { student: e.target.value })}
                          disabled={isAccessLoading}
                          className="flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60"
                        >
                          <option value="">Seleccionar estudiante...</option>
                          {availableStudents.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName} ({s.email})
                            </option>
                          ))}
                        </select>
                        <input
                          type="datetime-local"
                          value={input.expiresAt}
                          onChange={(e) => setInput(v.id, { expiresAt: e.target.value })}
                          disabled={isAccessLoading}
                          className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => handleGrantAccess(v.id)}
                          disabled={isAccessLoading || !input.student || !input.expiresAt}
                          className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white hover:from-amber-400 hover:to-orange-500 transition disabled:opacity-60 whitespace-nowrap"
                        >
                          {isAccessLoading ? '...' : 'Dar acceso'}
                        </button>
                      </div>

                      {/* Grant ALL students button */}
                      {(students || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleGrantAll(v.id, input.expiresAt)}
                          disabled={isAccessLoading || !input.expiresAt}
                          title={
                            !input.expiresAt
                              ? 'Selecciona primero la fecha de expiracion'
                              : undefined
                          }
                          className="w-full rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20 transition disabled:opacity-50"
                        >
                          {isAccessLoading
                            ? 'Asignando acceso a toda la clase...'
                            : `Dar acceso a toda la clase (${(students || []).length} estudiante${(students || []).length !== 1 ? 's' : ''})`}
                        </button>
                      )}

                      {!input.expiresAt && (
                        <p className="text-[11px] text-slate-500">
                          Selecciona la fecha de expiracion para poder asignar acceso individual o a
                          toda la clase.
                        </p>
                      )}
                    </div>

                    {/* Access list */}
                    {(v.accessGrants || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No hay accesos otorgados aun.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Accesos otorgados ({(v.accessGrants || []).length})
                        </p>
                        {(v.accessGrants || []).map((g) => {
                          const expired = new Date(g.expiresAt) < new Date();
                          const isRemoving = removingId === g.id;
                          const isToggling = togglingId === g.id;
                          const busy = isRemoving || isToggling;

                          return (
                            <div
                              key={g.id}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3 ${
                                !g.enabled || expired
                                  ? 'border-red-500/20 bg-red-500/5'
                                  : 'border-emerald-500/20 bg-emerald-500/5'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-white">
                                    {g.student?.fullName}
                                  </span>
                                  {g.viewedAt ? (
                                    <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                      Visto
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full border border-slate-600/40 bg-slate-700/30 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      Sin ver
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400 truncate">
                                    {g.student?.email}
                                  </span>
                                </div>
                                <div className="flex gap-2 mt-0.5 flex-wrap">
                                  <span
                                    className={`text-xs font-medium ${
                                      g.enabled ? 'text-emerald-300' : 'text-red-300'
                                    }`}
                                  >
                                    {g.enabled ? 'Habilitado' : 'Deshabilitado'}
                                  </span>
                                  <span
                                    className={`text-xs ${
                                      expired ? 'text-red-300 font-medium' : 'text-slate-400'
                                    }`}
                                  >
                                    {expired ? 'Expirado' : `Hasta: ${formatDate(g.expiresAt)}`}
                                  </span>
                                  {g.viewedAt ? (
                                    <span className="text-xs text-emerald-300/80">
                                      el {formatDate(g.viewedAt)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-500">—</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleToggleAccess(v.id, g.id, g.enabled)}
                                  disabled={busy}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                                    g.enabled
                                      ? 'bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20'
                                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {isToggling ? '...' : g.enabled ? 'Deshabilitar' : 'Habilitar'}
                                </button>
                                <button
                                  onClick={() => handleRemoveAccess(v.id, g.id)}
                                  disabled={busy}
                                  className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition disabled:opacity-60"
                                >
                                  {isRemoving ? '...' : 'Quitar'}
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
