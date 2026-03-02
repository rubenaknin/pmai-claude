import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Image
            src="/logo.svg"
            alt="PitchMeAI"
            width={80}
            height={26}
            className="h-6 w-auto opacity-60"
          />
          <nav className="flex gap-8 text-sm text-gray-400">
            <a
              href="#how-it-works"
              className="hover:text-gray-600 transition-colors"
            >
              How It Works
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              Contact
            </a>
          </nav>
        </div>
        <div className="mt-8 border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} PitchMeAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
