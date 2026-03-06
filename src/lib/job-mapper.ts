/**
 * Maps PitchMeAI API job responses → existing UI Job interface.
 * CouchDB documents have specific field names — this mapper handles them defensively.
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

/** Format salary from salary_raw object or string */
function formatSalary(raw: PitchMeApiJob): string {
  // Try salary_raw.value.minValue/maxValue (CouchDB format)
  const salaryVal = raw.salary_raw?.value;
  if (salaryVal?.minValue || salaryVal?.maxValue) {
    const min = salaryVal.minValue;
    const max = salaryVal.maxValue;
    const fmt = (n: number) => {
      if (n >= 1000) return `$${Math.round(n / 1000)}k`;
      return `$${n}`;
    };
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    if (max) return `Up to ${fmt(max)}`;
  }
  // Fallback to string salary field
  if (raw.salary) return raw.salary;
  return "Salary not listed";
}

/** Extract location from CouchDB job document */
function extractLocation(raw: PitchMeApiJob): string {
  // Backend sets job.location in the response mapping
  if (raw.location) return raw.location;
  if (raw.remote_derived) return "Remote";
  if (raw.locations_derived?.[0]) return raw.locations_derived[0];
  return "Location not specified";
}

/** Extract company name from various possible field names */
function extractCompany(raw: PitchMeApiJob): string {
  return raw.organization || raw.company || raw.company_name || "Unknown Company";
}

/** Extract job description */
function extractDescription(raw: PitchMeApiJob): string {
  return raw.description_text || raw.description || "";
}

/** Extract tags/skills from gpt_content_taxonomy or other fields */
function extractTags(raw: PitchMeApiJob): string[] {
  if (raw.skills && raw.skills.length > 0) return raw.skills.slice(0, 5);
  if (raw.tags && raw.tags.length > 0) return raw.tags.slice(0, 5);
  // Try to extract from gpt_content_taxonomy
  const taxonomy = raw.gpt_content_taxonomy;
  if (taxonomy?.industry) return [taxonomy.industry];
  return [];
}

/** Map a single API job object to the UI Job interface */
export function mapApiJob(raw: PitchMeApiJob, index: number): Job {
  const company = extractCompany(raw);
  const description = extractDescription(raw);
  const tags = extractTags(raw);

  const status: JobStatus = {
    ...defaultStatus(),
  };

  const requirements: string[] =
    description
      ? extractRequirements(description)
      : defaultRequirements(tags);

  // Format posted date
  let postedDate = "Recently";
  if (raw.date_posted) {
    try {
      const posted = new Date(raw.date_posted);
      const daysAgo = Math.floor((Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo === 0) postedDate = "Today";
      else if (daysAgo === 1) postedDate = "1 day ago";
      else if (daysAgo < 7) postedDate = `${daysAgo} days ago`;
      else if (daysAgo < 30) postedDate = `${Math.floor(daysAgo / 7)} weeks ago`;
      else postedDate = `${Math.floor(daysAgo / 30)} months ago`;
    } catch {
      postedDate = "Recently";
    }
  }

  return {
    id: raw._id || `api-${index}-${Date.now()}`,
    title: raw.title || "Untitled Position",
    company,
    location: extractLocation(raw),
    salary: formatSalary(raw),
    matchPercent: clampMatch(raw.matchScore),
    tags,
    description,
    requirements,
    postedDate,
    status,
    _apiData: {
      jobId: raw._id,
      url: raw.url || raw.redirect_url,
      companyUrl: raw.company_url || raw.companyUrl,
      companyProfileUrl: raw.company_profile_url || raw.companyProfileUrl,
      jobDetails: description,
      jobName: raw.title,
      companyName: company,
      location: extractLocation(raw),
      thumbnail: raw.thumbnail,
    },
  };
}

/** Extract all jobs from a PitchMeAI search response */
export function mapSearchResponse(response: PitchMeSearchResponse): {
  jobs: Job[];
  total: number;
} {
  // Primary: results array (jobs-get-results-v3 response shape)
  const rawJobs: PitchMeApiJob[] =
    response.results ?? response.jobs ?? response.data ?? [];

  const jobs = rawJobs.map((raw, i) => mapApiJob(raw, i));

  // Total from pagination (v3 response) or fallback fields
  const total =
    response.pagination?.totalJobs ??
    response.total ??
    response.totalResults ??
    response.count ??
    jobs.length;

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
