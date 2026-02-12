import { NextResponse } from "next/server";
import { getTokenOrRefresh } from "@/lib/proxy-auth";

export const runtime = "nodejs";
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET(request, { params }) {
  const { id } = await params;
  const { token } = await getTokenOrRefresh();
  if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const r = await fetch(`${API_URL}/courses/${id}/grades/export`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!r.ok) {
    const data = await r.json().catch(() => null);
    return NextResponse.json(data, { status: r.status });
  }

  const pdfBuffer = await r.arrayBuffer();
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": r.headers.get("Content-Disposition") || "attachment; filename=calificaciones.pdf",
    },
  });
}
