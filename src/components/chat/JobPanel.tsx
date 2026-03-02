"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { JobCard } from "./JobCard";
import { Job } from "./jobData";

type SortOption = "relevance" | "recent" | "near-me";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  recent: "Recently posted",
  "near-me": "Near me",
};

const PAGE_SIZE = 25;

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
  const [sort, setSort] = useState<SortOption>("relevance");
  const [page, setPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sortedJobs = useMemo(() => {
    const copy = [...jobs];
    if (sort === "recent") {
      // Mock: reverse so "1 day ago" comes first (lower IDs posted more recently for some)
      copy.sort((a, b) => {
        const order: Record<string, number> = {
          "1 day ago": 0, "2 days ago": 1, "3 days ago": 2, "4 days ago": 3,
          "5 days ago": 4, "6 days ago": 5, "1 week ago": 6,
        };
        return (order[a.postedDate] ?? 7) - (order[b.postedDate] ?? 7);
      });
    } else if (sort === "near-me") {
      // Mock: prioritize San Francisco, then other CA, then nearby states
      copy.sort((a, b) => {
        const nearScore = (loc: string) => {
          if (loc.includes("San Francisco")) return 0;
          if (loc.includes("Los Gatos") || loc.includes("CA")) return 1;
          if (loc.includes("Seattle") || loc.includes("Denver") || loc.includes("Austin")) return 2;
          if (loc.includes("New York") || loc.includes("Cambridge")) return 3;
          if (loc.includes("Remote")) return 4;
          return 5;
        };
        return nearScore(a.location) - nearScore(b.location);
      });
    }
    // "relevance" is default order (by matchPercent, already sorted)
    return copy;
  }, [jobs, sort]);

  const totalPages = Math.ceil(sortedJobs.length / PAGE_SIZE);
  const pageJobs = sortedJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allApplied = jobs.every((j) => j.status.applied);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToPage = useCallback(
    (p: number) => {
      setPage(p);
      scrollToTop();
    },
    [scrollToTop]
  );

  return (
    <aside className="hidden lg:flex w-96 flex-col border-l border-border/50 bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 px-4 pt-3 pb-3 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Matching Jobs</h2>
            <p className="text-[11px] text-muted-foreground">
              {sortedJobs.length} of {totalJobs} matches
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

        {/* Sort filters */}
        <div className="flex gap-1.5">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setSort(key);
                setPage(0);
                scrollToTop();
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                sort === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="space-y-2 p-3">
          {pageJobs.map((job) => (
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
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 shrink-0">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-[11px] text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </aside>
  );
}
