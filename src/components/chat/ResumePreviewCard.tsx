"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ResumePreviewCardProps {
  jobTitle?: string;
  company?: string;
  highlights?: string[];
  tags?: string[];
  pdfFileName?: string;
  onDownload?: () => void;
  onPreviewEdit?: () => void;
  onApply?: () => void;
  onEmailHM?: () => void;
}

export function ResumePreviewCard({
  jobTitle = "Senior Frontend Engineer",
  company = "Top Match",
  highlights,
  tags,
  onDownload,
  onPreviewEdit,
  onApply,
  onEmailHM,
}: ResumePreviewCardProps) {
  const displayHighlights = highlights && highlights.length > 0
    ? highlights.slice(0, 4)
    : [
        "5+ years React & TypeScript experience",
        "Led migration to Next.js, improving load times by 40%",
        "Built design system adopted by 3 product teams",
      ];

  const displayTags = tags && tags.length > 0
    ? tags.slice(0, 4)
    : ["React", "TypeScript", "Next.js", "Tailwind"];

  const hasActions = onDownload || onPreviewEdit || onApply || onEmailHM;

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
              {jobTitle}
            </p>
            <p>{company}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Key Highlights:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {displayHighlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {displayTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
          {hasActions && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
              {onDownload && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={onDownload}>
                  Download
                </Button>
              )}
              {onPreviewEdit && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={onPreviewEdit}>
                  Preview &amp; Edit
                </Button>
              )}
              {onApply && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={onApply}>
                  Apply to job
                </Button>
              )}
              {onEmailHM && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={onEmailHM}>
                  Intro email
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
