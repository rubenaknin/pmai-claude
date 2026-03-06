import { NextRequest, NextResponse } from "next/server";
import { generateEmail } from "@/lib/pitchmeai-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobUrl, jobTitle, company, companyUrl, jobDetails } = body;

    if (!jobUrl) {
      return NextResponse.json(
        { error: "jobUrl is required" },
        { status: 400 }
      );
    }

    const result = await generateEmail({
      jobUrl,
      jobTitle,
      company,
      companyUrl,
      jobDetails,
    });

    return NextResponse.json({
      success: true,
      subject: result.subject || `Introduction — ${jobTitle || "Job Application"}`,
      body: result.body || result.email_body || result.emailBody || "",
      recipientName: result.recipientName || result.recipient || "Hiring Manager",
      recipientTitle: result.recipientTitle || "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/email/generate error:", message);
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
