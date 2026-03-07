"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

interface JobDetailSheetProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onApply: (jobId: string) => void;
  onEmailHM: (job: Job) => void;
  onSave: (jobId: string) => void;
  onMatchResume?: (job: Job) => void;
}

export function JobDetailSheet({
  job,
  open,
  onClose,
  onApply,
  onEmailHM,
  onSave,
  onMatchResume,
}: JobDetailSheetProps) {
  if (!job) return null;
  const logoColor = LOGO_COLORS[job.company] || "bg-gray-600";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Sticky header with logo, title, and CTAs */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/50 px-6 pt-6 pb-4 space-y-4">
          <SheetHeader className="text-left pb-0">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${logoColor} text-white text-lg font-bold`}
              >
                {job.company.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg leading-tight">
                    {job.title}
                  </SheetTitle>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="View original job post"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                  </a>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {job.company} · {job.location}
                </p>
              </div>
            </div>
          </SheetHeader>

          {/* CTAs at top */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => { onApply(job.id); onClose(); }}
              disabled={job.status.applied}
              className="text-xs h-8"
            >
              {job.status.applied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Applied
                </>
              ) : (
                "Apply for me"
              )}
            </Button>
            {onMatchResume && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onMatchResume(job); onClose(); }}
                disabled={job.status.resumeGenerated}
                className="text-xs h-8"
              >
                {job.status.resumeGenerated ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Resume
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" /></svg>
                    Generate Resume
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEmailHM(job)}
              disabled={job.status.emailSent}
              className="text-xs h-8"
            >
              {job.status.emailSent ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Emailed
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  Intro Email
                </>
              )}
            </Button>
            <button
              onClick={() => onSave(job.id)}
              className={`rounded-lg p-1.5 transition-colors ${
                job.status.saved
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={job.status.saved ? "Saved" : "Save job"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={job.status.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-6 py-5 space-y-5">
          {/* Quick info badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className={`text-xs ${
                job.matchPercent >= 90
                  ? "bg-green-500/10 text-green-600"
                  : job.matchPercent >= 75
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {job.matchPercent}% match
            </Badge>
            <Badge variant="outline" className="text-xs">
              {job.salary}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Posted {job.postedDate}
            </Badge>
            {job.status.isLive ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
                Live
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Closed
              </Badge>
            )}
          </div>

          {/* Status tracker */}
          <div className="rounded-xl border border-border/50 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </h4>
            <div className="space-y-2">
              <StatusRow
                label="Job listing"
                status={job.status.isLive ? "Live" : "Closed"}
                active={job.status.isLive}
              />
              <StatusRow
                label="Application"
                status={
                  job.status.applied
                    ? `Applied ${job.status.appliedAt}`
                    : "Not applied"
                }
                active={job.status.applied}
              />
              <StatusRow
                label="Hiring manager"
                status={
                  job.status.hiringManagerFound
                    ? `${job.status.hiringManagerName} (${job.status.hiringManagerTitle})`
                    : "Not found yet"
                }
                active={job.status.hiringManagerFound}
              />
              <StatusRow
                label="Intro email"
                status={
                  job.status.emailSent
                    ? `Sent ${job.status.emailSentAt}`
                    : "Not sent"
                }
                active={job.status.emailSent}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <Separator />

          {/* Description */}
          <div className="px-1">
            <h4 className="text-sm font-semibold mb-3">About the Role</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {job.description}
            </p>
          </div>

          {/* Requirements */}
          <div className="px-1">
            <h4 className="text-sm font-semibold mb-3">Requirements</h4>
            <ul className="space-y-2">
              {job.requirements.map((req, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <div className="h-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusRow({
  label,
  status,
  active,
}: {
  label: string;
  status: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            active ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span
        className={
          active
            ? "text-foreground text-xs"
            : "text-muted-foreground/60 text-xs"
        }
      >
        {status}
      </span>
    </div>
  );
}
