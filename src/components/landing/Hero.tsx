"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDERS = [
  "Find me senior engineer roles in NYC...",
  "Tailor my resume for a product manager role...",
  "Apply to all matching jobs for me...",
  "Email hiring managers at top tech companies...",
  "Search for remote data scientist positions...",
];

export function Hero() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [value, setValue] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = PLACEHOLDERS[placeholderIndex];

    if (!isDeleting) {
      if (displayedPlaceholder.length < current.length) {
        const timeout = setTimeout(() => {
          setDisplayedPlaceholder(current.slice(0, displayedPlaceholder.length + 1));
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

  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--color-primary)/5%,transparent)]" />
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative rounded-full px-3 py-1 text-sm text-muted-foreground ring-1 ring-border">
            AI-powered job applications — now in beta
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your AI Job Application Assistant
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          PitchMeAI crafts a unique resume for every job and reaches out to
          hiring managers on your behalf. Stop sending generic applications —
          start getting interviews.
        </p>
        <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-xl">
          <div
            className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-lg transition-shadow focus-within:shadow-xl focus-within:ring-2 focus-within:ring-ring/20 cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="pl-3 text-muted-foreground">
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={displayedPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 sm:text-base"
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
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Try it — type anything and start chatting with your AI assistant
          </p>
        </form>
      </div>
    </section>
  );
}
