"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { JobCard } from "./JobCard";
import { Job } from "./jobData";

type SortOption = "relevance" | "recent" | "near-me";
type FilterOption = "all" | "resume-generated" | "no-resume" | "email-sent" | "applied";

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
  onRemoveJob: (jobId: string, mode: "single" | "title" | "location") => void;
  onClose: () => void;
  onMatchResume?: (job: Job) => void;
  matchingJobIds?: Set<string>;
  selectedJobIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

export function JobPanel({
  jobs,
  totalJobs,
  onApply,
  onApplyAll,
  onViewDetail,
  onSave,
  onEmailHM,
  onRemoveJob,
  onClose,
  onMatchResume,
  matchingJobIds,
  selectedJobIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: JobPanelProps) {
  const [sort, setSort] = useState<SortOption>("relevance");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [page, setPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: jobs.length,
    "resume-generated": jobs.filter((j) => j.status.resumeGenerated).length,
    "no-resume": jobs.filter((j) => !j.status.resumeGenerated).length,
    "email-sent": jobs.filter((j) => j.status.emailSent).length,
    applied: jobs.filter((j) => j.status.applied).length,
  }), [jobs]);

  const FILTER_LABELS: Record<FilterOption, string> = {
    all: "All",
    "resume-generated": "Resume generated",
    "no-resume": "No resume",
    "email-sent": "Email sent",
    applied: "Applied",
  };

  const filteredAndSortedJobs = useMemo(() => {
    // Filter first
    let filtered = [...jobs];
    switch (filter) {
      case "resume-generated":
        filtered = filtered.filter((j) => j.status.resumeGenerated);
        break;
      case "no-resume":
        filtered = filtered.filter((j) => !j.status.resumeGenerated);
        break;
      case "email-sent":
        filtered = filtered.filter((j) => j.status.emailSent);
        break;
      case "applied":
        filtered = filtered.filter((j) => j.status.applied);
        break;
    }

    // Then sort
    const copy = filtered;
    if (sort === "recent") {
      copy.sort((a, b) => {
        const order: Record<string, number> = {
          "1 day ago": 0, "2 days ago": 1, "3 days ago": 2, "4 days ago": 3,
          "5 days ago": 4, "6 days ago": 5, "1 week ago": 6,
        };
        return (order[a.postedDate] ?? 7) - (order[b.postedDate] ?? 7);
      });
    } else if (sort === "near-me") {
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
    return copy;
  }, [jobs, sort, filter]);

  const totalPages = Math.ceil(filteredAndSortedJobs.length / PAGE_SIZE);
  const pageJobs = filteredAndSortedJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allApplied = jobs.every((j) => j.status.applied);
  const selectionCount = selectedJobIds?.size || 0;
  const hasSelection = selectionCount > 0;

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
              {filteredAndSortedJobs.length} of {totalJobs} matches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={onApplyAll}
              disabled={allApplied}
            >
              {allApplied
                ? "All Applied"
                : hasSelection
                ? `Apply selected (${selectionCount})`
                : "Apply for all"}
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Hide panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m10 15 3-3-3-3" /></svg>
            </button>
          </div>
        </div>

        {/* Selection controls + Sort filters */}
        <div className="flex items-center justify-between gap-2">
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

          {/* Selection controls */}
          {onToggleSelect && (
            <div className="flex items-center gap-1.5">
              {hasSelection && onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
              {onSelectAll && (
                <button
                  onClick={onSelectAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Select all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPage(0);
                scrollToTop();
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                filter === key
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {FILTER_LABELS[key]} ({filterCounts[key]})
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
              onRemoveJob={onRemoveJob}
              onMatchResume={onMatchResume}
              matchingJobIds={matchingJobIds}
              isSelected={selectedJobIds?.has(job.id)}
              onToggleSelect={onToggleSelect}
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
