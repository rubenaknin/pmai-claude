import { NextResponse } from "next/server";
import type { UserStatusResponse } from "@/lib/types";

const API_URL = process.env.PITCHMEAI_API_URL || "https://pitchmeai.com/api";
const SESSION_COOKIE = process.env.PITCHMEAI_SESSION_COOKIE || "";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `AuthSession=${SESSION_COOKIE}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ isLoggedIn: false } satisfies UserStatusResponse);
    }

    const data = await res.json();

    // The /auth/login endpoint returns user profile data when authenticated
    const isLoggedIn = !!data && (!!data.email || !!data.firstName || !!data._id);
    const hasResume = !!(data.originalFileName || data.isRefined);

    const result: UserStatusResponse = {
      isLoggedIn,
      hasResume,
      userFirstName: data.firstName || data.first_name || undefined,
      dynamicTitle: data.dynamicTitle || data.dynamic_title || undefined,
      dynamicLocation: data.dynamicLocation || data.dynamic_location || undefined,
      credits: typeof data.credits === "number" ? data.credits : undefined,
      userPlan: data.userPlan || data.plan || undefined,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ isLoggedIn: false } satisfies UserStatusResponse);
  }
}
