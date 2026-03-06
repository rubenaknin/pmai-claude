/**
 * Claude tool definitions for PitchMeAI chat.
 * These are sent to the Claude API so it can decide which actions to take.
 */

import type Anthropic from "@anthropic-ai/sdk";

type Tool = Anthropic.Messages.Tool;

export const TOOLS: Tool[] = [
  {
    name: "search_jobs",
    description:
      `Search for jobs matching the user's criteria. The backend automatically uses the user's profile (resume taxonomy, location) to improve results.

RULES for the "search" parameter:
- Should be a specific job title or role (e.g. "frontend engineer", "data scientist", "product manager")
- NEVER use generic/filler words like "me", "jobs", "positions", "roles", "work", "opportunities"
- "find me jobs" → the word "me" is NOT a search term, it's a pronoun. Omit the search parameter entirely.
- If the user says "find me jobs" without specifying a role, either omit the search parameter (use only location) or use get_job_recommendations instead
- The search parameter is OPTIONAL — if omitted, the backend will use the user's profile taxonomy title automatically
- Good examples: "react developer", "senior backend engineer", "marketing manager"
- Bad examples: "me", "jobs", "positions in NYC", "work"`,
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description:
            "Specific job title or role to search for. Optional — if omitted, the backend uses the user's profile title automatically.",
        },
        location: {
          type: "string",
          description:
            "Location filter (e.g. 'New York', 'Remote', 'Tel Aviv'). Omit to use the user's profile location.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_job_recommendations",
    description:
      "Get personalized job recommendations based on the user's profile, resume, and preferences. Use this when the user says 'find me jobs' or 'show me matching jobs' WITHOUT specifying a particular role — this uses their profile's title and location automatically. Also use this as the default when you're unsure what role to search for.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_tailored_resume",
    description:
      "Generate a tailored resume for a specific job. Use this when the user wants to apply to a single job. Requires the job's ID, URL, title, company name, and description from the search results.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL of the job posting (from job._apiData.url).",
        },
        jobId: {
          type: "string",
          description: "The job ID (from job.id or job._apiData.jobId).",
        },
        jobName: {
          type: "string",
          description: "The job title.",
        },
        companyName: {
          type: "string",
          description: "The company name.",
        },
        jobDetails: {
          type: "string",
          description: "The job description text.",
        },
      },
      required: ["url", "jobId", "jobName", "companyName", "jobDetails"],
    },
  },
  {
    name: "generate_intro_email",
    description:
      "Generate a personalized intro email to the hiring manager for a specific job. Use when the user wants to email or contact a hiring manager. Requires the job's ID, title, company name, and description.",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId: {
          type: "string",
          description: "The job ID.",
        },
        jobName: {
          type: "string",
          description: "The job title.",
        },
        companyName: {
          type: "string",
          description: "The company name.",
        },
        jobDetails: {
          type: "string",
          description: "The job description.",
        },
        url: {
          type: "string",
          description: "The job posting URL (optional).",
        },
        companyUrl: {
          type: "string",
          description: "The company website URL (optional).",
        },
      },
      required: ["jobId", "jobName", "companyName", "jobDetails"],
    },
  },
  {
    name: "apply_to_multiple_jobs",
    description:
      "Apply to multiple jobs at once by generating tailored resumes for each. Use when the user says 'apply to all', 'apply to these jobs', or wants to bulk-apply.",
    input_schema: {
      type: "object" as const,
      properties: {
        jobIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of job IDs from the current search results to apply to.",
        },
      },
      required: ["jobIds"],
    },
  },
  {
    name: "email_all_hiring_managers",
    description:
      "Send personalized emails to hiring managers for multiple jobs. Use when the user wants to email all hiring managers or reach out to multiple companies.",
    input_schema: {
      type: "object" as const,
      properties: {
        jobIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of job IDs to email hiring managers for.",
        },
      },
      required: ["jobIds"],
    },
  },
];

export type ToolName =
  | "search_jobs"
  | "get_job_recommendations"
  | "generate_tailored_resume"
  | "generate_intro_email"
  | "apply_to_multiple_jobs"
  | "email_all_hiring_managers";
