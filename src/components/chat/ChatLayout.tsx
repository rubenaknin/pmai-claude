"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { JobPanel } from "./JobPanel";
import { ChatJobCards } from "./ChatJobCards";
import { JobDetailSheet } from "./JobDetailSheet";
import { EmailComposer } from "./EmailComposer";
import { ApplicationStatusCard } from "./ApplicationStatusCard";
import { ResumePreviewCard } from "./ResumePreviewCard";
import { Job } from "./jobData";
import type { ChatHistoryMessage, ChatApiResponse, EmailData, ResumeData, DebugInfo, UserStatusResponse } from "@/lib/types";

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
function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/[.!?]+$/, "");
  // Strip common filler prefixes
  const stripped = cleaned
    .replace(/^(hey|hi|hello|please|can you|could you|i want to|i'd like to|i need to)\s+/i, "")
    .replace(/^(find me|search for|look for|get me)\s+/i, "");
  const capitalized = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  return capitalized.length > 40 ? capitalized.slice(0, 37) + "..." : capitalized;
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

  // Job selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Drag & drop state for the chat area
  const [isChatDragging, setIsChatDragging] = useState(false);
  const chatDragCounter = useRef(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQueryHandled = useRef(false);

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

  const handleApplySingle = useCallback(
    async (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job || job.status.applied) return;

      // Optimistic update
      updateJob(jobId, (j) => ({
        ...j,
        status: { ...j.status, applied: true, appliedAt: "just now" },
      }));

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
          });
          const data = await res.json();
          if (data.html) {
            setResumeData({
              html: data.html,
              highlights: [],
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
        } catch (err) {
          console.error("Resume generation failed:", err);
        }
      }
    },
    [jobs, updateJob]
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
            setEmailData({
              subject: data.subject,
              body: data.body,
              recipientName: data.recipientName,
              recipientTitle: data.recipientTitle,
              company: job.company,
            });
          }
        } catch (err) {
          console.error("Email generation failed:", err);
        }
      }
      setEmailLoading(false);
    },
    []
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

  // --- Bot messaging helper ---
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
              ? `Got your resume! I found you're ${nameStr}. What kind of roles are you looking for?`
              : "Got your resume! What kind of roles are you looking for?"
          );
          setSuggestions([
            "Find me jobs that match my resume",
            "Show me remote roles",
          ]);
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
    async (job: Job): Promise<{ success: boolean; data?: Record<string, unknown> }> => {
      if (!job._apiData?.url || !job._apiData?.jobId) return { success: false };
      addMatchingId(job.id);

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
        });
        const data = await res.json();
        if (data.html) {
          setResumeData({
            html: data.html,
            highlights: [],
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
        return { success: false };
      } catch (err) {
        console.error("Match resume failed:", err);
        return { success: false };
      } finally {
        removeMatchingId(job.id);
      }
    },
    [addMatchingId, removeMatchingId, updateJob]
  );

  // --- Match resume for a single job card click (posts bot message) ---
  const handleMatchResumeSingle = useCallback(
    async (job: Job) => {
      const result = await handleMatchResume(job);
      if (result.success && result.data) {
        const data = result.data as { threeExplanations?: { summary?: string; keywords_added?: string[]; soft_skills?: string } };
        addBotMessage(
          `Here's your resume tailored for ${job.title} at ${job.company}:`,
          {
            customComponent: (
              <ResumePreviewCard
                jobTitle={job.title}
                company={job.company}
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
              />
            ),
          }
        );
      } else if (!result.success) {
        addBotMessage("Sorry, I couldn't generate the tailored resume. Please try again.");
      }
    },
    [handleMatchResume, addBotMessage]
  );

  // --- Match resume for all selected jobs ---
  const handleMatchResumeForSelected = useCallback(
    async (selectedJobs: Job[]) => {
      if (selectedJobs.length === 0) return;

      // Show spinners on all at once
      for (const job of selectedJobs) {
        addMatchingId(job.id);
      }

      addBotMessage(
        `Matching your resume for ${selectedJobs.length} selected job${selectedJobs.length !== 1 ? "s" : ""}...`
      );

      let successCount = 0;
      let failCount = 0;

      // Process sequentially
      for (const job of selectedJobs) {
        const result = await handleMatchResume(job);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          // Remove spinner for jobs without api data (handleMatchResume won't call removeMatchingId for those)
          removeMatchingId(job.id);
        }
      }

      // Post summary
      if (failCount === 0) {
        addBotMessage(
          `All done! Successfully matched your resume for ${successCount} job${successCount !== 1 ? "s" : ""}.`
        );
      } else {
        addBotMessage(
          `Finished: ${successCount} matched successfully, ${failCount} failed. You can retry the failed ones individually.`
        );
      }
    },
    [addMatchingId, removeMatchingId, handleMatchResume, addBotMessage]
  );

  // --- Apply all ---
  const handleApplyAll = useCallback(async () => {
    const count = jobs.length;
    setJobs((prev) =>
      prev.map((j) => ({
        ...j,
        status: { ...j.status, applied: true, appliedAt: "just now" },
      }))
    );
    setSuggestions([]);

    addBotMessage(
      `Applying to all ${count} jobs... I'm tailoring your resume for each position to maximize your chances.`
    );

    // Fire bulk resume generation in background for the first job
    const firstJob = jobs[0];
    if (firstJob?._apiData?.url && firstJob?._apiData?.jobId) {
      try {
        const res = await fetch("/api/resume/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: firstJob._apiData.url,
            jobId: firstJob._apiData.jobId,
            jobName: firstJob._apiData.jobName || firstJob.title,
            companyName: firstJob._apiData.companyName || firstJob.company,
            jobDetails: firstJob._apiData.jobDetails || firstJob.description,
            location: firstJob._apiData.location || firstJob.location,
          }),
        });
        const data = await res.json();
        if (data.html) {
          setResumeData({
            html: data.html,
            highlights: [],
            pdfFileName: data.pdfFileName,
            jobTitle: firstJob.title,
            company: firstJob.company,
            threeExplanations: data.threeExplanations,
          });
        }
      } catch (err) {
        console.error("Bulk resume generation failed:", err);
      }
    }

    addBotMessage(
      "Here's a preview of how I adapted your resume for the top match:",
      {
        customComponent: (
          <ResumePreviewCard
            jobTitle={firstJob?.title}
            company={firstJob?.company}
            highlights={resumeData?.highlights}
          />
        ),
      }
    );
    addBotMessage(
      `All done! I've submitted ${count} tailored applications.`,
      {
        customComponent: <ApplicationStatusCard jobCount={count} />,
      }
    );
    addBotMessage(
      "Would you like me to email the hiring managers directly? A personalized message can significantly increase your response rate."
    );
    setSuggestions([
      "Yes, email all hiring managers",
      "No thanks, just the applications",
    ]);
  }, [addBotMessage, jobs, resumeData?.highlights]);

  // --- Email all ---
  const handleEmailAll = useCallback(async () => {
    const count = jobs.length;
    setJobs((prev) =>
      prev.map((j) => ({
        ...j,
        status: { ...j.status, emailSent: true, emailSentAt: "just now" },
      }))
    );
    setSuggestions([]);
    addBotMessage(
      `Sending personalized emails to hiring managers at all ${count} companies...`
    );
    addBotMessage(
      "Done! I've sent a tailored email to each hiring manager highlighting why you're a great fit.",
      {
        customComponent: (
          <ApplicationStatusCard jobCount={count} emailsSent={true} />
        ),
      }
    );
    addBotMessage(
      "I'll notify you as soon as any hiring manager responds. Anything else I can help with?"
    );
    setSuggestions(["Find more jobs", "Help me prep for interviews"]);
  }, [addBotMessage, jobs.length]);

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

      // Selection-based actions
      if (lower.includes("apply to selected") || lower.includes("apply for selected")) {
        if (selectedJobs.length > 0) {
          setIsTyping(false);
          const targetJobs = selectedJobs.filter((j) => !j.status.applied);
          setJobs((prev) =>
            prev.map((j) =>
              selectedJobIds.has(j.id)
                ? { ...j, status: { ...j.status, applied: true, appliedAt: "just now" } }
                : j
            )
          );
          clearSelection();
          addBotMessage(
            `Applying to ${targetJobs.length} selected job${targetJobs.length !== 1 ? "s" : ""}... I'm tailoring your resume for each position.`
          );
          addBotMessage(
            `Done! I've submitted ${targetJobs.length} tailored applications.`,
            { customComponent: <ApplicationStatusCard jobCount={targetJobs.length} /> }
          );
          setSuggestions(["Yes, email all hiring managers", "Find more jobs"]);
          return;
        }
      }
      if (lower.includes("email hms for selected") || lower.includes("email hiring managers for selected")) {
        if (selectedJobs.length > 0) {
          setIsTyping(false);
          const count = selectedJobs.length;
          setJobs((prev) =>
            prev.map((j) =>
              selectedJobIds.has(j.id)
                ? { ...j, status: { ...j.status, emailSent: true, emailSentAt: "just now" } }
                : j
            )
          );
          clearSelection();
          addBotMessage(`Sending personalized emails to hiring managers at ${count} selected companies...`);
          addBotMessage(
            "Done! I've sent a tailored email to each hiring manager.",
            { customComponent: <ApplicationStatusCard jobCount={count} emailsSent={true} /> }
          );
          setSuggestions(["Find more jobs", "Help me prep for interviews"]);
          return;
        }
      }
      if (lower.includes("match resume for selected")) {
        if (selectedJobs.length > 0) {
          setIsTyping(false);
          const snapshot = [...selectedJobs];
          clearSelection();
          await handleMatchResumeForSelected(snapshot);
          return;
        }
      }

      if (
        lower.includes("apply for all") ||
        lower.includes("apply to all")
      ) {
        setIsTyping(false);
        await handleApplyAll();
        return;
      }
      if (
        lower.includes("email all hiring") ||
        lower.includes("yes, email all") ||
        lower.includes("email all")
      ) {
        setIsTyping(false);
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

        // Update chat history
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content },
          { role: "assistant", content: data.botMessage },
        ]);

        // Dispatch based on actionType
        const debugInfo = data._debug;
        switch (data.actionType) {
          case "show_jobs": {
            if (data.data?.jobs && data.data.jobs.length > 0) {
              const incomingJobs = data.data.jobs;
              const incomingTotal = data.data.totalJobs || incomingJobs.length;
              setJobs(incomingJobs);
              setTotalJobs(incomingTotal);
              setShowJobPanel(true);

              if (incomingJobs.length <= 5) {
                // Inline rich job cards in chat — short message
                const shortMsg = `I found ${incomingTotal} matching job${incomingTotal !== 1 ? "s" : ""} for you. Here are the top results:`;
                addBotMessage(shortMsg, {
                  customComponent: (
                    <ChatJobCards
                      jobs={incomingJobs}
                      totalJobs={incomingTotal}
                      onApply={handleApplySingle}
                      onEmailHM={handleOpenEmail}
                      onViewDetail={handleViewDetail}
                      onMatchResume={handleMatchResumeSingle}
                      matchingJobIds={matchingJobIds}
                    />
                  ),
                }, debugInfo);
              } else {
                // >5 jobs: short text only, jobs visible in right panel
                const shortMsg = `I found ${incomingTotal} matching jobs for you. Browse them in the panel on the right.`;
                addBotMessage(shortMsg, undefined, debugInfo);
              }
            } else {
              addBotMessage(data.botMessage, undefined, debugInfo);
            }
            break;
          }
          case "show_resume": {
            if (data.data?.resume) {
              setResumeData(data.data.resume);
              addBotMessage(data.botMessage, {
                customComponent: (
                  <ResumePreviewCard
                    jobTitle={data.data.resume.jobTitle}
                    company={data.data.resume.company}
                    highlights={data.data.resume.highlights}
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
                customComponent: <ApplicationStatusCard jobCount={count} />,
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
                customComponent: (
                  <ApplicationStatusCard jobCount={count} emailsSent={true} />
                ),
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
      handleEmailAll,
      handleApplySingle,
      handleSave,
      handleViewDetail,
      handleOpenEmail,
      handleRemoveJob,
      handleMatchResumeForSelected,
      userStatus,
      selectedJobs,
      selectedJobIds,
      clearSelection,
    ]
  );

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

        setChatHistory([
          { role: "user", content: initialQuery },
          { role: "assistant", content: data.botMessage },
        ]);

        const debugInfo = data._debug;
        switch (data.actionType) {
          case "show_jobs": {
            if (data.data?.jobs && data.data.jobs.length > 0) {
              const incomingJobs = data.data.jobs;
              const incomingTotal = data.data.totalJobs || incomingJobs.length;
              setJobs(incomingJobs);
              setTotalJobs(incomingTotal);
              setShowJobPanel(true);

              if (incomingJobs.length <= 5) {
                addBotMessage(
                  `I found ${incomingTotal} matching job${incomingTotal !== 1 ? "s" : ""} for you. Here are the top results:`,
                  {
                    customComponent: (
                      <ChatJobCards
                        jobs={incomingJobs}
                        totalJobs={incomingTotal}
                        onApply={handleApplySingle}
                        onEmailHM={handleOpenEmail}
                        onViewDetail={handleViewDetail}
                        onMatchResume={handleMatchResumeSingle}
                        matchingJobIds={matchingJobIds}
                      />
                    ),
                  },
                  debugInfo
                );
              } else {
                addBotMessage(
                  `I found ${incomingTotal} matching jobs for you. Browse them in the panel on the right.`,
                  undefined,
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/50 bg-muted/30 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4">
          <span className="font-semibold text-sm">PitchMeAI</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-1 flex-col min-h-0">
          <div className="p-3 shrink-0">
            <button
              onClick={handleNewConversation}
              className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              New Conversation
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 space-y-1">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => {
                  if (convo.id === activeConversationId) return;
                  saveCurrentConversation();
                  loadConversation(convo);
                }}
                className={`rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors truncate ${
                  convo.id === activeConversationId
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {convo.title}
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground/60 text-center">
                Your conversations will appear here
              </p>
            )}
          </nav>
          {/* Bottom links — pinned to bottom */}
          <div className="shrink-0 border-t border-border/50 p-3 space-y-1">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>
              My Applications
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              Settings
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
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
          </button>
          <h1 className="text-sm font-medium truncate flex-1">
            PitchMeAI
          </h1>
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
        </div>

        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="mx-auto max-w-2xl space-y-4 p-4">
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
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <ChatMessage
                message={{ id: "typing", role: "bot", content: "", isTyping: true }}
              />
            )}
          </div>
        </ScrollArea>

        <div className="shrink-0 mx-auto w-full max-w-2xl">
          <ChatInput
            onSend={handleUserMessage}
            onFileUpload={handleFileUpload}
            disabled={isTyping}
            suggestions={suggestions}
            selectedJobs={selectedJobs}
            onClearSelection={clearSelection}
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
          onEmailHM={handleOpenEmail}
          onRemoveJob={handleRemoveJob}
          onClose={() => setShowJobPanel(false)}
          onMatchResume={handleMatchResumeSingle}
          matchingJobIds={matchingJobIds}
          selectedJobIds={selectedJobIds}
          onToggleSelect={toggleJobSelection}
          onSelectAll={selectAllJobs}
          onClearSelection={clearSelection}
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
