"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { titleName, cleanAgency } from "../lib/names";
import { Icon } from "./Icons";

// The /claim entry point's working heart: an agent finds THEMSELVES by name or
// CEA number and lands one tap from the claim form on their own profile
// (#claim anchor). Public data only (name/agency/area/score); the pick fires a
// funnel event so the new entry's conversion is measurable end to end.
type Row = {
  id: number;
  name: string;
  slug: string;
  agency_name: string | null;
  primary_area: string | null;
  score: number | null;
  claimed: boolean;
  cea_registration: string;
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function AgentClaimSearch() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  // The term the current `rows` answer, so empty-state copy never flashes for
  // a query that has not been searched yet. All setState happens inside the
  // debounce timeout (never synchronously in the effect body).
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      const looksCea = /^r\d/i.test(term);
      const query = supabase
        .from("sg_agents")
        .select("id, name, slug, agency_name, primary_area, score, claimed, cea_registration")
        .limit(8);
      const { data } = looksCea
        ? await query.ilike("cea_registration", `${term}%`)
        : await query.ilike("name", `%${term}%`);
      if (!cancelled) {
        setRows((data ?? []) as Row[]);
        setSearched(term);
        setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [q]);

  function pick(agentId: number) {
    fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "claim_entry_pick", agentId, metadata: { q: q.trim().slice(0, 40) } }),
    }).catch(() => {});
  }

  return (
    <div>
      <div className="sr-search" style={{ background: "#fff" }}>
        <Icon.Search size={20} className="ic" />
        <input
          className="sr-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Your name or CEA number (e.g. R012345A)"
          aria-label="Find your agent profile"
          autoComplete="off"
        />
      </div>
      {loading && <p className="muted small" style={{ marginTop: 12 }}>Searching the register&hellip;</p>}
      {!loading && q.trim().length >= 2 && searched === q.trim() && rows.length === 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          No match yet. Try your name exactly as registered with CEA, or your CEA number.
        </p>
      )}
      {q.trim().length >= 2 && rows.length > 0 && (
        <div className="fc-card" style={{ marginTop: 12, padding: "4px 18px", background: "#fff", textAlign: "left" }}>
          {rows.map((a, i) => (
            <Link
              key={a.id}
              href={`/property-agents/agent/${a.slug}${a.claimed ? "" : "#claim"}`}
              onClick={() => pick(a.id)}
              className="fc-pop-in"
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                borderTop: i > 0 ? "1px solid var(--line)" : "none", color: "inherit", textDecoration: "none",
                animationDelay: `${Math.min(i * 50, 300)}ms`,
              }}
            >
              <span className="fc-avatar" style={{ width: 38, height: 38, borderRadius: 10, fontSize: 14, flexShrink: 0 }}>
                {initials(a.name)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{titleName(a.name)}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {[a.agency_name ? cleanAgency(a.agency_name) : null, a.primary_area ? titleName(a.primary_area) : null, `CEA ${a.cea_registration}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {a.score != null && (
                <span
                  style={{
                    fontWeight: 700, fontSize: 13, background: "var(--blue-wash)", color: "var(--blue-deep)",
                    borderRadius: 9, padding: "5px 9px", fontVariantNumeric: "tabular-nums", flexShrink: 0,
                  }}
                >
                  {Math.round(Number(a.score))}
                </span>
              )}
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--blue)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {a.claimed ? "View" : "This is me"} &rarr;
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
