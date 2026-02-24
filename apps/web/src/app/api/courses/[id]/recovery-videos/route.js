import { NextResponse } from 'next/server';
import { getTokenOrRefresh, applyTokenCookie } from '@/lib/proxy-auth';

export const runtime = 'nodejs';
const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function GET(request, { params }) {
  const { id } = await params;
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const r = await fetch(`${API_URL}/courses/${id}/recovery-videos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  // NO llamar request.formData() — eso bufferiza el video entero en memoria y cae.
  // Pasar request.body (ReadableStream) directo a Express para streaming real.
  const contentType = request.headers.get('content-type');
  const r = await fetch(`${API_URL}/courses/${id}/recovery-videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType && { 'content-type': contentType }),
    },
    body: request.body,
    // requerido por Node.js fetch para enviar un ReadableStream como cuerpo
    duplex: 'half',
  });
  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}
