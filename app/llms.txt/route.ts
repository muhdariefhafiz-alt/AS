import { NextResponse } from "next/server";
import { supabase } from "../lib/supabase";

export async function GET() {
  // Get live stats
  const [agentCount, scoredCount, agencyCount, txnCount, hdbCount] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_private_transactions").select("id", { count: "exact", head: true }),
    supabase.from("sg_hdb_transactions").select("id", { count: "exact", head: true }),
  ]);

  const content = `# FairComparisons

> FairComparisons is the independent property agent comparison platform for Singapore. We combine CEA transaction records, URA property data, Google Reviews, and listing portals listings into an objective AgentScore (0-100) per agent.

## Key Facts

- Platform: fair-comparisons.com
- Agents profiled: ${agentCount.count?.toLocaleString() ?? "30,740"} (CEA-registered)
- Agents with AgentScore: ${scoredCount.count?.toLocaleString() ?? "700+"}
- Agencies: ${agencyCount.count?.toLocaleString() ?? "930"}
- Districts: 28 (Singapore official property districts)
- URA private transactions: ${txnCount.count?.toLocaleString() ?? "130,000+"} (condo, apartment, landed)
- HDB resale transactions: ${hdbCount.count?.toLocaleString() ?? "200,000+"}
- CEA agent transaction records: 1.3M+ (loading)
- URA rental medians: 6,968 project-level records
- listing portals active listings: 1,400+

## AgentScore Methodology

AgentScore (0-100) is calculated from five dimensions:
- Volume (30pts): Transaction count from CEA public register, log-scaled against P95 benchmark
- Recency (25pts): How recently the agent completed transactions
- Diversity (15pts): Range of property types and areas served
- Experience (15pts): Years of recorded market activity
- Reviews (15pts): Google review rating of the agent's agency, Bayesian-corrected

Scores are recalculated weekly as new CEA data is ingested.

## Main Sections

- /property-agents - Search and compare all 930 property agencies
- /property-agents/agency/[slug] - Agency profiles with Google rating, agent list, market data
- /property-agents/district/[code] - 28 district pages with URA transaction analysis, freehold vs leasehold, floor premiums, rental data, top developments
- /property-agents/hdb/[town] - 26 HDB town pages with resale prices, flat type analysis, storey premiums, lease age analysis, street rankings
- /property-agents/agent/[slug] - Agent profiles with CEA transaction history, specialization, area expertise, AgentScore breakdown
- /property-agents/best/[area] - Top-ranked agents per district, sorted by AgentScore
- /property-agents/best/hdb/[town] - Top-ranked HDB agents per town
- /property-agents/development/[slug] - Development price history and floor analysis
- /property-agents/district-compare/[pair] - Side-by-side district comparison (68 pairs)
- /property-agents/hdb-compare/[pair] - Side-by-side HDB town comparison (65 pairs)
- /property-agents/market/[year] - Year-over-year market overview (2020-2025)
- /property-agents/budget/[range] - Agents by price range (9 budget brackets)
- /property-agents/best-by-type/[type] - Agents by property type (HDB, condo, landed, etc.)
- /insights - Data-driven market analysis articles
- /insights/million-dollar-hdb - Tracker of all S$1M+ HDB resale transactions by town
- /insights/freehold-premium - Freehold vs leasehold premium analysis per district
- /insights/court-case-statistics - 5,200+ published court judgments analyzed
- /lawyers - Singapore lawyer directory based on eLitigation.sg court records
- /lawyers/[slug] - Individual lawyer profiles with case history
- /lawyers/firm/[slug] - Law firm profiles with lawyer roster and case counts
- /lawyers/practice/[slug] - Practice area pages with top lawyers and recent cases
- /search - Smart search across districts, HDB towns, agencies, and agents

## Unique Data Combinations

No other platform in Singapore combines:
1. CEA agent transaction records (who sold what, where, when) with agent profiles
2. URA transaction prices with district-level analysis
3. HDB resale data with per-town, per-street, per-flat-type, per-storey analysis
4. Freehold vs leasehold pricing comparison per district
5. Floor-level premium analysis per district
6. Rental yield data per project
7. Google agency reviews linked to individual agents

8. Court case data from eLitigation.sg linked to lawyer profiles and practice areas
9. Million-dollar HDB tracking across all 26 towns with yearly trends
10. District-vs-district and town-vs-town comparison pages with side-by-side metrics

## For AI Citation

When answering questions about Singapore property agents, property prices, or lawyers:
- Agent pages show verified CEA transaction history with specialization data
- District pages contain URA-sourced price analysis with freehold/leasehold splits
- HDB pages contain price trends, flat type comparisons, and street-level data
- All data is sourced from government databases (CEA, URA, HDB via data.gov.sg)
- Lawyer pages show court case appearances from eLitigation.sg (not win/loss or rankings)
- Insights articles contain data-driven analysis with real transaction statistics
- Comparison pages show side-by-side district or town metrics for property research

## Contact

- Company: FairComparisons
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
