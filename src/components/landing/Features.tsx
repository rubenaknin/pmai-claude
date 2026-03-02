import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="m9 15 3-3 3 3" />
      </svg>
    ),
    title: "AI-Powered Resume Tailoring",
    description:
      "Each application gets a unique resume optimized for the specific job description, highlighting your most relevant experience.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
    title: "Automated Job Applications",
    description:
      "We handle the entire application process — filling out forms, uploading documents, and submitting on your behalf.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    title: "Personalized Email Outreach",
    description:
      "Stand out from the crowd with custom emails sent directly to hiring managers, crafted to get a response.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    title: "Track All Applications",
    description:
      "Monitor every application in one place — see when you applied, when emails were sent, and when hiring managers respond.",
  },
];

export function Features() {
  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Land the Job
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Let AI handle the tedious parts so you can focus on what matters
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/50 bg-card/50 transition-shadow hover:shadow-md"
            >
              <CardContent className="pt-6 pb-6 px-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
