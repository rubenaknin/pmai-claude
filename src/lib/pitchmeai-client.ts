/**
 * PitchMeAI HTTP client — wraps all API calls to the PitchMeAI backend.
 * Attaches the AuthSession cookie for authentication.
 */

import type {
  PitchMeSearchResponse,
  PitchMeResumeResponse,
  PitchMeEmailResponse,
} from "./types";

const API_URL = process.env.PITCHMEAI_API_URL || "https://pitchmeai.com/api";
const SESSION_COOKIE = process.env.PITCHMEAI_SESSION_COOKIE || "";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: `AuthSession=${SESSION_COOKIE}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `PitchMeAI API error: ${res.status} ${res.statusText} — ${text.slice(0, 200)}`
    );
  }

  return res.json() as Promise<T>;
}

/** Search for jobs matching a query */
export async function searchJobs(params: {
  search?: string;
  location?: string;
  page?: number;
  limit?: number;
}): Promise<PitchMeSearchResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.location) qs.set("location", params.location);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  return apiFetch<PitchMeSearchResponse>(`/jobs?${qs.toString()}`);
}

/** Generate a tailored resume for a specific job */
export async function generateResume(params: {
  jobUrl: string;
  jobTitle?: string;
  company?: string;
  jobDetails?: string;
}): Promise<PitchMeResumeResponse> {
  return apiFetch<PitchMeResumeResponse>("/resume/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Generate an intro email to a hiring manager */
export async function generateEmail(params: {
  jobUrl: string;
  jobTitle?: string;
  company?: string;
  companyUrl?: string;
  jobDetails?: string;
}): Promise<PitchMeEmailResponse> {
  return apiFetch<PitchMeEmailResponse>("/letter/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Resume builder — start building a new resume */
export async function startResumeBuild(params: {
  template?: string;
}): Promise<{ buildId?: string; id?: string; [key: string]: unknown }> {
  return apiFetch("/resume-builder/start", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Resume builder — check build status / get result */
export async function getResumeBuildStatus(
  buildId: string
): Promise<{ status?: string; html?: string; pdfUrl?: string; [key: string]: unknown }> {
  return apiFetch(`/resume-builder/status/${buildId}`);
}
