"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

export function ChatJobCard({ job, onApply, onEmailHM, onViewDetail }: ChatJobCardProps) {
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={job.status.applied ? "secondary" : "default"}
              className="text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onApply(job.id); }}
              disabled={job.status.applied}
            >
              {job.status.applied ? "Applied" : "Apply for me"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onEmailHM(job); }}
              disabled={job.status.emailSent}
            >
              {job.status.emailSent ? "Emailed" : "Email HM"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 ml-auto"
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
