/**
 * PitchMeAI HTTP client — wraps all API calls to the PitchMeAI backend.
 * Attaches the AuthSession cookie for authentication.
 * Captures network debug logs for monitoring.
 */

import type {
  PitchMeSearchResponse,
  PitchMeResumeResponse,
  PitchMeResumeUploadResponse,
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

/** Geocode a location string into coordinates using the backend's Google Places integration */
export async function geocodeLocation(locationText: string): Promise<{
  location: string;
  hierarchy: string;
  lat: number;
  lng: number;
} | null> {
  try {
    const data = await apiFetch<{
      results?: Array<{
        location: string;
        hierarchy: string;
        coordinates?: { lat: number; lng: number };
      }>;
    }>(`/jobs/locations/search?q=${encodeURIComponent(locationText)}`);

    const first = data.results?.[0];
    if (first?.coordinates?.lat && first?.coordinates?.lng) {
      return {
        location: first.location,
        hierarchy: first.hierarchy,
        lat: first.coordinates.lat,
        lng: first.coordinates.lng,
      };
    }
    return null;
  } catch (err) {
    console.error("Geocode failed:", err);
    return null;
  }
}

/** Search for jobs matching a query. Geocodes location text into coordinates automatically. */
export async function searchJobs(params: {
  search?: string;
  location?: string;
  page?: number;
  limit?: number;
}): Promise<PitchMeSearchResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  // Geocode location text into coordinates for the backend's bounding box query
  if (params.location) {
    const geo = await geocodeLocation(params.location);
    if (geo) {
      qs.set("location", geo.location);
      qs.set("locationLat", String(geo.lat));
      qs.set("locationLng", String(geo.lng));
      qs.set("locationHierarchy", geo.hierarchy);
    } else {
      // Fallback: pass raw text (may not filter properly)
      qs.set("location", params.location);
    }
  }

  const queryString = qs.toString();
  return apiFetch<PitchMeSearchResponse>(`/jobs${queryString ? `?${queryString}` : ""}`);
}

/**
 * Generate a tailored resume for a specific job.
 * Backend requires: url, jobId, jobDetails, jobName, companyName
 */
export async function generateResume(params: {
  url: string;
  jobId: string;
  jobDetails: string;
  jobName: string;
  companyName: string;
  companyUrl?: string;
  companyProfileUrl?: string;
  location?: string;
  platform?: string;
}): Promise<PitchMeResumeResponse> {
  return apiFetch<PitchMeResumeResponse>("/resume/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Generate an intro email to a hiring manager.
 * Backend requires: jobId, jobDetails, jobName, companyName
 */
export async function generateEmail(params: {
  jobId: string;
  jobDetails: string;
  jobName: string;
  companyName: string;
  url?: string;
  companyUrl?: string;
  companyProfileUrl?: string;
  platform?: string;
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

/** Get personalized job recommendations based on user profile */
export async function getJobRecommendations(): Promise<PitchMeSearchResponse> {
  return apiFetch<PitchMeSearchResponse>("/jobs/recommendations");
}

/** Upload a resume file (PDF/DOCX) to the PitchMeAI backend */
export async function uploadResume(
  formData: FormData
): Promise<PitchMeResumeUploadResponse> {
  const url = `${API_URL}/resume-builder/upload`;
  const start = Date.now();
  let status: number | null = null;
  let responseText = "";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Cookie: `AuthSession=${SESSION_COOKIE}`,
        // Do NOT set Content-Type — browser/node sets multipart boundary automatically
      },
      body: formData,
    });

    status = res.status;
    responseText = await res.text();
    const durationMs = Date.now() - start;

    networkLogs.push({
      method: "POST",
      url,
      status,
      durationMs,
      requestBody: "[FormData file upload]",
      responseSnippet: responseText.slice(0, 1000),
    });

    if (!res.ok) {
      throw new Error(
        `PitchMeAI API error: ${res.status} ${res.statusText} — ${responseText.slice(0, 200)}`
      );
    }

    return JSON.parse(responseText) as PitchMeResumeUploadResponse;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    if (status === null) {
      networkLogs.push({
        method: "POST",
        url,
        status: null,
        durationMs,
        requestBody: "[FormData file upload]",
        error: errMsg,
      });
    }

    throw err;
  }
}

/** Resume builder — check build status / get result */
export async function getResumeBuildStatus(
  userID: string
): Promise<{ status?: string; html?: string; pdfUrl?: string; [key: string]: unknown }> {
  return apiFetch(`/resume-builder/status/${userID}`);
}
