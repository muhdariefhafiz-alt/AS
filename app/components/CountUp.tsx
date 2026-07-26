"use client";

import { useEffect, useRef, useState } from "react";

// Number that counts up when scrolled into view. Server renders the FINAL
// value (SEO/no-JS/reduced-motion safe); with JS + motion it replays from 0
// with an ease-out curve so the last digits settle gently.
export default function CountUp({
  value,
  duration = 1100,
  className,
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [n, setN] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return;
        started.current = true;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(value * eased));
          if (p < 1) raf = window.requestAnimationFrame(tick);
        };
        setN(0);
        raf = window.requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}
