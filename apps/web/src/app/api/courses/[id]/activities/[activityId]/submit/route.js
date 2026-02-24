import { NextResponse } from 'next/server';
import { getTokenOrRefresh, applyTokenCookie } from '@/lib/proxy-auth';

export const runtime = 'nodejs';
const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function POST(request, { params }) {
  const { id, activityId } = await params;
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';

  let r;
  if (contentType.includes('multipart/form-data')) {
    // Forward FormData (file upload) — stream the body directly
    const formData = await request.formData();
    const backendForm = new FormData();

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const blob = new Blob([buffer], { type: value.type });
        backendForm.append(key, blob, value.name);
      } else {
        backendForm.append(key, value);
      }
    }

    r = await fetch(`${API_URL}/courses/${id}/activities/${activityId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: backendForm,
    });
  } else {
    // JSON body (quiz or text-only task)
    const body = await request.json();
    r = await fetch(`${API_URL}/courses/${id}/activities/${activityId}/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}
