/**
 * Core chat orchestration:
 * User message + history → Claude with tools → execute tool calls → tool_result → final response
 */

import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, type ToolName } from "./claude-tools";
import { searchJobs, generateResume, generateEmail } from "./pitchmeai-client";
import { mapSearchResponse } from "./job-mapper";
import type {
  ChatHistoryMessage,
  ChatApiResponse,
  ActionType,
} from "./types";
import type { Job } from "@/components/chat/jobData";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Nikki, PitchMeAI's friendly and efficient job application assistant.

Your capabilities:
- Search for jobs matching a user's skills, preferences, and location
- Generate tailored resumes for specific job applications
- Write personalized intro emails to hiring managers
- Apply to multiple jobs at once (bulk apply)
- Email all hiring managers for a set of jobs

Guidelines:
- Be conversational, helpful, and concise
- When showing search results, summarize what you found (e.g. "I found 47 frontend engineer roles in NYC")
- When the user wants to apply or email, confirm the action and execute it
- If the user references a specific job from previous results, use the job context to identify it
- If the user's intent is unclear, ask a clarifying question rather than guessing
- Never make up job listings — only show real results from the search tool
- When no tool is needed (general questions, chitchat), just respond naturally`;

export async function processChat(
  userMessage: string,
  history: ChatHistoryMessage[],
  jobsContext?: string
): Promise<ChatApiResponse> {
  // Build messages array for Claude
  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add current jobs context as a system-level note if available
  let systemPrompt = SYSTEM_PROMPT;
  if (jobsContext) {
    systemPrompt += `\n\nCurrent jobs the user is looking at:\n${jobsContext}`;
  }

  // Add the new user message
  messages.push({ role: "user", content: userMessage });

  try {
    // First Claude call — may return tool_use
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Check if Claude wants to use a tool
    const toolUseBlock = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    if (!toolUseBlock) {
      // No tool call — just a text response
      const textBlock = response.content.find(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      );
      return {
        botMessage: textBlock?.text || "I'm not sure how to help with that. Could you rephrase?",
        actionType: "general",
        suggestions: [],
      };
    }

    // Execute the tool call
    const toolName = toolUseBlock.name as ToolName;
    const toolInput = toolUseBlock.input as Record<string, unknown>;
    const { toolResult, actionType, data } = await executeTool(
      toolName,
      toolInput
    );

    // Send tool result back to Claude for a natural language response
    const followUp = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      ],
    });

    const finalText = followUp.content.find(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text"
    );

    const suggestions = buildSuggestions(actionType);

    return {
      botMessage: finalText?.text || "Done! Let me know if you need anything else.",
      actionType,
      data,
      suggestions,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("processChat error:", message);
    return {
      botMessage: `Sorry, I ran into an issue: ${message}. Please try again.`,
      actionType: "error",
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

    case "build_new_resume": {
      return {
        toolResult: {
          success: true,
          message:
            "Resume builder initiated. Please upload your current resume or provide your details.",
        },
        actionType: "general",
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
