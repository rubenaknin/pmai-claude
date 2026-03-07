"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Job, getHiringManager } from "./jobData";
import type { EmailData } from "@/lib/types";

/** Strip HTML tags from email body and decode common entities */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface EmailComposerProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onSend: (jobId: string) => void;
  emailData?: EmailData | null;
  loading?: boolean;
}

function generateFallbackEmail(job: Job): { subject: string; body: string } {
  const hm = getHiringManager(job.company);
  return {
    subject: `Application for ${job.title} at ${job.company}`,
    body: `Hi ${hm.name},

I recently applied for the ${job.title} position at ${job.company} and wanted to reach out directly.

With my background in ${job.tags.slice(0, 2).join(" and ")}, I believe I'd be a strong fit for this role. I'm particularly excited about the opportunity to contribute to ${job.company}'s mission and bring my experience in building scalable frontend applications to your team.

I'd love the chance to discuss how my skills align with what you're looking for. Would you be open to a brief conversation?

Looking forward to hearing from you.

Best regards`,
  };
}

export function EmailComposer({
  job,
  open,
  onClose,
  onSend,
  emailData,
  loading,
}: EmailComposerProps) {
  // Determine email content: prefer API data, fallback to generated
  const fallback = job ? generateFallbackEmail(job) : { subject: "", body: "" };
  const initialSubject = emailData?.subject || fallback.subject;
  const initialBody = stripHtmlTags(emailData?.body || fallback.body);

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  // Reset when job changes or emailData arrives
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [lastEmailDataKey, setLastEmailDataKey] = useState<string | null>(null);

  if (job && job.id !== lastJobId) {
    const email = emailData || generateFallbackEmail(job);
    setSubject("subject" in email ? email.subject : "");
    setBody(stripHtmlTags(email.body));
    setLastJobId(job.id);
    setLastEmailDataKey(emailData ? emailData.subject : null);
  }

  // Update when API email data arrives after initial open
  if (
    emailData &&
    emailData.subject !== lastEmailDataKey &&
    job?.id === lastJobId
  ) {
    setSubject(emailData.subject);
    setBody(stripHtmlTags(emailData.body));
    setLastEmailDataKey(emailData.subject);
  }

  if (!job) return null;

  const recipientName =
    emailData?.recipientName ||
    job.status.hiringManagerName ||
    getHiringManager(job.company).name;
  const recipientTitle =
    emailData?.recipientTitle ||
    job.status.hiringManagerTitle ||
    getHiringManager(job.company).title ||
    "Hiring Team";

  const handleSend = () => {
    onSend(job.id);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b border-border/50 px-6 pt-6 pb-4">
          <SheetHeader className="text-left pb-0">
            <SheetTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              Email Hiring Manager
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Generating personalized email...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recipient info */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">To:</span>
                <Badge variant="secondary" className="text-xs">
                  {recipientName} — {recipientTitle}, {job.company}
                </Badge>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Message
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="text-sm leading-relaxed resize-none"
                />
              </div>

              <p className="text-[11px] text-muted-foreground">
                This email was AI-generated based on your resume and the job description. Feel free to edit before sending.
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={loading}>
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
