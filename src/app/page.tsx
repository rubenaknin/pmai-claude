import Image from "next/image";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Image
            src="/logo.svg"
            alt="PitchMeAI"
            width={80}
            height={26}
            className="h-7 w-auto"
            priority
          />
          <nav className="hidden sm:flex items-center gap-8 text-sm text-gray-500">
            <a
              href="#how-it-works"
              className="hover:text-gray-900 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="hover:text-gray-900 transition-colors"
            >
              Features
            </a>
          </nav>
          <a
            href="/chat"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
          >
            Get Started
          </a>
        </div>
      </header>

      <main>
        <Hero />
        <HowItWorks />
        <Features />

        {/* Final CTA */}
        <section className="relative py-24 sm:py-32 px-6 lg:px-8 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/80" />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-gray-900">
              Ready to land your dream job?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start your AI-powered job search today. No credit card required.
            </p>
            <a
              href="/chat"
              className="inline-flex items-center gap-2 mt-8 rounded-full bg-primary px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              Get Started Free
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
