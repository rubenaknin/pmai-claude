"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { JobPanel } from "./JobPanel";
import { ChatJobCards } from "./ChatJobCards";
import { JobDetailSheet } from "./JobDetailSheet";
import { EmailComposer } from "./EmailComposer";
import { ApplicationStatusCard } from "./ApplicationStatusCard";
import { ResumePreviewCard } from "./ResumePreviewCard";
import { Job } from "./jobData";
import type { ChatHistoryMessage, ChatApiResponse, ActionType, EmailData, ResumeData, DebugInfo, UserStatusResponse } from "@/lib/types";

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  chatHistory: ChatHistoryMessage[];
  jobs: Job[];
  totalJobs: number;
  suggestions: string[];
}

/** Generate a short title from the first user message */
/** Proper-case each word for display */
function titleCase(str: string): string {
  // Short words that stay lowercase (unless first word)
  const minor = new Set(["a", "an", "the", "in", "on", "at", "for", "to", "of", "and", "or", "but", "is", "me"]);
  return str
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/[.!?]+$/, "");
  // Strip common filler prefixes
  const stripped = cleaned
    .replace(/^(hey|hi|hello|please|can you|could you|i want to|i'd like to|i need to)\s+/i, "")
    .replace(/^(find me|search for|look for|get me)\s+/i, "");
  const titled = titleCase(stripped);
  return titled.length > 40 ? titled.slice(0, 37) + "..." : titled;
}

/**
 * Append an [Action: ...] tag to a bot message for the LLM chat history,
 * so the model knows what happened as a result of the user's message.
 */
function enrichAssistantContent(
  botMessage: string,
  actionType: ActionType | undefined,
  data: ChatApiResponse["data"],
  toolInput?: Record<string, unknown>
): string {
  if (!actionType || actionType === "general" || actionType === "error") return botMessage;

  let tag = "";
  switch (actionType) {
    case "show_jobs": {
      const total = data?.totalJobs ?? data?.jobs?.length ?? 0;
      const parts: string[] = [];
      if (toolInput?.search) parts.push(`search='${toolInput.search}'`);
      if (toolInput?.location) parts.push(`location='${toolInput.location}'`);
      tag = `[Action: search_jobs(${parts.join(", ")}) → ${total} results]`;
      break;
    }
    case "show_resume": {
      const title = data?.resume?.jobTitle ?? "";
      const company = data?.resume?.company ?? "";
      tag = `[Action: show_resume(job='${title}', company='${company}')]`;
      break;
    }
    case "show_email": {
      const company = data?.email?.company ?? "";
      tag = `[Action: show_email(company='${company}')]`;
      break;
    }
    case "apply_result": {
      tag = `[Action: apply_result(jobId='${data?.applyResult?.jobId ?? ""}')]`;
      break;
    }
    case "bulk_apply_result": {
      const count = data?.bulkResults?.length ?? 0;
      tag = `[Action: bulk_apply(${count} jobs)]`;
      break;
    }
    case "bulk_email_result": {
      const count = data?.bulkResults?.length ?? 0;
      tag = `[Action: bulk_email(${count} jobs)]`;
      break;
    }
  }

  return tag ? `${botMessage}\n${tag}` : botMessage;
}

export function ChatLayout() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  // Pre-populate message + typing indicator when arriving from homepage with ?q=
  const [messages, setMessages] = useState<Message[]>(() =>
    initialQuery
      ? [{ id: `user-init-${Date.now()}`, role: "user" as const, content: initialQuery }]
      : []
  );
  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([]);
  const [isTyping, setIsTyping] = useState(!!initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>(
    initialQuery ? [] : ["Find me jobs", "Here's my resume — find jobs for me"]
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);

  // Conversation history
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => `conv-${Date.now()}`);

  // User status (fetched silently on mount)
  const [userStatus, setUserStatus] = useState<UserStatusResponse | null>(null);
  const initDone = useRef(false);

  // Detail sheet & email composer
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [emailJob, setEmailJob] = useState<Job | null>(null);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Resume preview data
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchingJobIds, setMatchingJobIds] = useState<Set<string>>(new Set());
  const [applyErrorJobIds, setApplyErrorJobIds] = useState<Set<string>>(new Set());
  const [applyingJobIds, setApplyingJobIds] = useState<Set<string>>(new Set());
  const [applyRetriedJobIds, setApplyRetriedJobIds] = useState<Set<string>>(new Set());
  const [selfApplyJobIds, setSelfApplyJobIds] = useState<Set<string>>(new Set());
  const [emailGeneratedJobIds, setEmailGeneratedJobIds] = useState<Set<string>>(new Set());
  const [emailGeneratingJobIds, setEmailGeneratingJobIds] = useState<Set<string>>(new Set());
  const [highlightJobIds, setHighlightJobIds] = useState<Set<string>>(new Set());
  const applyAbortControllers = useRef<Map<string, AbortController>>(new Map());
  const resumeHtmlCache = useRef<Map<string, string>>(new Map());
  const emailDataCache = useRef<Map<string, EmailData>>(new Map());

  const addApplyingId = useCallback((id: string) => {
    setApplyingJobIds((prev) => new Set(prev).add(id));
  }, []);

  const removeApplyingId = useCallback((id: string) => {
    setApplyingJobIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const addMatchingId = useCallback((id: string) => {
    setMatchingJobIds((prev) => new Set(prev).add(id));
  }, []);

  const removeMatchingId = useCallback((id: string) => {
    setMatchingJobIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const addEmailGeneratingId = useCallback((id: string) => {
    setEmailGeneratingJobIds((prev) => new Set(prev).add(id));
  }, []);

  const removeEmailGeneratingId = useCallback((id: string) => {
    setEmailGeneratingJobIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Job selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Processing state for stop button
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Action log settings
  const [showActionLogs, setShowActionLogs] = useState(true);

  // Bot avatar customization
  const [botName, setBotName] = useState(() => {
    if (typeof window === "undefined") return "Nora";
    return localStorage.getItem("botName") || "Nora";
  });
  const [botAvatarUrl, setBotAvatarUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("botAvatarUrl") || null;
  });

  const handleEditBot = useCallback((name: string, avatarUrl: string | null) => {
    setBotName(name);
    setBotAvatarUrl(avatarUrl);
    localStorage.setItem("botName", name);
    if (avatarUrl) {
      localStorage.setItem("botAvatarUrl", avatarUrl);
    } else {
      localStorage.removeItem("botAvatarUrl");
    }
  }, []);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const toggleDarkMode = useCallback((on: boolean) => {
    setDarkMode(on);
    if (on) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(on));
  }, []);

  // Drag & drop state for the chat area
  const [isChatDragging, setIsChatDragging] = useState(false);
  const chatDragCounter = useRef(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQueryHandled = useRef(false);
  const pendingMatchJobRef = useRef<Job | null>(null);
  const pendingApplyResumeJobRef = useRef<Job | null>(null);
  const pendingAutoSearch = useRef(false);
  const lastAppliedJobRef = useRef<Job | null>(null);
  const handleUserMessageRef = useRef<(content: string) => void>(() => {});

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // --- Fetch user status silently on mount (no greeting) ---
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    fetch("/api/user/status")
      .then((res) => res.json())
      .then((data: UserStatusResponse) => {
        setUserStatus(data);
      })
      .catch(() => {
        setUserStatus({ isLoggedIn: false });
      });
  }, []);

  // --- Save current conversation to history ---
  const saveCurrentConversation = useCallback(() => {
    if (messages.length === 0) return; // nothing to save
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === activeConversationId);
      const entry: Conversation = {
        id: activeConversationId,
        title: existing?.title || "New Conversation",
        messages,
        chatHistory,
        jobs,
        totalJobs,
        suggestions,
      };
      if (existing) {
        return prev.map((c) => (c.id === activeConversationId ? entry : c));
      }
      return [...prev, entry];
    });
  }, [activeConversationId, messages, chatHistory, jobs, totalJobs, suggestions]);

  // --- Load a conversation ---
  const loadConversation = useCallback((conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
    setChatHistory(conv.chatHistory);
    setJobs(conv.jobs);
    setTotalJobs(conv.totalJobs);
    setSuggestions(conv.suggestions);
    setShowJobPanel(conv.jobs.length > 0);
    setDetailJob(null);
    setEmailJob(null);
    setEmailData(null);
    setResumeData(null);
    setIsTyping(false);
    setSelectedJobIds(new Set());
  }, []);

  // --- New Conversation handler ---
  const handleNewConversation = useCallback(() => {
    saveCurrentConversation();
    const newId = `conv-${Date.now()}`;
    setActiveConversationId(newId);
    setMessages([]);
    setChatHistory([]);
    setSuggestions(["Find me jobs", "Here's my resume — find jobs for me"]);
    setJobs([]);
    setTotalJobs(0);
    setShowJobPanel(false);
    setDetailJob(null);
    setEmailJob(null);
    setEmailData(null);
    setResumeData(null);
    setIsTyping(false);
    setSelectedJobIds(new Set());
    initialQueryHandled.current = false;
  }, [saveCurrentConversation]);

  // --- Job state helpers ---
  const updateJob = useCallback((jobId: string, updater: (j: Job) => Job) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? updater(j) : j)));
  }, []);

  // --- Action log helper ---
  const addActionMessage = useCallback(
    (content: string) => {
      const id = `action-${Date.now()}-${Math.random()}`;
      const msg: Message = {
        id,
        role: "action",
        content,
      };
      setMessages((prev) => [...prev, msg]);
      return id;
    },
    []
  );

  const updateActionMessage = useCallback(
    (id: string, content: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content } : m))
      );
    },
    []
  );

  // --- Bot messaging helper (defined early so apply/match handlers can use it) ---
  const addBotMessage = useCallback(
    (content: string, extra?: Partial<Message>, debug?: DebugInfo) => {
      const msg: Message = {
        id: `bot-${Date.now()}-${Math.random()}`,
        role: "bot",
        content,
        ...extra,
        ...(debug ? { _debug: debug } : {}),
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    []
  );

  const handleApplySingle = useCallback(
    async (jobId: string, skipResumeCheck?: boolean) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job || job.status.applied) return;

      // If no resume generated yet, ask the user first via a bot message
      if (!skipResumeCheck && !job.status.resumeGenerated) {
        // Store the pending job for intent matching
        pendingApplyResumeJobRef.current = job;
        addBotMessage(
          `Before I auto-apply to **${job.title}** at **${job.company}**, would you like me to generate a tailored resume first? This significantly improves your chances.`
        );
        setSuggestions(["Yes, generate a resume first", "No, apply with my resume on record"]);
        return;
      }

      // Track if this is a retry (already had an error before)
      const isRetry = applyErrorJobIds.has(jobId);
      if (isRetry) {
        setApplyRetriedJobIds((prev) => new Set(prev).add(jobId));
      }

      // Clear any previous error for this job
      setApplyErrorJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });

      // Add to applying set (shows progress animation)
      addApplyingId(jobId);
      const actionMsgId = addActionMessage(`Auto-applying to ${job.title} at ${job.company}`);

      // Create per-job AbortController
      const controller = new AbortController();
      applyAbortControllers.current.set(jobId, controller);

      // Call API if we have apiData
      if (job._apiData?.url && job._apiData?.jobId) {
        try {
          const res = await fetch("/api/resume/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: job._apiData.url,
              jobId: job._apiData.jobId,
              jobName: job._apiData.jobName || job.title,
              companyName: job._apiData.companyName || job.company,
              jobDetails: job._apiData.jobDetails || job.description,
              location: job._apiData.location || job.location,
            }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `API error ${res.status}`);
          }
          // Success
          updateJob(jobId, (j) => ({
            ...j,
            status: { ...j.status, applied: true, appliedAt: "just now" },
          }));
          updateActionMessage(actionMsgId, `Auto-applied to ${job.title} at ${job.company}`);
          // Highlight the card
          setHighlightJobIds(new Set([jobId]));
          setTimeout(() => setHighlightJobIds(new Set()), 2000);
          if (data.html) {
            resumeHtmlCache.current.set(jobId, data.html);
            setResumeData({
              html: data.html,
              highlights: [],
              pdfUrl: data.pdfUrl,
              pdfFileName: data.pdfFileName,
              jobTitle: job.title,
              company: job.company,
              threeExplanations: data.threeExplanations,
            });
            updateJob(jobId, (j) => ({
              ...j,
              status: { ...j.status, resumeGenerated: true, resumeGeneratedAt: new Date().toISOString() },
            }));
          }
          // Offer to generate intro email to hiring manager
          if (!job.status.emailSent) {
            lastAppliedJobRef.current = job;
            addBotMessage(
              `Applied to **${job.title}** at **${job.company}**! Want me to draft an intro email to the hiring manager? It'll help you stand out.`
            );
            const unappliedCount = jobs.filter((j) => !j.status.applied && j.id !== jobId).length;
            const suggestionList = [
              `Yes, draft intro email`,
              "No thanks",
            ];
            if (unappliedCount > 0) {
              suggestionList.push("Select more jobs to apply to");
            }
            setSuggestions(suggestionList);
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            addActionMessage(`Cancelled auto-apply to ${job.title} at ${job.company}`);
          } else {
            console.error("Auto-apply failed:", err);
            setApplyErrorJobIds((prev) => new Set(prev).add(jobId));
            addBotMessage(
              `Auto-apply to **${job.title}** at **${job.company}** is currently unavailable. You can retry or apply [manually on their website](${job._apiData?.url || "#"}).`
            );
            setSuggestions(["Find more jobs", "Help me prep for interviews"]);
          }
        } finally {
          removeApplyingId(jobId);
          applyAbortControllers.current.delete(jobId);
        }
      } else {
        // No API data — mark as applied immediately
        updateJob(jobId, (j) => ({
          ...j,
          status: { ...j.status, applied: true, appliedAt: "just now" },
        }));
        removeApplyingId(jobId);
        applyAbortControllers.current.delete(jobId);
      }
    },
    [jobs, updateJob, addActionMessage, updateActionMessage, addApplyingId, removeApplyingId, addBotMessage, applyErrorJobIds]
  );

  const handleCancelApply = useCallback(
    (jobId: string) => {
      const controller = applyAbortControllers.current.get(jobId);
      if (controller) {
        controller.abort();
      }
      removeApplyingId(jobId);
      applyAbortControllers.current.delete(jobId);
    },
    [removeApplyingId]
  );

  const handleSelfApply = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      setSelfApplyJobIds((prev) => new Set(prev).add(jobId));
      // Clear error state so the "I applied" button shows instead of retry
      setApplyErrorJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      if (job?._apiData?.url) {
        window.open(job._apiData.url, "_blank");
      }
    },
    [jobs]
  );

  const handleConfirmSelfApply = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      updateJob(jobId, (j) => ({
        ...j,
        status: { ...j.status, applied: true, appliedAt: new Date().toLocaleString() },
      }));
      setSelfApplyJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      // Highlight the card
      setHighlightJobIds(new Set([jobId]));
      setTimeout(() => setHighlightJobIds(new Set()), 2000);
      // Offer intro email (same flow as auto-apply success)
      if (job && !job.status.emailSent) {
        lastAppliedJobRef.current = job;
        addBotMessage(
          `Great, marked **${job.title}** at **${job.company}** as applied! Want me to draft an intro email to the hiring manager?`
        );
        const unappliedCount = jobs.filter((j) => !j.status.applied && j.id !== jobId).length;
        const suggestionList = [
          `Yes, draft intro email`,
          "No thanks",
        ];
        if (unappliedCount > 0) {
          suggestionList.push("Select more jobs to apply to");
        }
        setSuggestions(suggestionList);
      }
    },
    [updateJob, jobs, addBotMessage]
  );

  const handleSave = useCallback(
    (jobId: string) => {
      updateJob(jobId, (j) => ({
        ...j,
        status: { ...j.status, saved: !j.status.saved },
      }));
    },
    [updateJob]
  );

  const handleEmailSingle = useCallback(
    (jobId: string) => {
      updateJob(jobId, (j) => ({
        ...j,
        status: {
          ...j.status,
          emailSent: true,
          emailSentAt: "just now",
        },
      }));
    },
    [updateJob]
  );

  const handleViewDetail = useCallback((job: Job) => {
    setDetailJob(job);
  }, []);

  const handleOpenEmail = useCallback(
    async (job: Job) => {
      setEmailJob(job);
      setEmailData(null);
      setEmailLoading(true);
      addActionMessage(`Drafting email for ${job.title} at ${job.company}`);

      // Call email API if we have apiData
      if (job._apiData?.jobId) {
        try {
          const res = await fetch("/api/email/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: job._apiData.jobId,
              jobName: job._apiData.jobName || job.title,
              companyName: job._apiData.companyName || job.company,
              jobDetails: job._apiData.jobDetails || job.description,
              url: job._apiData.url,
              companyUrl: job._apiData.companyUrl,
            }),
          });
          const data = await res.json();
          if (data.success) {
            const ed: EmailData = {
              subject: data.subject,
              body: data.body,
              recipientName: data.recipientName,
              recipientTitle: data.recipientTitle,
              company: job.company,
            };
            setEmailData(ed);
            emailDataCache.current.set(job.id, ed);
            setEmailGeneratedJobIds((prev) => new Set(prev).add(job.id));
            // Highlight the card
            setHighlightJobIds(new Set([job.id]));
            setTimeout(() => setHighlightJobIds(new Set()), 2000);
          }
        } catch (err) {
          console.error("Email generation failed:", err);
        }
      }
      setEmailLoading(false);
    },
    [addActionMessage]
  );

  const handleGenerateEmailSingle = useCallback(
    async (job: Job) => {
      addEmailGeneratingId(job.id);

      if (job._apiData?.jobId) {
        try {
          const res = await fetch("/api/email/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: job._apiData.jobId,
              jobName: job._apiData.jobName || job.title,
              companyName: job._apiData.companyName || job.company,
              jobDetails: job._apiData.jobDetails || job.description,
              url: job._apiData.url,
              companyUrl: job._apiData.companyUrl,
            }),
          });
          const data = await res.json();
          if (data.success) {
            const ed: EmailData = {
              subject: data.subject,
              body: data.body,
              recipientName: data.recipientName,
              recipientTitle: data.recipientTitle,
              company: job.company,
            };
            emailDataCache.current.set(job.id, ed);
            setEmailGeneratedJobIds((prev) => new Set(prev).add(job.id));
            // Auto-open the email composer
            setEmailJob(job);
            setEmailData(ed);
            setEmailLoading(false);
            // Highlight the card briefly
            setHighlightJobIds(new Set([job.id]));
            setTimeout(() => setHighlightJobIds(new Set()), 2000);
          }
        } catch (err) {
          console.error("Email generation failed:", err);
        } finally {
          removeEmailGeneratingId(job.id);
        }
      } else {
        removeEmailGeneratingId(job.id);
      }
    },
    [addEmailGeneratingId, removeEmailGeneratingId]
  );

  const handleSeeEmail = useCallback(
    (job: Job) => {
      const cached = emailDataCache.current.get(job.id);
      if (cached) {
        setEmailJob(job);
        setEmailData(cached);
        setEmailLoading(false);
      } else {
        handleOpenEmail(job);
      }
    },
    [handleOpenEmail]
  );

  const handleRemoveJob = useCallback(
    (jobId: string, mode: "single" | "title" | "location") => {
      setJobs((prev) => {
        const target = prev.find((j) => j.id === jobId);
        if (!target) return prev;
        if (mode === "single") return prev.filter((j) => j.id !== jobId);
        if (mode === "title") return prev.filter((j) => j.title !== target.title);
        if (mode === "location") return prev.filter((j) => j.location !== target.location);
        return prev;
      });
    },
    []
  );

  // --- Job selection helpers ---
  const toggleJobSelection = useCallback((jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const selectAllJobs = useCallback(() => {
    setSelectedJobIds(new Set(jobs.map((j) => j.id)));
  }, [jobs]);

  const clearSelection = useCallback(() => {
    setSelectedJobIds(new Set());
  }, []);

  const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id));

  // Keep detail sheet in sync with job state changes
  useEffect(() => {
    if (detailJob) {
      const updated = jobs.find((j) => j.id === detailJob.id);
      if (updated) setDetailJob(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  // --- Build jobs context string for Claude ---
  const buildJobsContext = useCallback(() => {
    if (jobs.length === 0) return undefined;
    return jobs
      .slice(0, 20)
      .map(
        (j, i) =>
          `[${i + 1}] id=${j.id} | ${j.title} at ${j.company} | ${j.location} | ${j.salary} | ${j.matchPercent}% match | applied=${j.status.applied}`
      )
      .join("\n");
  }, [jobs]);

  // --- Load jobs snapshot (from "Show jobs" button in chat) ---
  // Merges snapshot with current job statuses so applied/email/resume state isn't lost
  const handleLoadJobsSnapshot = useCallback(
    (snapshotJobs: Job[], snapshotTotal: number) => {
      // Merge snapshot with current job statuses so applied/email/resume state isn't lost
      const currentById = new Map(jobs.map((j) => [j.id, j]));
      const merged = snapshotJobs.map((sj) => {
        const current = currentById.get(sj.id);
        if (current) return current; // Use current state (preserves applied/email/resume status)
        return sj;
      });
      setJobs(merged);
      setTotalJobs(snapshotTotal);
      setShowJobPanel(true);
    },
    [jobs]
  );

  // --- Stop handler ---
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsProcessing(false);
    setMatchingJobIds(new Set());
    addBotMessage("Action stopped.");
  }, [addBotMessage]);

  // --- File upload handler ---
  const handleFileUpload = useCallback(
    async (file: File) => {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: `Uploading resume: ${file.name}`,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setSuggestions([]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        setIsTyping(false);

        if (data.success) {
          const firstName = data.userProfile?.firstName || "";
          const lastName = data.userProfile?.lastName || "";
          const nameStr = [firstName, lastName].filter(Boolean).join(" ");

          setUserStatus((prev) => ({
            ...prev,
            isLoggedIn: prev?.isLoggedIn ?? false,
            hasResume: true,
            userFirstName: firstName || prev?.userFirstName,
          }));

          addBotMessage(
            nameStr
              ? `Got your resume, ${firstName}! Let me find matching jobs for you...`
              : "Got your resume! Let me find matching jobs for you..."
          );

          // Auto-trigger a job search after state updates flush
          pendingAutoSearch.current = true;
          setTimeout(() => {
            if (pendingAutoSearch.current) {
              pendingAutoSearch.current = false;
              handleUserMessageRef.current("Find me jobs that match my resume");
            }
          }, 100);
        } else {
          addBotMessage(
            data.error || "Sorry, I couldn't process your resume. Please try a different file."
          );
        }
      } catch (err) {
        setIsTyping(false);
        console.error("Resume upload failed:", err);
        addBotMessage(
          "Sorry, I couldn't upload your resume. Please check your connection and try again."
        );
      }
    },
    [addBotMessage]
  );

  // --- Chat area drag & drop handlers ---
  const handleChatDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    chatDragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsChatDragging(true);
    }
  }, []);

  const handleChatDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    chatDragCounter.current--;
    if (chatDragCounter.current === 0) {
      setIsChatDragging(false);
    }
  }, []);

  const handleChatDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChatDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsChatDragging(false);
      chatDragCounter.current = 0;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  // --- Match my resume (core — returns result, does NOT post bot messages) ---
  const handleMatchResume = useCallback(
    async (job: Job): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> => {
      if (!job._apiData?.url || !job._apiData?.jobId) {
        console.error("Match resume: missing _apiData", { id: job.id, _apiData: job._apiData });
        return { success: false, error: "Missing job URL or ID" };
      }
      addMatchingId(job.id);

      const MAX_RETRIES = 3;

      try {
        const payload = {
          url: job._apiData.url,
          jobId: job._apiData.jobId,
          jobName: job._apiData.jobName || job.title,
          companyName: job._apiData.companyName || job.company,
          jobDetails: job._apiData.jobDetails || job.description,
          location: job._apiData.location || job.location,
        };

        let lastError = "";
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          const res = await fetch("/api/resume/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          // Retry on 420 (resume generation already in progress)
          if (res.status === 420) {
            if (attempt < MAX_RETRIES) {
              const delay = 5000 * (attempt + 1);
              console.warn(`Match resume 420 for ${job.company}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            lastError = "Resume generation is busy. Please try again in a moment.";
            return { success: false, error: lastError };
          }

          const data = await res.json();

          if (!res.ok) {
            const errMsg = data.error || `API error ${res.status}`;
            console.error("Match resume API error:", errMsg, { status: res.status, payload });
            return { success: false, error: errMsg };
          }

          if (data.html) {
            resumeHtmlCache.current.set(job.id, data.html);
            setResumeData({
              html: data.html,
              highlights: [],
              pdfUrl: data.pdfUrl,
              pdfFileName: data.pdfFileName,
              jobTitle: job.title,
              company: job.company,
              threeExplanations: data.threeExplanations,
            });
            updateJob(job.id, (j) => ({
              ...j,
              status: { ...j.status, resumeGenerated: true, resumeGeneratedAt: new Date().toISOString() },
            }));
            return { success: true, data };
          }
          console.error("Match resume: no HTML in response", data);
          return { success: false, error: "No resume HTML returned" };
        }

        return { success: false, error: lastError || "Max retries exceeded" };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Match resume failed:", errMsg);
        return { success: false, error: errMsg };
      } finally {
        removeMatchingId(job.id);
      }
    },
    [addMatchingId, removeMatchingId, updateJob]
  );

  // --- Resume CTA helpers ---
  const handleDownloadResume = useCallback((pdfFileName?: string, pdfUrl?: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else if (pdfFileName) {
      window.open(`/api/resume/download/${pdfFileName}`, "_blank");
    }
  }, []);

  const handlePreviewEditResume = useCallback((html: string) => {
    // Open resume HTML in a new tab for preview/edit
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }, []);

  // --- Match resume for a single job card click (posts bot message) ---
  const handleMatchResumeSingle = useCallback(
    async (job: Job): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> => {
      // If jobs are selected, ask for clarification
      if (selectedJobIds.size > 0 && !selectedJobIds.has(job.id)) {
        pendingMatchJobRef.current = job;
        addBotMessage(
          `You have ${selectedJobIds.size} job${selectedJobIds.size !== 1 ? "s" : ""} selected. Would you like to match just this job, or all selected jobs?`
        );
        setSuggestions([
          `Just ${job.company}`,
          `Generate resume for the ${selectedJobIds.size} selected`,
        ]);
        return { success: false, error: "Pending user clarification" };
      }

      addActionMessage(`Generating resume for ${job.title} at ${job.company}`);
      const result = await handleMatchResume(job);
      if (result.success) {
        // Highlight the card
        setHighlightJobIds(new Set([job.id]));
        setTimeout(() => setHighlightJobIds(new Set()), 2000);
      }
      if (result.success && result.data) {
        const data = result.data as {
          html?: string;
          pdfFileName?: string;
          pdfUrl?: string;
          threeExplanations?: { summary?: string; keywords_added?: string[]; soft_skills?: string };
        };
        addBotMessage(
          `Here's your resume tailored for ${job.title} at ${job.company}:`,
          {
            customComponent: (
              <ResumePreviewCard
                jobTitle={job.title}
                company={job.company}
                pdfFileName={data.pdfFileName}
                highlights={
                  data.threeExplanations
                    ? [
                        data.threeExplanations.summary,
                        data.threeExplanations.keywords_added?.length
                          ? `Keywords added: ${data.threeExplanations.keywords_added.join(", ")}`
                          : undefined,
                        data.threeExplanations.soft_skills
                          ? `Soft skills: ${data.threeExplanations.soft_skills}`
                          : undefined,
                      ].filter(Boolean) as string[]
                    : undefined
                }
                onDownload={(data.pdfFileName || data.pdfUrl) ? () => handleDownloadResume(data.pdfFileName, data.pdfUrl) : undefined}
                onPreviewEdit={data.html ? () => handlePreviewEditResume(data.html!) : undefined}
                onApply={() => handleApplySingle(job.id)}
                onEmailHM={() => handleOpenEmail(job)}
              />
            ),
          }
        );
      } else if (!result.success) {
        const reason = result.error || "unknown error";
        addBotMessage(`Sorry, I couldn't generate the tailored resume: ${reason}. Please try again.`);
      }
      return result;
    },
    [handleMatchResume, addBotMessage, addActionMessage, handleDownloadResume, handlePreviewEditResume, handleApplySingle, handleOpenEmail, selectedJobIds]
  );

  // --- View existing matched resume for a job (uses cache, no regeneration) ---
  const handleViewResume = useCallback(
    (job: Job) => {
      const cached = resumeHtmlCache.current.get(job.id);
      if (cached) {
        handlePreviewEditResume(cached);
        return;
      }
      // Fallback: if somehow not cached, fetch it
      if (!job._apiData?.url || !job._apiData?.jobId) return;
      addMatchingId(job.id);
      fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: job._apiData.url,
          jobId: job._apiData.jobId,
          jobName: job._apiData.jobName || job.title,
          companyName: job._apiData.companyName || job.company,
          jobDetails: job._apiData.jobDetails || job.description,
          location: job._apiData.location || job.location,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.html) {
            resumeHtmlCache.current.set(job.id, data.html);
            handlePreviewEditResume(data.html);
          }
        })
        .catch((err) => console.error("View resume failed:", err))
        .finally(() => removeMatchingId(job.id));
    },
    [addMatchingId, removeMatchingId, handlePreviewEditResume]
  );

  // --- Match resume for all selected jobs ---
  const handleMatchResumeForSelected = useCallback(
    async (selectedJobs: Job[]) => {
      if (selectedJobs.length === 0) return;

      // Skip jobs that already have resumes
      const jobsToMatch = selectedJobs.filter(j => !j.status.resumeGenerated);
      const skippedCount = selectedJobs.length - jobsToMatch.length;

      if (jobsToMatch.length === 0) {
        addBotMessage(`All ${selectedJobs.length} job${selectedJobs.length !== 1 ? "s" : ""} already have matched resumes.`);
        setSuggestions(["Yes, generate intro emails", "Find more jobs"]);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsProcessing(true);

      // Show spinners only on jobs that need matching
      for (const job of jobsToMatch) {
        addMatchingId(job.id);
      }

      const matchStatusMsgId = addActionMessage(
        `Generating resume for ${jobsToMatch.length} selected job${jobsToMatch.length !== 1 ? "s" : ""}${skippedCount > 0 ? ` (${skippedCount} already had resumes)` : ""}`
      );

      let successCount = 0;
      let failCount = 0;
      const matchedJobIds: string[] = [];

      // Process sequentially with inter-job delay
      for (let i = 0; i < jobsToMatch.length; i++) {
        if (controller.signal.aborted) break;
        const job = jobsToMatch[i];
        const result = await handleMatchResume(job);
        if (result.success) {
          successCount++;
          matchedJobIds.push(job.id);
          // Add 2s delay between successful jobs to avoid rate limiting
          if (i < jobsToMatch.length - 1) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        } else {
          failCount++;
          // Remove spinner for jobs without api data (handleMatchResume won't call removeMatchingId for those)
          removeMatchingId(job.id);
        }
      }

      setIsProcessing(false);
      abortControllerRef.current = null;

      // Post summary
      if (controller.signal.aborted) return;

      const skippedNote = skippedCount > 0 ? ` (${skippedCount} already had resumes)` : "";

      if (failCount === 0) {
        updateActionMessage(matchStatusMsgId, `Generated resume for ${successCount} job${successCount !== 1 ? "s" : ""}${skippedNote}`);
        // Collect matched jobs for the "Show jobs" snapshot
        const matchedJobs = selectedJobs.filter(j => matchedJobIds.includes(j.id) || j.status.resumeGenerated);
        addBotMessage(
          `All done! Successfully generated resumes for ${successCount} job${successCount !== 1 ? "s" : ""}.${skippedNote}`,
          { jobsSnapshot: { jobs: matchedJobs, totalJobs: matchedJobs.length } }
        );
        setSuggestions(["Yes, generate intro emails", "Find more jobs"]);
      } else {
        updateActionMessage(matchStatusMsgId, `Generated ${successCount} of ${jobsToMatch.length} resume${jobsToMatch.length !== 1 ? "s" : ""}${skippedNote}`);
        addBotMessage(
          `Finished: ${successCount} generated successfully, ${failCount} failed.${skippedNote} You can retry the failed ones individually.`
        );
        setSuggestions(["Find more jobs", "Help me prep for interviews"]);
      }

      // Open sidebar and highlight matched jobs
      setShowJobPanel(true);
      if (matchedJobIds.length > 0) {
        setHighlightJobIds(new Set(matchedJobIds));
        setTimeout(() => setHighlightJobIds(new Set()), 3000);
      }
    },
    [addMatchingId, removeMatchingId, handleMatchResume, addBotMessage, addActionMessage, updateActionMessage]
  );

  // --- Apply all helpers ---
  const pendingApplyJobsRef = useRef<Job[] | null>(null);

  const executeApplyAll = useCallback(async (targetJobs: Job[]) => {
    const count = targetJobs.length;
    setSuggestions([]);

    // Show animated "Applying to X jobs..." message
    const statusMsgId = addActionMessage(`Applying to ${count} job${count !== 1 ? "s" : ""}`);

    // Add all jobs to applying set for progress animation on cards
    for (const job of targetJobs) {
      addApplyingId(job.id);
      const controller = new AbortController();
      applyAbortControllers.current.set(job.id, controller);
    }

    let successCount = 0;
    let failCount = 0;

    // Process each job sequentially
    for (let i = 0; i < targetJobs.length; i++) {
      const job = targetJobs[i];
      const controller = applyAbortControllers.current.get(job.id);

      if (job._apiData?.url && job._apiData?.jobId) {
        try {
          const res = await fetch("/api/resume/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: job._apiData.url,
              jobId: job._apiData.jobId,
              jobName: job._apiData.jobName || job.title,
              companyName: job._apiData.companyName || job.company,
              jobDetails: job._apiData.jobDetails || job.description,
              location: job._apiData.location || job.location,
            }),
            signal: controller?.signal,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `API error ${res.status}`);

          updateJob(job.id, (j) => ({
            ...j,
            status: { ...j.status, applied: true, appliedAt: "just now" },
          }));
          if (data.html) {
            resumeHtmlCache.current.set(job.id, data.html);
            if (i === 0) {
              setResumeData({
                html: data.html,
                highlights: [],
                pdfFileName: data.pdfFileName,
                jobTitle: job.title,
                company: job.company,
                threeExplanations: data.threeExplanations,
              });
            }
            updateJob(job.id, (j) => ({
              ...j,
              status: { ...j.status, resumeGenerated: true, resumeGeneratedAt: new Date().toISOString() },
            }));
          }
          successCount++;
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            break;
          }
          console.error(`Bulk apply failed for ${job.company}:`, err);
          setApplyErrorJobIds((prev) => new Set(prev).add(job.id));
          failCount++;
        }
      } else {
        // No API data — mark as applied immediately
        updateJob(job.id, (j) => ({
          ...j,
          status: { ...j.status, applied: true, appliedAt: "just now" },
        }));
        successCount++;
      }

      // Remove from applying set + cleanup controller
      removeApplyingId(job.id);
      applyAbortControllers.current.delete(job.id);

      // Add small delay between jobs to avoid rate limiting
      if (i < targetJobs.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Update status message
    updateActionMessage(statusMsgId, `Applied to ${successCount} of ${count} job${count !== 1 ? "s" : ""}`);

    addBotMessage(
      failCount === 0
        ? `All done! I've submitted ${successCount} tailored applications.`
        : `Finished: ${successCount} applied successfully, ${failCount} failed. You can retry the failed ones individually.`,
      {
        customComponentMeta: { type: "applicationStatusCard", jobIds: targetJobs.map(j => j.id), totalJobs: count },
        jobsSnapshot: { jobs: targetJobs, totalJobs: count },
      }
    );
    addBotMessage(
      "Want me to generate personalized intro emails to the hiring managers? Candidates who reach out directly are 3x more likely to hear back."
    );
    setSuggestions([
      "Yes, generate intro emails",
      "No thanks",
    ]);
  }, [addBotMessage, addActionMessage, updateActionMessage, addApplyingId, removeApplyingId, updateJob]);

  const handleApplyAll = useCallback(async () => {
    // If jobs are selected, apply only to those; otherwise apply to all
    const targetJobs = selectedJobIds.size > 0
      ? jobs.filter((j) => selectedJobIds.has(j.id))
      : jobs;
    if (selectedJobIds.size > 0) clearSelection();

    const withResume = targetJobs.filter((j) => j.status.resumeGenerated);
    const withoutResume = targetJobs.filter((j) => !j.status.resumeGenerated);

    if (withoutResume.length > 0) {
      // Ask before tailoring
      pendingApplyJobsRef.current = targetJobs;
      const total = targetJobs.length;
      const haveCount = withResume.length;
      const needCount = withoutResume.length;
      const resumeMsg = haveCount > 0
        ? `You want to apply to ${total} job${total !== 1 ? "s" : ""}. ${haveCount} already ${haveCount === 1 ? "has" : "have"} a tailored resume. Would you like me to create personalized resumes for the other ${needCount}?`
        : `You want to apply to ${total} job${total !== 1 ? "s" : ""}. Would you like me to create personalized resumes for ${needCount === total ? "each one" : `the ${needCount} that need one`}?`;
      addBotMessage(resumeMsg);
      setSuggestions([
        "Yes, tailor resumes first",
        "No, apply with my resume on record",
      ]);
      return;
    }

    // All already have resumes — apply directly
    await executeApplyAll(targetJobs);
  }, [jobs, selectedJobIds, clearSelection, addBotMessage, executeApplyAll]);

  // --- Generate intro emails for all (or selected) ---
  const handleGenerateEmails = useCallback(async () => {
    // If jobs are selected, only generate for selected; otherwise all
    const pool = selectedJobIds.size > 0
      ? jobs.filter((j) => selectedJobIds.has(j.id))
      : jobs;
    if (selectedJobIds.size > 0) clearSelection();
    const eligibleJobs = pool.filter((j) => j._apiData?.jobId && !j.status.emailSent);
    const count = eligibleJobs.length;
    if (count === 0) {
      addBotMessage("All jobs already have emails generated or sent.");
      return;
    }

    setSuggestions([]);
    setIsProcessing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Show spinners on all eligible jobs
    for (const job of eligibleJobs) {
      addEmailGeneratingId(job.id);
    }

    const statusMsgId = addActionMessage(`Generating intro emails for ${count} hiring manager${count !== 1 ? "s" : ""}`);

    let successCount = 0;
    let failCount = 0;
    const generatedIds: string[] = [];

    for (let i = 0; i < eligibleJobs.length; i++) {
      if (controller.signal.aborted) break;
      const job = eligibleJobs[i];

      try {
        const res = await fetch("/api/email/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: job._apiData!.jobId,
            jobName: job._apiData!.jobName || job.title,
            companyName: job._apiData!.companyName || job.company,
            jobDetails: job._apiData!.jobDetails || job.description,
            url: job._apiData!.url,
            companyUrl: job._apiData!.companyUrl,
          }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success) {
          const ed: EmailData = {
            subject: data.subject,
            body: data.body,
            recipientName: data.recipientName,
            recipientTitle: data.recipientTitle,
            company: job.company,
          };
          emailDataCache.current.set(job.id, ed);
          setEmailGeneratedJobIds((prev) => new Set(prev).add(job.id));
          successCount++;
          generatedIds.push(job.id);
          // Delay between requests to avoid rate limiting
          if (i < eligibleJobs.length - 1) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        } else {
          failCount++;
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        console.error("Email generation failed:", err);
        failCount++;
      } finally {
        removeEmailGeneratingId(job.id);
      }
    }

    setIsProcessing(false);
    abortControllerRef.current = null;

    if (controller.signal.aborted) return;

    if (failCount === 0) {
      updateActionMessage(statusMsgId, `Generated intro emails for ${successCount} hiring manager${successCount !== 1 ? "s" : ""}`);
      addBotMessage(
        `All done! I've drafted personalized intro emails for ${successCount} hiring manager${successCount !== 1 ? "s" : ""}. Click **See email** on any job card to review and send.`,
        { jobsSnapshot: { jobs: eligibleJobs, totalJobs: eligibleJobs.length } }
      );
    } else {
      updateActionMessage(statusMsgId, `Generated ${successCount} of ${count} emails`);
      addBotMessage(
        `Drafted ${successCount} intro email${successCount !== 1 ? "s" : ""}, ${failCount} failed. Click **See email** on any job card to review.`,
        { jobsSnapshot: { jobs: eligibleJobs.filter(j => emailDataCache.current.has(j.id)), totalJobs: successCount } }
      );
    }

    // Open sidebar and highlight email-generated cards
    setShowJobPanel(true);
    if (generatedIds.length > 0) {
      setHighlightJobIds(new Set(generatedIds));
      setTimeout(() => setHighlightJobIds(new Set()), 3000);
    }

    setSuggestions(["Find more jobs", "Help me prep for interviews"]);
  }, [addBotMessage, addActionMessage, updateActionMessage, addEmailGeneratingId, removeEmailGeneratingId, jobs, selectedJobIds, clearSelection]);

  // --- Mark all emails as sent (after review) ---
  const handleEmailAll = useCallback(async () => {
    const count = jobs.length;
    const snapshot = [...jobs];
    setJobs((prev) =>
      prev.map((j) => ({
        ...j,
        status: { ...j.status, emailSent: true, emailSentAt: "just now" },
      }))
    );
    setSuggestions([]);
    addBotMessage(
      "Done! I've sent a tailored intro email to each hiring manager.",
      {
        customComponentMeta: { type: "applicationStatusCard", jobIds: snapshot.map(j => j.id), totalJobs: count },
      }
    );
    addBotMessage(
      "Anything else I can help with?"
    );
    setSuggestions(["Find more jobs", "Help me prep for interviews"]);
  }, [addBotMessage, jobs]);

  // --- Main message handler (API-driven) ---
  const handleUserMessage = useCallback(
    async (content: string) => {
      if (isTyping) return;

      // Add user message to UI
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const isFirstMsg = messages.length === 0;
      setMessages((prev) => [...prev, userMsg]);
      setSuggestions([]);
      setIsTyping(true);

      // On first message, create conversation entry with auto-generated title
      if (isFirstMsg) {
        const title = generateTitle(content);
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === activeConversationId);
          if (exists) {
            return prev.map((c) =>
              c.id === activeConversationId ? { ...c, title } : c
            );
          }
          return [
            {
              id: activeConversationId,
              title,
              messages: [userMsg],
              chatHistory: [],
              jobs: [],
              totalJobs: 0,
              suggestions: [],
            },
            ...prev,
          ];
        });
      }

      // Check for quick intent matches (button-like phrases)
      const lower = content.toLowerCase();

      // Handle pending match clarification (from multi-select conflict)
      if (pendingMatchJobRef.current && lower.startsWith("just ")) {
        const pendingJob = pendingMatchJobRef.current;
        pendingMatchJobRef.current = null;
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: `[Action: match_resume(${pendingJob.title} at ${pendingJob.company})]` },
        ]);
        await handleMatchResumeSingle(pendingJob);
        return;
      }

      // Handle pending "generate resume before apply?" question
      if (pendingApplyResumeJobRef.current) {
        const pendingJob = pendingApplyResumeJobRef.current;
        pendingApplyResumeJobRef.current = null;
        setIsTyping(false);

        if (lower.includes("yes") || lower.includes("generate") || lower.includes("tailor")) {
          // Generate resume first, then auto-apply
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: match_resume(${pendingJob.title} at ${pendingJob.company}) then auto-apply]` },
          ]);
          addBotMessage(`Generating a tailored resume for ${pendingJob.title} at ${pendingJob.company}, then I'll auto-apply...`);
          const result = await handleMatchResumeSingle(pendingJob);
          if (result.success) {
            handleApplySingle(pendingJob.id, true);
          }
          return;
        } else {
          // Apply directly without tailoring
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: auto-apply(${pendingJob.title} at ${pendingJob.company}, no tailor)]` },
          ]);
          handleApplySingle(pendingJob.id, true);
          return;
        }
      }

      // Handle "draft intro email" / "email hiring manager" after single apply
      if (lastAppliedJobRef.current && (lower.includes("yes, draft") || lower.includes("yes, email") || lower.includes("intro email") || lower.includes("hiring manager"))) {
        const targetJob = lastAppliedJobRef.current;
        lastAppliedJobRef.current = null;
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: `[Action: email_hm(${targetJob.title} at ${targetJob.company})]` },
        ]);
        await handleGenerateEmailSingle(targetJob);
        addBotMessage(
          `I've drafted a personalized intro email for **${targetJob.company}**. Click **See email** on the job card to review and send it.`
        );
        setSuggestions(["Find more jobs", "Help me prep for interviews"]);
        return;
      }
      if (lastAppliedJobRef.current && lower.includes("no thanks")) {
        lastAppliedJobRef.current = null;
        setIsTyping(false);
        addBotMessage("No problem! Let me know if you need anything else.");
        setSuggestions(["Find more jobs", "Help me prep for interviews"]);
        return;
      }
      if (lastAppliedJobRef.current && lower.includes("select more jobs")) {
        lastAppliedJobRef.current = null;
        setIsTyping(false);
        setShowJobPanel(true);
        addBotMessage("Select the jobs you'd like to apply to from the panel on the right, then click **Apply to the selected**.");
        return;
      }
      lastAppliedJobRef.current = null; // Clear if any other message

      // Handle pending bulk apply tailor question
      if (pendingApplyJobsRef.current) {
        const pendingJobs = pendingApplyJobsRef.current;
        pendingApplyJobsRef.current = null;
        setIsTyping(false);

        if (lower.includes("yes, tailor") || lower.includes("tailor resumes")) {
          // Match resumes first, then apply
          const needResume = pendingJobs.filter((j) => !j.status.resumeGenerated);
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: match_resume(${needResume.length} jobs) then bulk_apply]` },
          ]);
          await handleMatchResumeForSelected(needResume);
          await executeApplyAll(pendingJobs);
          return;
        } else {
          // Apply directly without tailoring
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: bulk_apply(${pendingJobs.length} jobs, no tailor)]` },
          ]);
          await executeApplyAll(pendingJobs);
          return;
        }
      }

      // Selection-based actions
      if (lower.includes("apply to selected") || lower.includes("apply for selected") || lower.includes("apply to the")) {
        if (selectedJobs.length > 0) {
          setIsTyping(false);
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: bulk_apply(${selectedJobs.length} selected jobs)]` },
          ]);
          await handleApplyAll();
          return;
        }
      }
      if (lower.includes("email hms for selected") || lower.includes("email hiring managers for selected") || lower.includes("generate intro emails for the")) {
        if (selectedJobs.length > 0) {
          setIsTyping(false);
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: generate_emails(${selectedJobs.length} selected jobs)]` },
          ]);
          await handleGenerateEmails();
          return;
        }
      }
      if (lower.includes("match resume for selected") || lower.includes("generate resume for the")) {
        if (selectedJobs.length > 0) {
          setIsTyping(false);
          const snapshot = [...selectedJobs];
          clearSelection();
          setChatHistory((prev) => [
            ...prev,
            { role: "user", content },
            { role: "assistant", content: `[Action: match_resume(${snapshot.length} selected jobs)]` },
          ]);
          await handleMatchResumeForSelected(snapshot);
          return;
        }
      }

      if (
        lower.includes("apply for all") ||
        lower.includes("apply to all")
      ) {
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: `[Action: bulk_apply(${jobs.length} jobs)]` },
        ]);
        await handleApplyAll();
        return;
      }
      if (
        lower.includes("generate intro email") ||
        lower.includes("generate email") ||
        lower.includes("yes, generate email") ||
        lower.includes("yes, generate intro")
      ) {
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: `[Action: generate_emails(${jobs.length} jobs)]` },
        ]);
        await handleGenerateEmails();
        return;
      }
      if (
        lower.includes("email all hiring") ||
        lower.includes("yes, email all") ||
        lower.includes("email all") ||
        lower.includes("send it") ||
        lower.includes("looks good, send")
      ) {
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: `[Action: bulk_email(${jobs.length} jobs)]` },
        ]);
        await handleEmailAll();
        return;
      }

      // Call the chat API — pass user status for personalized responses
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            history: chatHistory,
            jobsContext: buildJobsContext(),
            userStatus: userStatus || undefined,
          }),
        });

        const data: ChatApiResponse = await res.json();
        setIsTyping(false);

        // Update chat history (with action metadata for LLM context)
        const debugInfo = data._debug;
        const enrichedContent = enrichAssistantContent(
          data.botMessage,
          data.actionType,
          data.data,
          debugInfo?.toolInput
        );
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: enrichedContent },
        ]);

        // Dispatch based on actionType
        switch (data.actionType) {
          case "show_jobs": {
            if (data.data?.jobs && data.data.jobs.length > 0) {
              const incomingJobs = data.data.jobs;
              const incomingTotal = incomingJobs.length; // Use loaded count (API limit=50)
              setJobs(incomingJobs);
              setTotalJobs(incomingTotal);
              setShowJobPanel(true);

              const snapshot = { jobs: incomingJobs, totalJobs: incomingTotal };

              if (incomingJobs.length <= 5) {
                // Inline rich job cards in chat — short message
                const shortMsg = `I found ${incomingJobs.length} matching job${incomingJobs.length !== 1 ? "s" : ""} for you. Here are the top results:`;
                addBotMessage(shortMsg, {
                  jobsSnapshot: snapshot,
                  customComponentMeta: { type: "chatJobCards", jobIds: incomingJobs.map(j => j.id), totalJobs: incomingJobs.length },
                }, debugInfo);
              } else {
                // >5 jobs: short text only, jobs visible in right panel
                const shortMsg = `I found ${incomingJobs.length} matching jobs for you. Browse them in the panel on the right.`;
                addBotMessage(shortMsg, { jobsSnapshot: snapshot }, debugInfo);
              }
            } else {
              addBotMessage(data.botMessage, undefined, debugInfo);
            }
            break;
          }
          case "show_resume": {
            if (data.data?.resume) {
              const resume = data.data.resume;
              setResumeData(resume);
              // Try to find the matching job for CTA actions
              const matchJob = jobs.find(
                (j) =>
                  (resume.jobTitle && j.title.toLowerCase() === resume.jobTitle.toLowerCase()) &&
                  (resume.company && j.company.toLowerCase() === resume.company.toLowerCase())
              );
              addBotMessage(data.botMessage, {
                customComponent: (
                  <ResumePreviewCard
                    jobTitle={resume.jobTitle}
                    company={resume.company}
                    highlights={resume.highlights}
                    pdfFileName={resume.pdfFileName}
                    onDownload={(resume.pdfFileName || resume.pdfUrl) ? () => handleDownloadResume(resume.pdfFileName, resume.pdfUrl) : undefined}
                    onPreviewEdit={resume.html ? () => handlePreviewEditResume(resume.html) : undefined}
                    onApply={matchJob ? () => handleApplySingle(matchJob.id) : undefined}
                    onEmailHM={matchJob ? () => handleOpenEmail(matchJob) : undefined}
                  />
                ),
              }, debugInfo);
            } else {
              addBotMessage(data.botMessage, undefined, debugInfo);
            }
            break;
          }
          case "show_email": {
            if (data.data?.email) {
              setEmailData(data.data.email);
            }
            addBotMessage(data.botMessage, undefined, debugInfo);
            break;
          }
          case "bulk_apply_result": {
            if (data.data?.bulkResults) {
              const count = data.data.bulkResults.length;
              setJobs((prev) =>
                prev.map((j) => ({
                  ...j,
                  status: { ...j.status, applied: true, appliedAt: "just now" },
                }))
              );
              addBotMessage(data.botMessage, {
                customComponentMeta: { type: "applicationStatusCard", jobIds: jobs.map(j => j.id), totalJobs },
              }, debugInfo);
            } else {
              addBotMessage(data.botMessage, undefined, debugInfo);
            }
            break;
          }
          case "bulk_email_result": {
            if (data.data?.bulkResults) {
              const count = data.data.bulkResults.length;
              setJobs((prev) =>
                prev.map((j) => ({
                  ...j,
                  status: { ...j.status, emailSent: true, emailSentAt: "just now" },
                }))
              );
              addBotMessage(data.botMessage, {
                customComponentMeta: { type: "applicationStatusCard", jobIds: jobs.map(j => j.id), totalJobs },
              }, debugInfo);
            } else {
              addBotMessage(data.botMessage, undefined, debugInfo);
            }
            break;
          }
          default:
            addBotMessage(data.botMessage, undefined, debugInfo);
        }

        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } catch (err) {
        setIsTyping(false);
        console.error("Chat API error:", err);
        addBotMessage(
          "Sorry, I couldn't reach the server. Please check your connection and try again."
        );
      }
    },
    [
      isTyping,
      messages,
      activeConversationId,
      chatHistory,
      buildJobsContext,
      addBotMessage,
      handleApplyAll,
      executeApplyAll,
      handleEmailAll,
      handleGenerateEmails,
      handleApplySingle,
      handleCancelApply,
      handleSave,
      handleViewDetail,
      handleOpenEmail,
      handleGenerateEmailSingle,
      handleRemoveJob,
      handleMatchResumeForSelected,
      handleMatchResumeSingle,
      userStatus,
      selectedJobs,
      selectedJobIds,
      clearSelection,
      updateJob,
      jobs,
    ]
  );

  // Keep ref in sync so file upload can call it without stale closure
  handleUserMessageRef.current = handleUserMessage;

  // Handle initial query from homepage — wait for userStatus so we know resume state
  useEffect(() => {
    if (initialQueryHandled.current) return;
    if (!initialQuery) return;
    if (userStatus === null) return; // wait for status to load
    initialQueryHandled.current = true;

    // The user message is already in state (pre-populated above).
    // We need to call the API directly instead of handleUserMessage
    // because handleUserMessage would add a duplicate user message.
    const fireInitialQuery = async () => {
      // Create conversation entry
      const title = generateTitle(initialQuery);
      setConversations((prev) => [
        {
          id: activeConversationId,
          title,
          messages: [],
          chatHistory: [],
          jobs: [],
          totalJobs: 0,
          suggestions: [],
        },
        ...prev,
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: initialQuery,
            history: [],
            jobsContext: undefined,
            userStatus: userStatus || undefined,
          }),
        });

        const data: ChatApiResponse = await res.json();
        setIsTyping(false);

        const debugInfo = data._debug;
        const enrichedContent = enrichAssistantContent(
          data.botMessage,
          data.actionType,
          data.data,
          debugInfo?.toolInput
        );
        setChatHistory([
          { role: "user", content: initialQuery },
          { role: "assistant", content: enrichedContent },
        ]);
        switch (data.actionType) {
          case "show_jobs": {
            if (data.data?.jobs && data.data.jobs.length > 0) {
              const incomingJobs = data.data.jobs;
              const incomingTotal = incomingJobs.length; // Use loaded count (API limit=50)
              setJobs(incomingJobs);
              setTotalJobs(incomingTotal);
              setShowJobPanel(true);

              const snapshot = { jobs: incomingJobs, totalJobs: incomingTotal };

              if (incomingJobs.length <= 5) {
                addBotMessage(
                  `I found ${incomingJobs.length} matching job${incomingJobs.length !== 1 ? "s" : ""} for you. Here are the top results:`,
                  {
                    jobsSnapshot: snapshot,
                    customComponentMeta: { type: "chatJobCards", jobIds: incomingJobs.map(j => j.id), totalJobs: incomingJobs.length },
                  },
                  debugInfo
                );
              } else {
                addBotMessage(
                  `I found ${incomingJobs.length} matching jobs for you. Browse them in the panel on the right.`,
                  { jobsSnapshot: snapshot },
                  debugInfo
                );
              }
            } else {
              addBotMessage(data.botMessage, undefined, debugInfo);
            }
            break;
          }
          default:
            addBotMessage(data.botMessage, undefined, debugInfo);
        }

        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } catch (err) {
        setIsTyping(false);
        console.error("Chat API error:", err);
        addBotMessage("Sorry, I couldn't reach the server. Please check your connection and try again.");
      }
    };

    fireInitialQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, userStatus]);

  // --- Render live component from metadata using current state ---
  const renderLiveComponent = useCallback(
    (meta: NonNullable<Message["customComponentMeta"]>, message?: Message): React.ReactNode => {
      if (meta.type === "chatJobCards") {
        const liveJobs = meta.jobIds.map(id => jobs.find(j => j.id === id)).filter(Boolean) as Job[];
        return (
          <ChatJobCards
            jobs={liveJobs}
            totalJobs={meta.totalJobs}
            onApply={handleApplySingle}
            onEmailHM={handleGenerateEmailSingle}
            onViewDetail={handleViewDetail}
            onMatchResume={handleMatchResumeSingle}
            onViewResume={handleViewResume}
            matchingJobIds={matchingJobIds}
            applyErrorJobIds={applyErrorJobIds}
            applyingJobIds={applyingJobIds}
            applyRetriedJobIds={applyRetriedJobIds}
            onCancelApply={handleCancelApply}
            selfApplyJobIds={selfApplyJobIds}
            onSelfApply={handleSelfApply}
            onConfirmSelfApply={handleConfirmSelfApply}
            emailGeneratedJobIds={emailGeneratedJobIds}
            emailGeneratingJobIds={emailGeneratingJobIds}
            onSeeEmail={handleSeeEmail}
            highlightJobIds={highlightJobIds}
          />
        );
      }
      if (meta.type === "applicationStatusCard") {
        // Try to get live job state; fall back to snapshot from the message
        let liveJobs = meta.jobIds.map(id => jobs.find(j => j.id === id)).filter(Boolean) as Job[];
        if (liveJobs.length === 0 && message?.jobsSnapshot) {
          liveJobs = message.jobsSnapshot.jobs;
        }
        const successCount = liveJobs.filter(j => j.status.applied).length;
        const emailsSent = liveJobs.length > 0 && liveJobs.every(j => j.status.emailSent);
        const resumesTailored = liveJobs.length > 0 && liveJobs.some(j => j.status.resumeGenerated);
        return (
          <ApplicationStatusCard
            jobCount={meta.totalJobs}
            successCount={successCount}
            emailsSent={emailsSent}
            resumesTailored={resumesTailored}
            jobsSnapshot={{ jobs: liveJobs, totalJobs: meta.totalJobs }}
            onLoadJobsSnapshot={handleLoadJobsSnapshot}
          />
        );
      }
      return null;
    },
    [jobs, matchingJobIds, applyErrorJobIds, applyingJobIds, applyRetriedJobIds, selfApplyJobIds, emailGeneratedJobIds, emailGeneratingJobIds, highlightJobIds, handleApplySingle, handleGenerateEmailSingle, handleViewDetail, handleMatchResumeSingle, handleViewResume, handleCancelApply, handleSelfApply, handleConfirmSelfApply, handleSeeEmail, handleLoadJobsSnapshot]
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-muted/30 transition-all duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"
        } ${sidebarCollapsed ? "lg:w-12" : "lg:w-72"}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-3 overflow-hidden whitespace-nowrap">
          {sidebarCollapsed ? (
            <span className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <svg width="16" height="16" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6L3.4051 7.09486L4.5 7.5L3.4051 7.90514L3 9L2.5949 7.90514L1.5 7.5L2.5949 7.09486L3 6Z" fill="currentColor"/>
                <path d="M3.5 1L4.0402 2.45982L5.5 3L4.0402 3.54018L3.5 5L2.9598 3.54018L1.5 3L2.9598 2.45982L3.5 1Z" fill="currentColor"/>
                <path d="M7 3L7.8103 5.18973L10 6L7.8103 6.81027L7 9L6.1897 6.81027L4 6L6.1897 5.18973L7 3Z" fill="currentColor"/>
              </svg>
            </span>
          ) : (
            <Image src="/logo.svg" alt="PitchMeAI" width={80} height={26} className="h-7 w-auto shrink-0" />
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="p-2 shrink-0">
            <button
              onClick={handleNewConversation}
              className={`flex items-center gap-2 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted transition-colors overflow-hidden whitespace-nowrap ${sidebarCollapsed ? "w-8 h-8 justify-center p-0 lg:w-8" : "w-full px-3 py-2"}`}
              title="New Conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>New Conversation</span>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 space-y-1">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => {
                  if (convo.id === activeConversationId) return;
                  saveCurrentConversation();
                  loadConversation(convo);
                }}
                className={`rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors truncate overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? "lg:px-0 lg:flex lg:justify-center" : ""
                } ${
                  convo.id === activeConversationId
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                title={convo.title}
              >
                {sidebarCollapsed ? (
                  <span className="hidden lg:inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                ) : null}
                <span className={sidebarCollapsed ? "lg:hidden" : ""}>{convo.title}</span>
              </div>
            ))}
            {conversations.length === 0 && !sidebarCollapsed && (
              <p className="px-3 py-4 text-xs text-muted-foreground/60 text-center">
                Your conversations will appear here
              </p>
            )}
          </nav>
          {/* Bottom links — pinned to bottom */}
          <div className="shrink-0 border-t border-border/50 p-2 space-y-1">
            <button className={`flex items-center gap-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors overflow-hidden whitespace-nowrap ${sidebarCollapsed ? "w-8 h-8 justify-center p-0 lg:w-8" : "w-full px-3 py-2"}`} title="My Applications">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>My Applications</span>
            </button>
            <button className={`flex items-center gap-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors overflow-hidden whitespace-nowrap ${sidebarCollapsed ? "w-8 h-8 justify-center p-0 lg:w-8" : "w-full px-3 py-2"}`} title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>Settings</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div
        className="flex flex-1 flex-col min-w-0 min-h-0 relative"
        onDragEnter={handleChatDragEnter}
        onDragLeave={handleChatDragLeave}
        onDragOver={handleChatDragOver}
        onDrop={handleChatDrop}
      >
        {/* Full-area drop overlay */}
        {isChatDragging && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-12 py-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
              <p className="text-sm font-medium text-primary/80">Drop your resume here</p>
              <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX</p>
            </div>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
          </button>
          <div className="flex-1" />
          {!showJobPanel && jobs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex text-xs h-7 gap-1.5"
              onClick={() => setShowJobPanel(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="3" y="3" rx="1" /></svg>
              Show Jobs
            </Button>
          )}
          {/* Settings gear */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-3" align="end" side="bottom">
              <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span>Show action logs</span>
                <button
                  role="switch"
                  aria-checked={showActionLogs}
                  onClick={() => setShowActionLogs(!showActionLogs)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showActionLogs ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${showActionLogs ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
              </label>
              <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span className="flex items-center gap-1.5">
                  {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                  )}
                  Dark mode
                </span>
                <button
                  role="switch"
                  aria-checked={darkMode}
                  onClick={() => toggleDarkMode(!darkMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${darkMode ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
              </label>
            </PopoverContent>
          </Popover>
        </div>

        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="mx-auto max-w-4xl space-y-4 p-4">
            {/* Empty state — shown when no messages yet */}
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>
                </div>
                <h2 className="text-lg font-semibold mb-1">
                  {userStatus?.userFirstName
                    ? `Hi ${userStatus.userFirstName}, what can I help you with?`
                    : "What can I help you with?"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Tell me what kind of jobs you're looking for, or upload your resume and I'll find the best matches.
                </p>
                <p className="text-xs text-muted-foreground/50 mt-2">
                  or drag &amp; drop your resume here
                </p>
              </div>
            )}

            {messages
              .filter((msg) => showActionLogs || msg.role !== "action")
              .map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                liveCustomComponent={msg.customComponentMeta ? renderLiveComponent(msg.customComponentMeta, msg) : undefined}
                onLoadJobsSnapshot={handleLoadJobsSnapshot}
                onStop={handleStop}
                botName={botName}
                botAvatarUrl={botAvatarUrl}
                onEditBot={handleEditBot}
              />
            ))}
            {isTyping && (
              <ChatMessage
                message={{ id: "typing", role: "bot", content: "", isTyping: true }}
                botName={botName}
                botAvatarUrl={botAvatarUrl}
              />
            )}
          </div>
        </ScrollArea>

        <div className="shrink-0 mx-auto w-full max-w-4xl">
          <ChatInput
            onSend={handleUserMessage}
            onFileUpload={handleFileUpload}
            disabled={isTyping}
            suggestions={suggestions}
            selectedJobs={selectedJobs}
            onClearSelection={clearSelection}
            isProcessing={isProcessing}
            onStop={handleStop}
          />
        </div>
      </div>

      {/* Right Panel — Job Listings (desktop, sticky full height) */}
      {showJobPanel && (
        <JobPanel
          jobs={jobs}
          totalJobs={totalJobs}
          onApply={handleApplySingle}
          onApplyAll={handleApplyAll}
          onViewDetail={handleViewDetail}
          onSave={handleSave}
          onEmailHM={handleGenerateEmailSingle}
          onRemoveJob={handleRemoveJob}
          onClose={() => setShowJobPanel(false)}
          onMatchResume={handleMatchResumeSingle}
          onViewResume={handleViewResume}
          matchingJobIds={matchingJobIds}
          applyErrorJobIds={applyErrorJobIds}
          applyingJobIds={applyingJobIds}
          applyRetriedJobIds={applyRetriedJobIds}
          onCancelApply={handleCancelApply}
          selfApplyJobIds={selfApplyJobIds}
          onSelfApply={handleSelfApply}
          onConfirmSelfApply={handleConfirmSelfApply}
          emailGeneratedJobIds={emailGeneratedJobIds}
          emailGeneratingJobIds={emailGeneratingJobIds}
          onSeeEmail={handleSeeEmail}
          selectedJobIds={selectedJobIds}
          onToggleSelect={toggleJobSelection}
          onSelectAll={selectAllJobs}
          onClearSelection={clearSelection}
          highlightJobIds={highlightJobIds}
        />
      )}

      {/* Job detail slide-over */}
      <JobDetailSheet
        job={detailJob}
        open={!!detailJob}
        onClose={() => setDetailJob(null)}
        onApply={handleApplySingle}
        onEmailHM={handleOpenEmail}
        onSave={handleSave}
        onMatchResume={handleMatchResumeSingle}
      />

      {/* Email composer dialog */}
      <EmailComposer
        job={emailJob}
        open={!!emailJob}
        onClose={() => {
          setEmailJob(null);
          setEmailData(null);
        }}
        onSend={handleEmailSingle}
        emailData={emailData}
        loading={emailLoading}
      />
    </div>
  );
}
