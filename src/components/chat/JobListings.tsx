"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JobCard } from "./JobCard";
import { Job } from "./jobData";

interface JobListingsProps {
  jobs: Job[];
  totalJobs: number;
  onApply: (jobId: string) => void;
  onApplyAll: () => void;
  onViewDetail: (job: Job) => void;
  onSave: (jobId: string) => void;
  onEmailHM: (job: Job) => void;
  onRemoveJob?: (jobId: string, mode: "single" | "title" | "location") => void;
}

export function JobListings({
  jobs,
  totalJobs,
  onApply,
  onApplyAll,
  onViewDetail,
  onSave,
  onEmailHM,
  onRemoveJob,
}: JobListingsProps) {
  const [visibleCount, setVisibleCount] = useState(3);
  const allApplied = jobs.every((j) => j.status.applied);
  const visibleJobs = jobs.slice(0, visibleCount);
  const hasMore = visibleCount < jobs.length;
  const hiddenCount = jobs.length - visibleCount;

  return (
    <div className="w-full space-y-2 lg:hidden">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Top {jobs.length} of {totalJobs} matches
        </p>
        <Button
          size="sm"
          className="text-xs h-7"
          onClick={onApplyAll}
          disabled={allApplied}
        >
          {allApplied ? "All Applied" : "Apply for all"}
        </Button>
      </div>
      <div className="space-y-2">
        {visibleJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onApply={onApply}
            onViewDetail={onViewDetail}
            onSave={onSave}
            onEmailHM={onEmailHM}
            onRemoveJob={onRemoveJob}
          />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setVisibleCount((prev) => Math.min(prev + 10, jobs.length))}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          Show {Math.min(hiddenCount, 10)} more jobs
        </button>
      )}
      {visibleCount > 3 && (
        <button
          onClick={() => setVisibleCount(3)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
          Collapse
        </button>
      )}
    </div>
  );
}
