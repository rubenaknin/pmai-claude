"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ApplicationStatusCard() {
  return (
    <Card className="max-w-sm border-border/50 bg-card">
      <CardContent className="pt-4 pb-4 px-4">
        <h4 className="text-sm font-semibold mb-3">Application Status</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Application Submitted</span>
            </div>
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
              Done
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Email Sent to Hiring Manager</span>
            </div>
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 text-xs">
              Sent
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm">Awaiting Response</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Pending
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
