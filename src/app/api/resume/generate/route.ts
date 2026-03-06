import { NextRequest, NextResponse } from "next/server";
import { generateResume } from "@/lib/pitchmeai-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobUrl, jobTitle, company, jobDetails } = body;

    if (!jobUrl) {
      return NextResponse.json(
        { error: "jobUrl is required" },
        { status: 400 }
      );
    }

    const result = await generateResume({ jobUrl, jobTitle, company, jobDetails });

    return NextResponse.json({
      success: true,
      html: result.html || result.resume_html || result.resumeHtml || "",
      highlights: result.highlights || [],
      pdfUrl: result.pdfUrl || result.pdf_url || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/resume/generate error:", message);
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
