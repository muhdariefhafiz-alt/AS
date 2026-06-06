"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Mobile-only sticky "compare agents" bar for discovery pages (agent, district,
// best-area). SG property search is mobile-first and the convert action scrolls
// away. Hides on desktop (md:hidden) and auto-hides near the page bottom so it
// never covers the footer.
export default function StickyMobileCta({
  href,
  label = "Compare agents",
}: {
  href: string;
  label?: string;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
      setHidden(nearBottom);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t transition-transform md:hidden ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
      style={{
        background: "#fff",
        borderColor: "var(--line)",
        padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 16px rgba(10,23,51,0.08)",
      }}
    >
      <Link href={href} className="fc-btn fc-btn--primary fc-btn--block">
        {label}
      </Link>
    </div>
  );
}
