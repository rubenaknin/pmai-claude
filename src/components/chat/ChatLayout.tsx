"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { JobListings } from "./JobListings";
import { ApplicationStatusCard } from "./ApplicationStatusCard";
import { ResumePreviewCard } from "./ResumePreviewCard";

const MOCK_CONVERSATIONS = [
  { id: "1", title: "Job Search — Frontend Engineer", active: true },
  { id: "2", title: "Resume Review", active: false },
  { id: "3", title: "Interview Prep — DataDrive", active: false },
];

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "bot",
  content:
    "Hi! I'm your PitchMeAI assistant. I can help you find jobs, tailor your resume, apply automatically, and email hiring managers. Upload your resume or tell me what role you're looking for!",
};

type StepId =
  | "start"
  | "resume-received"
  | "jobs-shown"
  | "applied"
  | "email-prompt"
  | "email-sent"
  | "done";

export function ChatLayout() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [step, setStep] = useState<StepId>("start");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "I'm looking for frontend engineer roles",
    "Here's my resume — find jobs for me",
    "Help me tailor my resume",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const addBotMessage = useCallback(
    async (content: string, extra?: Partial<Message>, delay = 1500) => {
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, delay));
      setIsTyping(false);
      const msg: Message = {
        id: `bot-${Date.now()}-${Math.random()}`,
        role: "bot",
        content,
        ...extra,
      };
      setMessages((prev) => [...prev, msg]);
      await new Promise((r) => setTimeout(r, 200));
      return msg;
    },
    []
  );

  const handleUserMessage = useCallback(
    async (content: string) => {
      if (isTyping) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setSuggestions([]);

      if (step === "start") {
        // Step 1: User sends resume or describes themselves
        await addBotMessage(
          "Thanks! I'm parsing your resume and matching you with relevant positions..."
        );
        await addBotMessage(
          "Great news — I found 20 jobs that match your profile! Here are your top matches. You can apply to individual jobs or apply to all at once.",
          {
            customComponent: (
              <JobListings
                onApplyAll={() => handleApplyAll()}
                onApplySingle={(jobId) => handleApplySingle(jobId)}
              />
            ),
          },
          2000
        );
        setStep("jobs-shown");
        setSuggestions(["Apply for all", "Tell me more about the top match"]);
      } else if (step === "jobs-shown") {
        await handleApplyAll();
      } else if (step === "applied" || step === "email-prompt") {
        // Step 3: User confirms email
        await handleEmailSend();
      } else if (step === "email-sent" || step === "done") {
        await addBotMessage(
          "I'm on it! I'll also keep monitoring new job postings. Whenever a new job matches your profile, I'll send you an email so you can decide if you'd like me to apply. You'll never miss an opportunity!"
        );
        setStep("done");
        setSuggestions([]);
      }
    },
    [isTyping, step, addBotMessage]
  );

  const handleApplyAll = useCallback(async () => {
    setSuggestions([]);
    await addBotMessage(
      "Applying to all 5 jobs... I'm tailoring your resume for each position to maximize your chances."
    );
    await addBotMessage(
      "I've also prepared a preview of how your resume was adapted for the top match:",
      { customComponent: <ResumePreviewCard /> },
      1500
    );
    await addBotMessage(
      "All done! I've submitted 5 tailored applications. Here's your status:",
      { customComponent: <ApplicationStatusCard jobCount={5} /> },
      1500
    );
    await addBotMessage(
      "Would you like me to email the hiring managers directly? A personalized message can significantly increase your response rate."
    );
    setStep("applied");
    setSuggestions(["Yes, email all hiring managers", "No thanks, just the applications"]);
  }, [addBotMessage]);

  const handleApplySingle = useCallback(
    async (jobId: string) => {
      void jobId;
      // Individual apply feedback is handled by the JobCard button state
    },
    []
  );

  const handleEmailSend = useCallback(async () => {
    setSuggestions([]);
    await addBotMessage(
      "Sending personalized emails to hiring managers at all 5 companies..."
    );
    await addBotMessage(
      "Done! I've sent a tailored email to each hiring manager highlighting why you're a great fit. Here's your updated status:",
      {
        customComponent: (
          <ApplicationStatusCard jobCount={5} emailsSent={true} />
        ),
      },
      2000
    );
    await addBotMessage(
      "I'll notify you as soon as any hiring manager responds. I'll also keep watching for new matching jobs and proactively let you know via email when I find something great. Anything else I can help with?"
    );
    setStep("email-sent");
    setSuggestions(["Find more jobs", "Help me prep for interviews"]);
  }, [addBotMessage]);

  // Handle initial query from homepage
  useEffect(() => {
    if (initialQueryHandled.current) return;
    const q = searchParams.get("q");
    if (q) {
      initialQueryHandled.current = true;
      // Small delay so the UI renders first
      setTimeout(() => handleUserMessage(q), 500);
    }
  }, [searchParams, handleUserMessage]);

  return (
    <div className="flex h-dvh bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border/50 bg-muted/30 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              P
            </div>
            <span className="font-semibold text-sm">PitchMeAI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3">
          <button className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
            New Conversation
          </button>
        </div>
        <nav className="px-3 space-y-1">
          {MOCK_CONVERSATIONS.map((convo) => (
            <div
              key={convo.id}
              className={`rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                convo.active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {convo.title}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex h-14 items-center gap-3 border-b border-border/50 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <h1 className="text-sm font-medium truncate">
            Job Search — Frontend Engineer
          </h1>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="mx-auto max-w-2xl space-y-4 p-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <ChatMessage
                message={{
                  id: "typing",
                  role: "bot",
                  content: "",
                  isTyping: true,
                }}
              />
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="mx-auto w-full max-w-2xl">
          <ChatInput
            onSend={handleUserMessage}
            disabled={isTyping}
            suggestions={suggestions}
          />
        </div>
      </div>
    </div>
  );
}
