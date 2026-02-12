import { NextResponse } from "next/server";
import { getTokenOrRefresh, applyTokenCookie } from "@/lib/proxy-auth";

export const runtime = "nodejs";
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET(request, { params }) {
  const { id } = await params;
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const qs = date ? `?date=${date}` : "";

  const r = await fetch(`${API_URL}/courses/${id}/attendance${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { token, refreshed } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const r = await fetch(`${API_URL}/courses/${id}/attendance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  const res = NextResponse.json(data, { status: r.status });
  if (refreshed) applyTokenCookie(res, token);
  return res;
}
