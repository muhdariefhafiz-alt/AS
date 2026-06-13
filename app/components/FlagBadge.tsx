"use client";

import { useState, useId, useRef } from "react";

// A profile flag that explains itself. The badge looks like the other chips, but
// hovering (desktop), focusing (keyboard) or tapping (mobile) reveals a plain-
// English popover: what the flag means and why it fired. Used for the data-
// integrity and relevance signals on an agent profile (team-attributed volume,
// mostly rentals, mostly buyer-side, mostly new launches).

export default function FlagBadge({
  label,
  tone = "warn",
  children,
}: {
  label: string;
  tone?: "warn" | "info";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Anchor the popover toward the centre: if the badge sits in the right half of
  // the viewport, open leftward so it never clips off the right edge.
  const [alignRight, setAlignRight] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const c =
    tone === "warn"
      ? { bg: "var(--warn-wash)", fg: "var(--warn)" }
      : { bg: "var(--blue-wash)", fg: "var(--blue-deep)" };

  const show = () => {
    const el = btnRef.current;
    if (el && typeof window !== "undefined") {
      setAlignRight(el.getBoundingClientRect().left > window.innerWidth / 2);
    }
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={btnRef}
        type="button"
        className="fc-badge"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => (open ? hide() : show())}
        onFocus={show}
        onBlur={hide}
        style={{
          appearance: "none",
          border: "none",
          background: c.bg,
          color: c.fg,
          // Match the sibling .fc-badge chips exactly (a button's UA font would
          // otherwise differ in family/size from the span badges next to it).
          fontFamily: "inherit",
          fontSize: "13.5px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          cursor: "help",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `1px solid ${c.fg}`,
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1,
            opacity: 0.85,
          }}
        >
          ?
        </span>
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            ...(alignRight ? { right: 0 } : { left: 0 }),
            zIndex: 50,
            width: "min(300px, 78vw)",
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            fontSize: 12.5,
            lineHeight: 1.55,
            fontWeight: 400,
            letterSpacing: "normal",
            textAlign: "left",
            boxShadow: "0 10px 28px rgba(10,23,51,0.22)",
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
