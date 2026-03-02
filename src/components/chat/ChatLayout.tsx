"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

const MOCK_CONVERSATIONS = [
  { id: "1", title: "Senior Frontend Engineer — Acme Corp", active: true },
  { id: "2", title: "Full Stack Developer — StartupXYZ", active: false },
  { id: "3", title: "React Developer — BigCo", active: false },
];

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "bot",
  content:
    "Hi! I'm your PitchMe AI assistant. Upload your resume to get started, or tell me about the job you're targeting.",
};

type ConversationStep = {
  trigger: "any" | "confirm";
  messages: Message[];
  suggestions?: string[];
  delay?: number;
};

const CONVERSATION_FLOW: ConversationStep[] = [
  {
    trigger: "any",
    messages: [
      {
        id: "bot-2",
        role: "bot",
        content:
          "Great! I found the job posting for Senior Frontend Engineer at Acme Corp. Let me tailor your resume for this position...",
      },
      {
        id: "bot-3",
        role: "bot",
        content:
          "I've analyzed the job description and optimized your resume. Here's a preview of the tailored version:",
        attachment: "resume-preview",
      },
      {
        id: "bot-4",
        role: "bot",
        content:
          "Your resume has been tailored to highlight your React, TypeScript, and Next.js experience — exactly what they're looking for. Want me to apply and email the hiring manager?",
      },
    ],
    suggestions: ["Yes, apply and email!", "Let me review first"],
    delay: 1500,
  },
  {
    trigger: "confirm",
    messages: [
      {
        id: "bot-5",
        role: "bot",
        content:
          "Done! I've submitted your application to Acme Corp and sent a personalized email to Sarah Chen (Engineering Manager). Here's the status:",
        attachment: "application-status",
      },
      {
        id: "bot-6",
        role: "bot",
        content:
          "I'll notify you as soon as Sarah responds. Want me to find more matching jobs, or do you have another position in mind?",
      },
    ],
    suggestions: ["Find more jobs", "I have another job posting"],
    delay: 2000,
  },
  {
    trigger: "any",
    messages: [
      {
        id: "bot-7",
        role: "bot",
        content:
          "I'm searching for Senior Frontend Engineer roles that match your profile... This is a demo, but in the full version I'd scan job boards and present the best matches for you!",
      },
    ],
    suggestions: [],
    delay: 1500,
  },
];

export function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "I'm looking for a Senior Frontend Engineer role",
    "Here's a job posting I found",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const addBotMessages = useCallback(
    async (botMessages: Message[], delay: number) => {
      for (const msg of botMessages) {
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, delay));
        setIsTyping(false);
        setMessages((prev) => [...prev, msg]);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    },
    []
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (isTyping || step >= CONVERSATION_FLOW.length) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
      setSuggestions([]);

      const currentStep = CONVERSATION_FLOW[step];
      await addBotMessages(currentStep.messages, currentStep.delay ?? 1500);

      setSuggestions(currentStep.suggestions ?? []);
      setStep((prev) => prev + 1);
    },
    [isTyping, step, addBotMessages]
  );

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
            <span className="font-semibold text-sm">PitchMe AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3">
          <button className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <h1 className="text-sm font-medium truncate">
            Senior Frontend Engineer — Acme Corp
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
            onSend={handleSend}
            disabled={isTyping || step >= CONVERSATION_FLOW.length}
            suggestions={suggestions}
          />
        </div>
      </div>
    </div>
  );
}
