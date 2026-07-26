"use client";

import { useEffect, useRef, useState } from "react";

// Self-typing text: the "product demos itself" primitive (an AI draft writing
// itself, a reply composing). Progressive enhancement in the same spirit as
// ScrollReveal: the server HTML carries the FULL text, so crawlers, no-JS
// visitors and reduced-motion users always see complete content. Only when JS
// runs, motion is allowed and the element scrolls into view do we clear it and
// retype character by character.
export default function TypingDemo({
  text,
  speed = 14,
  startDelay = 350,
  className,
  cursor = true,
  active = true,
  onDone,
}: {
  text: string;
  /** ms per character */
  speed?: number;
  /** ms after entering the viewport (and active) before typing starts */
  startDelay?: number;
  className?: string;
  cursor?: boolean;
  /** choreography gate: typing waits until this turns true */
  active?: boolean;
  /** fires once when the last character lands (never under reduced motion) */
  onDone?: () => void;
}) {
  // Hydration-safe: initial state matches the server (full text visible).
  const [shown, setShown] = useState(text.length);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;
    let interval: number | undefined;
    const begin = () => {
      if (started.current) return;
      started.current = true;
      timer = window.setTimeout(() => {
        setShown(0);
        setTyping(true);
        let i = 0;
        interval = window.setInterval(() => {
          i += 1;
          setShown(i);
          if (i >= text.length) {
            window.clearInterval(interval);
            setTyping(false);
            finished.current = true;
            doneRef.current?.();
          }
        }, speed);
      }, startDelay);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        begin();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
      // A choreographing parent can toggle `active` mid-arm (its own reset
      // races our start timer). If typing never completed, re-arm so the next
      // activation replays instead of silently freezing on the guard.
      if (!finished.current) started.current = false;
    };
  }, [text, speed, startDelay, active]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      {cursor && typing && <span className="fc-type-cursor" aria-hidden="true" />}
    </span>
  );
}
