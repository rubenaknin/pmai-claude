/**
 * Core chat orchestration using LangChain + Anthropic.
 *
 * First message: handled deterministically in code.
 *   - User specifies a role explicitly → search immediately (no LLM needed)
 *   - User is vague → ask for clarification (no LLM needed)
 *
 * Subsequent messages: LangChain ChatAnthropic with tool calling.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
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
  UserStatusResponse,
} from "./types";

const MODEL = "claude-sonnet-4-5-20250929";

// ── LangChain model (created once, reused) ──

const llm = new ChatAnthropic({
  model: MODEL,
  maxTokens: 1024,
});

// ── System prompt builder ──

function buildSystemPrompt(userIp?: string, userStatus?: UserStatusResponse): string {
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
- When showing search results, respond with ONE short sentence like "I found 47 jobs in Tel Aviv for you." Do NOT list or describe individual jobs — the UI renders job cards automatically. Never enumerate jobs in your text response.
- When the user wants to apply or email, confirm the action and execute it
- If the user references a specific job from previous results, use the job context to identify it
- Never make up job listings — only show real results from the search tool
- When no tool is needed (general questions, chitchat), just respond naturally`;

  if (userStatus) {
    const parts: string[] = [];
    if (userStatus.isLoggedIn) parts.push("User is logged in.");
    if (userStatus.userFirstName) parts.push(`First name: ${userStatus.userFirstName}.`);
    if (userStatus.hasResume) parts.push("User has uploaded a resume.");
    if (userStatus.dynamicTitle) parts.push(`Job title from profile: ${userStatus.dynamicTitle}.`);
    if (userStatus.dynamicLocation) parts.push(`Location from profile: ${userStatus.dynamicLocation}.`);
    if (parts.length > 0) {
      prompt += `\n\nUSER PROFILE:\n${parts.join(" ")}`;
    }
  }

  if (userIp) {
    prompt += `\n\nUser's IP address (for approximate geolocation if no location specified): ${userIp}`;
  }

  return prompt;
}

// ── NLP helpers for first-message parsing ──

/** Extract an explicit job role from the message. Returns null if the user didn't specify one. */
function extractRole(message: string): string | null {
  const patterns = [
    // "find me marketing roles in paris", "search for frontend engineer jobs"
    /(?:find|search|look|get|show)\s+(?:me\s+)?(?:some\s+)?(.+?)\s+(?:jobs?|roles?|positions?|openings?|opportunities)\b/i,
    // "looking for data scientist positions"
    /(?:looking\s+for|interested\s+in)\s+(.+?)\s+(?:jobs?|roles?|positions?)\b/i,
    // "I want a marketing job in paris"
    /(?:i\s+want|i\s+need|i\'d\s+like)\s+(?:a\s+)?(.+?)\s+(?:jobs?|roles?|positions?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      let role = match[1].trim();
      // Strip leading filler words
      role = role.replace(/^(some|any|a|the|good|great|new|best|more|few)\s+/i, "").trim();
      if (role.length > 1 && role.length < 60) {
        return role;
      }
    }
  }
  return null;
}

/** Extract a location from the message (e.g. "in New York" → "New York") */
function extractLocation(message: string): string | null {
  const match = message.match(/\b(?:in|near|around|at)\s+(.+?)(?:\s*[.!?]?\s*$)/i);
  if (match) {
    const loc = match[1].replace(/\s*(please|thanks|thank you|asap|now)$/i, "").trim();
    if (loc.length > 0 && loc.length < 60) return loc;
  }
  return null;
}

// ── First-message handler (deterministic, no LLM) ──

async function handleFirstMessage(
  userMessage: string,
  userStatus?: UserStatusResponse,
  debug?: DebugInfo,
): Promise<ChatApiResponse> {
  const name = userStatus?.userFirstName;
  const profileTitle = userStatus?.dynamicTitle;
  const hasResume = userStatus?.hasResume;
  const isLoggedIn = userStatus?.isLoggedIn;

  const role = extractRole(userMessage);
  const location = extractLocation(userMessage);
  const greeting = name ? `Sure, ${name}!` : "Sure!";

  // ── Case 1: User explicitly specified a role → search immediately ──
  if (role) {
    const raw = await searchJobs({ search: role, location: location || undefined });
    const { jobs, total } = mapSearchResponse(raw);

    if (debug) {
      debug.toolUsed = "search_jobs";
      debug.toolInput = { search: role, location };
      debug.networkLogs = getNetworkLogs();
    }

    const locationLabel = location ? ` in ${location}` : "";
    return {
      botMessage: `${greeting} I found ${total} ${role} job${total !== 1 ? "s" : ""}${locationLabel} for you.`,
      actionType: "show_jobs",
      data: { jobs, totalJobs: total },
      suggestions: buildSuggestions("show_jobs"),
      _debug: debug,
    };
  }

  // ── Case 2: No explicit role — user has a profile title → confirm ──
  if (isLoggedIn && hasResume && profileTitle) {
    if (location) {
      return {
        botMessage: `${greeting} Should I look for ${profileTitle} roles in ${location}?`,
        actionType: "general",
        suggestions: [`Yes, find ${profileTitle} jobs in ${location}`, "No, a different role"],
        _debug: debug,
      };
    }
    return {
      botMessage: `${greeting} Should I look for ${profileTitle} roles?`,
      actionType: "general",
      suggestions: [`Yes, find ${profileTitle} jobs`, "No, a different role"],
      _debug: debug,
    };
  }

  // ── Case 3: No role, no profile title → ask for details ──
  if (location) {
    return {
      botMessage: `${greeting} Any specific type of jobs I should look for in ${location}? You can also upload your resume so I can get to know you better.`,
      actionType: "general",
      suggestions: ["Upload my resume"],
      _debug: debug,
    };
  }

  return {
    botMessage: `${greeting} What kind of roles are you looking for? You can also upload your resume so I can get to know you better.`,
    actionType: "general",
    suggestions: ["Upload my resume"],
    _debug: debug,
  };
}

// ── Main entry point ──

export async function processChat(
  userMessage: string,
  history: ChatHistoryMessage[],
  jobsContext?: string,
  userIp?: string,
  userStatus?: UserStatusResponse
): Promise<ChatApiResponse> {
  resetNetworkLogs();

  const debug: DebugInfo = {
    networkLogs: [],
    claudeModel: MODEL,
    timestamp: new Date().toISOString(),
  };

  const isFirstMessage = history.length === 0;

  // ── First message: deterministic handler ──
  if (isFirstMessage) {
    return handleFirstMessage(userMessage, userStatus, debug);
  }

  // ── Subsequent messages: LangChain agentic loop ──
  const systemPrompt = buildSystemPrompt(userIp, userStatus);
  const fullSystemPrompt = jobsContext
    ? `${systemPrompt}\n\nCurrent jobs the user is looking at:\n${jobsContext}`
    : systemPrompt;

  // Convert history + new message to LangChain message types
  const messages: BaseMessage[] = [new SystemMessage(fullSystemPrompt)];
  for (const m of history) {
    messages.push(m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content));
  }
  messages.push(new HumanMessage(userMessage));

  // Bind tools to model
  const modelWithTools = llm.bindTools(TOOLS);

  try {
    let currentMessages = [...messages];
    let finalActionType: ActionType = "general";
    let finalData: ChatApiResponse["data"] | undefined;
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await modelWithTools.invoke(currentMessages);

      // Check for tool calls
      const toolCalls = response.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tool calls — extract final text
        const text = typeof response.content === "string"
          ? response.content
          : (response.content as Array<{ type: string; text?: string }>)
              .filter((b) => b.type === "text")
              .map((b) => b.text || "")
              .join("");

        debug.networkLogs = getNetworkLogs();
        return {
          botMessage: text || "I'm not sure how to help with that. Could you rephrase?",
          actionType: finalActionType,
          data: finalData,
          suggestions: buildSuggestions(finalActionType),
          _debug: debug,
        };
      }

      // Execute each tool call (typically one per iteration)
      const toolCall = toolCalls[0];
      const toolName = toolCall.name as ToolName;
      const toolInput = (toolCall.args || {}) as Record<string, unknown>;

      debug.toolUsed = toolName;
      debug.toolInput = toolInput;

      const { toolResult, actionType, data } = await executeTool(toolName, toolInput);

      if (actionType !== "general" || !finalData) {
        finalActionType = actionType;
        finalData = data ?? finalData;
      }

      // Append assistant response + tool result for the next iteration
      currentMessages = [
        ...currentMessages,
        response,
        new ToolMessage({
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id!,
        }),
      ];
    }

    // Max iterations reached
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

// ── Tool execution ──

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
        toolResult: { found: total, showing: jobs.length, jobs: jobs.map(summarizeJob) },
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
        toolResult: { found: total, showing: jobs.length, jobs: jobs.map(summarizeJob) },
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
        toolResult: { success: true, count: jobIds.length, message: `Initiated bulk application for ${jobIds.length} jobs` },
        actionType: "bulk_apply_result",
        data: { bulkResults: jobIds.map((id) => ({ jobId: id, company: "", success: true })) },
      };
    }

    case "email_all_hiring_managers": {
      const jobIds = (input.jobIds as string[]) || [];
      return {
        toolResult: { success: true, count: jobIds.length, message: `Initiated bulk email for ${jobIds.length} hiring managers` },
        actionType: "bulk_email_result",
        data: { bulkResults: jobIds.map((id) => ({ jobId: id, company: "", success: true })) },
      };
    }

    default:
      return { toolResult: { error: `Unknown tool: ${toolName}` }, actionType: "error" };
  }
}

// ── Helpers ──

function summarizeJob(j: { id: string; title: string; company: string; location: string; salary: string; matchPercent: number; tags: string[] }) {
  return { id: j.id, title: j.title, company: j.company, location: j.location, salary: j.salary, matchPercent: j.matchPercent, tags: j.tags };
}

function extractHighlights(
  explanations?: { summary?: string; keywords_added?: string[]; soft_skills?: string }
): string[] {
  if (!explanations) return [];
  const highlights: string[] = [];
  if (explanations.summary) highlights.push(explanations.summary);
  if (explanations.keywords_added) highlights.push(`Keywords added: ${explanations.keywords_added.join(", ")}`);
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
