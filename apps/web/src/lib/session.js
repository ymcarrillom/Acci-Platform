import { headers } from "next/headers";

/**
 * getMeOrNull
 * - Llama al BFF /api/users/me en el MISMO host/puerto donde corre Next
 * - Compatible con Next 16 (headers() puede ser async)
 */
export async function getMeOrNull() {
  const h = await headers();

  const host = h.get("host"); // ej: localhost:3100
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;

  try {
    const res = await fetch(`${base}/api/users/me`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
