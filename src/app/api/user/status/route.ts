import { NextResponse } from "next/server";
import type { UserStatusResponse } from "@/lib/types";

const API_URL = process.env.PITCHMEAI_API_URL || "https://pitchmeai.com/api";
const SESSION_COOKIE = process.env.PITCHMEAI_SESSION_COOKIE || "";

async function fetchWithAuth(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `AuthSession=${SESSION_COOKIE}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Pick the best human-readable first name, ignoring emails and IDs */
function pickName(data: Record<string, unknown>): string | undefined {
  for (const key of ["firstName", "first_name"]) {
    const v = data[key];
    if (typeof v === "string" && v.length > 0 && !v.includes("@")) return v;
  }
  // data.name is often the CouchDB username (email) — only use if it looks like a real name
  if (typeof data.name === "string" && data.name.length > 0 && !data.name.includes("@") && !data.name.includes(".")) {
    return data.name;
  }
  return undefined;
}

export async function GET() {
  if (!SESSION_COOKIE) {
    return NextResponse.json({ isLoggedIn: false } satisfies UserStatusResponse);
  }

  // Try the auth/login endpoint (CouchDB session check)
  const data = await fetchWithAuth("/auth/login");

  if (!data) {
    return NextResponse.json({ isLoggedIn: false } satisfies UserStatusResponse);
  }

  // Determine logged-in status from whatever fields are present
  const isLoggedIn = !!(data.email || data.firstName || data.first_name || data._id || data.name);

  if (!isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false } satisfies UserStatusResponse);
  }

  const hasResume = !!(data.originalFileName || data.isRefined || data.original_file_name);

  const result: UserStatusResponse = {
    isLoggedIn: true,
    hasResume,
    userFirstName: pickName(data),
    dynamicTitle: (data.dynamicTitle || data.dynamic_title || data.title || undefined) as string | undefined,
    dynamicLocation: (data.dynamicLocation || data.dynamic_location || data.location || undefined) as string | undefined,
    credits: typeof data.credits === "number" ? data.credits : undefined,
    userPlan: (data.userPlan || data.plan || undefined) as string | undefined,
  };

  return NextResponse.json(result);
}
