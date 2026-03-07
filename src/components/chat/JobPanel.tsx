"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { JobCard } from "./JobCard";
import { Job } from "./jobData";

type SortOption = "relevance" | "recent" | "near-me";
type FilterOption = "resume-generated" | "no-resume" | "email-sent" | "applied";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  recent: "Recently posted",
  "near-me": "Near me",
};

const PAGE_SIZE = 10;

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
  onViewResume?: (job: Job) => void;
  matchingJobIds?: Set<string>;
  applyErrorJobIds?: Set<string>;
  applyingJobIds?: Set<string>;
  applyRetriedJobIds?: Set<string>;
  onCancelApply?: (jobId: string) => void;
  selfApplyJobIds?: Set<string>;
  onSelfApply?: (jobId: string) => void;
  onConfirmSelfApply?: (jobId: string) => void;
  emailGeneratedJobIds?: Set<string>;
  onSeeEmail?: (job: Job) => void;
  selectedJobIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  highlightJobIds?: Set<string>;
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
  onViewResume,
  matchingJobIds,
  applyErrorJobIds,
  applyingJobIds,
  applyRetriedJobIds,
  onCancelApply,
  selfApplyJobIds,
  onSelfApply,
  onConfirmSelfApply,
  emailGeneratedJobIds,
  onSeeEmail,
  selectedJobIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  highlightJobIds,
}: JobPanelProps) {
  const [sort, setSort] = useState<SortOption>("relevance");
  const [activeFilters, setActiveFilters] = useState<Set<FilterOption>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter counts + visibility
  const filterCounts = useMemo(() => ({
    "resume-generated": jobs.filter((j) => j.status.resumeGenerated).length,
    "no-resume": jobs.filter((j) => !j.status.resumeGenerated).length,
    "email-sent": jobs.filter((j) => j.status.emailSent).length,
    applied: jobs.filter((j) => j.status.applied).length,
  }), [jobs]);

  // Only show the filter dropdown when at least one job has had an action taken
  const hasAnyAction = useMemo(() =>
    jobs.some((j) => j.status.resumeGenerated || j.status.emailSent || j.status.applied),
    [jobs]
  );

  const FILTER_LABELS: Record<FilterOption, string> = {
    "resume-generated": "Resume generated",
    "no-resume": "No resume",
    "email-sent": "Email sent",
    applied: "Applied",
  };

  const toggleFilter = useCallback((f: FilterOption) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
    setPage(0);
  }, []);

  const filteredAndSortedJobs = useMemo(() => {
    // Filter first — if multiple filters are active, show union (OR logic)
    let filtered = [...jobs];
    if (activeFilters.size > 0) {
      filtered = filtered.filter((j) => {
        if (activeFilters.has("resume-generated") && j.status.resumeGenerated) return true;
        if (activeFilters.has("no-resume") && !j.status.resumeGenerated) return true;
        if (activeFilters.has("email-sent") && j.status.emailSent) return true;
        if (activeFilters.has("applied") && j.status.applied) return true;
        return false;
      });
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
  }, [jobs, sort, activeFilters]);

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
    <aside className="hidden lg:flex w-[480px] flex-col border-l border-border/50 bg-background overflow-hidden">
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

        {/* Filter dropdown — only visible when at least one job has an action */}
        {hasAnyAction && (
          <div className="flex items-center gap-1.5">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                    activeFilters.size > 0
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {activeFilters.size > 0 ? `Filters (${activeFilters.size})` : "Filter"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1.5" align="start" side="bottom">
                {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => {
                  const count = filterCounts[key];
                  const isActive = activeFilters.has(key);
                  // Hide filter options with 0 matches (except "no-resume" which is always relevant)
                  if (count === 0 && key !== "no-resume") return null;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleFilter(key)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/50"
                      }`}>
                        {isActive && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                      <span className="flex-1">{FILTER_LABELS[key]}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
                {activeFilters.size > 0 && (
                  <>
                    <div className="border-t border-border/30 my-1" />
                    <button
                      onClick={() => { setActiveFilters(new Set()); setPage(0); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left text-muted-foreground"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </PopoverContent>
            </Popover>
            {/* Show active filter tags */}
            {activeFilters.size > 0 && (
              <div className="flex gap-1 flex-wrap">
                {[...activeFilters].map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleFilter(f)}
                    className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] hover:bg-primary/20 transition-colors"
                  >
                    {FILTER_LABELS[f]}
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
              onViewResume={onViewResume}
              matchingJobIds={matchingJobIds}
              applyErrorJobIds={applyErrorJobIds}
              applyingJobIds={applyingJobIds}
              applyRetriedJobIds={applyRetriedJobIds}
              onCancelApply={onCancelApply}
              selfApplyJobIds={selfApplyJobIds}
              onSelfApply={onSelfApply}
              onConfirmSelfApply={onConfirmSelfApply}
              emailGeneratedJobIds={emailGeneratedJobIds}
              onSeeEmail={onSeeEmail}
              isSelected={selectedJobIds?.has(job.id)}
              onToggleSelect={onToggleSelect}
              compact
              highlightJobIds={highlightJobIds}
            />
          ))}
          {totalJobs > jobs.length && (
            <p className="text-[11px] text-muted-foreground/60 text-center py-2 px-3">
              Showing {jobs.length} of {totalJobs} jobs. Refine your search to see different results.
            </p>
          )}
        </div>
      </div>

      {/* Pagination — always visible */}
      <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 shrink-0">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page === 0}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Previous
        </button>
        <span className="text-[11px] text-muted-foreground">
          {totalPages > 1
            ? `Page ${page + 1} of ${totalPages} · ${filteredAndSortedJobs.length} jobs`
            : `${filteredAndSortedJobs.length} job${filteredAndSortedJobs.length !== 1 ? "s" : ""}`}
        </span>
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages - 1}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Next
        </button>
      </div>
    </aside>
  );
}
