"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResumePreviewCard() {
  return (
    <Card className="max-w-sm border-border/50 bg-card">
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Tailored Resume</h4>
          <Badge variant="secondary" className="text-xs">
            Optimized
          </Badge>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="rounded bg-muted/50 p-2">
            <p className="font-medium text-foreground mb-1">
              Senior Frontend Engineer
            </p>
            <p>Acme Corp — San Francisco, CA</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Key Highlights:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>5+ years React & TypeScript experience</li>
              <li>Led migration to Next.js, improving load times by 40%</li>
              <li>Built design system adopted by 3 product teams</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="outline" className="text-[10px]">
              React
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              TypeScript
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Next.js
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Tailwind
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
