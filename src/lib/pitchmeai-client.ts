/**
 * PitchMeAI HTTP client — wraps all API calls to the PitchMeAI backend.
 * Attaches the AuthSession cookie for authentication.
 * Captures network debug logs for monitoring.
 */

import type {
  PitchMeSearchResponse,
  PitchMeResumeResponse,
  PitchMeEmailResponse,
  DebugNetworkLog,
} from "./types";

const API_URL = process.env.PITCHMEAI_API_URL || "https://pitchmeai.com/api";
const SESSION_COOKIE = process.env.PITCHMEAI_SESSION_COOKIE || "";

/** Collected during a request cycle — call resetLogs() before a new cycle */
let networkLogs: DebugNetworkLog[] = [];

export function getNetworkLogs(): DebugNetworkLog[] {
  return [...networkLogs];
}

export function resetNetworkLogs(): void {
  networkLogs = [];
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const method = options.method || "GET";
  const start = Date.now();
  let status: number | null = null;
  let responseText = "";

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Cookie: `AuthSession=${SESSION_COOKIE}`,
        ...options.headers,
      },
    });

    status = res.status;
    responseText = await res.text();
    const durationMs = Date.now() - start;

    networkLogs.push({
      method,
      url,
      status,
      durationMs,
      requestBody: options.body ? String(options.body).slice(0, 500) : undefined,
      responseSnippet: responseText.slice(0, 1000),
    });

    if (!res.ok) {
      throw new Error(
        `PitchMeAI API error: ${res.status} ${res.statusText} — ${responseText.slice(0, 200)}`
      );
    }

    return JSON.parse(responseText) as T;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    // Only push if we didn't already push above (non-ok responses already logged)
    if (status === null) {
      networkLogs.push({
        method,
        url,
        status: null,
        durationMs,
        requestBody: options.body ? String(options.body).slice(0, 500) : undefined,
        error: errMsg,
      });
    }

    throw err;
  }
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

/** Get the user's resume data */
export async function getUserResume(
  userID: string
): Promise<Record<string, unknown>> {
  return apiFetch(`/resume-builder/resume/${userID}`);
}

/** Get user settings / profile (returns dynamicTitle, dynamicLocation, etc.) */
export async function getUserSettings(): Promise<Record<string, unknown>> {
  return apiFetch("/settings");
}

/** Get personalized job recommendations based on user profile */
export async function getJobRecommendations(): Promise<PitchMeSearchResponse> {
  return apiFetch<PitchMeSearchResponse>("/jobs/recommendations");
}

/** Resume builder — check build status / get result */
export async function getResumeBuildStatus(
  userID: string
): Promise<{ status?: string; html?: string; pdfUrl?: string; [key: string]: unknown }> {
  return apiFetch(`/resume-builder/status/${userID}`);
}
