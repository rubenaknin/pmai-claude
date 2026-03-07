"use client";

import { ChatJobCard } from "./ChatJobCard";
import { Job } from "./jobData";

interface ChatJobCardsProps {
  jobs: Job[];
  totalJobs: number;
  onApply: (jobId: string) => void;
  onEmailHM: (job: Job) => void;
  onViewDetail: (job: Job) => void;
  onMatchResume: (job: Job) => void;
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
  emailGeneratingJobIds?: Set<string>;
  onSeeEmail?: (job: Job) => void;
  highlightJobIds?: Set<string>;
}

export function ChatJobCards({
  jobs,
  totalJobs,
  onApply,
  onEmailHM,
  onViewDetail,
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
  emailGeneratingJobIds,
  onSeeEmail,
  highlightJobIds,
}: ChatJobCardsProps) {
  const displayed = jobs.slice(0, 5);
  const remaining = totalJobs - displayed.length;

  return (
    <div className="w-full space-y-2">
      <p className="text-xs text-muted-foreground">
        Top {displayed.length} of {totalJobs} matches
      </p>
      <div className="space-y-2">
        {displayed.map((job) => (
          <ChatJobCard
            key={job.id}
            job={job}
            onApply={onApply}
            onEmailHM={onEmailHM}
            onViewDetail={onViewDetail}
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
            emailGeneratingJobIds={emailGeneratingJobIds}
            onSeeEmail={onSeeEmail}
            highlightJobIds={highlightJobIds}
          />
        ))}
      </div>
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          +{remaining} more in the side panel &rarr;
        </p>
      )}
    </div>
  );
}
