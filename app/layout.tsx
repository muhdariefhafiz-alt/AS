import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import PageTracker from "./components/PageTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A6B5E",
};

export const metadata: Metadata = {
  title: {
    default: "FairComparisons - Compare Property Agents in Singapore",
    template: "%s | FairComparisons",
  },
  description:
    "Compare 30,000+ property agents in Singapore on actual performance. FairComparisons combines Google, listing portals and CEA data into an objective AgentScore.",
  alternates: { canonical: "https://fair-comparisons.com" },
  openGraph: {
    title: "FairComparisons - Compare Property Agents in Singapore",
    description: "Compare 30,000+ property agents on actual CEA transaction records. Independent ratings, not advertising.",
    url: "https://fair-comparisons.com",
    siteName: "FairComparisons",
    locale: "en_SG",
    type: "website",
    images: [{ url: "https://fair-comparisons.com/og-image.png", width: 1200, height: 630, alt: "FairComparisons - Independent Property Agent Ratings" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FairComparisons - Compare Property Agents in Singapore",
    description: "Compare 30,000+ property agents on actual CEA transaction records.",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-3 md:px-10 md:py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">FC</div>
          <span className="text-lg font-bold text-gray-900">Fair<span className="text-teal-600">Comparisons</span></span>
        </Link>
        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-500 sm:flex">
          <Link href="/property-agents" className="transition hover:text-gray-900">Property Agents</Link>
          <Link href="/lawyers" className="transition hover:text-gray-900">Lawyers</Link>
          <Link href="/for-agents" className="transition hover:text-gray-900">For Agents</Link>
          <Link href="/search" className="rounded-lg bg-teal-600 px-4 py-2 text-white transition hover:bg-teal-700">Search</Link>
        </nav>
        {/* Mobile nav */}
        <div className="flex items-center gap-3 sm:hidden">
          <Link href="/search" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white">Search</Link>
          <details className="relative">
            <summary className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-500 list-none">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </summary>
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <Link href="/property-agents" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Property Agents</Link>
              <Link href="/lawyers" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Lawyers</Link>
              <Link href="/for-agents" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">For Agents</Link>
              <Link href="/about" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">About</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-600 text-xs font-bold text-white">FC</div>
              <span className="font-bold text-gray-900">Fair<span className="text-teal-600">Comparisons</span></span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Independent comparison platform for property agents in Singapore.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Platform</h4>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link href="/property-agents" className="block hover:text-gray-900">Property Agents</Link>
              <Link href="/for-agents" className="block hover:text-gray-900">For Agents</Link>
              <Link href="/about" className="block hover:text-gray-900">How We Score</Link>
              <Link href="/privacy" className="block hover:text-gray-900">Privacy Policy</Link>
              <Link href="/terms" className="block hover:text-gray-900">Terms of Service</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Popular Districts</h4>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link href="/property-agents/district/d09-orchard" className="block hover:text-gray-900">D09 Orchard</Link>
              <Link href="/property-agents/district/d10-ardmore" className="block hover:text-gray-900">D10 Bukit Timah</Link>
              <Link href="/property-agents/district/d15-katong" className="block hover:text-gray-900">D15 Katong</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          Independent. Data-driven. Rankings cannot be bought. Built in Singapore.
          Data sourced from CEA, URA, HDB, and Google.
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-K4D8EQ6D9G"></script>
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-K4D8EQ6D9G');` }} />
      </head>
      <body className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)] text-gray-900">
        <Header />
        <main>{children}</main>
        <Footer />
        <PageTracker />
      </body>
    </html>
  );
}
