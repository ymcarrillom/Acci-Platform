import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function POST(request) {
  const body = await request.json();

  const r = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await r.json().catch(() => null);
  return NextResponse.json(data ?? {}, { status: r.status });
}
