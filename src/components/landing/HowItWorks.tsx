import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    number: "1",
    title: "Upload Your Resume",
    description:
      "Share your resume and tell us about yourself. Our AI learns your skills, experience, and career goals.",
  },
  {
    number: "2",
    title: "AI Tailors Your Resume",
    description:
      "For each job posting, our AI creates a custom resume that highlights the most relevant experience and skills.",
  },
  {
    number: "3",
    title: "We Apply & Reach Out",
    description:
      "We submit your tailored application and send personalized emails to hiring managers on your behalf.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three simple steps to land your next role
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <Card
              key={step.number}
              className="relative border-border/50 bg-card/50"
            >
              <CardContent className="pt-8 pb-6 px-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
