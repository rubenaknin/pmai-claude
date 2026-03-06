import { NextRequest, NextResponse } from "next/server";
import { processChat } from "@/lib/claude-chat";
import type { ChatRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { message, history = [], jobsContext, userStatus } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Extract user IP for geolocation fallback
    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const result = await processChat(message, history, jobsContext, userIp, userStatus);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/chat error:", message);
    return NextResponse.json(
      {
        botMessage: "Sorry, something went wrong. Please try again.",
        actionType: "error",
        error: message,
      },
      { status: 500 }
    );
  }
}
