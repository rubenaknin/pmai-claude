import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PITCHMEAI_API_URL || "https://pitchmeai.com/api";
const SESSION_COOKIE = process.env.PITCHMEAI_SESSION_COOKIE || "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize filename — only allow alphanumeric, hyphens, underscores, dots
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!sanitized || sanitized !== filename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/resume/download/${sanitized}`, {
      headers: {
        Cookie: `AuthSession=${SESSION_COOKIE}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const pdfBuffer = await res.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitized}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/resume/download error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
