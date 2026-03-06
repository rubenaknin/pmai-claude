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
  pdfFileName?: string;
  jobTitle?: string;
  company?: string;
  threeExplanations?: {
    summary?: string;
    keywords_added?: string[];
    soft_skills?: string;
  };
}

export interface EmailData {
  subject: string;
  body: string;
  recipientName: string;
  recipientTitle: string;
  recipientEmail?: string;
  recipientLinkedin?: string;
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

/** Raw job document from CouchDB (returned by GET /jobs) */
export interface PitchMeApiJob {
  _id?: string;
  title?: string;
  organization?: string;
  company?: string;
  company_name?: string;
  url?: string;
  redirect_url?: string;
  location?: string;
  locations_derived?: string[];
  remote_derived?: boolean;
  salary_raw?: {
    value?: {
      minValue?: number;
      maxValue?: number;
    };
  };
  salary?: string;
  date_posted?: string;
  description_text?: string;
  description?: string;
  gpt_content_taxonomy?: {
    industry?: string;
    [key: string]: unknown;
  };
  company_size?: number;
  linkedin_org_size?: number;
  employment_type?: string;
  thumbnail?: string;
  company_url?: string;
  companyUrl?: string;
  company_profile_url?: string;
  companyProfileUrl?: string;
  matchScore?: number;
  skills?: string[];
  tags?: string[];
  [key: string]: unknown;
}

/** Response shape from GET /jobs or GET /jobs/recommendations */
export interface PitchMeSearchResponse {
  results?: PitchMeApiJob[];
  pagination?: {
    currentPage?: number;
    jobsPerPage?: number;
    totalJobs?: number;
    totalPages?: number;
    hasNextPage?: boolean;
  };
  metadata?: {
    searchQuery?: string;
    geolocation?: Record<string, unknown>;
    taxonomyTokens?: string[];
    radiusMiles?: number;
    bookmark?: string;
    [key: string]: unknown;
  };
  // Legacy fallback shapes
  jobs?: PitchMeApiJob[];
  data?: PitchMeApiJob[];
  total?: number;
  totalResults?: number;
  count?: number;
  [key: string]: unknown;
}

/** Response from POST /resume/generate */
export interface PitchMeResumeResponse {
  jobId?: string;
  newResumeHTMLBody?: string;
  threeExplanations?: {
    summary?: string;
    keywords_added?: string[];
    soft_skills?: string;
  };
  pdfFileName?: string;
  resumeHistory?: unknown[];
  createdAtResume?: string;
  jobName?: string;
  companyName?: string;
  files?: {
    pdf?: string;
  };
  // Legacy fallbacks
  html?: string;
  resume_html?: string;
  resumeHtml?: string;
  highlights?: string[];
  pdfUrl?: string;
  pdf_url?: string;
  [key: string]: unknown;
}

/** Response from POST /letter/generate */
export interface PitchMeEmailResponse {
  jobId?: string;
  introEmail?: string;
  originalIntroEmail?: string;
  recruiter?: {
    name?: string;
    first_name?: string;
    email?: string;
    title?: string;
    linkedin_url?: string;
    photo_url?: string;
  };
  introEmailHistory?: unknown[];
  createdAtIntroEmail?: string;
  // Legacy fallbacks
  subject?: string;
  body?: string;
  email_body?: string;
  emailBody?: string;
  recipient?: string;
  recipientName?: string;
  recipientTitle?: string;
  [key: string]: unknown;
}
