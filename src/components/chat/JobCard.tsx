"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const LOGO_COLORS: Record<string, string> = {
  "Acme Corp": "bg-blue-600",
  TechFlow: "bg-purple-600",
  StartupXYZ: "bg-emerald-600",
  DataDrive: "bg-orange-600",
  CloudBase: "bg-cyan-600",
};

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchPercent: number;
  tags: string[];
  applied?: boolean;
}

interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
  compact?: boolean;
}

export function JobCard({ job, onApply, compact }: JobCardProps) {
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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${logoColor} text-white text-sm font-bold`}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold truncate">{job.title}</h4>
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.company} · {job.location}
              </p>
              <p className="text-xs text-muted-foreground">{job.salary}</p>
            </div>

            {/* Open job post link */}
            <button
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="View job post"
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

          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex flex-wrap gap-1">
              {job.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button
              size="sm"
              variant={job.applied ? "secondary" : "default"}
              className="shrink-0 text-xs h-7"
              onClick={() => onApply(job.id)}
              disabled={job.applied}
            >
              {job.applied ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Applied
                </>
              ) : (
                "Apply for me"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
