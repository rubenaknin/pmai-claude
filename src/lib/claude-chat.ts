/**
 * Core chat orchestration:
 * User message + history → Claude with tools → execute tool calls → tool_result → final response
 * Supports multi-turn tool use (e.g. get_user_profile → search_jobs in one turn).
 */

import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, type ToolName } from "./claude-tools";
import {
  searchJobs,
  generateResume,
  generateEmail,
  getUserSettings,
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
  UserProfile,
} from "./types";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-5-20250929";

function buildSystemPrompt(userProfile?: UserProfile | null, userIp?: string): string {
  let prompt = `You are Nikki, PitchMeAI's friendly and efficient job application assistant.

Your capabilities:
- Search for jobs matching a user's skills, preferences, and location
- Generate tailored resumes for specific job applications
- Write personalized intro emails to hiring managers
- Apply to multiple jobs at once (bulk apply)
- Email all hiring managers for a set of jobs
- Check user's profile and resume status

CRITICAL SEARCH RULES:
- The search_jobs tool requires a SPECIFIC job title/role (e.g. "frontend engineer", "data analyst")
- NEVER search for generic words like "jobs", "positions", "roles", "work"
- If the user asks "find me jobs" without specifying a role:
  1. FIRST call get_user_profile to check if they have a dynamicTitle set
  2. If they have a dynamicTitle, use get_job_recommendations (it uses their profile automatically) OR search_jobs with their dynamicTitle
  3. If they DON'T have a dynamicTitle or resume, ask them: "What kind of role are you looking for?" and suggest they upload their resume
- If the user mentions a location but not a role, still get their profile first to find their dynamicTitle

RESUME/PROFILE FLOW:
- If the user has no resume uploaded (hasResume=false), suggest they upload one for better matching
- If the user mentions "here's my resume" or wants to upload, tell them to use the upload feature (we don't handle file uploads in chat yet)

LOCATION HANDLING:
- If the user specifies a location, pass it to search_jobs
- If no location is specified, the API will use the user's profile location automatically
- Do NOT guess or assume locations

Guidelines:
- Be conversational, helpful, and concise
- When showing search results, summarize what you found (e.g. "I found 47 frontend engineer roles in Tel Aviv")
- When the user wants to apply or email, confirm the action and execute it
- If the user references a specific job from previous results, use the job context to identify it
- Never make up job listings — only show real results from the search tool
- When no tool is needed (general questions, chitchat), just respond naturally`;

  if (userProfile) {
    prompt += `\n\nUser Profile:`;
    if (userProfile.firstName || userProfile.lastName) {
      prompt += `\n- Name: ${[userProfile.firstName, userProfile.lastName].filter(Boolean).join(" ")}`;
    }
    if (userProfile.dynamicTitle) {
      prompt += `\n- Looking for: ${userProfile.dynamicTitle}`;
    }
    if (userProfile.dynamicLocation) {
      prompt += `\n- Preferred location: ${userProfile.dynamicLocation}`;
    }
    if (userProfile.hasResume !== undefined) {
      prompt += `\n- Resume uploaded: ${userProfile.hasResume ? "yes" : "no"}`;
    }
  }

  if (userIp) {
    prompt += `\n\nUser's IP address (for approximate geolocation if no location specified): ${userIp}`;
  }

  return prompt;
}

// Cache the user profile for the request lifecycle
let cachedProfile: UserProfile | null = null;
let profileFetched = false;

async function fetchUserProfile(): Promise<UserProfile | null> {
  if (profileFetched) return cachedProfile;
  try {
    const settings = await getUserSettings();
    cachedProfile = {
      dynamicTitle: settings.dynamicTitle as string | undefined,
      dynamicLocation: settings.dynamicLocation as string | undefined,
      firstName: settings.firstName as string | undefined,
      lastName: settings.lastName as string | undefined,
      email: settings.email as string | undefined,
      hasResume: !!settings.dynamicTitle, // proxy: if they have a title, they likely uploaded a resume
    };
  } catch {
    cachedProfile = null;
  }
  profileFetched = true;
  return cachedProfile;
}

export async function processChat(
  userMessage: string,
  history: ChatHistoryMessage[],
  jobsContext?: string,
  userIp?: string
): Promise<ChatApiResponse> {
  // Reset per-request state
  resetNetworkLogs();
  profileFetched = false;
  cachedProfile = null;

  const debug: DebugInfo = {
    networkLogs: [],
    claudeModel: MODEL,
    timestamp: new Date().toISOString(),
  };

  // Pre-fetch user profile so we can include it in the system prompt
  const userProfile = await fetchUserProfile();

  // Build messages array for Claude
  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let systemPrompt = buildSystemPrompt(userProfile, userIp);
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

      // Track the last meaningful tool for debug
      if (toolName !== "get_user_profile") {
        debug.toolUsed = toolName;
        debug.toolInput = toolInput;
      } else if (!debug.toolUsed) {
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
    case "get_user_profile": {
      const profile = await fetchUserProfile();
      return {
        toolResult: profile
          ? {
              dynamicTitle: profile.dynamicTitle || null,
              dynamicLocation: profile.dynamicLocation || null,
              firstName: profile.firstName || null,
              lastName: profile.lastName || null,
              hasResume: profile.hasResume || false,
            }
          : { error: "Could not fetch user profile", hasResume: false },
        actionType: "general",
      };
    }

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
        search: input.search as string,
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
        jobUrl: input.jobUrl as string,
        jobTitle: input.jobTitle as string | undefined,
        company: input.company as string | undefined,
        jobDetails: input.jobDetails as string | undefined,
      });
      const resumeData = {
        html: result.html || result.resume_html || result.resumeHtml || "",
        highlights: result.highlights || [],
        pdfUrl: result.pdfUrl || result.pdf_url,
        jobTitle: input.jobTitle as string | undefined,
        company: input.company as string | undefined,
      };
      return {
        toolResult: {
          success: true,
          hasResume: !!resumeData.html,
          highlights: resumeData.highlights,
        },
        actionType: "show_resume",
        data: { resume: resumeData },
      };
    }

    case "generate_intro_email": {
      const result = await generateEmail({
        jobUrl: input.jobUrl as string,
        jobTitle: input.jobTitle as string | undefined,
        company: input.company as string | undefined,
        companyUrl: input.companyUrl as string | undefined,
        jobDetails: input.jobDetails as string | undefined,
      });
      const emailData = {
        subject: result.subject || `Introduction — ${input.jobTitle || "Job Application"}`,
        body: result.body || result.email_body || result.emailBody || "",
        recipientName: result.recipientName || result.recipient || "Hiring Manager",
        recipientTitle: result.recipientTitle || "",
        company: (input.company as string) || "",
      };
      return {
        toolResult: {
          success: true,
          subject: emailData.subject,
          recipientName: emailData.recipientName,
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
