"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@acci.com");
  const [password, setPassword] = useState("Acci12345*");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo iniciar sesión");

      auth.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">ACCI Platform</h1>
        <p className="mt-1 text-sm text-zinc-400">Accede a tu panel</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-zinc-300">Email</label>
            <input
              className="mt-1 w-full rounded-xl bg-zinc-950/50 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl bg-zinc-950/50 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white text-zinc-900 py-2 font-medium hover:bg-zinc-200 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="text-xs text-zinc-500">
            Demo: admin@acci.com — pass: Acci12345*
          </div>
        </form>
      </div>
    </div>
  );
}
