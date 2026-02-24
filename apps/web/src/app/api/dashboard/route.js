import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const r = await fetch(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
    cache: 'no-store',
  });

  const data = await r.json().catch(() => ({ message: 'Error del servidor' }));
  return NextResponse.json(data, { status: r.status });
}
