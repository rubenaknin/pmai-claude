"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApplicationStatusCardProps {
  jobCount?: number;
  emailsSent?: boolean;
  successCount?: number;
  failCount?: number;
  onShowJobs?: () => void;
  jobsSnapshot?: { jobs: import("./jobData").Job[]; totalJobs: number };
  onLoadJobsSnapshot?: (jobs: import("./jobData").Job[], totalJobs: number) => void;
}

export function ApplicationStatusCard({
  jobCount = 5,
  emailsSent = false,
  successCount,
  failCount,
  onShowJobs,
  jobsSnapshot,
  onLoadJobsSnapshot,
}: ApplicationStatusCardProps) {
  const displaySuccess = successCount ?? jobCount;
  const displayFail = failCount ?? 0;

  return (
    <Card className="max-w-sm border-border/50 bg-card">
      <CardContent className="pt-4 pb-4 px-4">
        <h4 className="text-sm font-semibold mb-3">Application Summary</h4>
        <div className="space-y-3">
          {/* 1) Resumes Tailored */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Resumes Tailored per Job</span>
            </div>
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
              Done
            </Badge>
          </div>
          {/* 2) Applications Submitted */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">
                {displaySuccess} Applications Submitted
              </span>
            </div>
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
              Done
            </Badge>
          </div>
          {/* 3) Failed (conditional) */}
          {displayFail > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-600">
                  {displayFail} Failed
                </span>
              </div>
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            </div>
          )}
          {/* 4) Email section */}
          {emailsSent ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Intro Emails Sent</span>
              </div>
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
                Sent
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  Intro Emails to Hiring Managers
                </span>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Not Done Yet
              </Badge>
            </div>
          )}
        </div>
        {(onLoadJobsSnapshot || onShowJobs) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 text-xs h-7 gap-1.5"
            onClick={() => {
              if (onLoadJobsSnapshot && jobsSnapshot) {
                onLoadJobsSnapshot(jobsSnapshot.jobs, jobsSnapshot.totalJobs);
              } else if (onShowJobs) {
                onShowJobs();
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="3" y="3" rx="1" /></svg>
            Show jobs
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
