"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JobCard, Job } from "./JobCard";

interface JobListingsProps {
  jobs: Job[];
  onApply: (jobId: string) => void;
  onApplyAll: () => void;
  appliedJobs: Set<string>;
  allApplied: boolean;
}

export function JobListings({
  jobs,
  onApply,
  onApplyAll,
  appliedJobs,
  allApplied,
}: JobListingsProps) {
  const [expanded, setExpanded] = useState(false);
  const isAllApplied = allApplied || appliedJobs.size === jobs.length;

  const enrichedJobs = jobs.map((j) => ({
    ...j,
    applied: allApplied || appliedJobs.has(j.id),
  }));

  // Show first 3, rest are behind expand
  const visibleJobs = expanded ? enrichedJobs : enrichedJobs.slice(0, 3);
  const hiddenCount = enrichedJobs.length - 3;

  return (
    <div className="w-full space-y-2 lg:hidden">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Top {jobs.length} of 20 matches
        </p>
        <Button
          size="sm"
          className="text-xs h-7"
          onClick={onApplyAll}
          disabled={isAllApplied}
        >
          {isAllApplied ? "All Applied" : "Apply for all"}
        </Button>
      </div>
      <div className="space-y-2">
        {visibleJobs.map((job) => (
          <JobCard key={job.id} job={job} onApply={onApply} />
        ))}
      </div>
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
            <path d="m6 9 6 6 6-6" />
          </svg>
          Show {hiddenCount} more jobs
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
            <path d="m18 15-6-6-6 6" />
          </svg>
          Show less
        </button>
      )}
    </div>
  );
}
