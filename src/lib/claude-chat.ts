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

You will receive the latest message sent by the user and the conversation history. Your goal is to determine if you need to perform an action (using a tool) and if so which one (and use it correctly), or to simply answer the user conversationally. The goal of this chatbot is to eventually push users to take action: apply to jobs on their behalf, generate personalized resumes for these jobs, and send emails to hiring managers for the jobs.

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
- You MUST have BOTH a job title/role AND a location before calling search_jobs. If either is missing, ask the user for the missing piece instead of searching. EXCEPTION: if the user has uploaded a resume, you may search without a location since the backend will use their profile's location.
- If the user provides a role but no location: if they have a resume uploaded, go ahead and search (omit location). Otherwise ask "Where are you looking?".
- If the user provides a location but no role: check if we have a job title from their profile (see USER PROFILE below). If yes, use that title. If no profile title, ask the user what kind of role they want.
- If the user says "find me jobs" or "find jobs matching my resume" with no specifics: if they have a resume, use get_job_recommendations. Otherwise ask what they're looking for.
- NEVER call search_jobs with only a location and no title (unless the profile provides the title)
- IMPORTANT: Once you have gathered BOTH the title and location (either from the current message or from the conversation history), you MUST call search_jobs immediately in that same turn. Do NOT just acknowledge — actually search. The results will appear in the right panel automatically.

DOMAIN/INDUSTRY FILTERING:
- When the user mentions a specific industry or domain (e.g. "cybersecurity companies", "fintech startups", "healthcare firms"), extract relevant keywords and pass them as filter_keywords to search_jobs or get_job_recommendations
- Example: "find account manager jobs for cybersecurity companies in Tel Aviv" → search="account manager", location="Tel Aviv", filter_keywords=["cyber", "security", "cybersecurity", "infosec", "defense"]
- Example: "find me fintech jobs" → filter_keywords=["fintech", "finance", "financial", "banking", "payments"]
- The filter_keywords will be matched against job tags, titles, and company names to narrow results
- CRITICAL: The "location" parameter must ONLY contain a city/region/country name (e.g. "Tel Aviv", "New York"). NEVER include industry qualifiers like "Cybersecurity Companies In Tel Aviv" — strip the domain qualifier and use ONLY the geographic name.

RESUME & EMAIL GENERATION:
- To generate a resume or email, you MUST have the job's ID, URL, title, company, and description
- These come from the _apiData field of jobs returned by search results
- When the user says "apply for job #3", look up that job from the search results context
- The resume/email generation costs the user 1 credit — mention this if relevant

Guidelines:
- Be conversational, helpful, and concise — keep answers to 2-3 SHORT sentences max
- Have no more than 2 sentences in a single paragraph. If the last sentence is a question, always make it a standalone paragraph.
- When showing search results, respond with ONE short sentence like "I found 47 jobs in Tel Aviv for you." Do NOT list or describe individual jobs — the UI renders job cards automatically. Never enumerate jobs in your text response.
- When the user asks a question (not a search), keep the answer brief and casual — 2-3 short sentences max, like you're chatting with a friend
- When the user wants to apply or email, confirm the action and execute it
- If the user references a specific job from previous results, use the job context to identify it
- Never make up job listings — only show real results from the search tool
- When no tool is needed (general questions, chitchat), just respond naturally without calling any tools
- ALWAYS use proper capitalization, spelling, and grammar in your responses. Fix any typos from the user's input when you reference their words (e.g. "creteil" → "Créteil", "nyc" → "NYC", "frontend enginer" → "Frontend Engineer").

EMAIL WORKFLOW:
- When generating emails for the user, frame it as "generate" or "draft" — NOT "send"
- The user will review each email in a composer dialog and can edit before sending
- Say things like "I've drafted an email for you" or "Here's a personalized email you can review"
- Never say "I've sent the email" — the user sends it themselves after review

BULK APPLY WORKFLOW:
- When the user asks to apply to multiple jobs at once, first ask if they want personalized resumes tailored to each job
- If yes: generate a tailored resume for each job that doesn't already have one, then apply
- If no: apply with the resume on record
- Example: "Before I apply to all 25 jobs, would you like me to create a personalized resume for each one? It takes a bit longer but significantly improves your chances."`;


  if (userStatus) {
    const parts: string[] = [];
    if (userStatus.isLoggedIn) parts.push("User is logged in.");
    if (userStatus.userFirstName) parts.push(`First name: ${userStatus.userFirstName}.`);
    if (userStatus.hasResume) {
      parts.push("User HAS uploaded a resume — do NOT ask them to upload one. You already have it.");
    } else {
      parts.push("User has NOT uploaded a resume yet. You can suggest they upload one.");
    }
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

/** Words that should never be treated as a job role */
const JUNK_ROLES = new Set([
  "me", "us", "my", "i", "jobs", "job", "positions", "position",
  "roles", "role", "work", "opportunities", "openings", "for",
  "all", "these", "those", "it", "them",
]);

/** Check if message is asking for resume/profile-based job search */
function isResumeBasedSearch(message: string): boolean {
  return /\b(match|based on|from|using|with)\s+(my\s+)?(resume|cv|profile)\b/i.test(message)
    || /\b(my resume|my cv|my profile)\b/i.test(message);
}

/** Extract domain/industry keywords from message (e.g. "cybersecurity companies" → ["cyber", "security"]) */
function extractDomainKeywords(message: string): string[] {
  const patterns = [
    // "for cybersecurity companies/firms/startups"
    /\b(?:for|in|at)\s+([\w\s-]+?)\s+(?:companies?|firms?|startups?|industry|sector|organizations?|businesses?)\b/i,
    // "in the cybersecurity field/space/domain"
    /\b(?:in|for)\s+(?:the\s+)?([\w\s-]+?)\s+(?:field|space|domain|area|world)\b/i,
  ];

  for (const p of patterns) {
    const m = message.match(p);
    if (m) {
      const domain = m[1].trim().toLowerCase();
      // Expand common domains into tag-friendly keywords
      const expansions: Record<string, string[]> = {
        cybersecurity: ["cyber", "security", "cybersecurity", "infosec", "defense"],
        fintech: ["fintech", "finance", "financial", "banking", "payments"],
        healthtech: ["health", "healthcare", "medical", "biotech"],
        healthcare: ["health", "healthcare", "medical", "biotech"],
        edtech: ["education", "edtech", "learning", "elearning"],
        ai: ["ai", "artificial intelligence", "machine learning", "ml", "deep learning"],
        "artificial intelligence": ["ai", "artificial intelligence", "machine learning", "ml"],
        crypto: ["crypto", "blockchain", "web3", "defi"],
        blockchain: ["blockchain", "crypto", "web3", "defi"],
        gaming: ["gaming", "games", "game"],
        ecommerce: ["ecommerce", "e-commerce", "retail", "commerce"],
        "e-commerce": ["ecommerce", "e-commerce", "retail", "commerce"],
        saas: ["saas", "software", "cloud"],
        defense: ["defense", "defence", "military", "security", "cyber"],
      };
      const expanded = expansions[domain];
      if (expanded) return expanded;
      // For unknown domains, split into words as keywords
      return domain.split(/\s+/).filter((w) => w.length > 2);
    }
  }
  return [];
}

/** Filter jobs by domain/tag keywords — keeps jobs where any tag, title, or company matches */
function filterJobsByKeywords<T extends { title: string; company: string; tags: string[] }>(
  jobs: T[],
  keywords: string[]
): T[] {
  if (keywords.length === 0) return jobs;
  return jobs.filter((job) => {
    const searchable = [
      ...job.tags.map((t) => t.toLowerCase()),
      job.title.toLowerCase(),
      job.company.toLowerCase(),
    ].join(" ");
    return keywords.some((kw) => searchable.includes(kw));
  });
}

/** Extract an explicit job role from the message. Returns null if the user didn't specify one. */
function extractRole(message: string): string | null {
  const patterns = [
    // "find me marketing roles in paris", "search for frontend engineer jobs"
    /(?:find|search|look|get|show)\s+(?:me\s+)?(?:some\s+)?(.+?)\s+(?:jobs?|roles?|positions?|openings?|opportunities)\b/i,
    // "find jobs for account manager", "get jobs as data scientist"
    /(?:find|search|look for|get|show)\s+(?:me\s+)?(?:jobs?|roles?|positions?)\s+(?:for|as)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:in|at|near|for)\b|[.!?]?\s*$)/i,
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
      // Strip trailing filler like "for cybersecurity companies" that leaked into role
      role = role.replace(/\s+(?:for|in|at|near)\s+.*$/i, "").trim();
      // Reject junk/filler terms that are not actual job titles
      if (JUNK_ROLES.has(role.toLowerCase())) continue;
      if (role.length > 1 && role.length < 60) {
        return role;
      }
    }
  }
  return null;
}

/** Capitalize each word for display (proper noun style) */
function properCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract a location from the message (e.g. "in New York" → "New York").
 *  Uses the LAST "in/near/around/at" match to skip domain qualifiers
 *  like "in cybersecurity companies in Tel Aviv" → "Tel Aviv". */
function extractLocation(message: string): string | null {
  const matches = [...message.matchAll(/\b(?:in|near|around|at)\s+/gi)];
  if (matches.length === 0) return null;

  // Take the last preposition match
  const last = matches[matches.length - 1];
  const after = message.slice(last.index! + last[0].length);
  const loc = after
    .replace(/\s*[.!?]\s*$/, "")
    .replace(/\s*(please|thanks|thank you|asap|now)$/i, "")
    .trim();
  if (loc.length > 0 && loc.length < 60) return loc;
  return null;
}

/** Check if a message looks like a job search intent (vs. a general question or conversation) */
function isJobSearchIntent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  // Positive signals: explicit search verbs + "jobs/roles/positions"
  if (/\b(find|search|look for|get|show)\b.*\b(jobs?|roles?|positions?|openings?)\b/i.test(lower)) return true;
  if (/\b(looking for|interested in)\b.*\b(jobs?|roles?|positions?)\b/i.test(lower)) return true;
  if (/\b(i want|i need|i'd like)\b.*\b(jobs?|roles?|positions?)\b/i.test(lower)) return true;
  // Negative signals: questions, greetings, conversational messages
  if (/\?$/.test(lower)) return false;
  if (/^(do you|don't you|can you|could you|have you|did you|are you|is there|what|how|why|where|when|who)\b/i.test(lower)) return false;
  if (/^(hey|hi|hello|yo|sup|thanks|thank you|ok|okay)\b/i.test(lower)) return false;
  if (/\b(my resume|my cv|my profile|my account)\b/i.test(lower) && !/\b(find|search|match)\b/i.test(lower)) return false;
  // Default: treat short vague messages as conversational
  return false;
}

// ── First-message handler (deterministic, no LLM) ──

async function handleFirstMessage(
  userMessage: string,
  userStatus?: UserStatusResponse,
  debug?: DebugInfo,
): Promise<ChatApiResponse | null> {
  // If the message doesn't look like a job search, let the LLM handle it
  if (!isJobSearchIntent(userMessage)) return null;

  const name = userStatus?.userFirstName;
  const profileTitle = userStatus?.dynamicTitle;
  const hasResume = userStatus?.hasResume;
  const greeting = name ? `Sure, ${name}!` : "Sure!";
  const domainKeywords = extractDomainKeywords(userMessage);

  // ── Resume-based search: "find jobs that match my resume" ──
  if (isResumeBasedSearch(userMessage) && hasResume) {
    const raw = await getJobRecommendations();
    let { jobs, total } = mapSearchResponse(raw);

    // Apply domain keyword filtering if present
    if (domainKeywords.length > 0) {
      jobs = filterJobsByKeywords(jobs, domainKeywords);
      total = jobs.length;
    }

    if (debug) {
      debug.toolUsed = "get_job_recommendations";
      debug.toolInput = {};
      debug.networkLogs = getNetworkLogs();
    }

    return {
      botMessage: `${greeting} I found ${total} job${total !== 1 ? "s" : ""} matching your profile for you.`,
      actionType: "show_jobs",
      data: { jobs, totalJobs: total },
      suggestions: buildSuggestions("show_jobs"),
      _debug: debug,
    };
  }

  // If the user mentions "my resume" but hasn't uploaded one yet
  if (isResumeBasedSearch(userMessage) && !hasResume) {
    return {
      botMessage: `${greeting} I don't have your resume yet. Please upload it so I can find the best matching jobs for you!`,
      actionType: "general",
      suggestions: ["Upload my resume"],
      _debug: debug,
    };
  }

  const role = extractRole(userMessage);
  const location = extractLocation(userMessage);
  const profileLocation = userStatus?.dynamicLocation;

  // Resolve the effective title and location (user-specified takes priority, then profile)
  // Proper-case user input for clean display
  const effectiveTitle = role ? properCase(role) : profileTitle;
  const effectiveLocation = location ? properCase(location) : profileLocation;

  // ── Both title and location available → search immediately ──
  if (effectiveTitle && effectiveLocation) {
    const raw = await searchJobs({ search: role || undefined, location: effectiveLocation, limit: 50 });
    let { jobs, total } = mapSearchResponse(raw);

    // Apply domain keyword filtering
    if (domainKeywords.length > 0) {
      jobs = filterJobsByKeywords(jobs, domainKeywords);
      total = jobs.length;
    }

    if (debug) {
      debug.toolUsed = "search_jobs";
      debug.toolInput = { search: role || profileTitle, location: effectiveLocation };
      debug.networkLogs = getNetworkLogs();
    }

    return {
      botMessage: `${greeting} I found ${total} ${effectiveTitle} job${total !== 1 ? "s" : ""} in ${effectiveLocation} for you.`,
      actionType: "show_jobs",
      data: { jobs, totalJobs: total },
      suggestions: buildSuggestions("show_jobs"),
      _debug: debug,
    };
  }

  // ── Title but no location: if user has a resume, use profile-based search ──
  if (effectiveTitle && !effectiveLocation && hasResume) {
    // User has a resume → search using the role (backend adds profile location automatically)
    const raw = await searchJobs({ search: role || undefined, limit: 50 });
    let { jobs, total } = mapSearchResponse(raw);

    if (domainKeywords.length > 0) {
      jobs = filterJobsByKeywords(jobs, domainKeywords);
      total = jobs.length;
    }

    if (debug) {
      debug.toolUsed = "search_jobs";
      debug.toolInput = { search: role || profileTitle };
      debug.networkLogs = getNetworkLogs();
    }

    return {
      botMessage: `${greeting} I found ${total} ${effectiveTitle} job${total !== 1 ? "s" : ""} for you.`,
      actionType: "show_jobs",
      data: { jobs, totalJobs: total },
      suggestions: buildSuggestions("show_jobs"),
      _debug: debug,
    };
  }

  // ── Missing title or location → ask for what's missing ──
  const resumeHint = hasResume
    ? ""
    : " You can also upload your resume so I can get to know you better.";
  const resumeSuggestion = hasResume ? [] : ["Upload my resume"];

  if (effectiveTitle && !effectiveLocation) {
    // Have title, need location
    return {
      botMessage: `${greeting} Where are you looking for ${effectiveTitle} roles?`,
      actionType: "general",
      suggestions: ["Remote", "New York", "San Francisco"],
      _debug: debug,
    };
  }

  if (!effectiveTitle && effectiveLocation) {
    // Have location, need title
    return {
      botMessage: `${greeting} What kind of roles are you looking for in ${effectiveLocation}?${resumeHint}`,
      actionType: "general",
      suggestions: resumeSuggestion,
      _debug: debug,
    };
  }

  // Neither title nor location — if user has resume, use profile-based recommendations
  if (hasResume) {
    const raw = await getJobRecommendations();
    let { jobs, total } = mapSearchResponse(raw);

    if (domainKeywords.length > 0) {
      jobs = filterJobsByKeywords(jobs, domainKeywords);
      total = jobs.length;
    }

    if (debug) {
      debug.toolUsed = "get_job_recommendations";
      debug.toolInput = {};
      debug.networkLogs = getNetworkLogs();
    }

    return {
      botMessage: `${greeting} I found ${total} job${total !== 1 ? "s" : ""} matching your profile for you.`,
      actionType: "show_jobs",
      data: { jobs, totalJobs: total },
      suggestions: buildSuggestions("show_jobs"),
      _debug: debug,
    };
  }

  // No resume, no title, no location
  return {
    botMessage: `${greeting} What kind of roles are you looking for, and where?${resumeHint}`,
    actionType: "general",
    suggestions: resumeSuggestion,
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

  // ── First message: deterministic handler for job search intents ──
  if (isFirstMessage) {
    const deterministic = await handleFirstMessage(userMessage, userStatus, debug);
    if (deterministic) return deterministic;
    // Not a job search intent — fall through to LLM
  }

  // ── LangChain loop (subsequent messages + non-search first messages) ──
  const systemPrompt = buildSystemPrompt(userIp, userStatus);
  const fullSystemPrompt = jobsContext
    ? `${systemPrompt}\n\nCurrent jobs the user is looking at:\n${jobsContext}`
    : systemPrompt;

  // Build the user message with latest message + conversation thread
  const messages: BaseMessage[] = [new SystemMessage(fullSystemPrompt)];

  // Format conversation thread (most recent first) for context
  let userContent = `Latest message sent by user = ${userMessage}`;
  if (history.length > 0) {
    const threadLines = [...history]
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "Nikki"}: ${m.content}`);
    userContent += `\n\nConversation thread (from last to first) =\n${threadLines.join("\n")}`;
  }
  messages.push(new HumanMessage(userContent));

  // Always bind tools — the LLM has full conversation context to decide what to do
  const model = llm.bindTools(TOOLS);

  try {
    let currentMessages = [...messages];
    let finalActionType: ActionType = "general";
    let finalData: ChatApiResponse["data"] | undefined;
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await model.invoke(currentMessages);

      // Check for tool calls
      const toolCalls = response.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tool calls — extract final text
        let text = typeof response.content === "string"
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
      let { jobs, total } = mapSearchResponse(raw);

      // Apply domain keyword filtering if provided
      const recKeywords = (input.filter_keywords as string[] | undefined) || [];
      if (recKeywords.length > 0) {
        jobs = filterJobsByKeywords(jobs, recKeywords.map((k) => k.toLowerCase()));
        total = jobs.length;
      }

      return {
        toolResult: { found: total, showing: jobs.length, jobs: jobs.map(summarizeJob) },
        actionType: "show_jobs",
        data: { jobs, totalJobs: total },
      };
    }

    case "search_jobs": {
      // Filter out junk search terms that Claude sometimes extracts from filler words
      let searchTerm = (input.search as string | undefined)?.trim();
      const JUNK_TERMS = ["me", "jobs", "job", "positions", "position", "roles", "role", "work", "opportunities", "openings"];
      if (searchTerm && JUNK_TERMS.includes(searchTerm.toLowerCase())) {
        searchTerm = undefined;
      }

      const raw = await searchJobs({
        search: searchTerm,
        location: input.location as string | undefined,
        limit: 50,
      });
      let { jobs, total } = mapSearchResponse(raw);

      // Apply domain keyword filtering if provided
      const searchKeywords = (input.filter_keywords as string[] | undefined) || [];
      if (searchKeywords.length > 0) {
        jobs = filterJobsByKeywords(jobs, searchKeywords.map((k) => k.toLowerCase()));
        total = jobs.length;
      }

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
