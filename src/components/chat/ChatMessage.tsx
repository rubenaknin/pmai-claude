"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TypingIndicator } from "./TypingIndicator";
import { ResumePreviewCard } from "./ResumePreviewCard";
import { ApplicationStatusCard } from "./ApplicationStatusCard";

export type MessageRole = "bot" | "user";
export type MessageAttachment = "resume-preview" | "application-status";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  attachment?: MessageAttachment;
  isTyping?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === "bot";

  return (
    <div
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            P
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`flex flex-col gap-2 max-w-[80%] sm:max-w-[70%] ${
          isBot ? "items-start" : "items-end"
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isBot
              ? "bg-muted text-foreground rounded-tl-sm"
              : "bg-primary text-primary-foreground rounded-tr-sm"
          }`}
        >
          {message.isTyping ? <TypingIndicator /> : message.content}
        </div>
        {message.attachment === "resume-preview" && <ResumePreviewCard />}
        {message.attachment === "application-status" && (
          <ApplicationStatusCard />
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
