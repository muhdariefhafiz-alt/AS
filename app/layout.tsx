import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AgentScan - Compare Property Agents in Singapore",
    template: "%s | AgentScan",
  },
  description:
    "Compare 30,000+ property agents in Singapore on actual performance. AgentScan combines Google, PropertyGuru and CEA data into an objective AgentScore.",
  alternates: { canonical: "https://agentscan.sg" },
};

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">AS</div>
          <span className="text-lg font-bold text-gray-900">Agent<span className="text-emerald-600">Scan</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-500 sm:flex">
          <Link href="/agencies" className="transition hover:text-gray-900">Agencies</Link>
          <Link href="/about" className="transition hover:text-gray-900">About</Link>
          <Link href="/agencies" className="rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700">Find Agent</Link>
        </nav>
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
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-xs font-bold text-white">AS</div>
              <span className="font-bold text-gray-900">AgentScan</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Independent comparison platform for property agents in Singapore.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Platform</h4>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link href="/agencies" className="block hover:text-gray-900">All Agencies</Link>
              <Link href="/about" className="block hover:text-gray-900">About AgentScore</Link>
              <Link href="/privacy" className="block hover:text-gray-900">Privacy Policy</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Popular Districts</h4>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link href="/district/d09-orchard" className="block hover:text-gray-900">D09 Orchard</Link>
              <Link href="/district/d10-bukit-timah" className="block hover:text-gray-900">D10 Bukit Timah</Link>
              <Link href="/district/d15-katong" className="block hover:text-gray-900">D15 Katong</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          AgentScan is a product of Fair Comparisons Netherlands (KvK 42031267).
          Data sourced from CEA, Google, and public records.
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)] text-gray-900">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
