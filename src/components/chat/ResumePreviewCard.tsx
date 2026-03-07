"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const color = companyColor(company);

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
          {/* Company header with colored initial */}
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 p-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${color} text-white text-xs font-bold`}>
              {company.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
                {jobTitle}
              </p>
              <p className="text-xs text-muted-foreground">{company}</p>
            </div>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                  Download
                </Button>
              )}
              {onPreviewEdit && (
                <Button size="sm" variant="secondary" className="text-xs h-7" onClick={onPreviewEdit}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                  Preview &amp; Edit
                </Button>
              )}
              {onApply && (
                <Button size="sm" variant="default" className="text-xs h-7" onClick={onApply}>
                  Apply to job
                </Button>
              )}
              {onEmailHM && (
                <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white" onClick={onEmailHM}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
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
