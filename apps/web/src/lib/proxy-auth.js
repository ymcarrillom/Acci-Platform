import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Get a valid access token from cookies. If the accessToken cookie is missing,
 * attempt to refresh using the refreshToken cookie.
 * Returns { token, refreshed } where refreshed=true means a new cookie should be set.
 */
export async function getTokenOrRefresh() {
  const c = await cookies();
  const token = c.get('accessToken')?.value;
  if (token) return { token: decodeURIComponent(token), refreshed: false };

  const refreshCookie = c.get('refreshToken')?.value;
  if (!refreshCookie) return { token: null, refreshed: false };

  try {
    const r = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: `refreshToken=${refreshCookie}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (r.ok) {
      const data = await r.json();
      if (data.accessToken) {
        return { token: data.accessToken, refreshed: true };
      }
    }
  } catch {}

  return { token: null, refreshed: false };
}

/**
 * Set the accessToken cookie on a NextResponse.
 */
export function applyTokenCookie(response, token) {
  response.cookies.set('accessToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 4,
  });
}
