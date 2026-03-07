"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Job } from "./jobData";

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload?: (file: File) => void;
  disabled?: boolean;
  suggestions?: string[];
  selectedJobs?: Job[];
  onClearSelection?: () => void;
}

export function ChatInput({
  onSend,
  onFileUpload,
  disabled,
  suggestions,
  selectedJobs,
  onClearSelection,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileUpload) {
        onFileUpload(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [onFileUpload]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const file = e.dataTransfer.files?.[0];
      if (file && onFileUpload) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  const handleSuggestionClick = (suggestion: string) => {
    // If it's an upload-related suggestion, open file picker instead
    const lower = suggestion.toLowerCase();
    if (
      onFileUpload &&
      (lower.includes("upload") && lower.includes("resume"))
    ) {
      fileInputRef.current?.click();
      return;
    }
    onSend(suggestion);
  };

  const hasSelection = selectedJobs && selectedJobs.length > 0;

  // When jobs are selected, show selection-specific suggestions with smart emphasis
  type SuggestionItem = { text: string; primary: boolean };
  const selectionSuggestions: SuggestionItem[] | null = hasSelection
    ? (() => {
        const noResume = selectedJobs.some((j) => !j.status.resumeGenerated);
        const allResumed = selectedJobs.every((j) => j.status.resumeGenerated);
        const notAllApplied = selectedJobs.some((j) => !j.status.applied);
        const allApplied = selectedJobs.every((j) => j.status.applied);

        return [
          {
            text: `Match resume for selected (${selectedJobs.length})`,
            primary: noResume && !allResumed,
          },
          {
            text: `Apply to selected (${selectedJobs.length})`,
            primary: allResumed && notAllApplied,
          },
          {
            text: `Email HMs for selected (${selectedJobs.length})`,
            primary: allApplied,
          },
        ];
      })()
    : null;

  const activeSuggestions: SuggestionItem[] | string[] | null = selectionSuggestions || suggestions || null;

  return (
    <div
      className={`border-t border-border/50 bg-background p-4 transition-colors ${
        isDragging ? "bg-primary/5 border-primary/30" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Drop overlay */}
      {isDragging && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 mb-3">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-primary/60"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
            <p className="text-sm text-primary/80 font-medium">Drop your resume here</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, or DOCX</p>
          </div>
        </div>
      )}

      {/* Selected jobs bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 mb-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          <span className="text-xs font-medium text-foreground flex-1">
            {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={onClearSelection}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      )}

      {/* Suggestions */}
      {activeSuggestions && activeSuggestions.length > 0 && !isDragging && (
        <div className="flex flex-wrap gap-2 mb-3">
          {activeSuggestions.map((suggestion) => {
            const text = typeof suggestion === "string" ? suggestion : suggestion.text;
            const isPrimary = typeof suggestion === "object" && suggestion.primary;
            return (
              <button
                key={text}
                onClick={() => handleSuggestionClick(text)}
                disabled={disabled}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                  isPrimary
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        {/* Attach button */}
        {onFileUpload && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Upload resume"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </Button>
        )}
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1"
          autoFocus
        />
        <Button onClick={handleSend} disabled={disabled || !value.trim()}>
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
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
            <path d="m21.854 2.147-10.94 10.939" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
