import type { Metadata } from "next";

// Embed routes are noindex: they are meant to be iframed on other sites, not to
// compete in search with the canonical tool pages.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
