export interface JobStatus {
  isLive: boolean;
  applied: boolean;
  appliedAt: string | null;
  hiringManagerFound: boolean;
  hiringManagerName: string | null;
  hiringManagerTitle: string | null;
  emailSent: boolean;
  emailSentAt: string | null;
  resumeGenerated: boolean;
  resumeGeneratedAt: string | null;
  saved: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchPercent: number;
  tags: string[];
  description: string;
  requirements: string[];
  postedDate: string;
  status: JobStatus;
  /** Extra API data needed for apply/email calls */
  _apiData?: {
    jobId?: string;
    url?: string;
    companyUrl?: string;
    companyProfileUrl?: string;
    jobDetails?: string;
    jobName?: string;
    companyName?: string;
    location?: string;
    thumbnail?: string;
  };
}

export const defaultStatus = (): JobStatus => ({
  isLive: true,
  applied: false,
  appliedAt: null,
  hiringManagerFound: false,
  hiringManagerName: null,
  hiringManagerTitle: null,
  emailSent: false,
  emailSentAt: null,
  resumeGenerated: false,
  resumeGeneratedAt: null,
  saved: false,
});

const HIRING_MANAGERS: Record<string, { name: string; title: string }> = {
  "Acme Corp": { name: "Sarah Chen", title: "Engineering Manager" },
  TechFlow: { name: "James Rivera", title: "VP of Engineering" },
  StartupXYZ: { name: "Priya Sharma", title: "CTO" },
  DataDrive: { name: "Michael Park", title: "Director of Engineering" },
  CloudBase: { name: "Emily Watson", title: "Engineering Lead" },
  Stripe: { name: "Alex Kim", title: "Staff Eng Manager" },
  Notion: { name: "Laura Martinez", title: "Engineering Director" },
  Figma: { name: "David Liu", title: "Frontend Lead" },
  Vercel: { name: "Rachel Green", title: "Head of Engineering" },
  Coinbase: { name: "Tom Anderson", title: "Engineering Manager" },
  Shopify: { name: "Nina Patel", title: "Senior Eng Manager" },
  Airbnb: { name: "Chris Johnson", title: "Staff Eng Manager" },
  Twilio: { name: "Maria Garcia", title: "VP Engineering" },
  Datadog: { name: "Ryan Taylor", title: "Engineering Lead" },
  Netflix: { name: "Jennifer Wu", title: "Director of Engineering" },
  Atlassian: { name: "Mark Brown", title: "Engineering Manager" },
  HubSpot: { name: "Sophia Lee", title: "Team Lead" },
  Lyft: { name: "Daniel Kim", title: "Staff Eng Manager" },
  Slack: { name: "Olivia Davis", title: "Engineering Director" },
  Squarespace: { name: "Kevin Zhang", title: "Frontend Lead" },
  Plaid: { name: "Amanda White", title: "Engineering Manager" },
  Retool: { name: "Jason Miller", title: "Head of Frontend" },
  Linear: { name: "Sam Wilson", title: "CTO" },
  Ramp: { name: "Jessica Thomas", title: "Engineering Lead" },
  Canva: { name: "Andrew Clark", title: "Staff Eng Manager" },
};

export function getHiringManager(company: string) {
  return HIRING_MANAGERS[company] || { name: "Hiring Manager", title: "Engineering" };
}

function makeDescription(title: string, company: string): string {
  return `We're looking for a ${title} to join our team at ${company}. You'll work on building and maintaining our core product, collaborating with cross-functional teams including design, product, and backend engineering.

You'll be responsible for architecting scalable frontend solutions, mentoring junior developers, and driving technical decisions that impact millions of users. This is a high-impact role where you'll ship features that directly affect our business metrics.

We value engineers who are passionate about user experience, write clean and testable code, and thrive in a fast-paced environment. You'll have the opportunity to work with modern technologies and contribute to our engineering culture.`;
}

function makeRequirements(tags: string[]): string[] {
  const base = [
    "5+ years of professional software engineering experience",
    "Strong CS fundamentals (data structures, algorithms, system design)",
    "Excellent communication and collaboration skills",
    "Experience working in agile development environments",
  ];
  const techReqs = tags.map((t) => `Production experience with ${t}`);
  return [...techReqs, ...base];
}

const RAW_JOBS = [
  { id: "1", title: "Senior Frontend Engineer", company: "Acme Corp", location: "San Francisco, CA", salary: "$160k – $200k", matchPercent: 95, tags: ["React", "TypeScript", "Next.js"], postedDate: "2 days ago" },
  { id: "2", title: "Staff Software Engineer", company: "TechFlow", location: "New York, NY (Hybrid)", salary: "$180k – $220k", matchPercent: 92, tags: ["React", "Node.js", "AWS"], postedDate: "1 day ago" },
  { id: "3", title: "Frontend Developer", company: "StartupXYZ", location: "Remote", salary: "$130k – $170k", matchPercent: 88, tags: ["React", "TypeScript", "Tailwind"], postedDate: "3 days ago" },
  { id: "4", title: "Full Stack Engineer", company: "DataDrive", location: "Austin, TX", salary: "$150k – $190k", matchPercent: 85, tags: ["React", "Python", "PostgreSQL"], postedDate: "1 day ago" },
  { id: "5", title: "Software Engineer II", company: "CloudBase", location: "Seattle, WA", salary: "$145k – $185k", matchPercent: 82, tags: ["TypeScript", "React", "Kubernetes"], postedDate: "4 days ago" },
  { id: "6", title: "Frontend Engineer", company: "Stripe", location: "San Francisco, CA", salary: "$170k – $210k", matchPercent: 80, tags: ["React", "TypeScript", "CSS"], postedDate: "2 days ago" },
  { id: "7", title: "Senior Software Engineer", company: "Notion", location: "New York, NY", salary: "$165k – $205k", matchPercent: 79, tags: ["React", "TypeScript", "Node.js"], postedDate: "5 days ago" },
  { id: "8", title: "UI Engineer", company: "Figma", location: "San Francisco, CA", salary: "$155k – $195k", matchPercent: 78, tags: ["React", "WebGL", "TypeScript"], postedDate: "3 days ago" },
  { id: "9", title: "Frontend Lead", company: "Vercel", location: "Remote", salary: "$175k – $215k", matchPercent: 77, tags: ["Next.js", "React", "TypeScript"], postedDate: "1 day ago" },
  { id: "10", title: "Software Engineer, Frontend", company: "Coinbase", location: "Remote", salary: "$150k – $195k", matchPercent: 76, tags: ["React", "GraphQL", "TypeScript"], postedDate: "6 days ago" },
  { id: "11", title: "Senior React Developer", company: "Shopify", location: "Remote", salary: "$140k – $185k", matchPercent: 75, tags: ["React", "Ruby", "GraphQL"], postedDate: "2 days ago" },
  { id: "12", title: "Frontend Engineer II", company: "Airbnb", location: "San Francisco, CA", salary: "$160k – $200k", matchPercent: 74, tags: ["React", "TypeScript", "Testing"], postedDate: "4 days ago" },
  { id: "13", title: "Web Developer", company: "Twilio", location: "Denver, CO (Hybrid)", salary: "$135k – $175k", matchPercent: 73, tags: ["React", "Node.js", "REST APIs"], postedDate: "3 days ago" },
  { id: "14", title: "Software Engineer, UI", company: "Datadog", location: "New York, NY", salary: "$155k – $195k", matchPercent: 72, tags: ["React", "TypeScript", "D3.js"], postedDate: "5 days ago" },
  { id: "15", title: "Frontend Platform Engineer", company: "Netflix", location: "Los Gatos, CA", salary: "$180k – $250k", matchPercent: 71, tags: ["React", "Node.js", "Performance"], postedDate: "1 day ago" },
  { id: "16", title: "Senior Web Engineer", company: "Atlassian", location: "Remote", salary: "$145k – $190k", matchPercent: 70, tags: ["React", "TypeScript", "Monorepo"], postedDate: "6 days ago" },
  { id: "17", title: "Frontend Developer", company: "HubSpot", location: "Cambridge, MA", salary: "$130k – $170k", matchPercent: 69, tags: ["React", "JavaScript", "CSS"], postedDate: "2 days ago" },
  { id: "18", title: "Software Engineer III", company: "Lyft", location: "San Francisco, CA", salary: "$155k – $200k", matchPercent: 68, tags: ["React", "TypeScript", "Mobile Web"], postedDate: "4 days ago" },
  { id: "19", title: "UI/Frontend Engineer", company: "Slack", location: "San Francisco, CA", salary: "$150k – $195k", matchPercent: 67, tags: ["React", "Electron", "TypeScript"], postedDate: "3 days ago" },
  { id: "20", title: "React Developer", company: "Squarespace", location: "New York, NY", salary: "$135k – $175k", matchPercent: 66, tags: ["React", "Next.js", "CSS-in-JS"], postedDate: "5 days ago" },
  { id: "21", title: "Senior Frontend Engineer", company: "Plaid", location: "San Francisco, CA", salary: "$165k – $210k", matchPercent: 65, tags: ["React", "TypeScript", "Security"], postedDate: "1 day ago" },
  { id: "22", title: "Full Stack Developer", company: "Retool", location: "San Francisco, CA", salary: "$150k – $190k", matchPercent: 64, tags: ["React", "Node.js", "PostgreSQL"], postedDate: "6 days ago" },
  { id: "23", title: "Frontend Engineer", company: "Linear", location: "Remote", salary: "$140k – $180k", matchPercent: 63, tags: ["React", "TypeScript", "Performance"], postedDate: "2 days ago" },
  { id: "24", title: "Software Engineer, Web", company: "Ramp", location: "New York, NY", salary: "$155k – $200k", matchPercent: 62, tags: ["React", "TypeScript", "Fintech"], postedDate: "4 days ago" },
  { id: "25", title: "Senior UI Developer", company: "Canva", location: "Remote", salary: "$145k – $185k", matchPercent: 61, tags: ["React", "TypeScript", "Canvas API"], postedDate: "3 days ago" },
  // Extended jobs (26-50) for infinite scroll
  { id: "26", title: "Frontend Architect", company: "Stripe", location: "Remote", salary: "$190k – $240k", matchPercent: 60, tags: ["React", "System Design", "TypeScript"], postedDate: "1 week ago" },
  { id: "27", title: "React Native Engineer", company: "Coinbase", location: "San Francisco, CA", salary: "$155k – $200k", matchPercent: 59, tags: ["React Native", "TypeScript", "Mobile"], postedDate: "5 days ago" },
  { id: "28", title: "Senior Web Developer", company: "Shopify", location: "Toronto, ON (Remote)", salary: "$140k – $180k", matchPercent: 58, tags: ["React", "Ruby on Rails", "GraphQL"], postedDate: "1 week ago" },
  { id: "29", title: "Frontend Infrastructure", company: "Netflix", location: "Remote", salary: "$175k – $230k", matchPercent: 57, tags: ["React", "Webpack", "Performance"], postedDate: "6 days ago" },
  { id: "30", title: "Software Engineer, Growth", company: "Notion", location: "San Francisco, CA", salary: "$160k – $200k", matchPercent: 56, tags: ["React", "A/B Testing", "Analytics"], postedDate: "1 week ago" },
  { id: "31", title: "Design Engineer", company: "Figma", location: "New York, NY", salary: "$150k – $195k", matchPercent: 55, tags: ["React", "CSS", "Animation"], postedDate: "4 days ago" },
  { id: "32", title: "Frontend Engineer, Platform", company: "Vercel", location: "Remote", salary: "$165k – $210k", matchPercent: 54, tags: ["Next.js", "TypeScript", "Edge Computing"], postedDate: "1 week ago" },
  { id: "33", title: "Senior Software Engineer", company: "Airbnb", location: "Remote", salary: "$170k – $215k", matchPercent: 53, tags: ["React", "GraphQL", "Microservices"], postedDate: "5 days ago" },
  { id: "34", title: "Full Stack Engineer", company: "Linear", location: "San Francisco, CA", salary: "$155k – $195k", matchPercent: 52, tags: ["React", "Node.js", "PostgreSQL"], postedDate: "1 week ago" },
  { id: "35", title: "Frontend Developer", company: "Ramp", location: "Remote", salary: "$145k – $185k", matchPercent: 51, tags: ["React", "TypeScript", "Fintech"], postedDate: "6 days ago" },
  { id: "36", title: "Web Platform Engineer", company: "Datadog", location: "Remote", salary: "$160k – $205k", matchPercent: 50, tags: ["React", "TypeScript", "Observability"], postedDate: "1 week ago" },
  { id: "37", title: "Software Engineer II", company: "HubSpot", location: "Remote", salary: "$135k – $175k", matchPercent: 49, tags: ["React", "Node.js", "MySQL"], postedDate: "5 days ago" },
  { id: "38", title: "Senior Frontend Engineer", company: "Twilio", location: "Remote", salary: "$155k – $200k", matchPercent: 48, tags: ["React", "WebRTC", "TypeScript"], postedDate: "1 week ago" },
  { id: "39", title: "React Developer", company: "Atlassian", location: "Sydney, AU (Remote)", salary: "$140k – $185k", matchPercent: 47, tags: ["React", "TypeScript", "Jira API"], postedDate: "6 days ago" },
  { id: "40", title: "Frontend Engineer", company: "Canva", location: "Sydney, AU (Remote)", salary: "$140k – $180k", matchPercent: 46, tags: ["React", "Canvas", "WebGL"], postedDate: "1 week ago" },
];

export const MOCK_JOBS: Job[] = RAW_JOBS.map((j) => ({
  ...j,
  description: makeDescription(j.title, j.company),
  requirements: makeRequirements(j.tags),
  status: {
    ...defaultStatus(),
    hiringManagerFound: true,
    hiringManagerName: getHiringManager(j.company).name,
    hiringManagerTitle: getHiringManager(j.company).title,
  },
}));

export const TOTAL_MATCHING_JOBS = 127;
