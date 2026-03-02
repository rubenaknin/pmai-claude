"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { JobCard, Job } from "./JobCard";

interface JobPanelProps {
  jobs: Job[];
  onApply: (jobId: string) => void;
  onApplyAll: () => void;
  appliedJobs: Set<string>;
  allApplied: boolean;
  onClose: () => void;
}

export function JobPanel({
  jobs,
  onApply,
  onApplyAll,
  appliedJobs,
  allApplied,
  onClose,
}: JobPanelProps) {
  const enrichedJobs = jobs.map((j) => ({
    ...j,
    applied: allApplied || appliedJobs.has(j.id),
  }));
  const isAllApplied = allApplied || appliedJobs.size === jobs.length;

  return (
    <aside className="hidden lg:flex w-96 flex-col border-l border-border/50 bg-background">
      {/* Panel header */}
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
        <div>
          <h2 className="text-sm font-semibold">Matching Jobs</h2>
          <p className="text-[11px] text-muted-foreground">
            {jobs.length} of 20 shown
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

      {/* Job list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {enrichedJobs.map((job) => (
            <JobCard key={job.id} job={job} onApply={onApply} compact />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
