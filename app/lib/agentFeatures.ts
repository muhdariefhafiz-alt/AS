// Marketing data for the individual agent-feature landing pages
// (/for-agents/<slug>). One entry per feature, rendered by
// components/AgentFeaturePage.tsx.
//
// ACCURACY RULES (do not relax):
// - Every claim below describes what the product does TODAY. No promised
//   features, no invented numbers, no testimonials.
// - Tier facts come from lib/tiers.ts (Verified S$29, Professional S$69,
//   Elite S$149) and lib/buildingPages.ts (quotas 1/3/10/25). Being listed
//   and ranked is free forever; nothing here implies payment changes rank.

export type AgentFeatureData = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heroH1: string;
  heroAccent: string;
  heroSub: string;
  tags: string[];
  sections: { kicker: string; title: string; body: string; points: string[] }[];
  faq: { q: string; a: string }[];
};

export const AGENT_FEATURES: Record<string, AgentFeatureData> = {
  "deal-radar": {
    slug: "deal-radar",
    name: "Deal Radar",
    metaTitle: "Deal Radar: Free Prospecting Feed for SG Agents",
    metaDescription:
      "Deal Radar surfaces HDB owners reaching MOP and fresh sales in your farm areas, from real CEA, URA and HDB records. Free with your claimed agent profile.",
    eyebrow: "For agents · Deal Radar",
    heroH1: "Know who can sell,",
    heroAccent: "before they list.",
    heroSub:
      "Deal Radar watches your farm areas and surfaces two signals every agent farms by hand today: HDB owners reaching their 5-year MOP window, and fresh nearby sales you can use as comps. All from official records, in your dashboard.",
    tags: ["Owners reaching MOP", "Fresh sales as comps", "Up to 5 farm areas", "Free"],
    sections: [
      {
        kicker: "MOP prospecting",
        title: "Owners reaching their 5-year MOP, block by block",
        body: "The moment an HDB block bought five years ago approaches its Minimum Occupation Period, its owners become possible sellers. Deal Radar reads the official HDB transaction record and lists those addresses in your farm areas, with the original purchase price, so your door-knock and mailer lists build themselves.",
        points: ["From official HDB records", "Original purchase price shown", "Sorted by your farm areas"],
      },
      {
        kicker: "Fresh comps",
        title: "Every recent sale near your patch, as it is recorded",
        body: "Recent transactions are both your market pulse and your conversation starter. Deal Radar shows every fresh sale recorded in your chosen towns and districts, so you walk into every listing pitch with the latest actual prices, not portal asking prices.",
        points: ["Actual recorded prices", "HDB towns and private districts", "Updated as records land"],
      },
      {
        kicker: "Seller reports",
        title: "Turn a signal into a co-branded seller report",
        body: "Every Deal Radar row links to a seller report you can share: recent comparable sales, price context and your profile with your independent AgentScore. It is your record doing the selling, backed by data a homeowner can verify.",
        points: ["Co-branded with your profile", "Built on verifiable records", "Share by link or WhatsApp"],
      },
    ],
    faq: [
      {
        q: "Where does Deal Radar data come from?",
        a: "From official public records: HDB resale transactions and URA private transaction records, the same government data that powers AgentScore. We never invent a signal; every row traces to a recorded transaction.",
      },
      {
        q: "What does Deal Radar cost?",
        a: "It is included free with your claimed FairComparisons profile. Claiming your profile is free and stays free; optional paid tiers add other tools but Deal Radar itself is not paywalled.",
      },
      {
        q: "How many farm areas can I track?",
        a: "Up to five, mixing HDB towns and private districts. You can swap areas anytime from your dashboard.",
      },
    ],
  },

  "demand-dashboard": {
    slug: "demand-dashboard",
    name: "Demand Dashboard",
    metaTitle: "Agent Demand Dashboard: Sellers Comparing You",
    metaDescription:
      "See real sellers viewing your profile, shortlisting you and inviting you to quote. Honest numbers, never for sale. Free with your claimed agent profile.",
    eyebrow: "For agents · Demand Dashboard",
    heroH1: "See the sellers",
    heroAccent: "already comparing you.",
    heroSub:
      "Every day, sellers compare agents on FairComparisons before choosing who to interview. The Demand Dashboard shows you that activity on your own profile: views, shortlist appearances, invites to quote and sellers won.",
    tags: ["Profile views", "Shortlist appearances", "Invites to quote", "Free"],
    sections: [
      {
        kicker: "Your funnel",
        title: "From profile view to instruction, in four honest numbers",
        body: "Views in the last 7 days, shortlist appearances and invites in the last 30, and sellers won all time. Zeros show as zeros: the point is a truthful read on your demand, not a vanity chart. When the numbers move, you know sellers in your area are actively choosing.",
        points: ["7 and 30 day windows", "Zeros shown honestly", "All from real seller activity"],
      },
      {
        kicker: "Never for sale",
        title: "Demand data never changes your rank",
        body: "Nothing in the Demand Dashboard is buyable and none of it feeds your AgentScore, which is computed only from official transaction records. Paying us more does not show you to more sellers. That independence is exactly why a seller invite from FairComparisons is worth answering.",
        points: ["Rank is never for sale", "Score from records only", "No paid placement, ever"],
      },
      {
        kicker: "Act on it",
        title: "A complete profile converts the demand you already have",
        body: "The dashboard pairs your numbers with the two levers you control: a complete profile (photo, bio, WhatsApp for alerts) and your public track record. Sellers who view a complete, verified profile invite more often, and every invite arrives in your inbox with the brief attached.",
        points: ["Profile completeness prompts", "Invites land in your inbox", "WhatsApp alerts opt-in"],
      },
    ],
    faq: [
      {
        q: "Where do the demand numbers come from?",
        a: "From first-party activity on fair-comparisons.com: sellers viewing your profile, appearing on comparison shortlists for their area, and choosing to invite you to quote. We show your own numbers only, never another agent's.",
      },
      {
        q: "Can I pay to appear in front of more sellers?",
        a: "No. There is no paid placement on FairComparisons. Rankings come from AgentScore, which is computed from official CEA, URA and HDB records and cannot be bought. Subscriptions add tools, never position.",
      },
      {
        q: "What does the Demand Dashboard cost?",
        a: "Nothing. It is part of the free dashboard every claimed agent gets. Claim your profile and the numbers start where you are today.",
      },
    ],
  },

  "building-pages": {
    slug: "building-pages",
    name: "Building Pages",
    metaTitle: "Building Pages: Own Your Development's Page",
    metaDescription:
      "Claim the agent spotlight on a development's data page: your commentary and booking link next to real URA prices. One agent per building. From S$0.",
    eyebrow: "For agents · Building Pages",
    heroH1: "The building you know best",
    heroAccent: "should introduce you.",
    heroSub:
      "Every development page on FairComparisons shows real URA transaction data: prices, floor premiums, trends. A Building Page puts your local commentary and profile on that page, exclusively. One agent per development, first come, first served.",
    tags: ["Exclusive per development", "Your commentary + booking link", "Featured on the homepage", "From S$0"],
    sections: [
      {
        kicker: "Exclusive spotlight",
        title: "One agent per development. Claim yours first.",
        body: "While a Building Page is published, no other agent can present that development. Your headline, your local insight, your photo, your CEA registration and a direct booking link sit beside the neutral price data every buyer and seller checks. When someone researches that building, they meet you.",
        points: ["Exclusive while published", "Your booking link on the page", "CEA registration shown automatically"],
      },
      {
        kicker: "Real substance",
        title: "Your words next to real URA numbers",
        body: "These are not empty ad slots. The page already carries recorded transactions, floor-level pricing and rental data; your commentary adds what the records cannot say: which stacks face the afternoon sun, what the walk to the MRT is really like, how it compares to its neighbours. Substance ranks, and substance converts.",
        points: ["Minimum-length commentary, your own words", "Marketing clearly attributed to you", "Data stays neutral and sourced"],
      },
      {
        kicker: "Distribution",
        title: "Featured on the homepage, indexed for search",
        body: "New spotlights are featured on the FairComparisons homepage, and every development page is built for search: structured data, clean titles and the transaction depth Google rewards. Your quota grows with your plan: one page free, three on Verified, ten on Professional, twenty-five on Elite.",
        points: ["Homepage feature for new spotlights", "1 free · 3 Verified · 10 Professional · 25 Elite", "Never affects rank or lead flow"],
      },
    ],
    faq: [
      {
        q: "How many Building Pages can I have?",
        a: "One with a free claimed profile, three on Verified (S$29/mo), ten on Professional (S$69/mo) and twenty-five on Elite (S$149/mo). Each page stays exclusively yours while it is published.",
      },
      {
        q: "Does owning a Building Page improve my ranking?",
        a: "No. Building Pages are a marketing surface. AgentScore and search order are computed from official transaction records only and cannot be bought. The page is clearly attributed as your commentary next to neutral data.",
      },
      {
        q: "What happens if another agent wants my building?",
        a: "They cannot take it while your page is published. If you unpublish or delete the page, the development becomes claimable again, first come, first served.",
      },
      {
        q: "Can I write anything I like?",
        a: "Your commentary must be your own words with a minimum length, is clearly labelled as agent marketing content, and your name, CEA registration and agency are displayed automatically in line with CEA advertising guidelines. The transaction data on the page stays neutral and sourced.",
      },
    ],
  },

  "badge-widget": {
    slug: "badge-widget",
    name: "Badge & Lead Widget",
    metaTitle: "AgentScore Badge & Lead Widget for Agents",
    metaDescription:
      "Embed your verified AgentScore badge in your signature and site, and a co-branded valuation widget that sends visitors to you as seller enquiries. Free to embed.",
    eyebrow: "For agents · Badge & Lead Widget",
    heroH1: "Proof in your signature,",
    heroAccent: "leads from your website.",
    heroSub:
      "Two embeds, one copy-paste each. The AgentScore badge puts independently verified proof of your record wherever you already talk to clients. The lead widget puts a free valuation card on your own site, and its users come to you as seller enquiries.",
    tags: ["Verified score badge", "Co-branded lead widget", "Copy-paste embed", "Free"],
    sections: [
      {
        kicker: "The badge",
        title: "An unbuyable score is worth showing off",
        body: "Anyone can say they are a top agent; your badge links to a profile scored from official CEA, URA and HDB records that no one can pay to change. Drop it in your email signature, your listings, your socials. One click and the client sees the evidence.",
        points: ["Live SVG, always your current score", "Links to your full record", "Works in signatures and sites"],
      },
      {
        kicker: "The lead widget",
        title: "A valuation card on your site that works for you",
        body: "The widget renders a co-branded \"Get a free valuation\" card on your own website. Visitors who use it become seller enquiries routed to you, with FairComparisons handling the data and the estimate. Your site traffic stops being a brochure and starts being a pipeline.",
        points: ["Co-branded with your profile", "Enquiries route to you", "One iframe, no maintenance"],
      },
      {
        kicker: "Zero upkeep",
        title: "Paste once, current forever",
        body: "Both embeds are generated in your dashboard with your slug baked in. The badge redraws itself as your score updates and the widget always serves the latest valuation model, so there is nothing to maintain and nothing to update.",
        points: ["Embed code in your dashboard", "Auto-updates with your record", "No developer needed"],
      },
    ],
    faq: [
      {
        q: "What does the badge show?",
        a: "Your current AgentScore, computed from official CEA, URA and HDB transaction records, with a link back to your full public record on FairComparisons. It updates automatically as new transactions are recorded.",
      },
      {
        q: "Where do widget leads go?",
        a: "Visitors who request a valuation through your widget come to you as seller enquiries. You are the agent on that enquiry; it does not go into a general pool.",
      },
      {
        q: "What do the embeds cost?",
        a: "Both are free with your claimed profile. Copy the embed code from your dashboard and paste it into your site, signature or bio.",
      },
    ],
  },
};

// Order used for cross-linking and the features hub. Includes the three
// standalone marketing pages that predate this data file.
export const FEATURE_LINKS: { slug: string; label: string }[] = [
  { slug: "features", label: "The full toolkit" },
  { slug: "deal-radar", label: "Deal Radar prospecting" },
  { slug: "planner", label: "Viewing Planner" },
  { slug: "demand-dashboard", label: "Demand Dashboard" },
  { slug: "building-pages", label: "Building Pages" },
  { slug: "badge-widget", label: "Badge & Lead Widget" },
  { slug: "grow", label: "Grow toolkit" },
  { slug: "lead-generation", label: "Lead generation" },
];
