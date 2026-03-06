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
      "Search for jobs matching the user's criteria. Use this when the user asks to find jobs, look for positions, or describes what kind of role they want.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description:
            "Job search query — role title, skills, or keywords (e.g. 'frontend engineer react')",
        },
        location: {
          type: "string",
          description:
            "Location filter (e.g. 'New York', 'Remote', 'San Francisco'). Omit if not specified.",
        },
      },
      required: ["search"],
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
  {
    name: "build_new_resume",
    description:
      "Start building a new resume from scratch or update an existing one. Use when the user wants to create, build, or upload a resume.",
    input_schema: {
      type: "object" as const,
      properties: {
        template: {
          type: "string",
          description:
            "Resume template to use (optional). Leave empty for default.",
        },
      },
      required: [],
    },
  },
];

export type ToolName =
  | "search_jobs"
  | "generate_tailored_resume"
  | "generate_intro_email"
  | "apply_to_multiple_jobs"
  | "email_all_hiring_managers"
  | "build_new_resume";
