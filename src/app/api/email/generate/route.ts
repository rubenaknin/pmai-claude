import { NextRequest, NextResponse } from "next/server";
import { generateEmail } from "@/lib/pitchmeai-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, jobDetails, jobName, companyName, url, companyUrl } = body;

    if (!jobId || !jobDetails || !jobName || !companyName) {
      return NextResponse.json(
        { error: "jobId, jobDetails, jobName, and companyName are required" },
        { status: 400 }
      );
    }

    const result = await generateEmail({
      jobId,
      jobDetails,
      jobName,
      companyName,
      url,
      companyUrl,
      platform: "PitchMeAI",
    });

    return NextResponse.json({
      success: true,
      subject: `Introduction — ${jobName}`,
      body: result.introEmail || "",
      recipientName: result.recruiter?.name || "Hiring Manager",
      recipientTitle: result.recruiter?.title || "",
      recipientEmail: result.recruiter?.email || null,
      recipientLinkedin: result.recruiter?.linkedin_url || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/email/generate error:", message);

    if (message.includes("402")) {
      return NextResponse.json(
        { error: "Insufficient credits", success: false },
        { status: 402 }
      );
    }

    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
