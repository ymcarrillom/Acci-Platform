import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(request) {
  const cookieHeader = request.headers.get("cookie") || "";

  const backendRes = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    return NextResponse.json(data || { message: "Refresh failed" }, { status: backendRes.status });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("accessToken", data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return res;
}
