"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function SearchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("search") || "");
  const [role, setRole] = useState(sp.get("role") || "");

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    params.set("page", "1");
    router.push(`/dashboard/usuarios?${params}`);
  }

  function clearFilters() {
    setSearch("");
    setRole("");
    router.push("/dashboard/usuarios");
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-sky-400/50 focus:outline-none"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:outline-none"
      >
        <option value="">Todos los roles</option>
        <option value="ADMIN">Coordinador</option>
        <option value="TEACHER">Instructor</option>
        <option value="STUDENT">Estudiante</option>
      </select>
      <button
        type="submit"
        className="rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15 transition"
      >
        Buscar
      </button>
      {(search || role) && (
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition"
        >
          Limpiar
        </button>
      )}
    </form>
  );
}

export default function UserSearch() {
  return (
    <Suspense fallback={<div className="h-11" />}>
      <SearchInner />
    </Suspense>
  );
}
