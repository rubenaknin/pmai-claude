/** Shared types for PitchMeAI chat + API integration */

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatHistoryMessage[];
  jobsContext?: string; // serialized summary of current jobs for Claude context
  userIp?: string; // for geolocation fallback
}

export interface UserProfile {
  dynamicTitle?: string;
  dynamicLocation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  hasResume?: boolean;
  [key: string]: unknown;
}

export type ActionType =
  | "show_jobs"
  | "show_resume"
  | "show_email"
  | "apply_result"
  | "bulk_apply_result"
  | "bulk_email_result"
  | "general"
  | "error";

export interface DebugNetworkLog {
  method: string;
  url: string;
  status: number | null;
  durationMs: number;
  requestBody?: string;
  responseSnippet?: string;
  error?: string;
}

export interface DebugInfo {
  toolUsed?: string;
  toolInput?: Record<string, unknown>;
  networkLogs: DebugNetworkLog[];
  claudeModel?: string;
  timestamp: string;
}

export interface ChatApiResponse {
  botMessage: string;
  actionType: ActionType;
  data?: {
    jobs?: import("@/components/chat/jobData").Job[];
    totalJobs?: number;
    resume?: ResumeData;
    email?: EmailData;
    applyResult?: ApplyResult;
    bulkResults?: BulkResult[];
  };
  suggestions?: string[];
  _debug?: DebugInfo;
}

export interface ResumeData {
  html: string;
  highlights: string[];
  pdfUrl?: string;
  jobTitle?: string;
  company?: string;
}

export interface EmailData {
  subject: string;
  body: string;
  recipientName: string;
  recipientTitle: string;
  company: string;
}

export interface ApplyResult {
  jobId: string;
  success: boolean;
  message?: string;
}

export interface BulkResult {
  jobId: string;
  company: string;
  success: boolean;
  message?: string;
}

/** Raw API response shape from PitchMeAI search */
export interface PitchMeApiJob {
  url?: string;
  title?: string;
  company?: string;
  companyUrl?: string;
  location?: string;
  salary?: string;
  matchScore?: number;
  skills?: string[];
  tags?: string[];
  description?: string;
  jobDetails?: string;
  requirements?: string[];
  posted?: string;
  postedDate?: string;
  isActive?: boolean;
  hiringManager?: {
    name?: string;
    title?: string;
  };
  [key: string]: unknown;
}

export interface PitchMeSearchResponse {
  jobs?: PitchMeApiJob[];
  results?: PitchMeApiJob[];
  data?: PitchMeApiJob[];
  total?: number;
  totalResults?: number;
  count?: number;
  [key: string]: unknown;
}

export interface PitchMeResumeResponse {
  html?: string;
  resume_html?: string;
  resumeHtml?: string;
  highlights?: string[];
  pdfUrl?: string;
  pdf_url?: string;
  success?: boolean;
  [key: string]: unknown;
}

export interface PitchMeEmailResponse {
  subject?: string;
  body?: string;
  email_body?: string;
  emailBody?: string;
  recipient?: string;
  recipientName?: string;
  recipientTitle?: string;
  success?: boolean;
  [key: string]: unknown;
}
