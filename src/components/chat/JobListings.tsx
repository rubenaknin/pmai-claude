"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JobCard, Job } from "./JobCard";

const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    location: "San Francisco, CA",
    salary: "$160k – $200k",
    matchPercent: 95,
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    id: "2",
    title: "Staff Software Engineer",
    company: "TechFlow",
    location: "New York, NY (Hybrid)",
    salary: "$180k – $220k",
    matchPercent: 92,
    tags: ["React", "Node.js", "AWS"],
  },
  {
    id: "3",
    title: "Frontend Developer",
    company: "StartupXYZ",
    location: "Remote",
    salary: "$130k – $170k",
    matchPercent: 88,
    tags: ["React", "TypeScript", "Tailwind"],
  },
  {
    id: "4",
    title: "Full Stack Engineer",
    company: "DataDrive",
    location: "Austin, TX",
    salary: "$150k – $190k",
    matchPercent: 85,
    tags: ["React", "Python", "PostgreSQL"],
  },
  {
    id: "5",
    title: "Software Engineer II",
    company: "CloudBase",
    location: "Seattle, WA",
    salary: "$145k – $185k",
    matchPercent: 82,
    tags: ["TypeScript", "React", "Kubernetes"],
  },
];

interface JobListingsProps {
  onApplyAll: () => void;
  onApplySingle: (jobId: string) => void;
  allApplied?: boolean;
}

export function JobListings({
  onApplyAll,
  onApplySingle,
  allApplied,
}: JobListingsProps) {
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const isAllApplied = allApplied || appliedJobs.size === MOCK_JOBS.length;

  const handleApply = (jobId: string) => {
    setAppliedJobs((prev) => new Set(prev).add(jobId));
    onApplySingle(jobId);
  };

  const handleApplyAll = () => {
    setAppliedJobs(new Set(MOCK_JOBS.map((j) => j.id)));
    onApplyAll();
  };

  const jobs = MOCK_JOBS.map((job) => ({
    ...job,
    applied: allApplied || appliedJobs.has(job.id),
  }));

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing top 5 of 20 matches
        </p>
        <Button
          size="sm"
          className="text-xs"
          onClick={handleApplyAll}
          disabled={isAllApplied}
        >
          {isAllApplied ? "All Applied" : "Apply for all"}
        </Button>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onApply={handleApply} />
        ))}
      </div>
    </div>
  );
}
