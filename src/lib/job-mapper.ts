/**
 * Maps PitchMeAI API job responses → existing UI Job interface.
 * Defensive parsing with fallbacks so the UI never breaks.
 */

import type { Job, JobStatus } from "@/components/chat/jobData";
import type { PitchMeApiJob, PitchMeSearchResponse } from "./types";

export function defaultStatus(): JobStatus {
  return {
    isLive: true,
    applied: false,
    appliedAt: null,
    hiringManagerFound: false,
    hiringManagerName: null,
    hiringManagerTitle: null,
    emailSent: false,
    emailSentAt: null,
    saved: false,
  };
}

/** Map a single API job object to the UI Job interface */
export function mapApiJob(raw: PitchMeApiJob, index: number): Job {
  const hmName = raw.hiringManager?.name ?? null;
  const hmTitle = raw.hiringManager?.title ?? null;

  const status: JobStatus = {
    ...defaultStatus(),
    isLive: raw.isActive !== false,
    hiringManagerFound: !!hmName,
    hiringManagerName: hmName,
    hiringManagerTitle: hmTitle,
  };

  const tags: string[] =
    raw.skills ?? raw.tags ?? [];

  const requirements: string[] =
    raw.requirements ??
    (raw.jobDetails
      ? extractRequirements(raw.jobDetails)
      : defaultRequirements(tags));

  return {
    id: `api-${index}-${Date.now()}`,
    title: raw.title || "Untitled Position",
    company: raw.company || "Unknown Company",
    location: raw.location || "Remote",
    salary: raw.salary || "Salary not listed",
    matchPercent: clampMatch(raw.matchScore),
    tags: tags.slice(0, 5),
    description: raw.description || raw.jobDetails || "",
    requirements,
    postedDate: raw.posted || raw.postedDate || "Recently",
    status,
    _apiData: {
      url: raw.url,
      companyUrl: raw.companyUrl,
      jobDetails: raw.jobDetails || raw.description,
    },
  };
}

/** Extract all jobs from a PitchMeAI search response (handles multiple shapes) */
export function mapSearchResponse(response: PitchMeSearchResponse): {
  jobs: Job[];
  total: number;
} {
  const rawJobs: PitchMeApiJob[] =
    response.jobs ?? response.results ?? response.data ?? [];

  const jobs = rawJobs.map((raw, i) => mapApiJob(raw, i));
  const total =
    response.total ?? response.totalResults ?? response.count ?? jobs.length;

  return { jobs, total };
}

function clampMatch(score?: number): number {
  if (typeof score !== "number" || isNaN(score)) return 75;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function extractRequirements(details: string): string[] {
  const lines = details.split(/\n|•|·|-\s/).filter((l) => l.trim().length > 10);
  return lines.slice(0, 6).map((l) => l.trim());
}

function defaultRequirements(tags: string[]): string[] {
  const base = [
    "Relevant professional experience",
    "Strong problem-solving skills",
    "Excellent communication abilities",
  ];
  const techReqs = tags.slice(0, 2).map((t) => `Experience with ${t}`);
  return [...techReqs, ...base];
}
