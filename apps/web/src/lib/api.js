import { auth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function refreshTokens() {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) throw new Error('No hay refresh token');

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'No se pudo refrescar sesión');

  auth.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = auth.getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    const newAccess = await refreshTokens();
    const headers2 = new Headers(options.headers || {});
    headers2.set('Content-Type', 'application/json');
    headers2.set('Authorization', `Bearer ${newAccess}`);
    res = await fetch(`${API_URL}${path}`, { ...options, headers: headers2 });
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Error ${res.status}`);
  }

  return res.json().catch(() => ({}));
}
