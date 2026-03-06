/**
 * Claude tool definitions for PitchMeAI chat.
 * These are sent to the Claude API so it can decide which actions to take.
 */

import type Anthropic from "@anthropic-ai/sdk";

type Tool = Anthropic.Messages.Tool;

export const TOOLS: Tool[] = [
  {
    name: "get_user_profile",
    description:
      "Fetch the user's profile and resume status from PitchMeAI. Call this FIRST before searching for jobs if you don't know what role/title the user is looking for. Returns their dynamicTitle (desired job title), dynamicLocation (preferred location), name, and whether they have a resume uploaded.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_jobs",
    description:
      `Search for jobs matching the user's criteria.

CRITICAL RULES for the "search" parameter:
- MUST be a specific job title or role (e.g. "frontend engineer", "data scientist", "product manager", "devops engineer")
- NEVER use generic words like "jobs", "positions", "roles", "work", "opportunities"
- If the user says "find me jobs" without specifying a role, you MUST first call get_user_profile to get their dynamicTitle, OR ask the user what role they want
- If the user says "find me jobs in Tel Aviv", do NOT search for "jobs" — ask what kind of role, or use their profile's dynamicTitle
- Good examples: "react developer", "senior backend engineer", "marketing manager", "UX designer"
- Bad examples: "jobs", "positions in NYC", "work", "employment"`,
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description:
            "Specific job title or role to search for (e.g. 'frontend engineer', 'data scientist'). Must be a real job title, never generic words like 'jobs'.",
        },
        location: {
          type: "string",
          description:
            "Location filter (e.g. 'New York', 'Remote', 'Tel Aviv'). Omit to use the user's profile location.",
        },
      },
      required: ["search"],
    },
  },
  {
    name: "get_job_recommendations",
    description:
      "Get personalized job recommendations based on the user's profile, resume, and preferences. Use this when the user says 'find me jobs' or 'show me matching jobs' WITHOUT specifying a particular role — this uses their profile's dynamicTitle and dynamicLocation automatically.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_tailored_resume",
    description:
      "Generate a tailored resume for a specific job. Use this when the user wants to apply to a single job, or when they say 'apply for me' for a specific position.",
    input_schema: {
      type: "object" as const,
      properties: {
        jobUrl: {
          type: "string",
          description: "The URL of the job posting to tailor the resume for.",
        },
        jobTitle: {
          type: "string",
          description: "The job title.",
        },
        company: {
          type: "string",
          description: "The company name.",
        },
        jobDetails: {
          type: "string",
          description: "The job description or details.",
        },
      },
      required: ["jobUrl"],
    },
  },
  {
    name: "generate_intro_email",
    description:
      "Generate a personalized intro email to the hiring manager for a specific job. Use when the user wants to email or contact a hiring manager.",
    input_schema: {
      type: "object" as const,
      properties: {
        jobUrl: {
          type: "string",
          description: "The URL of the job posting.",
        },
        jobTitle: {
          type: "string",
          description: "The job title.",
        },
        company: {
          type: "string",
          description: "The company name.",
        },
        companyUrl: {
          type: "string",
          description: "The company website URL.",
        },
        jobDetails: {
          type: "string",
          description: "The job description.",
        },
      },
      required: ["jobUrl"],
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
  | "get_user_profile"
  | "search_jobs"
  | "get_job_recommendations"
  | "generate_tailored_resume"
  | "generate_intro_email"
  | "apply_to_multiple_jobs"
  | "email_all_hiring_managers";
