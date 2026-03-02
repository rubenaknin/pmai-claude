"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDERS = [
  "Upload my resume and find matching jobs...",
  "I'm a senior engineer looking for roles in NYC...",
  "Tailor my resume for a product manager role...",
  "Apply to all matching jobs for me...",
  "Email hiring managers at top tech companies...",
];

export function Hero() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [value, setValue] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const current = PLACEHOLDERS[placeholderIndex];

    if (!isDeleting) {
      if (displayedPlaceholder.length < current.length) {
        const timeout = setTimeout(() => {
          setDisplayedPlaceholder(
            current.slice(0, displayedPlaceholder.length + 1)
          );
        }, 40);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => setIsDeleting(true), 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (displayedPlaceholder.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1));
        }, 25);
        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      }
    }
  }, [displayedPlaceholder, isDeleting, placeholderIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-28 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--color-primary)/5%,transparent)]" />
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative rounded-full px-3 py-1 text-sm text-muted-foreground ring-1 ring-border">
            AI-powered job applications — now in beta
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your AI Job Application Assistant
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Upload your resume, and PitchMeAI finds matching jobs, tailors your
          resume for each one, applies, and emails hiring managers — all
          automatically.
        </p>

        {/* Chat-style window — single frame */}
        <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-2xl">
          <div className="rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                N
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Nikki, your assistant
              </span>
            </div>

            {/* Input + resume hint in one section */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={displayedPlaceholder}
                  rows={2}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 sm:text-base leading-relaxed"
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
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
                    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                    <path d="m21.854 2.147-10.94 10.939" />
                  </svg>
                </button>
              </div>
              {/* Resume hint at bottom */}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>Recommended: drop your resume here</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Type a message or upload your resume to start — you&apos;ll be taken
            to the full chat experience
          </p>
        </form>
      </div>
    </section>
  );
}
