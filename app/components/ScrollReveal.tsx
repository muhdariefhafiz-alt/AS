"use client";

import { useEffect } from "react";

// Progressive-enhancement scroll reveal (the housapp "flawless animated" feel).
// Server HTML renders fully visible; only if JS runs and motion is allowed do we
// hide .fc-reveal elements (inline styles win the cascade) and reveal each as it
// enters the viewport. Uses a scroll/resize listener (not IntersectionObserver)
// so content is NEVER left permanently hidden — an on-mount pass reveals whatever
// is already in view, and a safety timeout reveals everything if anything stalls.
// No JS / reduced motion => full content stays visible. No deps.
export default function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".fc-reveal"));
    if (!els.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // leave visible

    const reveal = (el: HTMLElement) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.dataset.revealed = "1";
    };

    // Hide (inline beats any CSS opacity; .fc-reveal carries the transition).
    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(26px)";
      el.style.willChange = "opacity, transform";
    });

    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (const el of els) {
        if (el.dataset.revealed) continue;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) reveal(el);
      }
    };

    check(); // reveal whatever is already in view on load
    const onScroll = () => window.requestAnimationFrame(check);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Safety net: never leave content hidden if scrolling never happens.
    const safety = window.setTimeout(() => els.forEach(reveal), 4000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(safety);
    };
  }, []);

  return null;
}
