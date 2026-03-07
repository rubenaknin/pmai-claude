"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Job } from "./jobData";

const LOGO_COLORS: Record<string, string> = {
  "Acme Corp": "bg-blue-600", TechFlow: "bg-purple-600", StartupXYZ: "bg-emerald-600",
  DataDrive: "bg-orange-600", CloudBase: "bg-cyan-600", Stripe: "bg-indigo-600",
  Notion: "bg-stone-800", Figma: "bg-pink-600", Vercel: "bg-black",
  Coinbase: "bg-blue-500", Shopify: "bg-green-600", Airbnb: "bg-rose-600",
  Twilio: "bg-red-600", Datadog: "bg-violet-600", Netflix: "bg-red-700",
  Atlassian: "bg-blue-700", HubSpot: "bg-orange-500", Lyft: "bg-fuchsia-600",
  Slack: "bg-amber-700", Squarespace: "bg-neutral-800", Plaid: "bg-teal-600",
  Retool: "bg-sky-600", Linear: "bg-indigo-500", Ramp: "bg-lime-700",
  Canva: "bg-cyan-500",
};

interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
  onViewDetail: (job: Job) => void;
  onSave: (jobId: string) => void;
  onEmailHM: (job: Job) => void;
  onRemoveJob?: (jobId: string, mode: "single" | "title" | "location") => void;
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
  isSelected?: boolean;
  onToggleSelect?: (jobId: string) => void;
  compact?: boolean;
}

export function JobCard({
  job,
  onApply,
  onViewDetail,
  onSave,
  onEmailHM,
  onRemoveJob,
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
  isSelected,
  onToggleSelect,
  compact,
}: JobCardProps) {
  const logoColor = LOGO_COLORS[job.company] || "bg-gray-600";
  const initial = job.company.charAt(0);
  const [removeOpen, setRemoveOpen] = useState(false);
  const isMatching = matchingJobIds?.has(job.id) ?? false;
  const hasApplyError = applyErrorJobIds?.has(job.id) ?? false;
  const isApplying = applyingJobIds?.has(job.id) ?? false;
  const hasRetried = applyRetriedJobIds?.has(job.id) ?? false;
  const isSelfApplying = selfApplyJobIds?.has(job.id) ?? false;
  const hasEmailGenerated = emailGeneratedJobIds?.has(job.id) ?? false;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-radix-popover-content]") || target.closest("input[type='checkbox']")) return;
    onViewDetail(job);
  };

  const locationCity = job.location.split(",")[0].trim();

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-xl border transition-colors hover:bg-muted/30 cursor-pointer ${
        compact ? "p-3" : "p-4"
      } ${
        isSelected
          ? "border-primary/30 ring-2 ring-primary/20 bg-primary/5"
          : "border-border/50 bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {onToggleSelect && (
          <div className="flex items-center pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(job.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/30 cursor-pointer"
            />
          </div>
        )}

        {/* Company logo */}
        <div
          className={`flex ${compact ? "h-9 w-9" : "h-10 w-10"} shrink-0 items-center justify-center rounded-lg ${logoColor} text-white ${compact ? "text-xs" : "text-sm"} font-bold`}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-sm font-semibold truncate block">
                {job.title}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.company} · {job.location}
              </p>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Remove */}
              {onRemoveJob && (
                <Popover open={removeOpen} onOpenChange={setRemoveOpen}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Remove job"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-56 p-1.5"
                    align="end"
                    side="bottom"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { onRemoveJob(job.id, "single"); setRemoveOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
                    >
                      Remove this one
                    </button>
                    <button
                      onClick={() => { onRemoveJob(job.id, "title"); setRemoveOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
                    >
                      Remove all &ldquo;{job.title}&rdquo; jobs
                    </button>
                    <button
                      onClick={() => { onRemoveJob(job.id, "location"); setRemoveOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
                    >
                      Remove all {locationCity} jobs
                    </button>
                  </PopoverContent>
                </Popover>
              )}
              {/* Save */}
              <button
                onClick={(e) => { e.stopPropagation(); onSave(job.id); }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={job.status.saved ? "Saved" : "Save job"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={job.status.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
              </button>
            </div>
          </div>

          {/* Salary + match */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{job.salary}</span>
            <Badge
              variant="secondary"
              className={`text-[10px] ${
                job.matchPercent >= 90
                  ? "bg-green-500/10 text-green-600"
                  : job.matchPercent >= 75
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {job.matchPercent}% match
            </Badge>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {job.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-nowrap">
            {isApplying ? (
              <button
                className="group relative overflow-hidden inline-flex items-center justify-center rounded-md text-xs h-7 min-w-[90px] px-3 bg-primary text-primary-foreground shrink-0 cursor-pointer hover:bg-red-500/90 transition-colors"
                onClick={(e) => { e.stopPropagation(); onCancelApply?.(job.id); }}
              >
                <span className="absolute inset-y-0 left-0 bg-primary-foreground/15 animate-[progress-fill_20s_ease-out_forwards] group-hover:opacity-0" />
                <span className="relative z-10 flex items-center gap-1 group-hover:invisible">Applying...</span>
                <span className="relative z-10 items-center gap-1 absolute inset-0 hidden group-hover:flex group-hover:items-center group-hover:justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  Stop
                </span>
              </button>
            ) : hasApplyError ? (
              hasRetried ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 shrink-0"
                  onClick={(e) => { e.stopPropagation(); window.open(job._apiData?.url, "_blank"); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                  Apply manually
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs h-7 shrink-0 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); onApply(job.id); }}
                >
                  Retry
                </Button>
              )
            ) : job.status.applied ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 px-2 shrink-0 text-green-600"
                disabled
                title={`Applied ${job.status.appliedAt || ""}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </Button>
            ) : isSelfApplying ? (
              <JobCardApplyDropdown job={job} onApply={onApply} compact={compact} selfApplying onConfirmSelfApply={onConfirmSelfApply} />
            ) : (
              <JobCardApplyDropdown job={job} onApply={onApply} compact={compact} onSelfApply={onSelfApply} />
            )}
            {/* Match my resume — three-state: sweep → green check → normal */}
            {onMatchResume && (
              <Button
                size="sm"
                variant={job.status.resumeGenerated ? "secondary" : "outline"}
                className={`text-xs h-7 shrink-0 ${isMatching ? "relative overflow-hidden" : ""} ${job.status.resumeGenerated ? "text-green-600" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (job.status.resumeGenerated && onViewResume) {
                    onViewResume(job);
                  } else if (!job.status.resumeGenerated) {
                    onMatchResume(job);
                  }
                }}
                disabled={isMatching}
              >
                {isMatching ? (
                  <>
                    <span className="absolute inset-y-0 left-0 bg-primary/30 animate-[progress-fill_30s_ease-out_forwards]" />
                    <span className="relative z-10 flex items-center gap-1">Matching...</span>
                  </>
                ) : job.status.resumeGenerated ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
                    {compact ? "Resume" : "Matching Resume"}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                    {compact ? "Match" : "Match my resume"}
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`text-xs h-7 px-2 shrink-0 ${hasEmailGenerated && !job.status.emailSent ? "gap-1" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (hasEmailGenerated && !job.status.emailSent && onSeeEmail) {
                  onSeeEmail(job);
                } else {
                  onEmailHM(job);
                }
              }}
              disabled={job.status.emailSent}
              title={job.status.emailSent ? "Email sent" : hasEmailGenerated ? "See email" : "Email hiring manager"}
            >
              {job.status.emailSent ? (
                compact ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-green-600"><polyline points="20 6 9 17 4 12" /></svg>
                    Emailed
                  </>
                )
              ) : hasEmailGenerated ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  See email
                </>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCardApplyDropdown({ job, onApply, compact, selfApplying, onSelfApply, onConfirmSelfApply }: { job: Job; onApply: (jobId: string) => void; compact?: boolean; selfApplying?: boolean; onSelfApply?: (jobId: string) => void; onConfirmSelfApply?: (jobId: string) => void }) {
  const [open, setOpen] = useState(false);

  if (selfApplying) {
    // Self-applying state: "I applied" main button + dropdown with Auto-apply / Go to job post
    return (
      <div className="flex items-center gap-0 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          className="text-xs h-7 rounded-r-none"
          onClick={(e) => { e.stopPropagation(); onConfirmSelfApply?.(job.id); }}
        >
          I applied
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-7 px-1.5 rounded-l-none border-l border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-44 p-1.5"
            align="start"
            side="bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { onApply(job.id); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10" /><path d="m9 9 3 3 3-3" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg>
              Auto-apply
            </button>
            <button
              onClick={() => { window.open(job._apiData?.url, "_blank"); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
              Go to job post
            </button>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Default state: "Auto-apply" main button + dropdown with Apply by myself / Go to job post
  return (
    <div className="flex items-center gap-0 shrink-0">
      <Button
        size="sm"
        variant="default"
        className="text-xs h-7 rounded-r-none"
        onClick={(e) => { e.stopPropagation(); onApply(job.id); }}
      >
        Auto-apply
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="default"
            className="text-xs h-7 px-1.5 rounded-l-none border-l border-primary-foreground/20"
            onClick={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-44 p-1.5"
          align="start"
          side="bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onSelfApply?.(job.id); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
            Apply by myself
          </button>
          <button
            onClick={() => { window.open(job._apiData?.url, "_blank"); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted transition-colors text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
            Go to job post
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
