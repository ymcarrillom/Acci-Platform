/**
 * Client-side fetch wrapper that auto-refreshes the access token on 401.
 *
 * Usage (in "use client" components):
 *   import { fetchWithAuth } from "@/lib/fetchWithAuth";
 *   const res = await fetchWithAuth("/api/...", { method: "POST", body: ... });
 *
 * - On 401: calls POST /api/auth/refresh once, then retries the original request.
 * - Multiple concurrent 401s share the same refresh call (deduplication).
 * - If refresh fails: redirects to /acceso.
 */

let refreshPromise = null;

export async function fetchWithAuth(input, init = {}) {
  const res = await fetch(input, { ...init, credentials: 'include' });

  if (res.status !== 401) return res;

  // Deduplicate: if multiple requests fail simultaneously, only one refresh call is made
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      refreshPromise = null;
    });
  }

  const refreshRes = await refreshPromise;

  if (!refreshRes.ok) {
    // Token truly expired and refresh token is gone — force re-login
    if (typeof window !== 'undefined') {
      window.location.replace('/acceso');
    }
    return res; // return the original 401 response
  }

  // New accessToken cookie is now set — retry the original request
  return fetch(input, { ...init, credentials: 'include' });
}
