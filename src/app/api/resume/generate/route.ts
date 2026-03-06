import { NextRequest, NextResponse } from "next/server";
import { generateResume } from "@/lib/pitchmeai-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, jobId, jobDetails, jobName, companyName, companyUrl, location } = body;

    if (!url || !jobId || !jobDetails || !jobName || !companyName) {
      return NextResponse.json(
        { error: "url, jobId, jobDetails, jobName, and companyName are required" },
        { status: 400 }
      );
    }

    const result = await generateResume({
      url,
      jobId,
      jobDetails,
      jobName,
      companyName,
      companyUrl,
      location,
      platform: "PitchMeAI",
    });

    return NextResponse.json({
      success: true,
      html: result.newResumeHTMLBody || "",
      threeExplanations: result.threeExplanations,
      pdfFileName: result.pdfFileName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/resume/generate error:", message);

    // Handle specific error codes
    if (message.includes("402")) {
      return NextResponse.json(
        { error: "Insufficient credits", success: false },
        { status: 402 }
      );
    }
    if (message.includes("420")) {
      return NextResponse.json(
        { error: "Resume generation already in progress", success: false },
        { status: 420 }
      );
    }

    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
