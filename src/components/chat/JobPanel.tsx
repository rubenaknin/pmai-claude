"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { JobCard } from "./JobCard";
import { Job } from "./jobData";

const PAGE_SIZE = 10;

interface JobPanelProps {
  jobs: Job[];
  totalJobs: number;
  onApply: (jobId: string) => void;
  onApplyAll: () => void;
  onViewDetail: (job: Job) => void;
  onSave: (jobId: string) => void;
  onEmailHM: (job: Job) => void;
  onClose: () => void;
}

export function JobPanel({
  jobs,
  totalJobs,
  onApply,
  onApplyAll,
  onViewDetail,
  onSave,
  onEmailHM,
  onClose,
}: JobPanelProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allApplied = jobs.every((j) => j.status.applied);
  const visibleJobs = jobs.slice(0, visibleCount);
  const hasMore = visibleCount < jobs.length;

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, jobs.length));
    }
  }, [hasMore, jobs.length]);

  return (
    <aside className="hidden lg:flex w-96 flex-col border-l border-border/50 bg-background overflow-hidden">
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
            disabled={allApplied}
          >
            {allApplied ? "All Applied" : "Apply for all"}
          </Button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="space-y-2 p-3">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={onApply}
              onViewDetail={onViewDetail}
              onSave={onSave}
              onEmailHM={onEmailHM}
              compact
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, jobs.length))}
              className="flex w-full items-center justify-center py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Load more jobs...
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
