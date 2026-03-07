"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

/** Render inline **bold** and [text](url) markdown as <strong> and <a> elements */
function renderInlineBold(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else if (match[2] && match[3]) {
      // Link
      parts.push(
        <a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">
          {match[2]}
        </a>
      );
    }
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
  botName?: string;
  botAvatarUrl?: string | null;
  onEditBot?: (name: string, avatarUrl: string | null) => void;
}

function BotAvatarEditor({ botName, botAvatarUrl, onEditBot, children }: { botName: string; botAvatarUrl: string | null; onEditBot: (name: string, avatarUrl: string | null) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(botName);
  const [avatarUrl, setAvatarUrl] = useState(botAvatarUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onEditBot(name || "Nora", avatarUrl || null);
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setName(botName); setAvatarUrl(botAvatarUrl || ""); } }}>
      <PopoverTrigger asChild>
        <button className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30" title="Customize assistant">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="start" side="right">
        <p className="text-xs font-medium">Customize assistant</p>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Nora"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Avatar</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Image URL or upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              title="Upload image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" variant="default" className="text-xs h-7" onClick={handleSave}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChatMessage({ message, liveCustomComponent, onLoadJobsSnapshot, onStop, botName, botAvatarUrl, onEditBot }: ChatMessageProps) {
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
  const displayName = botName || "Nora";
  const initial = displayName.charAt(0).toUpperCase();

  const avatarElement = (
    <Avatar className="h-8 w-8 shrink-0">
      {botAvatarUrl ? (
        <AvatarImage src={botAvatarUrl} alt={displayName} />
      ) : null}
      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
        {initial}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        onEditBot ? (
          <BotAvatarEditor botName={displayName} botAvatarUrl={botAvatarUrl ?? null} onEditBot={onEditBot}>
            {avatarElement}
          </BotAvatarEditor>
        ) : (
          avatarElement
        )
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
