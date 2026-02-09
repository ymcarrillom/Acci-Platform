"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.getAccessToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/dashboard");
        setData(res);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function logout() {
    auth.clear();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard ACCI</h1>
            <p className="mt-1 text-sm text-zinc-400">Rol: {data?.role || "..."}</p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900"
          >
            Cerrar sesión
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-red-200">
            Error: {error}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.cards || []).map((c) => (
            <div key={c.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <p className="text-sm text-zinc-400">{c.title}</p>
              <p className="mt-2 text-3xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
