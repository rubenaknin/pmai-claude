import { NextRequest, NextResponse } from "next/server";
import { uploadResume } from "@/lib/pitchmeai-client";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "A file is required", success: false },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, DOC, and DOCX files are supported", success: false },
        { status: 400 }
      );
    }

    // Forward to PitchMeAI backend
    const upstreamForm = new FormData();
    upstreamForm.append("file", file);

    const result = await uploadResume(upstreamForm);

    return NextResponse.json({
      success: true,
      cvContent: result.cvContent,
      userProfile: result.userProfile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/resume/upload error:", message);
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
