"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ApplicationStatusCardProps {
  jobCount?: number;
  emailsSent?: boolean;
}

export function ApplicationStatusCard({
  jobCount = 5,
  emailsSent = false,
}: ApplicationStatusCardProps) {
  return (
    <Card className="max-w-sm border-border/50 bg-card">
      <CardContent className="pt-4 pb-4 px-4">
        <h4 className="text-sm font-semibold mb-3">Application Summary</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">
                {jobCount} Applications Submitted
              </span>
            </div>
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
              Done
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Resumes Tailored per Job</span>
            </div>
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
              Done
            </Badge>
          </div>
          {emailsSent ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Emails Sent to Hiring Managers</span>
                </div>
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
                  Sent
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm">Awaiting Responses</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Pending
                </Badge>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  Email Hiring Managers
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Pending
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
