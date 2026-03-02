"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { JobCard, Job } from "./JobCard";

const PAGE_SIZE = 10;

interface JobPanelProps {
  jobs: Job[];
  totalJobs: number;
  onApply: (jobId: string) => void;
  onApplyAll: () => void;
  appliedJobs: Set<string>;
  allApplied: boolean;
  onClose: () => void;
}

export function JobPanel({
  jobs,
  totalJobs,
  onApply,
  onApplyAll,
  appliedJobs,
  allApplied,
  onClose,
}: JobPanelProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const enrichedJobs = jobs.map((j) => ({
    ...j,
    applied: allApplied || appliedJobs.has(j.id),
  }));
  const isAllApplied = allApplied || appliedJobs.size === jobs.length;
  const visibleJobs = enrichedJobs.slice(0, visibleCount);
  const hasMore = visibleCount < enrichedJobs.length;

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasMore) return;
    // Load more when scrolled within 200px of the bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, jobs.length));
    }
  }, [hasMore, jobs.length]);

  return (
    <aside className="hidden lg:flex w-96 flex-col border-l border-border/50 bg-background overflow-hidden">
      {/* Panel header */}
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-4 shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Matching Jobs</h2>
          <p className="text-[11px] text-muted-foreground">
            {jobs.length} of {totalJobs} matches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={onApplyAll}
            disabled={isAllApplied}
          >
            {isAllApplied ? "All Applied" : "Apply for all"}
          </Button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Job list — isolated scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="space-y-2 p-3">
          {visibleJobs.map((job) => (
            <JobCard key={job.id} job={job} onApply={onApply} compact />
          ))}
          {hasMore && (
            <div className="py-3 text-center">
              <button
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(prev + PAGE_SIZE, jobs.length)
                  )
                }
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Load more jobs...
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
