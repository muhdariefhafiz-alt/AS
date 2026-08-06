"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Product news, delivered once and then archived.
//
// The old model put every announcement in a stacked banner at the top of the
// dashboard: the least urgent thing on the page in the most prominent slot,
// pushing the agent's actual work down, and destroyed forever the moment they
// tapped the x. This replaces it with the pattern consumer apps settled on:
//
//   1. ONE focused card, once. It takes the screen, says one thing, and leaves.
//      Never two at a time, because two notices is zero notices read.
//   2. A permanent quiet entry point ("What's new") with an unread dot, so
//      closing an announcement archives it instead of shredding it.
//   3. A receipt for every appearance, so "have they all seen it?" is a
//      question with an answer instead of a hope.
//
// Escape and the backdrop both count as acknowledgement: an agent who closed
// the card decided about it, and re-showing a decided thing is how software
// teaches people to dismiss without reading.

type Announcement = {
  id: number;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  link_label: string | null;
  link_href: string | null;
  severity: string;
  created_at: string;
  unread: boolean;
};

type Feed = { spotlight: Announcement | null; whatsNew: Announcement[]; unreadCount: number };

// The composer offers three tones, so the card and its kicker have to carry
// them. "Warning" that renders identically to product news is a lie to the
// operator who picked it.
const TONE_KICKER: Record<string, string> = {
  info: "New in FairComparisons",
  success: "Now live",
  warn: "Please read",
};

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
}

async function postReceipt(id: number, action: "seen" | "ack" | "click") {
  try {
    await fetch("/api/dashboard/broadcast-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcast_id: id, action }),
      keepalive: true, // survives the navigation a CTA click causes
    });
  } catch {
    /* a lost receipt must never break the announcement */
  }
}

export default function Announcements() {
  const [feed, setFeed] = useState<Feed>({ spotlight: null, whatsNew: [], unreadCount: 0 });
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const seenLogged = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/dashboard/broadcasts")
      .then((r) => r.json())
      .then((j: Feed) => {
        if (!live) return;
        setFeed({ spotlight: j.spotlight ?? null, whatsNew: j.whatsNew ?? [], unreadCount: j.unreadCount ?? 0 });
        if (j.spotlight) setSpotlightOpen(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // One impression per appearance, recorded when the card is actually on screen.
  const spotlightId = feed.spotlight?.id ?? null;
  useEffect(() => {
    if (!spotlightOpen || spotlightId == null || seenLogged.current === spotlightId) return;
    seenLogged.current = spotlightId;
    postReceipt(spotlightId, "seen");
    closeRef.current?.focus();
  }, [spotlightOpen, spotlightId]);

  // The drawer is a portal at the end of <body>, so without an explicit move a
  // screen reader stays behind on the trigger and nothing is announced. Focus
  // returns to the trigger on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const returnTo = triggerRef.current;
    drawerCloseRef.current?.focus();
    return () => returnTo?.focus();
  }, [drawerOpen]);

  // Opening the archive shows every announcement in full, body and all, so what
  // is on that screen has been delivered. Without this an announcement with no
  // button and no link could never lose its unread dot, and a dot that cannot
  // be cleared is a dot people stop looking at.
  const openArchive = useCallback(() => {
    setDrawerOpen(true);
    setSpotlightOpen(false);
    const unread = feed.whatsNew.filter((a) => a.unread);
    if (!unread.length) return;
    unread.forEach((a) => postReceipt(a.id, "ack"));
    setFeed((f) => ({
      ...f,
      whatsNew: f.whatsNew.map((a) => ({ ...a, unread: false })),
      unreadCount: 0,
    }));
  }, [feed.whatsNew]);

  const acknowledge = useCallback(
    (id: number, action: "ack" | "click") => {
      postReceipt(id, action);
      setSpotlightOpen(false);
      setFeed((f) => ({
        ...f,
        whatsNew: f.whatsNew.map((a) => (a.id === id ? { ...a, unread: false } : a)),
        unreadCount: Math.max(0, f.unreadCount - (f.whatsNew.find((a) => a.id === id)?.unread ? 1 : 0)),
      }));
      triggerRef.current?.focus();
    },
    [],
  );

  // While a layer is open: Escape closes it (and closing the card is a
  // decision, so it acknowledges), Tab stays inside it, and the dashboard
  // behind it does not scroll away under the overlay.
  useEffect(() => {
    if (!spotlightOpen && !drawerOpen) return;
    const layer = () => document.querySelector<HTMLElement>(drawerOpen ? ".fc-anno-drawer" : ".fc-anno-card");

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        else if (spotlightOpen && feed.spotlight) acknowledge(feed.spotlight.id, "ack");
        return;
      }
      if (e.key !== "Tab") return;
      const root = layer();
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [spotlightOpen, drawerOpen, feed.spotlight, acknowledge]);

  const hasArchive = feed.whatsNew.length > 0;

  // Both layers are portalled to <body>. The trigger lives inside the agent
  // header card, which animates its transform on entry, and a transformed
  // ancestor becomes the containing block for position:fixed: rendered in
  // place, a full-screen overlay would be cropped to the card it came from.
  function overlay(node: React.ReactNode) {
    if (typeof document === "undefined") return null;
    return createPortal(node, document.body);
  }

  return (
    <>
      {/* The permanent entry point. Rendered only when there is an archive to
          open, so an agent with no news sees no chrome at all. */}
      {hasArchive && (
        <button
          ref={triggerRef}
          type="button"
          className="fc-anno-trigger"
          // A thumb needs 44px. Set here rather than only in CSS: the padding
          // buys the target and the negative margin pulls the box back to the
          // visual edge, so the row still reads as one line of quiet links.
          style={{ minHeight: 44, padding: "12px 8px", margin: "-12px -8px" }}
          data-unread={feed.unreadCount > 0 ? "1" : "0"}
          aria-label={feed.unreadCount > 0 ? `What's new, ${feed.unreadCount} unread` : "What's new"}
          onClick={openArchive}
        >
          {feed.unreadCount > 0 && <span className="fc-anno-dot" aria-hidden="true" />}
          What&apos;s new
        </button>
      )}

      {spotlightOpen && feed.spotlight && overlay(
        <div
          className="fc-anno-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget && feed.spotlight) acknowledge(feed.spotlight.id, "ack");
          }}
        >
          <div className="fc-anno-card" data-tone={feed.spotlight.severity} role="dialog" aria-modal="true" aria-labelledby="fc-anno-title">
            <button
              ref={closeRef}
              type="button"
              className="fc-anno-close"
              aria-label="Close"
              onClick={() => feed.spotlight && acknowledge(feed.spotlight.id, "ack")}
            >
              &times;
            </button>
            <p className="fc-anno-kicker">{TONE_KICKER[feed.spotlight.severity] ?? TONE_KICKER.info}</p>
            <h2 className="fc-anno-title" id="fc-anno-title">{feed.spotlight.title}</h2>
            <p className="fc-anno-body">{feed.spotlight.body}</p>
            <div className="fc-anno-actions">
              {feed.spotlight.cta_label && feed.spotlight.cta_href ? (
                <a
                  className="fc-btn fc-btn--primary fc-btn--sm"
                  href={feed.spotlight.cta_href}
                  onClick={() => feed.spotlight && acknowledge(feed.spotlight.id, "click")}
                >
                  {feed.spotlight.cta_label}
                </a>
              ) : (
                <button
                  type="button"
                  className="fc-btn fc-btn--primary fc-btn--sm"
                  onClick={() => feed.spotlight && acknowledge(feed.spotlight.id, "ack")}
                >
                  Got it
                </button>
              )}
              {feed.spotlight.link_label && feed.spotlight.link_href && (
                <a
                  className="small"
                  style={{ fontWeight: 600, color: "var(--slate)", textDecoration: "underline" }}
                  href={feed.spotlight.link_href}
                  onClick={() => feed.spotlight && acknowledge(feed.spotlight.id, "ack")}
                >
                  {feed.spotlight.link_label}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {drawerOpen && overlay(
        <div className="fc-anno-scrim" onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}>
          <aside className="fc-anno-drawer" role="dialog" aria-modal="true" aria-label="What's new">
            <div className="fc-anno-drawer-head">
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>What&apos;s new</span>
              <button ref={drawerCloseRef} type="button" className="fc-anno-close" style={{ position: "static" }} aria-label="Close" onClick={() => setDrawerOpen(false)}>
                &times;
              </button>
            </div>
            <div className="fc-anno-list">
              {feed.whatsNew.map((a) => (
                <div key={a.id} className="fc-anno-item">
                  <div className="fc-anno-item-title">
                    {a.unread && (
                      <>
                        <span className="fc-anno-dot" aria-hidden="true" />
                        {/* A bare span with aria-label is not exposed by most
                            screen readers; real text inside the heading is. */}
                        <span className="fc-sr-only">Unread. </span>
                      </>
                    )}
                    <span>{a.title}</span>
                  </div>
                  <p className="muted small" style={{ margin: "3px 0 0" }}>{monthYear(a.created_at)}</p>
                  <p className="small" style={{ margin: "8px 0 0", color: "var(--ink-3)", lineHeight: 1.55 }}>{a.body}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
                    {a.cta_label && a.cta_href && (
                      <a
                        className="small"
                        style={{ fontWeight: 700, color: "var(--blue)" }}
                        href={a.cta_href}
                        onClick={() => acknowledge(a.id, "click")}
                      >
                        {a.cta_label} &rarr;
                      </a>
                    )}
                    {a.link_label && a.link_href && (
                      <a
                        className="small"
                        style={{ fontWeight: 600, color: "var(--slate)", textDecoration: "underline" }}
                        href={a.link_href}
                        onClick={() => acknowledge(a.id, "ack")}
                      >
                        {a.link_label}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
