import { NextResponse } from 'next/server';
import { getTokenOrRefresh, applyTokenCookie } from '@/lib/proxy-auth';

export const runtime = 'nodejs';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function GET() {
  const { token, refreshed } = await getTokenOrRefresh();

  if (!token) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const backendRes = await fetch(`${API_URL}/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    // Debug seguro: no exponemos token completo
    const res = NextResponse.json(data || { message: 'No autorizado' }, {
      status: backendRes.status,
    });
    res.headers.set('x-me-has-token', '1');
    res.headers.set('x-me-token-len', String(token.length));
    if (refreshed) applyTokenCookie(res, token);
    return res;
  }

  const res = NextResponse.json(data);
  if (refreshed) applyTokenCookie(res, token);
  return res;
}

export async function PUT(request) {
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const r = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}
