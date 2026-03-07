"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDERS = [
  "Upload my resume and find matching jobs...",
  "I'm a senior engineer looking for roles in NYC...",
  "Tailor my resume for a product manager role...",
  "Apply to all matching jobs for me...",
  "Email hiring managers at top tech companies...",
];

const COMPANIES = [
  "Google",
  "Meta",
  "Stripe",
  "Airbnb",
  "Notion",
  "Vercel",
  "Netflix",
  "Shopify",
];

export function Hero() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Detect user's city from IP for location-based suggestion
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.city) setUserCity(data.city);
      })
      .catch(() => { /* fallback: no location */ });
  }, []);

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

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        // Build a search query from resume content
        const query = "Find me jobs that match my resume";
        router.push(`/chat?q=${encodeURIComponent(query)}`);
      } else {
        setIsUploading(false);
        alert(data.error || "Could not process your resume. Please try a different file.");
      }
    } catch {
      setIsUploading(false);
      alert("Upload failed. Please check your connection and try again.");
    }
  }, [router]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-32 sm:pb-24 lg:px-8">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-emerald-100/60 blur-[120px] animate-float-slow" />
        <div className="absolute top-20 -right-60 h-[500px] w-[500px] rounded-full bg-teal-100/50 blur-[120px] animate-float-medium" />
        <div className="absolute -bottom-40 left-1/4 h-[450px] w-[450px] rounded-full bg-cyan-50/50 blur-[100px] animate-float-fast" />
        <div className="absolute top-1/2 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-50/40 blur-[80px] animate-float-medium" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Badge */}
        <div
          className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 ring-1 ring-emerald-200/60"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          AI-powered job applications — now in beta
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up text-5xl font-bold tracking-tight leading-[1.1] text-gray-900 sm:text-7xl"
          style={{ animationDelay: "100ms" }}
        >
          Your AI Job Application{" "}
          <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
            Assistant
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-in-up mt-6 text-lg leading-relaxed text-gray-500 sm:text-xl max-w-2xl mx-auto"
          style={{ animationDelay: "200ms" }}
        >
          Upload your resume, and PitchMeAI finds matching jobs, tailors your
          resume for each one, applies, and emails hiring managers — all
          automatically.
        </p>

        {/* Chat window */}
        <div
          className="animate-fade-in-up mt-12 mx-auto max-w-2xl"
          style={{ animationDelay: "400ms" }}
        >
          <form onSubmit={handleSubmit} className="relative">
            {/* Glow behind the card */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-emerald-400/20 via-teal-400/15 to-cyan-400/20 blur-2xl animate-glow-pulse" />

            {/* Card */}
            <div
              className="relative rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-200/60 overflow-hidden"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drop overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-emerald-400/50 bg-emerald-50/50 px-10 py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                    <p className="text-sm font-medium text-emerald-600">Drop your resume here</p>
                    <p className="text-xs text-gray-400">PDF, DOC, or DOCX</p>
                  </div>
                </div>
              )}
              {/* Upload spinner overlay */}
              {isUploading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-gray-500">Uploading resume...</p>
                  </div>
                </div>
              )}
              {/* Header */}
              <div className="border-b border-gray-100 px-5 py-2" />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Input area */}
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={displayedPlaceholder}
                    rows={2}
                    className="flex-1 resize-none bg-transparent text-gray-900 text-sm outline-none placeholder:text-gray-400/70 sm:text-base leading-relaxed"
                  />
                  <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
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
                {/* Suggestion pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/chat?q=${encodeURIComponent(userCity ? `Find me a job in ${userCity}` : "Find me a job")}`)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                  >
                    {userCity ? `Find me a job in ${userCity}` : "Find me a job"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                  >
                    Upload my resume
                  </button>
                </div>

                {/* Resume hint — now clickable */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer"
                >
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
                  <span>Attach or drop your resume here</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <p
          className="animate-fade-in-up mt-4 text-xs text-gray-400"
          style={{ animationDelay: "500ms" }}
        >
          Type a message or upload your resume to start — you&apos;ll be taken
          to the full chat experience
        </p>

        {/* Social proof */}
        <div
          className="animate-fade-in-up mt-20 flex flex-col items-center gap-5"
          style={{ animationDelay: "700ms" }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">
            Our users have landed roles at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {COMPANIES.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold text-gray-300 tracking-wide"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
