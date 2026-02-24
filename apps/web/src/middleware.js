import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Protegemos dashboard (ajusta si tienes más rutas privadas)
  if (!pathname.startsWith('/dashboard')) return NextResponse.next();

  const accessToken = req.cookies.get('accessToken')?.value;
  const refreshToken = req.cookies.get('refreshToken')?.value;

  // Si ya hay accessToken, dejamos pasar
  if (accessToken) return NextResponse.next();

  // Si no hay refreshToken, no podemos renovar
  if (!refreshToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/acceso';
    return NextResponse.redirect(url);
  }

  // Intentamos refresh contra el backend, reenviando refreshToken
  try {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: `refreshToken=${refreshToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!refreshRes.ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/acceso';
      return NextResponse.redirect(url);
    }

    const data = await refreshRes.json().catch(() => null);
    const newAccessToken = data?.accessToken;

    if (!newAccessToken) {
      const url = req.nextUrl.clone();
      url.pathname = '/acceso';
      return NextResponse.redirect(url);
    }

    const res = NextResponse.next();

    // Seteamos accessToken en cookie para localhost:3000
    res.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 4, // 4 hours
    });

    return res;
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/acceso';
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
