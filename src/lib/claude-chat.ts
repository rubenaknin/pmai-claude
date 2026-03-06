/**
 * Core chat orchestration:
 * User message + history → Claude with tools → execute tool calls → tool_result → final response
 * Supports multi-turn tool use (e.g. search_jobs → generate_resume in one turn).
 */

import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, type ToolName } from "./claude-tools";
import {
  searchJobs,
  generateResume,
  generateEmail,
  getJobRecommendations,
  getNetworkLogs,
  resetNetworkLogs,
} from "./pitchmeai-client";
import { mapSearchResponse } from "./job-mapper";
import type {
  ChatHistoryMessage,
  ChatApiResponse,
  ActionType,
  DebugInfo,
} from "./types";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-5-20250929";

function buildSystemPrompt(userIp?: string): string {
  let prompt = `You are Nikki, PitchMeAI's friendly and efficient job application assistant.

Your capabilities:
- Search for jobs matching a user's skills, preferences, and location
- Generate tailored resumes for specific job applications
- Write personalized intro emails to hiring managers
- Apply to multiple jobs at once (bulk apply)
- Email all hiring managers for a set of jobs

HOW JOB SEARCH WORKS:
- The backend automatically uses the user's uploaded resume/profile to determine their job title taxonomy and location
- When calling search_jobs, the user's profile taxonomy tokens are ALWAYS added to the search automatically
- This means if a user says "find me jobs in Tel Aviv" you can call search_jobs with just location="Tel Aviv" and the backend will search using their profile's job title
- If the user specifies a role like "frontend engineer jobs in NYC", pass search="frontend engineer" and location="NYC"
- If the user gives a vague request like "find me jobs" with no role or location, use get_job_recommendations which uses their full profile

SEARCH RULES:
- NEVER search for generic words like "jobs", "positions", "roles", "work" — these are NOT job titles
- If the user specifies a role, use search_jobs with that role
- If the user only specifies a location, use search_jobs with just location (backend adds profile title)
- If the user gives no specifics, use get_job_recommendations

RESUME & EMAIL GENERATION:
- To generate a resume or email, you MUST have the job's ID, URL, title, company, and description
- These come from the _apiData field of jobs returned by search results
- When the user says "apply for job #3", look up that job from the search results context
- The resume/email generation costs the user 1 credit — mention this if relevant

Guidelines:
- Be conversational, helpful, and concise
- When showing search results, summarize what you found (e.g. "I found 47 frontend engineer roles in Tel Aviv")
- When the user wants to apply or email, confirm the action and execute it
- If the user references a specific job from previous results, use the job context to identify it
- Never make up job listings — only show real results from the search tool
- When no tool is needed (general questions, chitchat), just respond naturally`;

  if (userIp) {
    prompt += `\n\nUser's IP address (for approximate geolocation if no location specified): ${userIp}`;
  }

  return prompt;
}

export async function processChat(
  userMessage: string,
  history: ChatHistoryMessage[],
  jobsContext?: string,
  userIp?: string
): Promise<ChatApiResponse> {
  // Reset per-request state
  resetNetworkLogs();

  const debug: DebugInfo = {
    networkLogs: [],
    claudeModel: MODEL,
    timestamp: new Date().toISOString(),
  };

  // Build messages array for Claude
  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let systemPrompt = buildSystemPrompt(userIp);
  if (jobsContext) {
    systemPrompt += `\n\nCurrent jobs the user is looking at:\n${jobsContext}`;
  }

  messages.push({ role: "user", content: userMessage });

  try {
    // Agentic loop — keep calling Claude until it stops using tools (max 5 iterations)
    let currentMessages = [...messages];
    let finalActionType: ActionType = "general";
    let finalData: ChatApiResponse["data"] | undefined;
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
      });

      const toolUseBlock = response.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
      );

      if (!toolUseBlock) {
        // No more tool calls — extract final text
        const textBlock = response.content.find(
          (b): b is Anthropic.Messages.TextBlock => b.type === "text"
        );
        debug.networkLogs = getNetworkLogs();
        const suggestions = buildSuggestions(finalActionType);
        return {
          botMessage: textBlock?.text || "I'm not sure how to help with that. Could you rephrase?",
          actionType: finalActionType,
          data: finalData,
          suggestions,
          _debug: debug,
        };
      }

      // Execute the tool call
      const toolName = toolUseBlock.name as ToolName;
      const toolInput = toolUseBlock.input as Record<string, unknown>;

      // Track tool for debug
      if (!debug.toolUsed) {
        debug.toolUsed = toolName;
        debug.toolInput = toolInput;
      } else {
        debug.toolUsed = toolName;
        debug.toolInput = toolInput;
      }

      const { toolResult, actionType, data } = await executeTool(toolName, toolInput);

      // Update final action/data if this tool produced meaningful output
      if (actionType !== "general" || !finalData) {
        finalActionType = actionType;
        finalData = data ?? finalData;
      }

      // Append assistant response + tool result, continue the loop
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      ];
    }

    // If we hit max iterations, return what we have
    debug.networkLogs = getNetworkLogs();
    return {
      botMessage: "I've completed the search. Let me know if you need anything else.",
      actionType: finalActionType,
      data: finalData,
      suggestions: buildSuggestions(finalActionType),
      _debug: debug,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("processChat error:", message);
    debug.networkLogs = getNetworkLogs();
    return {
      botMessage: `Sorry, I ran into an issue: ${message}. Please try again.`,
      actionType: "error",
      _debug: debug,
    };
  }
}

async function executeTool(
  toolName: ToolName,
  input: Record<string, unknown>
): Promise<{
  toolResult: unknown;
  actionType: ActionType;
  data?: ChatApiResponse["data"];
}> {
  switch (toolName) {
    case "get_job_recommendations": {
      const raw = await getJobRecommendations();
      const { jobs, total } = mapSearchResponse(raw);
      return {
        toolResult: {
          found: total,
          showing: jobs.length,
          jobs: jobs.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            salary: j.salary,
            matchPercent: j.matchPercent,
            tags: j.tags,
          })),
        },
        actionType: "show_jobs",
        data: { jobs, totalJobs: total },
      };
    }

    case "search_jobs": {
      const raw = await searchJobs({
        search: input.search as string | undefined,
        location: input.location as string | undefined,
      });
      const { jobs, total } = mapSearchResponse(raw);
      return {
        toolResult: {
          found: total,
          showing: jobs.length,
          jobs: jobs.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            salary: j.salary,
            matchPercent: j.matchPercent,
            tags: j.tags,
          })),
        },
        actionType: "show_jobs",
        data: { jobs, totalJobs: total },
      };
    }

    case "generate_tailored_resume": {
      const result = await generateResume({
        url: input.url as string,
        jobId: input.jobId as string,
        jobName: input.jobName as string,
        companyName: input.companyName as string,
        jobDetails: input.jobDetails as string,
        platform: "PitchMeAI",
      });
      const resumeData = {
        html: result.newResumeHTMLBody || result.html || result.resume_html || "",
        highlights: extractHighlights(result.threeExplanations),
        pdfFileName: result.pdfFileName,
        jobTitle: input.jobName as string | undefined,
        company: input.companyName as string | undefined,
        threeExplanations: result.threeExplanations,
      };
      return {
        toolResult: {
          success: true,
          hasResume: !!resumeData.html,
          highlights: resumeData.highlights,
          summary: result.threeExplanations?.summary,
        },
        actionType: "show_resume",
        data: { resume: resumeData },
      };
    }

    case "generate_intro_email": {
      const result = await generateEmail({
        jobId: input.jobId as string,
        jobName: input.jobName as string,
        companyName: input.companyName as string,
        jobDetails: input.jobDetails as string,
        url: input.url as string | undefined,
        companyUrl: input.companyUrl as string | undefined,
        platform: "PitchMeAI",
      });
      const emailData = {
        subject: `Introduction — ${input.jobName || "Job Application"}`,
        body: result.introEmail || result.body || result.email_body || "",
        recipientName: result.recruiter?.name || result.recipientName || "Hiring Manager",
        recipientTitle: result.recruiter?.title || result.recipientTitle || "",
        recipientEmail: result.recruiter?.email,
        recipientLinkedin: result.recruiter?.linkedin_url,
        company: (input.companyName as string) || "",
      };
      return {
        toolResult: {
          success: true,
          subject: emailData.subject,
          recipientName: emailData.recipientName,
          recipientTitle: emailData.recipientTitle,
          hasRecruiterEmail: !!emailData.recipientEmail,
        },
        actionType: "show_email",
        data: { email: emailData },
      };
    }

    case "apply_to_multiple_jobs": {
      const jobIds = (input.jobIds as string[]) || [];
      return {
        toolResult: {
          success: true,
          count: jobIds.length,
          message: `Initiated bulk application for ${jobIds.length} jobs`,
        },
        actionType: "bulk_apply_result",
        data: {
          bulkResults: jobIds.map((id) => ({
            jobId: id,
            company: "",
            success: true,
          })),
        },
      };
    }

    case "email_all_hiring_managers": {
      const jobIds = (input.jobIds as string[]) || [];
      return {
        toolResult: {
          success: true,
          count: jobIds.length,
          message: `Initiated bulk email for ${jobIds.length} hiring managers`,
        },
        actionType: "bulk_email_result",
        data: {
          bulkResults: jobIds.map((id) => ({
            jobId: id,
            company: "",
            success: true,
          })),
        },
      };
    }

    default:
      return {
        toolResult: { error: `Unknown tool: ${toolName}` },
        actionType: "error",
      };
  }
}

/** Extract highlights array from threeExplanations object */
function extractHighlights(
  explanations?: { summary?: string; keywords_added?: string[]; soft_skills?: string }
): string[] {
  if (!explanations) return [];
  const highlights: string[] = [];
  if (explanations.summary) highlights.push(explanations.summary);
  if (explanations.keywords_added) {
    highlights.push(`Keywords added: ${explanations.keywords_added.join(", ")}`);
  }
  if (explanations.soft_skills) highlights.push(`Soft skills: ${explanations.soft_skills}`);
  return highlights;
}

function buildSuggestions(actionType: ActionType): string[] {
  switch (actionType) {
    case "show_jobs":
      return ["Apply for all", "Tell me more about the top match", "Refine my search"];
    case "show_resume":
      return ["Email the hiring manager", "Apply to more jobs"];
    case "show_email":
      return ["Send the email", "Edit the email", "Apply to more jobs"];
    case "bulk_apply_result":
      return ["Email all hiring managers", "Find more jobs"];
    case "bulk_email_result":
      return ["Find more jobs", "Help me prep for interviews"];
    default:
      return [];
  }
}
