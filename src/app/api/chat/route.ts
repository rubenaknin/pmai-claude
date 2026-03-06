import { NextRequest, NextResponse } from "next/server";
import { processChat } from "@/lib/claude-chat";
import type { ChatRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { message, history = [], jobsContext } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const result = await processChat(message, history, jobsContext);
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
