import { NextRequest, NextResponse } from "next/server";
import { searchJobs } from "@/lib/pitchmeai-client";
import { mapSearchResponse } from "@/lib/job-mapper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const location = searchParams.get("location") || undefined;
    const page = searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined;
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined;

    const raw = await searchJobs({ search, location, page, limit });
    const { jobs, total } = mapSearchResponse(raw);

    return NextResponse.json({ jobs, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
