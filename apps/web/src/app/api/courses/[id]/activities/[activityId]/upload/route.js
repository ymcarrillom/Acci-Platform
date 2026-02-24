import { NextResponse } from 'next/server';
import { getTokenOrRefresh, applyTokenCookie } from '@/lib/proxy-auth';

export const runtime = 'nodejs';
const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function POST(request, { params }) {
  const { id, activityId } = await params;
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const formData = await request.formData();
  const r = await fetch(`${API_URL}/courses/${id}/activities/${activityId}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}
