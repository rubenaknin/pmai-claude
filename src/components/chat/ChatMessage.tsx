"use client";

import { ReactNode, useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TypingIndicator } from "./TypingIndicator";
import { NetworkDebugPanel } from "./NetworkDebugPanel";
import type { Job } from "./jobData";
import type { DebugInfo } from "@/lib/types";

/** Animated dots that cycle: . → .. → ... */
function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => (c % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span className="inline-block w-[1em] text-left">{".".repeat(count)}</span>;
}

/** Render inline **bold** markdown as <strong> elements */
function renderInlineBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

export type MessageRole = "bot" | "user" | "action";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  customComponent?: ReactNode;
  customComponentMeta?: { type: "chatJobCards" | "applicationStatusCard"; jobIds: string[]; totalJobs: number };
  isTyping?: boolean;
  _debug?: DebugInfo;
  jobsSnapshot?: { jobs: Job[]; totalJobs: number };
}

interface ChatMessageProps {
  message: Message;
  liveCustomComponent?: ReactNode;
  onLoadJobsSnapshot?: (jobs: Job[], totalJobs: number) => void;
  onStop?: () => void;
}

export function ChatMessage({ message, liveCustomComponent, onLoadJobsSnapshot, onStop }: ChatMessageProps) {
  // Action log messages — subtle centered line
  if (message.role === "action") {
    // Show animated dots for in-progress actions (present participle verbs)
    const isInProgress = /\b(Applying|Auto-applying|Matching|Drafting|Sending|Generating)\b/.test(message.content);
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-[11px] italic text-muted-foreground/60">
          {message.content}{isInProgress && <AnimatedDots />}
        </span>
      </div>
    );
  }

  const isBot = message.role === "bot";

  return (
    <div
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            N
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${
          isBot ? "items-start" : "items-end"
        }`}
      >
        {(message.content || message.isTyping) && (
          <div
            className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isBot
                ? "bg-muted text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm"
            }`}
          >
            {message.isTyping ? <TypingIndicator /> : renderInlineBold(message.content)}
            {isBot && onStop && message.content.includes("then I'll auto-apply") && (
              <button
                onClick={onStop}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
                title="Stop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            )}
          </div>
        )}
        {liveCustomComponent || message.customComponent}
        {message.jobsSnapshot && onLoadJobsSnapshot && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 mt-1 gap-1.5"
            onClick={() =>
              onLoadJobsSnapshot(
                message.jobsSnapshot!.jobs,
                message.jobsSnapshot!.totalJobs
              )
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="3" y="3" rx="1" /></svg>
            Show jobs ({message.jobsSnapshot.jobs.length})
          </Button>
        )}
        {isBot && message._debug && (
          <NetworkDebugPanel debug={message._debug} />
        )}
      </div>
      {!isBot && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
