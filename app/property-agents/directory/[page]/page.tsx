import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "../../../lib/supabase";
import { titleName, cleanAgency } from "../../../lib/names";
import {
  AGENT_DIRECTORY_PAGE_SIZE,
  agentDirectoryPageCount,
  countIndexableAgents,
} from "../../../lib/indexable";

// A-to-Z crawl directory: gives every scored agent page an internal link at
// depth 2 from the sitewide footer (footer -> directory page -> agent page).
// Alphabetical, not ranked: this is a browse index, so it deliberately shows
// no scores and no ordering by performance. The full numbered strip on every
// page keeps all ~120 directory pages one click apart for crawlers.

export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ page: string }> };

const BASE = "https://fair-comparisons.com";

// Only the first pages are prerendered; the tail builds on demand (ISR) to
// keep build IO flat (see lessons on Supabase reads in prerender).
export async function generateStaticParams() {
  return [{ page: "1" }, { page: "2" }, { page: "3" }];
}

async function pageCount(): Promise<number> {
  return agentDirectoryPageCount(await countIndexableAgents());
}

function parsePage(raw: string, total: number): number | null {
  if (!/^[0-9]{1,4}$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 1 || n > total) return null;
  return n;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const total = await pageCount();
  const n = parsePage(page, total);
  if (!n) return { robots: { index: false, follow: false } };
  return {
    title: `Singapore Property Agents A to Z, Page ${n} of ${total}`,
    description: `Browse every CEA-registered Singapore property agent with a scored transaction record, alphabetically. Page ${n} of ${total}. Each name links to the agent's full record and AgentScore.`,
    alternates: { canonical: `${BASE}/property-agents/directory/${n}` },
  };
}

export default async function AgentDirectoryPage({ params }: Props) {
  const { page } = await params;
  const universe = await countIndexableAgents();
  const total = agentDirectoryPageCount(universe);
  const n = parsePage(page, total);
  if (!n) notFound();

  const from = (n - 1) * AGENT_DIRECTORY_PAGE_SIZE;
  // id tiebreak keeps .range() paging deterministic across duplicate names.
  const { data } = await supabase
    .from("sg_agents")
    .select("slug, name, agency_name, transaction_count")
    .not("score", "is", null)
    .not("slug", "is", null)
    .eq("is_hidden", false)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + AGENT_DIRECTORY_PAGE_SIZE - 1);

  const agents = data ?? [];
  if (agents.length === 0) notFound();

  const first = titleName(agents[0].name ?? "");
  const last = titleName(agents[agents.length - 1].name ?? "");

  const pageNums = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <>
      <section style={{ background: "var(--cloud)", borderBottom: "1px solid var(--line)" }}>
        <div className="fc-wrap" style={{ padding: "48px 40px 36px" }}>
          <div className="eyebrow">Agent directory</div>
          <h1 style={{ marginTop: 12, fontSize: "var(--t-h2)" }}>
            Every ranked agent, <span className="italic-serif">A to Z.</span>
          </h1>
          <p className="lede" style={{ marginTop: 12, maxWidth: "62ch" }}>
            All {universe.toLocaleString()} CEA-registered agents with a scored transaction
            record, in alphabetical order. Page {n} of {total}: {first} to {last}. Each name
            opens the agent&apos;s full record, reviews and AgentScore.
          </p>
          <p className="mono" style={{ marginTop: 10, fontSize: 12.5, color: "var(--slate)" }}>
            Alphabetical, not a ranking · <Link href="/search" style={{ color: "var(--blue)" }}>Search by name or area instead &rarr;</Link>
          </p>
        </div>
      </section>

      <section className="fc-wrap" style={{ padding: "36px 40px 56px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
          {agents.map((a) => (
            <Link
              key={a.slug}
              href={`/property-agents/agent/${a.slug}`}
              className="fc-card fc-card--hover"
              style={{ padding: "11px 14px", display: "block", textDecoration: "none", color: "inherit", background: "#fff" }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {titleName(a.name ?? "")}
              </div>
              <div className="muted" style={{ marginTop: 2, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.agency_name ? cleanAgency(a.agency_name) : "Independent"}
                {(a.transaction_count ?? 0) > 0 && (
                  <span className="mono" style={{ marginLeft: 8, fontSize: 11.5 }}>
                    {(a.transaction_count ?? 0).toLocaleString()} {a.transaction_count === 1 ? "deal" : "deals"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        <nav aria-label="Directory pages" style={{ marginTop: 32 }}>
          <div className="fc-row" style={{ gap: 10, marginBottom: 12 }}>
            {n > 1 && (
              <Link href={`/property-agents/directory/${n - 1}`} className="fc-btn fc-btn--quiet fc-btn--sm">
                &larr; Previous
              </Link>
            )}
            {n < total && (
              <Link href={`/property-agents/directory/${n + 1}`} className="fc-btn fc-btn--quiet fc-btn--sm">
                Next &rarr;
              </Link>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pageNums.map((p) =>
              p === n ? (
                <span
                  key={p}
                  aria-current="page"
                  className="mono"
                  style={{
                    fontSize: 12, padding: "4px 8px", borderRadius: 6,
                    background: "var(--blue-wash)", color: "var(--blue-deep)", fontWeight: 700,
                  }}
                >
                  {p}
                </span>
              ) : (
                <Link
                  key={p}
                  href={`/property-agents/directory/${p}`}
                  className="mono"
                  style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, color: "var(--slate)", textDecoration: "none" }}
                >
                  {p}
                </Link>
              )
            )}
          </div>
        </nav>
      </section>
    </>
  );
}
