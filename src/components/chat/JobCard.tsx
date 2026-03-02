"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  compact?: boolean;
}

export function JobCard({
  job,
  onApply,
  onViewDetail,
  onSave,
  onEmailHM,
  compact,
}: JobCardProps) {
  const logoColor = LOGO_COLORS[job.company] || "bg-gray-600";
  const initial = job.company.charAt(0);

  return (
    <div
      className={`rounded-xl border border-border/50 bg-card transition-colors hover:bg-muted/30 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-3">
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
              <button
                onClick={() => onViewDetail(job)}
                className="text-sm font-semibold hover:underline text-left truncate block"
              >
                {job.title}
              </button>
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.company} · {job.location}
              </p>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Save */}
              <button
                onClick={() => onSave(job.id)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={job.status.saved ? "Saved" : "Save job"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={job.status.saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
              </button>
              {/* View detail */}
              <button
                onClick={() => onViewDetail(job)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="View full description"
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
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
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
          <div className="flex items-center gap-2 mt-2.5">
            <Button
              size="sm"
              variant={job.status.applied ? "secondary" : "default"}
              className="text-xs h-7"
              onClick={() => onApply(job.id)}
              disabled={job.status.applied}
            >
              {job.status.applied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="20 6 9 17 4 12" /></svg>
                  Applied
                </>
              ) : (
                "Apply for me"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => onEmailHM(job)}
              disabled={job.status.emailSent}
            >
              {job.status.emailSent ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="20 6 9 17 4 12" /></svg>
                  Emailed
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  Email HM
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
