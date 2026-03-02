"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Job, getHiringManager } from "./jobData";

interface EmailComposerProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onSend: (jobId: string) => void;
}

function generateEmail(job: Job): { subject: string; body: string } {
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

export function EmailComposer({ job, open, onClose, onSend }: EmailComposerProps) {
  const generated = job ? generateEmail(job) : { subject: "", body: "" };
  const [subject, setSubject] = useState(generated.subject);
  const [body, setBody] = useState(generated.body);

  // Reset when job changes
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  if (job && job.id !== lastJobId) {
    const email = generateEmail(job);
    setSubject(email.subject);
    setBody(email.body);
    setLastJobId(job.id);
  }

  if (!job) return null;
  const hm = getHiringManager(job.company);

  const handleSend = () => {
    onSend(job.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            Email Hiring Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">To:</span>
            <Badge variant="secondary" className="text-xs">
              {hm.name} — {hm.title}, {job.company}
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
              rows={10}
              className="text-sm leading-relaxed resize-none"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            This email was AI-generated based on your resume and the job description. Feel free to edit before sending.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
