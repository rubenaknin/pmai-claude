import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--color-primary)/5%,transparent)]" />
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative rounded-full px-3 py-1 text-sm text-muted-foreground ring-1 ring-border">
            AI-powered job applications — now in beta
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your AI Job Application Assistant
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          PitchMe AI crafts a unique resume for every job and reaches out to
          hiring managers on your behalf. Stop sending generic applications —
          start getting interviews.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <Link href="/chat">
            <Button size="lg" className="text-base px-8">
              Try the Demo
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="text-base px-8">
              How It Works
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
