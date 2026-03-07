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

/** Deterministic color from company name hash */
function companyColor(name: string): string {
  const COLORS = [
    "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-600",
    "bg-cyan-600", "bg-indigo-600", "bg-pink-600", "bg-rose-600",
    "bg-red-600", "bg-violet-600", "bg-teal-600", "bg-sky-600",
    "bg-lime-700", "bg-amber-700", "bg-fuchsia-600", "bg-stone-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/** Extract root domain from a URL string */
function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function CompanyLogo({ company, apiData }: { company: string; apiData?: Job["_apiData"] }) {
  const [tier, setTier] = useState<1 | 2 | 3>(apiData?.thumbnail ? 1 : 2);

  // Tier 1: API thumbnail
  if (tier === 1 && apiData?.thumbnail) {
    return (
      <img
        src={apiData.thumbnail}
        alt={company}
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
        onError={() => setTier(2)}
      />
    );
  }

  // Tier 2: Clearbit logo
  const domain = extractDomain(apiData?.companyUrl);
  if (tier === 2 && domain) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={company}
        className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white p-0.5"
        onError={() => setTier(3)}
      />
    );
  }

  // Tier 3: Colored initial letter
  const color = companyColor(company);
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color} text-white text-sm font-bold`}>
      {company.charAt(0)}
    </div>
  );
}

interface ChatJobCardProps {
  job: Job;
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
  onSeeEmail?: (job: Job) => void;
}

export function ChatJobCard({ job, onApply, onEmailHM, onViewDetail, onMatchResume, onViewResume, matchingJobIds, applyErrorJobIds, applyingJobIds, applyRetriedJobIds, onCancelApply, selfApplyJobIds, onSelfApply, onConfirmSelfApply, emailGeneratedJobIds, onSeeEmail }: ChatJobCardProps) {
  const isMatching = matchingJobIds?.has(job.id) ?? false;
  const hasApplyError = applyErrorJobIds?.has(job.id) ?? false;
  const isApplying = applyingJobIds?.has(job.id) ?? false;
  const hasRetried = applyRetriedJobIds?.has(job.id) ?? false;
  const isSelfApplying = selfApplyJobIds?.has(job.id) ?? false;
  const hasEmailGenerated = emailGeneratedJobIds?.has(job.id) ?? false;
  return (
    <div
      onClick={() => onViewDetail(job)}
      className="rounded-xl border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <CompanyLogo company={job.company} apiData={job._apiData} />

        <div className="min-w-0 flex-1">
          {/* Title + match */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold truncate block">{job.title}</span>
            <Badge
              variant="secondary"
              className={`shrink-0 text-[10px] ${
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

          {/* Company / Location / Salary */}
          <p className="text-xs text-muted-foreground mt-0.5">
            {job.company} · {job.location} · {job.salary}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {job.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-border/30 my-2" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-nowrap">
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
              <ApplyDropdown job={job} onApply={onApply} selfApplying onConfirmSelfApply={onConfirmSelfApply} />
            ) : (
              <ApplyDropdown job={job} onApply={onApply} onSelfApply={onSelfApply} />
            )}
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
                  Matching Resume
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                  Match
                </>
              )}
            </Button>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12" /></svg>
              ) : hasEmailGenerated ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  See email
                </>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 ml-auto shrink-0"
              onClick={(e) => { e.stopPropagation(); onViewDetail(job); }}
            >
              Details &rarr;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplyDropdown({ job, onApply, selfApplying, onSelfApply, onConfirmSelfApply }: { job: Job; onApply: (jobId: string) => void; selfApplying?: boolean; onSelfApply?: (jobId: string) => void; onConfirmSelfApply?: (jobId: string) => void }) {
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
