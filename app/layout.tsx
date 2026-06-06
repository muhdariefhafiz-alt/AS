import type { Metadata, Viewport } from "next";
import { Newsreader, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";
import PageTracker from "./components/PageTracker";
import EmailCapture from "./components/EmailCapture";
import ChromeGate from "./components/ChromeGate";
import { Lockup } from "./components/Brand";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const spline = Spline_Sans_Mono({
  variable: "--font-spline",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a1733",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://fair-comparisons.com"),
  title: {
    default: "FairComparisons - Compare Property Agents in Singapore",
    template: "%s | FairComparisons",
  },
  description:
    "Choose your property agent on evidence, not advertising. FairComparisons ranks every Singapore agent on real CEA, URA and HDB transaction data. Free for sellers, rankings cannot be bought.",
  alternates: {
    canonical: "https://fair-comparisons.com",
    types: { "application/rss+xml": "https://fair-comparisons.com/api/feed" },
  },
  openGraph: {
    title: "FairComparisons - Compare Property Agents in Singapore",
    description:
      "Ranked on real CEA transaction records, not advertising. Independent, free for sellers, rankings cannot be bought.",
    url: "https://fair-comparisons.com",
    siteName: "FairComparisons",
    locale: "en_SG",
    type: "website",
    images: [
      {
        url: "https://fair-comparisons.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "FairComparisons - Independent Property Agent Ratings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FairComparisons - Compare Property Agents in Singapore",
    description: "Ranked on real CEA transaction records, not advertising.",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

const NAV: [string, string][] = [
  ["/property-agents", "Compare agents"],
  ["/tools/valuation", "Online valuation"],
  ["/tools/mop-tracker", "MOP tracker"],
  ["/for-agents", "For agents"],
];

function Header() {
  return (
    <nav className="fc-nav">
      <div className="fc-wrap fc-nav__inner">
        <Lockup size={20} />
        <div className="fc-nav__links">
          <div className="hidden items-center gap-6 md:flex">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <Link href="/sell" className="fc-btn fc-btn--primary fc-btn--sm">
            <span className="md:hidden">Sell</span>
            <span className="hidden md:inline">Sell your property</span>
          </Link>
          {/* Mobile menu */}
          <details className="relative md:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[8px] border"
              style={{ borderColor: "var(--line-2)", color: "var(--ink)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div
              className="absolute right-0 top-11 z-50 w-52 rounded-[14px] border bg-white p-2"
              style={{ borderColor: "var(--line)", boxShadow: "var(--sh-2)" }}
            >
              {NAV.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-[8px] px-3 py-2 text-sm font-semibold"
                  style={{ color: "var(--ink)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ background: "var(--ink)", color: "#fff" }}>
      <div className="fc-wrap" style={{ padding: "56px 40px 40px" }}>
        <div className="fc-grid-3" style={{ gap: "var(--s7)" }}>
          <div>
            <Lockup size={20} light href="/" />
            <p
              className="muted"
              style={{ marginTop: 14, color: "rgba(255,255,255,0.7)", fontSize: 14, maxWidth: "34ch" }}
            >
              The independent way to choose a Singapore property agent. Ranked on real government data, never advertising.
            </p>
            <a
              href="mailto:hello@fair-comparisons.com"
              style={{ marginTop: 10, display: "block", fontSize: 14, color: "var(--slate-2)" }}
            >
              hello@fair-comparisons.com
            </a>
          </div>
          <div>
            <div className="eyebrow" style={{ color: "var(--slate-2)" }}>
              Platform
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              {[
                ["/property-agents", "Compare agents"],
                ["/sell", "Sell your property"],
                ["/tools/valuation", "Online valuation"],
                ["/tools/mop-tracker", "MOP tracker"],
                ["/for-agents", "For agents"],
                ["/guides/property-agent-commission", "Agent commission guide"],
                ["/guides", "Property guides"],
                ["/how-we-score", "How we score"],
                ["/independent", "Why we're independent"],
                ["/about", "About"],
                ["/trust", "Trust & data"],
                ["/contact", "Contact"],
                ["/privacy", "Privacy"],
                ["/terms", "Terms"],
              ].map(([href, label]) => (
                <Link key={href} href={href} style={{ color: "rgba(255,255,255,0.78)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <EmailCapture variant="footer" source="footer" />
          </div>
        </div>
        <div
          className="mono"
          style={{
            marginTop: 40,
            paddingTop: 22,
            borderTop: "1px solid var(--line-dk)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--slate-2)",
          }}
        >
          Free for sellers · Ranked on CEA, URA and HDB data · No paid placement · Built in Singapore
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className={`${newsreader.variable} ${hanken.variable} ${spline.variable} antialiased`}>
      <head />
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-K4D8EQ6D9G" strategy="afterInteractive" />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-K4D8EQ6D9G');`,
        }}
      />
      <body className="min-h-screen">
        <ChromeGate><Header /></ChromeGate>
        <main>{children}</main>
        <ChromeGate><Footer /></ChromeGate>
        <PageTracker />
      </body>
    </html>
  );
}
