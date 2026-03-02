"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

export function JobCard({ job, onApply }: JobCardProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1 space-y-1.5">
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
        <p className="text-xs text-muted-foreground">
          {job.company} · {job.location}
        </p>
        <p className="text-xs text-muted-foreground">{job.salary}</p>
        <div className="flex flex-wrap gap-1 pt-1">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <Button
        size="sm"
        variant={job.applied ? "secondary" : "default"}
        className="shrink-0 text-xs"
        onClick={() => onApply(job.id)}
        disabled={job.applied}
      >
        {job.applied ? "Applied" : "Apply for me"}
      </Button>
    </div>
  );
}
