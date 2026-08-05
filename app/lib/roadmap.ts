// The public product roadmap.
//
// One registry drives both /roadmap and every /roadmap/[slug] post, so adding
// an entry is a single edit and the index can never disagree with the post.
//
// RULES FOR THIS FILE (they are the reason the page is worth reading):
// - Only changes an agent, seller or landlord can SEE or USE. No refactors, no
//   data pipeline work, no SEO plumbing, no bug fixes.
// - Only big ones. If it would not change how someone works, leave it out.
// - Every sentence must be true of the code as shipped. The `limits` list is
//   not a disclaimer, it is the part that makes the rest believable.
// - No dates we cannot stand behind, and no promises about what is not built.

export type RoadmapStatus = "live" | "building" | "exploring";
export type RoadmapAudience = "agents" | "sellers" | "everyone";

export type RoadmapEntry = {
  slug: string;
  title: string;
  status: RoadmapStatus;
  audience: RoadmapAudience;
  /** ISO month for live entries, from the commit that shipped it. */
  shipped?: string;
  summary: string;
  whatItIs: string[];
  whyWeBuiltIt: string[];
  whoItHelps: { who: string; how: string }[];
  useCase: { title: string; body: string };
  walkthrough: { step: string; detail: string }[];
  /** For live entries: what it does not do. For planned ones: what must be true first. */
  limits: string[];
  tryIt?: { href: string; label: string; cta?: string };
  tiers?: string;
};

export const ROADMAP: RoadmapEntry[] = [
  // ---------------------------------------------------------------- LIVE ---
  {
    slug: "letter-of-intent",
    title: "Paperwork: the letter of intent, and the tenancy agreement that fills itself",
    status: "live",
    audience: "agents",
    shipped: "2026-08",
    summary:
      "Draw up a rental letter of intent on your own letterhead in about two minutes, then start the tenancy agreement from it with the deal already carried across.",
    whatItIs: [
      "Paperwork is a document tool inside the agent dashboard. It now covers the two documents that open and close a rental deal: the letter of intent, and the residential tenancy agreement.",
      "Both come out on your letterhead, with your name and CEA registration already on them, because we hold your profile. You fill in the property, the parties and the commercial terms, and download a clean PDF.",
      "The part that saves the most time is the chain. Once the landlord accepts, one tap starts the tenancy agreement from the letter of intent and carries the property, the parties, the term, the rent, the deposit and the clause choices across.",
    ],
    whyWeBuiltIt: [
      "We looked at what agents actually do between a viewing and a signed lease, and it is paperwork. Singapore runs roughly three rental contracts for every resale, so the letter of intent is one of the most-typed documents in the industry, and there is no official template for it. Every agency retypes its own.",
      "We read three real executed letters of intent from Singapore deals before writing a line of code. They taught us the thing the online guides miss: the letter is the salesperson's instrument, issued over their name and CEA registration, with the agency's own protections in it. That is why a generic template site cannot produce a usable one, and why we can.",
      "The market conventions in those letters disagreed with each other. One converted the good-faith deposit into the security deposit, another into the first month's advance rental. So every convention here is an editable field with its market range shown, never fixed wording that puts words in your mouth.",
    ],
    whoItHelps: [
      {
        who: "Rental-heavy salespersons",
        how: "The document you produce most often, in about two minutes, from your phone in the lift after a viewing rather than in a Word file back at the office.",
      },
      {
        who: "Anyone running a deal end to end",
        how: "The deal is typed once. The tenancy agreement inherits it, so the two documents cannot quietly disagree about the rent, the term or who pays the stamp duty.",
      },
      {
        who: "Landlords and tenants on the other side",
        how: "A complete, consistent letter with the deposit mechanics spelled out, rather than a template with clauses that contradict each other.",
      },
    ],
    useCase: {
      title: "A viewing that just turned into a deal",
      body: "You have shown a condo unit on a Saturday afternoon and the tenant says yes. The landlord wants something in writing today. Instead of finding last month's file and editing over it, you open the viewing in your Planner, tap to issue a letter of intent, and the letter is already on your letterhead with your CEA registration and the standard clauses in place. You type the parties, the rent, the term and the deposits, download the PDF and send it. When the landlord accepts, the tenancy agreement starts from that letter.",
    },
    walkthrough: [
      { step: "Open Paperwork", detail: "In your dashboard, the Paperwork tab. You can also start straight from a confirmed viewing in your Planner, which carries the property across." },
      { step: "Choose the document", detail: "Pick Letter of Intent or Tenancy agreement. Each card says roughly how long it takes." },
      { step: "Check your letterhead", detail: "Your name, CEA registration and agency are already filled in from your profile and collapsed out of the way. They are fixed to you and cannot be edited into someone else's name." },
      { step: "Fill in the deal", detail: "Property, landlord, tenant and occupiers, term, rent, deposits, and the standard terms. Conventions such as the security deposit months, the minor repair cap and the diplomatic clause come with the market range as a hint, and every one of them is editable." },
      { step: "Preview the PDF", detail: "While it is a draft the PDF carries a DRAFT watermark, so an unsigned letter can never be mistaken for an executed one." },
      { step: "Mark it ready to sign", detail: "The watermark drops. We check the required fields first: a letter with no rent or no parties cannot leave draft." },
      { step: "Track what happened", detail: "Mark it sent out, then signed, as the deal moves. A signed document is locked and can only be voided, never edited or deleted." },
      { step: "Start the tenancy agreement", detail: "From the signed letter, one tap starts the tenancy agreement with the deal already in it. Check the details, add the inventory, and you are done." },
    ],
    limits: [
      "It is a standard template for your review, not legal advice, and it says so on every page.",
      "It does not e-sign. You download the PDF and sign it the way you do today. Signing inside the tool is what we are building next.",
      "The inventory of furniture and fittings, and the two parties' contact details, do not carry across from the letter of intent, because a letter of intent does not carry them.",
      "It does not compute stamp duty. Lease duty is calculated at current IRAS rates in our stamp duty calculator, never by a formula copied off an old agency form.",
      "It will never produce an HDB resale Option to Purchase. That is a serialised form issued only through the HDB Resale Portal, and generating a lookalike would be a real problem for you.",
      "The good-faith deposit is paid to the landlord. We never hold money, and CEA does not permit a salesperson to hold transaction money either.",
    ],
    tryIt: { href: "/tools/loi", label: "See it on your letterhead", cta: "Free on the free plan." },
    tiers: "Every plan, including free.",
  },

  {
    slug: "agent-comparison",
    title: "Every CEA-registered agent, ranked on their actual transaction record",
    status: "live",
    audience: "everyone",
    shipped: "2026-07",
    summary:
      "A public page for every registered property agent in Singapore, built from government transaction records rather than from what the agent says about themselves.",
    whatItIs: [
      "Every agent registered with the Council for Estate Agencies has a page here, whether they have claimed it or not. It carries an AgentScore from 0 to 100, how many sales against how many rentals they have on record, whether they usually act for the seller or the buyer, the areas and property types they work, a year-by-year activity chart and their recent recorded deals.",
      "Where the record could mislead, the page says so in plain language. If most of an agent's deals are rentals, the page says so. If they mostly represent buyers, the page says so. The full scoring method is published.",
    ],
    whyWeBuiltIt: [
      "Choosing an agent in Singapore meant choosing between people who all describe themselves as the top agent in the area. There was no way to check, even though the transaction records that would settle it are public.",
      "So we compiled them, and we score the same way for everyone. No agent can pay to rank higher, appear sooner or remove a flag. That constraint is the product, not a policy we could relax later.",
      "The flags matter as much as the score. An agent with 200 rental deals and two sales is not the right person to sell your flat, and a ranking that hides that is worse than no ranking.",
    ],
    whoItHelps: [
      { who: "Anyone about to sell or rent out a home", how: "A way to check an agent's actual record before you sign a year of your life over to them." },
      { who: "Agents with a real record", how: "Somewhere the work shows, independent of who has the biggest advertising budget." },
    ],
    useCase: {
      title: "The agent who dropped a flyer in your letterbox",
      body: "A flyer says the agent is the number one specialist in your block. You search their name, land on their page, and see how many sales they actually have on record in your town, when the most recent one was, and whether most of their work is rentals. It takes about a minute and it is the same data whichever agent you look up.",
    },
    walkthrough: [
      { step: "Search the agent", detail: "By name, or by CEA registration number if you have it from their card or advertisement." },
      { step: "Read the score and the band", detail: "AgentScore out of 100 with a plain band, from Top performer through to Limited record." },
      { step: "Check the flags", detail: "Mostly rentals, mostly buyer-side, mostly new launches and team-attributed volume each appear when the record warrants it, and each explains itself when tapped." },
      { step: "Look at the split", detail: "Recorded sales against rental transactions, and which side of the deal they usually represent. These are never added together." },
      { step: "Check the areas and the timeline", detail: "Where they are most active, and a year-by-year chart of how busy they have been." },
      { step: "See how the score is built", detail: "The score breakdown card and the published methodology set out every input and its weight." },
    ],
    limits: [
      "The record is what is officially recorded. Deals logged under a team leader's name appear under that person, which is why the team-attributed flag exists.",
      "A score is not a personality. It cannot tell you whether someone will answer your calls or negotiate well for you.",
      "Agents with no recorded transactions get a page that says exactly that, rather than a score implying otherwise.",
      "The profile does not publish an agent's phone number. Contact runs through a quote request, so agents are not cold-called off the back of their own record.",
    ],
    tryIt: { href: "/property-agents", label: "Compare agents", cta: "Free, no account." },
  },
  {
    slug: "seller-shortlist",
    title: "For sellers: a shortlist on the record, then quotes you can compare",
    status: "live",
    audience: "sellers",
    shipped: "2026-07",
    summary:
      "Describe your property, get a ranked shortlist of agents who actually have deals in your area, invite up to three to quote, and compare their fees side by side.",
    whatItIs: [
      "A free flow with no account. You say what you are selling and where, and we build a ranked shortlist of CEA-licensed agents with recorded deals in that area, each with their score, their deals there, their area focus and the month of their last recorded sale.",
      "You invite up to three to quote. They receive your property brief and never your contact details. Their quotes come back on one page: commission, estimated weeks to sell, estimated sale range and marketing approach.",
      "Only the one agent you finally instruct is given your name, phone and email.",
    ],
    whyWeBuiltIt: [
      "The normal way to find an agent is to fill in a form and then be called by ten of them, because your details were sold. We built the opposite: the agents get your brief, you keep your number until you choose.",
      "Comparing fees was equally broken. Everyone quotes in conversation, and by the time you have three numbers you have had three sales pitches. Getting them in writing on one page changes the conversation.",
      "We show dormancy honestly. If an agent has not recorded a sale in two years, that sits on their row while you are choosing, not after.",
    ],
    whoItHelps: [
      { who: "Homeowners about to sell", how: "Three comparable quotes, from agents whose record you can check, without giving your number to anyone until you decide." },
      { who: "Agents with a genuine record in an area", how: "Enquiries from sellers who already looked at the numbers, rather than whoever answered an advert first." },
    ],
    useCase: {
      title: "Selling the flat you have lived in for eleven years",
      body: "You have no idea what commission is normal and no wish to be called by ten agents. You describe the flat, see which agents actually have deals in your town, and invite three whose records look right. Their quotes come back on one page and you can see that two want the same fee and one wants more but expects a faster sale. You instruct one, and only then do they get your number.",
    },
    walkthrough: [
      { step: "Describe the property", detail: "Type and area first. We tell you how many ranked agents we hold for that area before you go further, and stop you if we do not cover it." },
      { step: "See your shortlist", detail: "Ranked agents with score, deals in your area, area focus, last recorded sale and any warning flags. Agents we cannot reach are labelled and cannot be picked." },
      { step: "Pick up to three", detail: "Or press to see more agents from the same area if none fit." },
      { step: "They get the brief", detail: "Property type, bedrooms, area, value range and timeline. Not your contact details." },
      { step: "Compare the quotes", detail: "Commission, estimated timeline, estimated range and marketing approach, side by side, with each agent's flags and a link to their full record." },
      { step: "Instruct one", detail: "Only then do they receive your details. Nothing is binding until you sign an agency agreement with them directly." },
    ],
    limits: [
      "We ask agents to quote within 24 hours. We cannot make them. If the time passes with no quotes, the page says so plainly and offers to invite more.",
      "We only cover areas where we hold ranked agents. If yours is not covered we tell you before you give us any contact details.",
      "Matching is by area and property type. It does not consider your postal code or block.",
      "There is no messaging between you and the agents here. You see their structured quote and their marketing plan, then you talk to the one you choose.",
      "It is free for sellers and we take no cut of your sale.",
    ],
    tryIt: { href: "/sell", label: "Get your shortlist", cta: "Always free for sellers." },
  },
  {
    slug: "verified-reviews",
    title: "Reviews that are tied to a real deal",
    status: "live",
    audience: "everyone",
    shipped: "2026-07",
    summary:
      "Sellers who complete a sale through us are invited to review the agent, and those reviews sit next to the transaction record without ever touching the score.",
    whatItIs: [
      "Reviews arrive through two doors. Sellers who ran their sale through the platform get a private link about a week after the option is signed, and their review publishes in a verified block showing initials, with a completion chip once the agent has logged the completion.",
      "Anyone else who worked with an agent can also leave a review on their profile. That one stays hidden until the reviewer confirms it by email and a person here approves it.",
      "Neither kind moves the AgentScore. The score comes from government transaction records, and reviews sit beside it.",
    ],
    whyWeBuiltIt: [
      "Agent reviews elsewhere are collected by the agent, from clients the agent selected, on a page the agent controls. A five-star average assembled that way tells you very little.",
      "Tying a review to a sale we can see makes it worth reading. Keeping it out of the score means an agent cannot review their way up the rankings, which is the failure mode of every reputation system that counts them.",
      "Two doors rather than one, because most agents have years of clients from before they found us, and refusing all of that would be its own kind of dishonesty. So we label which is which.",
    ],
    whoItHelps: [
      { who: "Sellers choosing between two similar records", how: "What working with them was actually like, from someone who did it, next to the numbers." },
      { who: "Agents who look after their clients", how: "Credit that is visible on the page people read, and that cannot be bought by a competitor." },
    ],
    useCase: {
      title: "Two agents with almost the same record",
      body: "You have narrowed it to two agents with similar deal counts in your town. One has three reviews from sellers who completed sales through the platform, describing how the agent handled a slow first month. That is the tiebreaker the transaction record cannot give you.",
    },
    walkthrough: [
      { step: "Sell through the platform", detail: "The agent logs the milestones as the deal moves, including the signed option." },
      { step: "You get an invitation", detail: "About a week after the option is signed, a private link to review the agent." },
      { step: "Write it", detail: "A rating, what stood out, and how you want to be shown. Reviews publish with initials, not your full name." },
      { step: "It appears with the record", detail: "In a verified seller block on the agent's profile, with a completion chip once the agent has logged the completion date." },
    ],
    limits: [
      "The open review door proves an email address, not that the person worked with the agent. That is why the two blocks are labelled separately.",
      "The completion chip reflects what the agent logged with us, not an independent check against government records.",
      "Reviews never affect AgentScore, ranking or who receives leads.",
      "There is no agent reply and no dispute flow yet. If a review is wrong, that matters, and it is on our list.",
      "Reviews publish with initials, not full names, which is what we promise the reviewer when they write one.",
    ],
  },
  {
    slug: "free-tools",
    title: "Free calculators that use the current rules, not the rules from 2019",
    status: "live",
    audience: "everyone",
    shipped: "2026-07",
    summary:
      "Stamp duty, affordability, net sale proceeds, commission, an online valuation, an MOP tracker, a CEA advertising checker and the letter of intent, free and without an account.",
    whatItIs: [
      "A set of tools for the arithmetic that decides whether a move is possible: buyer's and seller's stamp duty including ABSD, what you can borrow under the current lending rules, what you actually walk away with after commission, duty, the loan and your CPF refund, and what your home is worth from recent transactions.",
      "For agents there are two more: a checker that tests an advertisement against CEA's advertising requirements before it goes out, and the letter of intent generator.",
    ],
    whyWeBuiltIt: [
      "Most Singapore property calculators online are stale. The rules move, sometimes twice a year, and a calculator quoting an old rate is not a rounding error, it is a wrong answer about the largest transaction of someone's life.",
      "We keep them current and we show the rates we used, so you can check us rather than trust us.",
      "They are free and they do not ask for your details. A calculator that requires your phone number is a lead form wearing a costume.",
    ],
    whoItHelps: [
      { who: "Buyers working out what they can afford", how: "The real ceiling under the current lending limits, including the stress rate, not a rough multiple of income." },
      { who: "Sellers working out what they clear", how: "Cash in hand after commission, duty, the outstanding loan and the CPF refund, which is the number that decides whether the move works." },
      { who: "Agents", how: "An advertisement check before publishing, and the paperwork tools." },
    ],
    useCase: {
      title: "Working out whether upgrading is possible at all",
      body: "You are in a four-room flat and wondering about a condo. Before speaking to anyone, you check what your flat is likely worth, what you would clear after the loan and the CPF refund, what stamp duty the next place attracts, and what you could borrow. Twenty minutes later you know whether the conversation is worth having, and no one has called you.",
    },
    walkthrough: [
      { step: "Open the tools page", detail: "Every tool is listed with who it is for." },
      { step: "Pick the question", detail: "Affordability, stamp duty, net proceeds, commission, valuation, MOP, advertising compliance or the letter of intent." },
      { step: "Enter your numbers", detail: "No account, no email, nothing stored." },
      { step: "Check the workings", detail: "Each result shows the rates and rules applied, so you can verify the answer rather than take it on faith." },
    ],
    limits: [
      "They are estimates for planning. Confirm duty with IRAS and your loan with your bank before you commit.",
      "The valuation is an estimate from recent transactions in your area, not a formal valuation, and it cannot see your renovation or your view.",
      "Rules change. We keep these current and stamp what we used, but check anything close to the line.",
    ],
    tryIt: { href: "/tools", label: "Open the tools", cta: "Free, no account, nothing stored." },
  },
  {
    slug: "your-standing",
    title: "Your standing: where you rank, and whether sellers are actually looking",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "Your position against other agents active in your area, month-over-month movement, and four honest counts of what sellers did with your profile.",
    whatItIs: [
      "Two cards at the top of your dashboard. Your standing tells you where you rank against other agents active in your area, computed from official transaction records, led by a band such as top ten percent rather than a bare number, with movement since last month.",
      "Your demand shows what sellers on the site actually did: profile views in the last week, shortlist appearances and invitations to quote in the last month, and sellers won.",
      "Zeros are shown as zeros. None of these numbers can be bought, and none of them change your rank.",
    ],
    whyWeBuiltIt: [
      "An agent who claims their profile deserves to know whether it is doing anything. Without that, claiming is an act of faith.",
      "We lead with a band rather than a raw position because a raw number without context is either meaningless or discouraging, and because the honest answer for most agents is a range rather than a place.",
      "Showing demand as raw counts, including zero, is the point. A dashboard that only ever shows encouraging numbers is a dashboard nobody should believe.",
    ],
    whoItHelps: [
      { who: "Claimed agents", how: "Whether the profile is working, and whether last month's effort moved anything." },
      { who: "Agents deciding whether this is worth their time", how: "Real numbers instead of a vague promise of exposure." },
    ],
    useCase: {
      title: "Deciding whether to keep at it",
      body: "You claimed your profile six weeks ago, added your photo and your farm areas. You open the dashboard and see you are in the top quarter of agents in your town, up four places since last month, with eleven profile views this week and two shortlist appearances. That is enough to know it is worth another month.",
    },
    walkthrough: [
      { step: "Claim and sign in", detail: "Both cards sit at the top of the Home tab." },
      { step: "Read your band", detail: "Top ten percent, top quarter, top half or building, for the area your record centres on." },
      { step: "Read the movement", detail: "Up, down or held since last month, when we have a snapshot from the previous month for the same area." },
      { step: "Read your demand", detail: "Profile views, shortlist appearances, invitations to quote and sellers won, each with its window." },
    ],
    limits: [
      "It ranks you in one area, the one your record centres on. Multi-area standing is not built yet.",
      "Movement is month to month and needs a snapshot from the previous month in the same area, so a newly claimed profile will not show it at first.",
      "A shortlist appearance means our matching put you in front of a seller, not that a seller personally saved you.",
      "Profile views are raw counts and are not deduplicated by person.",
      "Nothing here changes your rank or who receives leads. It is a mirror, not a lever.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "deal-radar",
    title: "Deal Radar: the households in your farm areas approaching their MOP",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "Pick up to five towns or districts you work, and see which HDB households are approaching their five-year MOP and what has sold there recently, from official records.",
    whatItIs: [
      "A prospecting list built from the same government transaction records the rest of the site runs on. You name up to five HDB towns or private districts you farm, and Deal Radar returns two lists.",
      "First, HDB flats that changed hands about five years ago, whose owners are now approaching the end of their Minimum Occupation Period. Second, every sale recorded in those areas in the last 180 days.",
      "Each row is one real recorded transaction: block and street, flat type, storey range, size, month and price. Any row can be turned into a co-branded seller report you can send.",
    ],
    whyWeBuiltIt: [
      "Agents build MOP door-knock lists by hand, from memory or from a spreadsheet someone shared two years ago. The data to do it properly is public, it is just tedious to assemble.",
      "We already hold the HDB resale and URA private transaction records for the whole island because the agent rankings run on them. Turning that into a farm list for a claimed agent costs us almost nothing and saves an afternoon.",
      "It is free on every plan, deliberately. Prospecting is how an agent gets their first win here, and putting a paywall in front of that would be a strange way to earn someone's trust.",
    ],
    whoItHelps: [
      { who: "HDB resale agents with a farm area", how: "The list you would have built by hand, ready when you open the tab, refreshed against the official record." },
      { who: "Agents moving into a new area", how: "A read on what is actually trading there in the last six months before you commit your time to it." },
    ],
    useCase: {
      title: "Planning a Saturday of door-knocking",
      body: "You farm two HDB towns. On Friday evening you open Deal Radar and see the blocks where flats changed hands around five years ago, so those households are coming up on their MOP, alongside every sale recorded nearby in the last six months. You plan the route around the blocks with both signals, and you knock with the recent prices already in your head.",
    },
    walkthrough: [
      { step: "Open the Grow tab", detail: "Deal Radar sits at the top of the Grow tab in your dashboard." },
      { step: "Add your farm areas", detail: "Choose HDB town or District, pick the area, press Add. Up to five, the same on every plan." },
      { step: "Read the MOP list", detail: "Block and street, flat type, storey range, and the note telling you which month the flat was bought and that it is approaching the five-year MOP." },
      { step: "Read recent sales", detail: "Everything recorded in those areas in the last 180 days, HDB and private, with price and month." },
      { step: "Turn a row into a conversation", detail: "Press Seller report on any row to open a co-branded report of recent comparable sales, with your photo, name and record on it, ready to send." },
    ],
    limits: [
      "These are households approaching their MOP, not owners past it, and not a complete list. We can only see flats that appear as a resale transaction about five years ago, so a household that bought their flat new from HDB never shows up.",
      "There are no names, no unit numbers and no contact details. A row is a block, a street and a recorded transaction. Everything on it is already public.",
      "It does not predict who will sell. There is no score and no likelihood model, only two honest signals.",
      "It covers HDB resale and private transactions. No landed-only view, no rentals, no listings.",
      "HDB records refresh weekly. Private district records depend on a manual load, so their recency is not guaranteed the same way.",
      "Five areas is the cap on every plan, including the paid ones.",
    ],
    tryIt: { href: "/for-agents/deal-radar", label: "See how Deal Radar works" },
    tiers: "Free on every plan.",
  },
  {
    slug: "area-intelligence",
    title: "Area Intelligence: price it, and see who else works the area",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "For any area you already transact in, the pricing evidence from official past sales and an honest read on the competition, including where you rank.",
    whatItIs: [
      "Pick one of the areas from your own transaction record and Area Intelligence shows two things side by side.",
      "Pricing evidence: for an HDB town and flat type, an estimate range from the last twelve months of resales with the number of comparables behind it. For a private district, the median, the middle half of the market and the median price per square foot from the last six months.",
      "The competition picture: how many agents closed something there in the last twelve months, how many deals, the average per agent, what share the top five took, and where you sit among them.",
    ],
    whyWeBuiltIt: [
      "Agents were pricing from feel and from what the last agent told the seller. The transaction record answers it better, and we already hold it.",
      "The competition half exists because deciding where to spend your effort is as important as pricing a single flat. If the top five agents in a town take most of the deals, that is worth knowing before you commit a year to it.",
      "Every figure carries its window and its sample size. When there is not enough data we say so rather than extrapolating, which is the opposite of how most area reports work.",
    ],
    whoItHelps: [
      { who: "An agent walking into a listing appointment", how: "A price range you can defend, with the number of comparable sales it rests on." },
      { who: "An agent choosing where to farm", how: "How concentrated the area is and where you already stand in it, before you spend the year." },
    ],
    useCase: {
      title: "A seller who thinks their flat is worth more than it is",
      body: "You are meeting an owner in a town you work. Before you go, you open Area Intelligence, pick the town and the flat type, and see the range from the last twelve months of resales along with how many sales sit behind it. At the table you are not arguing about a feeling, you are showing the record, with the sample size next to it.",
    },
    walkthrough: [
      { step: "Open the Grow tab", detail: "Area Intelligence sits below Deal Radar and the Pitch Kit." },
      { step: "Pick one of your areas", detail: "The chips are built from your own transaction record, up to eight, ordered by how many deals you have done there." },
      { step: "Choose a flat type for a town", detail: "HDB towns get a flat-type selector. Private districts are priced as a whole." },
      { step: "Read the pricing evidence", detail: "The range, the number of comparables behind it, a plain confidence label, and the most recent comparable sale." },
      { step: "Read the competition", detail: "Active agents, deals closed with the sales split called out, deals per agent, the top five share, and your own position." },
      { step: "Open your pitch", detail: "One button takes you to your Pitch Kit page for the same area." },
    ],
    limits: [
      "It is not a valuation. It never asks for an address, a unit, a floor or a renovation standard, so it cannot price a specific home.",
      "You can only look at areas already in your own transaction record. There is no search box for the whole island.",
      "A town gives you HDB pricing. A district gives you private pricing. The two are never mixed for one area.",
      "Deals closed counts sales and rentals together, with the sales figure shown separately underneath, because pretending a rental is a sale is how agent statistics get misleading.",
      "There is no export, no PDF and no client-facing version. The Pitch Kit is the artifact you share.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "pitch-kit",
    title: "Pitch Kit: walk into the listing appointment with your record",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "A live web page proving what you have actually closed in one area, built from official records, that you can send a seller before the appointment.",
    whatItIs: [
      "Pick an area you work and Pitch Kit gives you a link. The page carries your photo, agency, CEA registration and AgentScore, then the deals you have closed in that area, your career totals, your recent deals there and what has sold in that area lately.",
      "It rebuilds from the record every time it is opened, so it is never a stale saved file, and there is nothing to design or maintain.",
      "It also shows your own context flags. If most of your work is rentals, or you are mostly buyer-side, the page says so.",
    ],
    whyWeBuiltIt: [
      "Every agent arrives at a listing appointment claiming to be the area expert, and the seller has no way to tell who is right. A link to an independently compiled record settles it in a way a personal brochure cannot.",
      "Showing the unflattering flags too is the whole point. A page that only ever flatters is marketing, and sellers discount marketing. Honest data cuts both ways, which is exactly why the good parts are believable.",
    ],
    whoItHelps: [
      { who: "Agents with a real record in an area", how: "Independent proof, sent before you arrive, instead of claims made once you are in the room." },
      { who: "Sellers deciding between agents", how: "The same figures for each agent, compiled the same way, rather than three different self-reported brochures." },
    ],
    useCase: {
      title: "Two days before the listing appointment",
      body: "A seller in a town you work has agreed to meet you on Thursday. On Tuesday you send them your Pitch Kit link for that town. They open it and see how many deals you have actually closed there, when the most recent one was, how you rank among agents active in that area, and what has sold nearby. By Thursday the conversation has moved past whether you know the area.",
    },
    walkthrough: [
      { step: "Open the Grow tab", detail: "The Pitch Kit card sits under Deal Radar." },
      { step: "Pick an area", detail: "The chips come from your own record, labelled with how many deals you have done there." },
      { step: "Open or copy", detail: "Open your pitch shows you the page. Copy share link puts the URL on your clipboard." },
      { step: "Send it", detail: "WhatsApp, email, wherever you already talk to the seller." },
      { step: "It stays current", detail: "The page recomputes on every open, so a deal you close next week is on it without you touching anything." },
    ],
    limits: [
      "The link is not private. It is hidden from search engines, but anyone who has the URL can open it, so treat it as a page you send rather than a secret.",
      "It is not a valuation or a CMA. The market section is area-level recent transactions with a median across them, clearly labelled as such.",
      "You cannot edit it, brand it or add your own marketing plan. Every figure is computed, which is what makes it worth sending.",
      "It is a web page, not a PDF or a deck.",
      "It does not tell you when the seller opened it.",
      "It shows your context flags whether they flatter you or not.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "seller-enquiry-inbox",
    title: "Seller enquiries, with a first reply drafted from the record",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "Every seller who shortlists you lands in one inbox, ordered by what is at risk, with a first reply you can draft from official records and edit before you send it.",
    whatItIs: [
      "Sellers who compare agents here and shortlist you arrive in a Leads tab, ordered so the enquiries that could cost you a listing sit at the top, each with a chip showing how long it has been waiting.",
      "On an enquiry you have been invited to quote, one button drafts a first reply. The draft uses only things on record: what the seller told us about their property, area, timeline and price expectation, your own name, agency and AgentScore, and recent transactions in their town or district.",
      "Nothing is sent for you. The text appears in an editable box with a copy button, you send it through your own WhatsApp or email, and then mark it replied.",
    ],
    whyWeBuiltIt: [
      "A seller who shortlists three agents is comparing three replies. The first substantive one usually wins the conversation, and agents were losing listings to the delay between the enquiry landing and finding the words.",
      "Drafting from the record rather than from a template is the difference between a message that mentions the seller's block and a message that could have been sent to anyone.",
      "We deliberately stopped short of sending. An agent's first message to a seller should go out under their own hand, from their own number, after they have read it.",
    ],
    whoItHelps: [
      { who: "Agents being shortlisted by sellers", how: "The enquiries that matter most are at the top, and the blank page problem is solved in about a minute." },
      { who: "Sellers waiting to hear back", how: "Faster, more specific replies from the agents they chose." },
    ],
    useCase: {
      title: "Three enquiries you have not answered since Tuesday",
      body: "You open the Leads tab and the banner tells you two need a reply, one of them overdue. You open the oldest, press to draft a reply, and get a message that names the seller's flat type, their area and two recent sales nearby, in your voice and under your name. You edit a line, copy it, send it on WhatsApp and mark it replied.",
    },
    walkthrough: [
      { step: "Open the Leads tab", detail: "Enquiries are ordered so the ones needing you come first, with New, Aging or Overdue chips." },
      { step: "Expand an enquiry", detail: "Press Submit quote on an enquiry that is awaiting your quote." },
      { step: "Draft a reply", detail: "Press Draft a reply with AI. The result is labelled as grounded in the record." },
      { step: "Edit and copy", detail: "It is a plain editable box. Change what you want, press Copy, or redraft." },
      { step: "Send it yourself", detail: "Through your own WhatsApp or email, then press Mark as replied to stamp the time." },
      { step: "Quote", detail: "Fill in commission, timeline, estimated range and your marketing approach and submit. If the seller picks you, their contact details unlock." },
    ],
    limits: [
      "Nothing is ever sent by us. The draft is text you copy and send yourself.",
      "It only holds seller enquiries generated here. It does not read your portal leads, your WhatsApp or your own email.",
      "Free plans get two drafts a month. Verified and above are unlimited. The inbox itself, the ordering and the quoting are free.",
      "The comparable sales are area-level, not matched to the seller's exact unit or size, and the draft says so rather than implying a valuation.",
      "It does not learn or imitate your writing style. It sticks to facts on record, which is why it can be trusted to name a price.",
    ],
    tiers: "Inbox free on every plan. AI drafting: 2 a month on free, unlimited from Verified.",
  },
  {
    slug: "planner",
    title: "Planner: one booking link, and viewings you can actually track",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "A public booking link you can share anywhere, turning viewing requests into a list you confirm, complete or cancel, with optional calendar sync.",
    whatItIs: [
      "Every claimed agent gets a booking page at a link they can share in listings, bios and messages. A buyer opens it, picks a property, a date and a time, leaves a name and one contact, and sends the request without creating an account.",
      "The request is emailed to you and appears in your dashboard, where you confirm it, mark it done or cancel it.",
      "If you connect a calendar, confirmed viewings are written into it automatically.",
    ],
    whyWeBuiltIt: [
      "Arranging viewings is a WhatsApp back-and-forth that costs both sides a dozen messages to land a time. A link removes most of that.",
      "It also gives the agent one place where requests live, rather than scattered across chats, which is what turns a viewing into a letter of intent without anything falling through.",
    ],
    whoItHelps: [
      { who: "Agents juggling several viewings a week", how: "One link to share and one list to work from, instead of scrolling chats to remember who asked for Saturday." },
      { who: "Buyers and tenants", how: "Pick a time in a few taps, no account, no back-and-forth." },
    ],
    useCase: {
      title: "A listing that draws ten enquiries in a day",
      body: "You put your booking link in the listing and in your bio. Ten people ask to view. Instead of ten separate threads, ten requests land in your Planner with the property, the time and the contact. You confirm the ones that work, cancel the ones that clash, and when one of the viewings turns into a deal you issue the letter of intent straight from that row.",
    },
    walkthrough: [
      { step: "Copy your link", detail: "In the Leads tab, the Planner panel shows your booking link with a copy button." },
      { step: "Share it", detail: "Listings, bio, messages. The page shows your photo, agency, CEA number and AgentScore." },
      { step: "Requests arrive", detail: "You get an email and the request appears in your Planner marked as a new request." },
      { step: "Confirm or cancel", detail: "Confirm, mark done, or cancel. If a calendar is connected, a confirmed viewing is written to it." },
      { step: "Turn it into a deal", detail: "On a confirmed viewing, Issue a letter of intent jumps to Paperwork with the property already filled in." },
    ],
    limits: [
      "We do not notify the buyer after their request. Confirming or cancelling updates your list and your calendar, and contacting them is still your job. Closing that gap is on our list.",
      "The time slots are a fixed nine to seven, the same for every agent. It does not read your calendar for conflicts before offering a time.",
      "Calendar connection needs to be switched on for your account and no agent has connected one yet, so treat it as new rather than proven.",
      "There are no reminders, no rescheduling and no recurring availability. Confirm, complete, cancel.",
      "The booking page is only reachable through the link you share. It is not indexed and it is not linked from your public profile.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "building-pages",
    title: "Building pages: be the agent on the development page buyers read",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "Publish your own commentary on one development's price page, exclusively, so the people researching that building meet you first.",
    whatItIs: [
      "Every private development on the site has a page built from URA transaction records: median price, range, floor-level pricing, rental data. A building page attaches your written local commentary to one of those developments.",
      "While it is published, no other agent can present that development. It is first come, first served, and the slot is yours while the page is live.",
      "It is clearly labelled as agent commentary next to the neutral data, with your name, agency, CEA registration and a booking link.",
    ],
    whyWeBuiltIt: [
      "People research a building's prices long before they choose an agent. That is the moment where local knowledge is worth the most and where almost no agent is present.",
      "Exclusivity is what makes it worth writing something good. A page with five agents shouting on it is a directory, not a recommendation.",
      "It changes nothing about ranking. Presenting a development never moves your AgentScore, your search position or your lead flow, and the page says so out loud where consumers can read it.",
    ],
    whoItHelps: [
      { who: "Agents who genuinely farm a development", how: "You meet the buyers and sellers researching it, at the moment they are researching." },
      { who: "Buyers and sellers reading the data", how: "Local context next to the numbers, from someone named and registered, clearly marked as their commentary." },
    ],
    useCase: {
      title: "The condo you have sold in four times",
      body: "You know one development better than anyone, down to which stacks face the afternoon sun. You claim its page, write four paragraphs of the things the price table cannot say, and publish. From then on, the owners and buyers reading that development's transaction history read your commentary underneath, with a button to book you.",
    },
    walkthrough: [
      { step: "Open the Grow tab", detail: "Find the Building pages card. It shows how many pages your plan allows." },
      { step: "Find your development", detail: "Search by name. Results show the street, district and how many transactions we hold." },
      { step: "Write it", detail: "A headline up to 90 characters and your commentary, at least 350 characters to publish." },
      { step: "Publish", detail: "It goes live immediately. If another agent already presents that development, you are told and can save a draft instead." },
      { step: "It appears with the data", detail: "Your spotlight renders on the development page with your name, agency, CEA number and a booking link, plus a note that it is agent commentary." },
    ],
    limits: [
      "Private residential developments only. No HDB blocks and no landed estates.",
      "One agent per development at a time. If someone already has it, you cannot.",
      "There is no edit flow yet. To change your text you delete the page and write it again, which also releases the development.",
      "A newly published spotlight can take until the next site build to appear on a development page that is already cached.",
      "There is no performance data on the page yet: no views, no clicks.",
      "It never affects your ranking, your AgentScore or your leads. That is enforced in the code, not just promised here.",
    ],
    tiers: "1 page on free, 3 on Verified, 10 on Professional, 25 on Elite.",
  },

  // ------------------------------------------------------------ BUILDING ---
  {
    slug: "cea-prescribed-forms",
    title: "The prescribed estate agency agreement forms, with the rules built in",
    status: "building",
    audience: "agents",
    summary:
      "The CEA prescribed agreement forms, filled from your profile, with the practice rules enforced by the tool rather than remembered by you.",
    whatItIs: [
      "The eight prescribed estate agency agreement forms, for sale, purchase and leasing work, exclusive and non-exclusive, drawn up inside the dashboard the same way the letter of intent is.",
      "The difference from a downloaded PDF is that the rules travel with the form. The prescribed clauses are locked, only the blanks and choices are editable, and the tool will not let you finalise an agreement with an essential field still empty.",
      "You will not need to know form numbers. You answer who you are acting for and whether the appointment is exclusive, and we bring up the right form.",
    ],
    whyWeBuiltIt: [
      "Under section 44 of the Estate Agents Act, an agent can only sue a client on the engagement, commission included, if a prescribed estate agency agreement was entered into and properly executed. Not using it is not an offence, but it can quietly cost you the ability to enforce your own fee.",
      "The forms are free to download today, so access is not the problem. The problem is that a downloaded PDF does not know the practice rules: what may be varied, what must be initialled, what happens to additional terms that overflow the page.",
      "We would rather build the ten percent that is hard and useful than the ninety percent that is already free.",
    ],
    whoItHelps: [
      { who: "Any salesperson taking a mandate", how: "The agreement is drawn up in the same place as the rest of the deal, with your particulars already on it." },
      { who: "Agents who want their commission to be enforceable", how: "The tool blocks the specific mistakes that undermine an agreement, rather than trusting memory." },
    ],
    useCase: {
      title: "Taking on a landlord who wants to lease this month",
      body: "A landlord agrees to appoint you exclusively. Before you do any work, you need the right prescribed form, filled in correctly and signed. You answer two questions about the appointment, the form appears with your particulars already on it, you complete the blanks with the landlord, and the tool refuses to finalise until the commission, the property and the dates are all present.",
    },
    walkthrough: [
      { step: "Answer two questions", detail: "Who you are acting for, and whether the appointment is exclusive. We resolve the right prescribed form and show its official name." },
      { step: "Complete only what is yours to complete", detail: "The prescribed clauses are locked. Blanks, choices and additional terms are yours." },
      { step: "The tool checks before you sign", detail: "It will not finalise while an essential field is empty, which is exactly the failure that undermines an agreement." },
      { step: "Print with the right instructions", detail: "Overflow additional terms come out on their own sheet with the printing rule stated on it." },
    ],
    limits: [
      "The forms are prescribed under the Estate Agents Regulations. We will reproduce them faithfully from the legislation, with the required attribution, and we will not alter a word of the prescribed terms.",
      "They apply to residential work only. Commercial and industrial property, property outside Singapore, collective sales and developer sales have no prescribed form, and we will say so rather than imply coverage we do not have.",
      "A revision watch has to be in place before this ships, so a gazetted change to the forms cannot leave you filling in a stale version.",
      "It is going through a legal review before it goes live to agents.",
    ],
  },
  {
    slug: "e-signing",
    title: "Signing inside the tool, with an audit trail",
    status: "building",
    audience: "agents",
    summary:
      "Send a letter of intent or tenancy agreement for signature, watch it complete, and keep the executed copy with a full record of who signed and when.",
    whatItIs: [
      "Send for signature from the document you just drew up. Each party gets their own link, reviews the document, consents and signs, and you see the status move without chasing anyone.",
      "When everyone has signed, the document seals: the draft watermark drops, a completion certificate listing every step is added to the PDF, and the executed file can no longer be edited.",
      "The audit trail is the point. Who opened it, when they consented, when they signed, and a fingerprint of the exact document they agreed to.",
    ],
    whyWeBuiltIt: [
      "Of the three real executed letters of intent we studied, two had been signed through a paid external e-signature service. Agents are already paying for this and already doing it. The work is simply happening outside the tool that holds the document.",
      "It is also the piece no independent agent tool in Singapore offers today. The paperwork itself is becoming a commodity; the record of what was agreed is not.",
      "Once signing happens here, the document store stops being a folder and becomes the record of your deals.",
    ],
    whoItHelps: [
      { who: "Agents chasing signatures", how: "One link per party, a visible status, and no scanning or re-uploading." },
      { who: "Landlords and tenants", how: "They sign on a phone, and they keep a copy with a record of exactly what they agreed to." },
    ],
    useCase: {
      title: "A landlord overseas and a tenant who needs to move in two weeks",
      body: "The terms are agreed but the landlord is not in Singapore, and posting paper would cost you the deal. You finalise the letter of intent, add both parties, and send it. Each of them opens their own link, reads the document, confirms and signs. When the second signature lands, the executed PDF seals with a certificate showing every step, and all three of you have the same copy.",
    },
    walkthrough: [
      { step: "Finalise the document", detail: "Signing only opens on a document that has passed its completeness check." },
      { step: "Add the parties", detail: "Name and email for each signer, in their role on the document." },
      { step: "Send", detail: "Each party gets a single-use link. Share it yourself or let us email it." },
      { step: "They read, consent and sign", detail: "The full document first, then an explicit agreement to sign electronically, then the signature." },
      { step: "It seals", detail: "The watermark drops, a completion certificate is appended, and the executed file becomes read-only. A change from then on means voiding and reissuing." },
    ],
    limits: [
      "This is the one we will not rush. It does not launch before an external legal review of the signing wording and a security review of the signing links.",
      "We will describe it accurately: electronically signed tenancy documents are enforceable in Singapore under ordinary contract law, and Singapore courts have upheld them since 2005, but they do not carry the statutory presumptions the Electronic Transactions Act reserves for other documents. Anyone claiming otherwise is overselling.",
      "It will not cover documents that need a deed or a conveyance, such as a sale option or a transfer. Those belong in the government conveyancing system, not here.",
      "Signing with Singpass is the upgrade we want after this, not part of the first version.",
    ],
  },
  {
    slug: "whatsapp-alerts",
    title: "Seller enquiries on WhatsApp",
    status: "building",
    audience: "agents",
    summary:
      "An opt-in WhatsApp alert the moment a seller shortlists you or invites you to quote, so a lead does not sit in an inbox you check twice a day.",
    whatItIs: [
      "A notification, not a conversation. When a seller invites you to quote, we message the number you opted in with, and the message takes you to the enquiry in your dashboard where you reply properly.",
      "It is opt-in per agent, and you can turn it off in your dashboard at any time.",
    ],
    whyWeBuiltIt: [
      "Seller enquiries are time-sensitive: the seller is comparing several agents at once, and the first substantive reply usually wins the conversation. Email alone loses that race.",
      "Singapore agents live in WhatsApp. Asking them to live in another inbox to catch a lead is asking for the lead to go cold.",
    ],
    whoItHelps: [
      { who: "Agents receiving seller enquiries", how: "You hear about it where you already are, within minutes rather than at the end of the day." },
      { who: "Sellers waiting for a reply", how: "Faster answers from the agents they picked, which is the whole point of the shortlist." },
    ],
    useCase: {
      title: "A seller invites three agents on a Sunday evening",
      body: "A homeowner in your area finishes their shortlist at nine on a Sunday night and invites three agents to quote. You get a WhatsApp alert, open the enquiry, and reply that evening with your record for their block. The other two reply on Monday afternoon.",
    },
    walkthrough: [
      { step: "Opt in", detail: "In your dashboard, add the number you want alerts on and switch it on. Nothing is sent to a number that has not opted in." },
      { step: "A seller invites you", detail: "You get one message telling you there is an enquiry, with a link." },
      { step: "You reply in the dashboard", detail: "The conversation with the seller stays on the platform, where the record and the quote live." },
    ],
    limits: [
      "The code is built and switched off. It is waiting on business messaging approval from Meta, which is outside our control, and we will not guess at a date.",
      "It is a notification channel only. We are not building a WhatsApp inbox, and we do not read your WhatsApp messages.",
      "Alerts only go to a number that opted in, and only for enquiries that concern you.",
    ],
  },
];

export function roadmapBySlug(slug: string): RoadmapEntry | undefined {
  return ROADMAP.find((e) => e.slug === slug);
}

const STATUS_ORDER: RoadmapStatus[] = ["live", "building", "exploring"];

export function byStatus(status: RoadmapStatus): RoadmapEntry[] {
  return ROADMAP.filter((e) => e.status === status).sort((a, b) => (b.shipped ?? "").localeCompare(a.shipped ?? ""));
}

/** Up to three other entries, newest live first, for the foot of a post. */
export function relatedEntries(slug: string, limit = 3): RoadmapEntry[] {
  return ROADMAP.filter((e) => e.slug !== slug)
    .sort((a, b) => {
      const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return s !== 0 ? s : (b.shipped ?? "").localeCompare(a.shipped ?? "");
    })
    .slice(0, limit);
}
