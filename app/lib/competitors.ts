// Verified data for the "X alternative for agents" comparison pages.
// Every competitor entry's facts are researched + adversarially verified against
// the competitor's own site (dated in `verifiedOn`) and kept factual and
// non-disparaging. Do not add a competitor here without sourced facts.

export type CompareRow = { label: string; them: string; us: string };
export type Differentiator = { them: string; us: string; detail: string };
export type CompetitorFaq = { q: string; a: string };

export type CompetitorData = {
  slug: string; // route slug, e.g. "99co" -> /for-agents/99co-alternative
  name: string; // display name, e.g. "99.co"
  url: string; // official site (for the sourced-on note)
  verifiedOn: string; // ISO date the facts were verified
  metaTitle: string;
  metaDescription: string;
  heroHeadline: string; // "<Competitor> does X." (first line)
  heroAccent: string; // "FairComparisons does Y." (accent second line)
  heroSub: string;
  compareRows: CompareRow[];
  differentiators: Differentiator[];
  faq: CompetitorFaq[];
  bothNote: string; // honest "not either-or / many agents use both" line
};

// Populated from verified research (research-sg-competitors workflow, 2026-07-12).
// Every claim is sourced and every adversarial-verifier softener has been applied:
// no unsourced exact prices, company-stated figures attributed, strengths conceded,
// non-disparaging throughout. All five confirm our wedge: none runs a seller-side
// compare-agents-and-invite-to-quote marketplace.
export const COMPETITORS: Record<string, CompetitorData> = {
  "99co": {
    slug: "99co", name: "99.co", url: "https://www.99.co", verifiedOn: "2026-07-12",
    metaTitle: "99.co Alternative for Agents - FairComparisons",
    metaDescription:
      "99.co is a listing portal agents pay for. FairComparisons lists and ranks every CEA agent free, on real CEA/URA/HDB records, and lets sellers compare and invite you to quote. See how they compare.",
    heroHeadline: "99.co sells listings and leads to agents.",
    heroAccent: "FairComparisons ranks you free, on your record.",
    heroSub:
      "99.co is one of Singapore's top consumer portals. FairComparisons is a seller-first comparison layer: every CEA agent is listed and ranked on real transaction data at no cost, and sellers compare agents and invite them to quote.",
    compareRows: [
      { label: "Seller enquiries sent to you", them: "Owner Listings broadcast an owner's unit to the agent pool; agents contact the owner", us: "Sellers shortlist agents and invite up to 3 to quote" },
      { label: "Cost to be listed, ranked and found", them: "Paid subscription packages plus credits (published on the 99 Agent Property Hub)", us: "Free forever, and never a cut of your sale" },
      { label: "How you are surfaced to clients", them: "CEA-verified profiles with track records and reviews; listing prominence is influenced by paid boosting", us: "AgentScore on verified CEA/URA/HDB records, never for sale" },
      { label: "Cost to the seller or consumer", them: "Free to search; valuation tools via SRX X-Value", us: "Always free for sellers" },
      { label: "Business model", them: "Agent listing subscriptions, credits and lead products", us: "Optional agent tool subscriptions only, never pay-to-rank" },
    ],
    differentiators: [
      { them: "99.co sells listings and leads to agents.", us: "FairComparisons ranks you on your record, free.", detail: "Your AgentScore is computed from CEA, URA and HDB transaction data; being listed and ranked costs nothing and we take no cut of your sale." },
      { them: "On 99.co, listing prominence follows paid credits.", us: "On FairComparisons, ranking follows your transactions.", detail: "There is no boosting or featured placement to buy. The only way to rank higher is to close more of the deals sellers care about." },
      { them: "99.co's Owner Listings broadcast to the agent pool.", us: "FairComparisons lets the seller compare and invite you.", detail: "A seller shortlists agents on their record and invites up to three to quote, so the enquiries you receive come from sellers who chose you." },
      { them: "99.co has huge reach and SRX X-Value data.", us: "Use both: portal reach plus an independent record.", detail: "We are not competing on listing inventory or valuation data. Many agents list on 99.co and use FairComparisons for the independent record and the seller comparison." },
    ],
    faq: [
      { q: "Is FairComparisons a replacement for 99.co?", a: "No. 99.co is a consumer listing portal and agent marketing suite; FairComparisons is a seller-first comparison layer and an independent agent record. Many agents use both, 99.co for listing reach and FairComparisons for the record and the seller enquiries." },
      { q: "What does each cost an agent?", a: "On FairComparisons, being listed, ranked and found is free forever, and we never take a cut of a sale; optional tool subscriptions are Verified S$29, Professional S$69, Elite S$149 per month and never change your rank. 99.co sells agent subscription packages plus credits, published on its 99 Agent Property Hub." },
      { q: "Does 99.co send me seller enquiries?", a: "Its free Owner Listings channel broadcasts an owner's unit to the agent subscriber pool, and agents then contact the owner; the agent directory is browse-only. On FairComparisons a seller compares agents and invites up to three to quote, so you hear from sellers who picked you." },
      { q: "How are agents ranked on each?", a: "99.co shows CEA-verified profiles with automated track records and reviews, while listing prominence is influenced by paid boosting. FairComparisons ranks by AgentScore computed from CEA/URA/HDB records; payment never changes your position." },
      { q: "Is 99.co better at anything?", a: "Yes, and it is worth being straight about it. 99.co is a top-two Singapore portal with huge consumer reach, a large agent network and strong valuation data through the SRX X-Value model it owns. It is a different job from an independent, seller-first agent comparison." },
    ],
    bothNote: "Not either-or: many agents run listings on 99.co and use FairComparisons for the independent record and the seller comparison.",
  },

  srx: {
    slug: "srx", name: "SRX", url: "https://www.srx.com.sg", verifiedOn: "2026-07-12",
    metaTitle: "SRX Alternative for Agents - FairComparisons",
    metaDescription:
      "SRX is a data portal agents pay to list and feature on. FairComparisons lists and ranks every CEA agent free, on real transaction records, with a seller compare-and-invite marketplace. See how they compare.",
    heroHeadline: "SRX ranks agents by listings and paid slots.",
    heroAccent: "FairComparisons ranks you on your record, free.",
    heroSub:
      "SRX is a trusted data and listings portal, part of the 99 Group. FairComparisons is the seller-first layer: every CEA agent is ranked on real transaction data at no cost, and sellers compare agents and invite them to quote.",
    compareRows: [
      { label: "Seller enquiries sent to you", them: "Agent Finder directory plus an SRX Concierge lead-capture that routes seller enquiries to agents/partners", us: "Sellers shortlist agents and invite up to 3 to quote" },
      { label: "Cost to be listed, ranked and found", them: "Paid subscription packages that cross-post to 99.co and SRX, plus paid Featured Agent placements", us: "Free forever, and never a cut of your sale" },
      { label: "How you are surfaced to clients", them: "Directory with track records, plus per-listing exposure and paid Featured Agent slots above the natural order", us: "AgentScore on verified CEA/URA/HDB records, never for sale" },
      { label: "Cost to the seller or consumer", them: "Free to search and use X-Value; formal SRX Valuations are a paid service", us: "Always free for sellers" },
      { label: "Business model", them: "Agent subscriptions, featured placements and valuations", us: "Optional agent tool subscriptions only, never pay-to-rank" },
    ],
    differentiators: [
      { them: "SRX visibility follows paid packages and featured slots.", us: "FairComparisons ranks you on merit, free.", detail: "There is no featured placement to buy. Your AgentScore comes from CEA, URA and HDB records, and being ranked costs nothing." },
      { them: "SRX routes seller enquiries via directory and concierge.", us: "FairComparisons lets the seller compare and invite you.", detail: "A seller shortlists agents on their record and invites up to three to quote, rather than a directory or a concierge that assigns the enquiry." },
      { them: "SRX surfaces track records alongside paid promotion.", us: "FairComparisons ranks on the record itself.", detail: "SRX holds strong validated transaction data, but prominence is influenced by paid packages; our AgentScore uses transaction data to rank and cannot be bought." },
      { them: "SRX has trusted data and the X-Value model.", us: "Use both: SRX data plus an independent record.", detail: "We are not competing on valuation data. Many agents subscribe to SRX and use FairComparisons for the independent, purchasable-proof-free ranking and the seller comparison." },
    ],
    faq: [
      { q: "Is FairComparisons a replacement for SRX?", a: "No. SRX is a data and listings portal (part of the 99 Group); FairComparisons is a seller-first comparison layer and an independent agent record. Many agents use both." },
      { q: "What does each cost an agent?", a: "FairComparisons is free to be listed, ranked and found, with optional tool subscriptions (S$29/69/149) that never change rank. SRX is paid: agent subscription packages that cross-post to 99.co and SRX, plus optional paid Featured Agent placements sold via an account manager." },
      { q: "Does SRX let sellers compare agents and invite quotes?", a: "Not in that structured way. A seller browses the Agent Finder directory and contacts agents, or uses the SRX Concierge lead flow that routes their enquiry to agents or partners. FairComparisons is built specifically for the seller to compare agents on record and invite a shortlist to quote." },
      { q: "How are agents ranked on each?", a: "SRX surfaces agents through the directory (with track records), per-listing exposure and paid Featured Agent slots that promote an agent above the natural order. FairComparisons ranks by AgentScore from CEA/URA/HDB records; placement cannot be bought." },
      { q: "Is SRX better at anything?", a: "Yes. SRX is well known for validated, quality-controlled listings and its widely-cited X-Value valuation, backed by data shared by major agencies. That data credibility is a real strength and a different job from an independent, seller-first agent comparison." },
    ],
    bothNote: "Not either-or: many agents subscribe to SRX for data and reach and use FairComparisons for the independent record and the seller comparison.",
  },

  ohmyhome: {
    slug: "ohmyhome", name: "Ohmyhome", url: "https://ohmyhome.com", verifiedOn: "2026-07-12",
    metaTitle: "Ohmyhome Alternative for Agents - FairComparisons",
    metaDescription:
      "Ohmyhome sells through its own in-house agents. FairComparisons lists and ranks every independent CEA agent free, on real transaction records, and lets sellers compare and invite them to quote.",
    heroHeadline: "Ohmyhome sells through its own in-house agents.",
    heroAccent: "FairComparisons ranks every independent agent, free.",
    heroSub:
      "Ohmyhome is a low-fixed-fee brokerage and DIY portal staffed by its own agents. FairComparisons is a neutral comparison of every independent CEA agent, ranked on real transaction data, where the seller compares and invites quotes.",
    compareRows: [
      { label: "Whose agents", them: "Its own employed in-house agents, assigned to the seller by area and property type", us: "Every independent CEA-registered agent in Singapore" },
      { label: "Seller enquiries sent to you", them: "Not applicable to outside agents; Ohmyhome routes the seller to its own agent", us: "Sellers shortlist agents and invite up to 3 to quote" },
      { label: "Cost to be listed and ranked", them: "No pay-to-list marketplace for outside agents (its agents are employees)", us: "Free forever for every CEA agent, and never a cut of your sale" },
      { label: "How agents are ranked", them: "No independent ranking; it markets its own agents as high performers by transaction volume", us: "AgentScore on verified CEA/URA/HDB records, never for sale" },
      { label: "Cost to the seller", them: "DIY listings free; its agency service is a low fixed or ~1% fee, collected only on a sale", us: "Always free for sellers" },
    ],
    differentiators: [
      { them: "Ohmyhome assigns you one of its own agents.", us: "FairComparisons lets you compare independent agents.", detail: "A seller shortlists multiple independent CEA agents on their track record and invites them to quote, rather than being routed to a single in-house agent." },
      { them: "Ohmyhome ranks nobody; it markets its own roster.", us: "FairComparisons ranks on an independent AgentScore.", detail: "Our ranking is computed from official CEA, URA and HDB transaction records for the whole market, not a marketing claim about one firm's own staff." },
      { them: "Ohmyhome surfaces only its own agents.", us: "FairComparisons covers the whole market, free.", detail: "Every CEA-registered agent appears and is ranked whether or not they pay, so sellers see neutral coverage rather than one brokerage's roster." },
      { them: "Ohmyhome's low fixed fee is genuinely competitive.", us: "We are a different layer, not a brokerage.", detail: "Ohmyhome's cheaper-than-market agency is a real option for some sellers. FairComparisons does not sell homes; it helps sellers compare independent agents and lets those agents quote their own fee." },
    ],
    faq: [
      { q: "Is FairComparisons the same as Ohmyhome?", a: "No. Ohmyhome is a technology-enabled brokerage with its own in-house agents and a free DIY portal. FairComparisons is a neutral comparison of every independent CEA agent, where the seller compares track records and invites a shortlist to quote. Different models." },
      { q: "Can an independent agent be listed on Ohmyhome?", a: "Ohmyhome's agent supply is its own employed agents, not independent agents who pay to be listed or ranked, so there is no pay-to-list marketplace for outside agents. On FairComparisons every CEA-registered agent is listed and ranked for free." },
      { q: "How are agents surfaced on each?", a: "When a seller engages Ohmyhome, it assigns one of its own agents by area and property type and markets its agents as high performers by transaction volume. FairComparisons ranks all agents by an independent AgentScore from CEA/URA/HDB records that cannot be bought." },
      { q: "Is Ohmyhome cheaper for sellers?", a: "Ohmyhome's fixed or roughly 1% fee, collected only on a completed sale, genuinely undercuts the traditional 2 to 3 percent, and DIY listing is free. On FairComparisons sellers pay nothing and each shortlisted agent quotes their own commission, so sellers can compare real fees, including agents who match or beat that." },
    ],
    bothNote: "Different jobs: Ohmyhome is a low-fee brokerage option; FairComparisons is the neutral way to compare every independent agent before you choose one.",
  },

  mogul: {
    slug: "mogul", name: "Mogul.sg", url: "https://mogul.sg", verifiedOn: "2026-07-12",
    metaTitle: "Mogul.sg Alternative for Agents - FairComparisons",
    metaDescription:
      "Mogul.sg assigns sellers one partner agent for a flat fee. FairComparisons lists and ranks every CEA agent free, on real transaction records, and lets sellers compare and invite them to quote.",
    heroHeadline: "Mogul.sg assigns sellers one partner agent.",
    heroAccent: "FairComparisons lets sellers compare every agent.",
    heroSub:
      "Mogul.sg is a data-rich portal with a low-cost, concierge selling service. FairComparisons is the seller-first comparison layer: every CEA agent is ranked on real transaction data, and the seller compares and invites a shortlist to quote.",
    compareRows: [
      { label: "Seller enquiries sent to you", them: "Its AI agent (MAIA) routes buyer leads to the listing's agent; the seller service assigns one partner agent", us: "Sellers shortlist agents and invite up to 3 to quote" },
      { label: "Cost to be listed and ranked", them: "No additional listing fee to receive MAIA leads; a 0.2% referral to Mogul only on a successful sale", us: "Free forever, and never a cut of your sale" },
      { label: "How agents are surfaced", them: "No public merit ranking of agents; the seller is assigned one partner agent (concierge model)", us: "AgentScore on verified CEA/URA/HDB records, never for sale" },
      { label: "Cost to the seller", them: "A flat S$150 admin fee for its 0% commission service, refundable under a 90-day guarantee", us: "Always free for sellers" },
      { label: "Business model", them: "Consumer data + a 0.2% success referral on assigned sales", us: "Optional agent tool subscriptions only, never a cut of the sale" },
    ],
    differentiators: [
      { them: "Mogul assigns the seller one partner agent.", us: "FairComparisons lets the seller compare and choose.", detail: "A seller shortlists multiple agents on their track record and invites them to quote, rather than a concierge model that assigns a single partner agent." },
      { them: "Mogul publishes no independent agent ranking.", us: "FairComparisons ranks on an independent AgentScore.", detail: "Our ranking is computed from official CEA, URA and HDB records so sellers can see who actually sells, which an assigned-agent service does not surface." },
      { them: "Mogul earns a 0.2% referral on the sale.", us: "FairComparisons takes no cut of your sale.", detail: "We are paid only by optional agent tool subscriptions and never by pay-to-rank, so the comparison stays independent of any transaction incentive." },
      { them: "Mogul's flat-fee model and data tools are a real draw.", us: "Use both: Mogul's tools plus a free comparison.", detail: "Mogul says it built rich map, keyword and valuation tools and a low-cost selling service. Many sellers will still want to compare independent agents first, which is what FairComparisons is for." },
    ],
    faq: [
      { q: "Is FairComparisons the same as Mogul.sg?", a: "No. Mogul.sg is a data portal with a low-cost concierge selling service that assigns the seller one partner agent. FairComparisons is a neutral comparison of every independent CEA agent, where the seller compares track records and invites a shortlist to quote." },
      { q: "What does each cost an agent?", a: "FairComparisons is free to be listed and ranked, with optional tool subscriptions that never change rank and no cut of your sale. Mogul charges agents no extra listing fee to receive its MAIA leads and takes a 0.2% referral only on a successful sale, versus the usual 1% co-broke." },
      { q: "Does Mogul let sellers compare agents?", a: "Not in a compare-and-invite way. A seller using Mogul's flat S$150 service is assigned one Mogul-partnered agent (a concierge model), and its MAIA assistant routes buyer enquiries to the listing's agent. FairComparisons is built for the seller to compare agents on record and invite quotes." },
      { q: "Is Mogul cheaper for sellers?", a: "Mogul advertises a flat S$150 admin fee (refundable under a 90-day money-back guarantee) instead of the usual seller commission, which is genuinely low-cost. On FairComparisons sellers pay nothing and each shortlisted agent quotes their own fee, so sellers can weigh a full-service agent against Mogul's model on real numbers." },
    ],
    bothNote: "Different jobs: Mogul is a low-cost selling service; FairComparisons is the neutral way to compare every independent agent first.",
  },

  edgeprop: {
    slug: "edgeprop", name: "EdgeProp", url: "https://www.edgeprop.sg", verifiedOn: "2026-07-12",
    metaTitle: "EdgeProp Alternative for Agents - FairComparisons",
    metaDescription:
      "EdgeProp sells agents leads and featured placement. FairComparisons lists and ranks every CEA agent free, on real transaction records, and lets sellers compare and invite them to quote.",
    heroHeadline: "EdgeProp sells agents leads and placement.",
    heroAccent: "FairComparisons ranks you free, on your record.",
    heroSub:
      "EdgeProp is a listings-and-data portal with an attached agent-services arm. FairComparisons is the seller-first layer: every CEA agent is ranked on real transaction data at no cost, and sellers compare agents and invite them to quote.",
    compareRows: [
      { label: "Seller enquiries sent to you", them: "Lead-generation products capture a seller enquiry and route it to the agent who paid for that segment or project", us: "Sellers shortlist agents and invite up to 3 to quote" },
      { label: "Cost to be listed, ranked and found", them: "Free Basic tier for listings; paid tiers, Prop Points leads and featured placement for more visibility", us: "Free forever, and never a cut of your sale" },
      { label: "How you are surfaced to clients", them: "Listing volume plus paid promotion (featured agents, prioritized listings, page ranking)", us: "AgentScore on verified CEA/URA/HDB records, never for sale" },
      { label: "Cost to the seller or consumer", them: "Free to browse listings, news and analytics tools", us: "Always free for sellers" },
      { label: "Business model", them: "Agent subscriptions, pay-per-lead points and featured placement", us: "Optional agent tool subscriptions only, never pay-to-rank" },
    ],
    differentiators: [
      { them: "EdgeProp captures the seller as a paid lead.", us: "FairComparisons lets the seller compare and invite you.", detail: "Its lead products route a seller enquiry to the agent who paid for that segment. On FairComparisons the seller shortlists agents on record and invites a shortlist to quote, free." },
      { them: "EdgeProp lets agents buy prominence.", us: "FairComparisons placement cannot be bought.", detail: "EdgeProp openly sells prioritized listings, featured enquiries and featured-agent slots. On FairComparisons the only way to rank higher is to close more of the deals sellers care about." },
      { them: "EdgeProp surfaces agents by listings and promotion.", us: "FairComparisons ranks on the transaction record.", detail: "EdgeProp holds strong transaction data but surfaces agents by listing count and paid placement; our AgentScore uses transaction data to rank and cannot be bought." },
      { them: "EdgeProp's data and analytics depth is a real draw.", us: "Use both: EdgeProp's tools plus a free record.", detail: "We concede EdgeProp offers a genuine free Basic tier and deep research tools. Many agents use it for data and use FairComparisons for the independent record and the seller comparison." },
    ],
    faq: [
      { q: "Is FairComparisons a replacement for EdgeProp?", a: "No. EdgeProp is a listings-and-data portal with an attached agent-services arm; FairComparisons is a seller-first comparison layer and an independent agent record. Many agents use both." },
      { q: "What does each cost an agent?", a: "FairComparisons is free to be listed, ranked and found, with optional tool subscriptions (S$29/69/149) that never change rank and no cut of your sale. EdgeProp offers a free Basic tier but sells paid analytics tiers, pay-per-lead Prop Points and featured placement for more visibility and leads." },
      { q: "Does EdgeProp send me seller enquiries?", a: "Yes, but agent-side and pay-gated: its lead-generation products capture a high-intent seller or buyer enquiry and route it to the agent who paid for that segment or project, often on an exclusive-slot basis. FairComparisons instead lets the seller compare agents and invite a shortlist to quote, free." },
      { q: "How are agents ranked on each?", a: "EdgeProp surfaces agents by listing volume plus paid promotion (featured agents, prioritized listings, page ranking). FairComparisons ranks by AgentScore from CEA/URA/HDB records; placement cannot be bought." },
      { q: "Is EdgeProp better at anything?", a: "Yes. EdgeProp's data and analytics depth, trusted editorial and tools like Edge Fair Value are a genuine strength, and it offers a real free Basic tier. That is a different job from an independent, seller-first agent comparison." },
    ],
    bothNote: "Not either-or: many agents use EdgeProp for data and leads and use FairComparisons for the independent record and the seller comparison.",
  },
};

export function getCompetitor(slug: string): CompetitorData | undefined {
  return COMPETITORS[slug];
}
