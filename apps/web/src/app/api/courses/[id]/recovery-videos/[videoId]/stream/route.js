import { NextResponse } from "next/server";
import { getTokenOrRefresh } from "@/lib/proxy-auth";

export const runtime = "nodejs";
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET(request, { params }) {
  const { id, videoId } = await params;
  const { token } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const headers = { Authorization: `Bearer ${token}` };

  // Forward range header for video seeking
  const range = request.headers.get("range");
  if (range) headers["Range"] = range;

  const r = await fetch(`${API_URL}/courses/${id}/recovery-videos/${videoId}/stream`, {
    headers,
    cache: "no-store",
  });

  if (!r.ok) {
    const data = await r.json().catch(() => null);
    return NextResponse.json(data || { message: "Error" }, { status: r.status });
  }

  // Pass through the binary response
  const responseHeaders = new Headers();
  for (const [key, value] of r.headers.entries()) {
    if (["content-type", "content-length", "content-range", "accept-ranges"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  return new NextResponse(r.body, {
    status: r.status,
    headers: responseHeaders,
  });
}
