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
  /**
   * ISO month a live entry FIRST became usable, verified against the first
   * commit that shipped it, not the last one that touched it. Several of these
   * have been rebuilt since; where that matters the entry says so in its text.
   */
  shipped?: string;
  summary: string;
  whatItIs: string[];
  whyWeBuiltIt: string[];
  whoItHelps: { who: string; how: string }[];
  useCase: { title: string; body: string };
  /**
   * Walkthrough steps. A shot is a REAL screenshot of the shipped interface,
   * never a mockup: this page's whole claim is that it describes software that
   * exists. `alt` describes what is in the image for anyone who cannot see it
   * and must stand alone; `caption` adds what the picture cannot say by itself.
   */
  walkthrough: {
    step: string;
    detail: string;
    shot?: { src: string; alt: string; caption: string; width: number; height: number };
  }[];
  /** For live entries: what it does not do. For planned ones: what must be true first. */
  limits: string[];
  tryIt?: { href: string; label: string; cta?: string };
  tiers?: string;
};

export const ROADMAP: RoadmapEntry[] = [
  // ---------------------------------------------------------------- LIVE ---
  {
    slug: "deal-pipeline",
    title: "Your dashboard follows the deal now, not our toolbox",
    status: "live",
    audience: "agents",
    shipped: "2026-08",
    summary:
      "One property is one deal. The enquiry, the viewings and the paperwork for the same flat sit together, and the stage moves itself when you finalise a letter of intent or sign a tenancy agreement.",
    whatItIs: [
      "Four tabs, named after your work rather than our tools: Today, Pipeline, Find and You. Today is what needs you now. Pipeline is every deal you are working. Find is where the next one comes from. You is your profile, plan and standing.",
      "Pipeline is the spine. Each row is one property, showing who is on the other side, what it is waiting on, and how long it has been sitting. Open it and the viewings and documents for that property are there together.",
      "You are never asked to create a deal. Confirming a viewing, winning a seller enquiry, or typing an address into a letter of intent creates one for you. Starting one by hand exists for the deal that began on WhatsApp, and that is the only place you name one.",
      "The stage keeps itself current. A confirmed viewing moves a deal to Viewing, a finalised letter of intent to Offer, a signed tenancy agreement to Agreement. You can override any stage by hand, and a later real event still moves it on.",
    ],
    whyWeBuiltIt: [
      "The dashboard had one surface for each part of your job and no thread running through them. A viewing lived in one place with the address typed as free text, and the letter of intent you wrote after that viewing lived in another with the address buried in a different shape. Two records about the same flat on the same afternoon, and the software did not know they were related.",
      "That is why it read as a drawer of tools. No arrangement of tabs fixes it, because the missing piece was not a tab. It was the deal.",
      "Rentals are 63% of recorded CEA activity and roughly three rental contracts happen for every resale, so the sequence we tuned for is the one most agents actually run: viewing, letter of intent, tenancy agreement.",
    ],
    whoItHelps: [
      { who: "Rental salespeople", how: "The pivot from a viewing to an offer is two taps on a phone, with the property already filled in. That moment is where the deal is won, and it is the one we made shortest." },
      { who: "Anyone taking seller enquiries", how: "An enquiry and the deal it becomes are in one tab instead of two, so replying and working the property are the same place." },
      { who: "Agents juggling several properties", how: "A row tells you what each deal is waiting on and how long it has been waiting, so the one going cold is visible without opening anything." },
    ],
    useCase: {
      title: "A Saturday viewing that turns into an offer",
      body:
        "You confirm a viewing for Saturday and the deal appears on its own. On Saturday the tenant wants it. Standing in the flat you open Pipeline, tap the deal, and tap Issue a letter of intent. The property and the prospect are already in it, on your letterhead with your CEA registration. You fill in the term, the rent and the deposits and send it before you leave. When the landlord accepts, the deal is at Offer and the row tells you the next thing: create the tenancy agreement, which starts from that letter with the deal carried across.",
    },
    walkthrough: [
      {
        step: "Open Pipeline",
        detail: "Your deals are grouped by the stage they are actually at: Enquiry, Viewing, Offer, Agreement. Closed ones collapse out of the way.",
        shot: {
          src: "/roadmap/shots/pipeline-stages.png",
          alt: "The Pipeline tab. A heading reads Your deals, with a Start a deal button. Below it two stage groups: Enquiry with one deal at 12 Sample Gardens #08-08 reading Share your booking link, or start the paperwork, and Offer with one deal at 7 Sample Rise #12-04 reading Create the tenancy agreement. Each row shows how long it has been sitting, here today.",
          caption: "Stage groups in workflow order. The line under each property is its next action, so a row tells you what it is waiting on without opening it.",
          width: 616,
          height: 408,
        },
      },
      { step: "Let a deal appear", detail: "Confirm a viewing, or start a letter of intent and type the address. Either creates the deal. You will rarely start one by hand." },
      {
        step: "Tap the deal",
        detail: "The viewings and documents for that property are inside it, with one primary action for whatever the stage needs next.",
        shot: {
          src: "/roadmap/shots/deal-open.png",
          alt: "An opened deal for 7 Sample Rise #12-04. Under the property it reads Sample Tenant, then Create the tenancy agreement. A Documents section lists Letter of intent, Ready to sign. At the bottom a blue Create the tenancy agreement button sits beside a quieter Mark lost link.",
          caption: "The deal at Offer stage. Its letter of intent is already signed off, so the primary button is the tenancy agreement that follows, not a menu of everything the tool can do.",
          width: 596,
          height: 207,
        },
      },
      {
        step: "Work it",
        detail: "Issue the letter of intent, then create the tenancy agreement from it. The stage follows the documents, so there is nothing to keep updated.",
        shot: {
          src: "/roadmap/shots/letter-of-intent.png",
          alt: "The letter of intent editor. A back link reads All documents, the kicker reads Letter of intent, residential lease, and a status chip reads Ready to sign. A notice says the document is ready to sign so its contents are locked. Below, a This letter section holds the date and a toggle for subject to contract, and a The property section holds the address 7 Sample Rise #12-04 with postal code and property type.",
          caption: "The property carried across from the deal, so the letter opens with the address already in it. Once you mark it ready to sign the fields lock, which is what moves the deal to Offer.",
          width: 616,
          height: 621,
        },
      },
      { step: "Close it", detail: "Mark it completed when the lease starts, or lost with a reason. Closed deals stay in your history." },
    ],
    limits: [
      "It is not a CRM. There is no contact database, no email sync and no lead scoring, and we are not planning any.",
      "The stage only moves on evidence: a confirmed viewing, a finalised letter of intent, a signed tenancy agreement. Opening a blank form moves nothing, which is deliberate.",
      "Nothing books a viewing for you. Your booking link is the mechanism, and a request from it does not become a deal until you confirm it.",
      "Sale-side deals are tracked, but the paperwork chain is rental only. There is no Option to Purchase and there will not be one for HDB resale.",
      "There is no invoicing. In Singapore the commission invoice comes from the agency, not from you.",
      "A deal belongs to one agent. Nothing is shared across a team, and co-broke is not modelled.",
      "Deals are matched to a property by its address, so two genuinely different units need two different addresses typed.",
    ],
    tryIt: { href: "/dashboard", label: "Open your pipeline" },
  },

  {
    slug: "letter-of-intent",
    title: "Paperwork: the letter of intent, and the tenancy agreement that fills itself",
    status: "live",
    audience: "agents",
    shipped: "2026-08",
    summary:
      "Draw up a rental letter of intent on your own letterhead in about two minutes, then start the tenancy agreement from it with the deal already carried across.",
    whatItIs: [
      "The documents live inside the deal they belong to, in your Pipeline. They cover the two that open and close a rental: the letter of intent, and the residential tenancy agreement.",
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
        how: "The document you produce most often, from your phone in the lift after a viewing rather than in a Word file back at the office.",
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
      body: "You have shown a condo unit on a Saturday afternoon and the tenant says yes. The landlord wants something in writing today. Instead of finding last month's file and editing over it, you open the deal in your Pipeline, tap to issue a letter of intent, and the letter is already on your letterhead with your CEA registration and the standard clauses in place. You type the parties, the rent, the term and the deposits, download the PDF and send it. When the landlord accepts, the tenancy agreement starts from that letter.",
    },
    walkthrough: [
      { step: "Open Pipeline", detail: "In your dashboard, the Pipeline tab. Every deal opens with the paperwork it needs, and a confirmed viewing carries the property across." },
      { step: "Choose the document", detail: "Pick Letter of Intent or Tenancy agreement. Each card says roughly how long it takes." },
      { step: "Check your letterhead", detail: "Your name, CEA registration and agency are already filled in from your profile and collapsed out of the way. They are fixed to you and cannot be edited into someone else's name." },
      { step: "Fill in the deal", detail: "Property, landlord, tenant and occupiers, term, rent, deposits, and the standard terms. Conventions such as the security deposit months, the minor repair cap and the diplomatic clause come with the market range as a hint, and every one of them is editable." },
      { step: "Preview the PDF", detail: "While it is a draft the PDF carries a DRAFT watermark, so an unsigned letter can never be mistaken for an executed one." },
      { step: "Mark it ready to sign", detail: "The watermark drops. We check the required fields first: a letter with no rent or no parties cannot leave draft." },
      { step: "Track what happened", detail: "Mark it sent out, then signed, as the deal moves. A signed document locks: it cannot be edited or deleted, and voiding it is the only way to correct a mistake, which keeps the record of the deal intact." },
      { step: "Start the tenancy agreement", detail: "From the signed letter, one tap starts the tenancy agreement with the deal already in it. Check the details, add the inventory, and you are done." },
    ],
    limits: [
      "It is a standard template for your review, not legal advice, and it says so on every page.",
      "It does not e-sign. You download the PDF and sign it the way you do today. Signing inside the tool is what we are building next.",
      "The inventory of furniture and fittings, and the two parties' contact details, do not carry across from the letter of intent, because a letter of intent does not carry them.",
      "It does not compute stamp duty. Lease duty is a joint liability of both parties and is stamped with IRAS; the document records who bears it. Our stamp duty calculator covers buying and selling duty, not lease duty.",
      "It will never produce an HDB resale Option to Purchase. That is a serialised form issued only through the HDB Resale Portal, and generating a lookalike would be a real problem for you.",
      "The good-faith deposit is paid to the landlord. We never hold money, and CEA does not permit a salesperson to hold transaction money either.",
      "Ten documents per rolling thirty days on the free plan, thirty on Verified, unlimited on Professional and Elite. Voiding or deleting one frees the slot.",
      "On the free plan the PDF footer carries one line saying it was prepared with FairComparisons. Paid plans render without it.",
    ],
    tryIt: { href: "/tools/loi", label: "See it on your letterhead", cta: "Free on the free plan." },
    tiers: "10 documents a month on free, 30 on Verified, unlimited from Professional.",
  },

  {
    slug: "claim-your-profile",
    title: "Claim your profile: the record is already yours, take control of it",
    status: "live",
    audience: "agents",
    shipped: "2026-04",
    summary:
      "Every CEA-registered agent already has a page here. Claiming it is free, takes about a minute, never changes your rank, and opens the whole agent toolkit.",
    whatItIs: [
      "Your profile exists whether you claim it or not, because it is built from public transaction records rather than from a signup. Claiming proves it is you and hands you the controls.",
      "You verify by email against your CEA registration, which is what stops anyone else claiming your record. Then you can add a photo, a message and your WhatsApp, and the whole agent toolkit opens: seller enquiries, the Planner, Deal Radar, Area Intelligence, the Pitch Kit, Paperwork and your standing.",
      "It is free and stays free. There is no card, and nothing to cancel.",
    ],
    whyWeBuiltIt: [
      "Ranking agents who never asked to be ranked puts an obligation on us. The least we owe someone is the ability to see what we publish about them, correct what is theirs to correct, and receive the enquiries their record earns.",
      "It also had to be provably safe. An agent's page carries their livelihood, so claiming is verified against the email and the registration rather than being a form anyone can fill in.",
      "The hard line is that claiming changes nothing about ranking. Not the score, not the order, not who receives leads. If claiming moved you up, the rankings would be an advertising product, and everything else we say would be worth less.",
    ],
    whoItHelps: [
      { who: "Any CEA-registered salesperson", how: "Control of the page sellers actually read, and the enquiries that come off it." },
      { who: "Agents with a strong record and a small marketing budget", how: "The work shows without paying anyone for placement." },
      { who: "Sellers", how: "A claimed profile carries a photo, a message and a contactable agent, so the shortlist leads somewhere." },
    ],
    useCase: {
      title: "Finding out you have been ranked",
      body: "A client mentions they looked you up and found a page with your deal history on it. You search your own name, find your profile, and see your score, your areas and your recorded transactions. You claim it with your CEA number, confirm by email, add a photo and your WhatsApp, and the enquiries from sellers comparing your area start arriving in a dashboard that was already filled in before you got there.",
    },
    walkthrough: [
      { step: "Find yourself", detail: "Search your name or CEA registration number on the claim page." },
      { step: "Claim it", detail: "Confirm the profile is yours, with your CEA registration." },
      { step: "Verify by email", detail: "We send a link. Clicking it proves the profile is yours and signs you in. There is no password to remember." },
      { step: "Fill in what only you know", detail: "Photo, a short message to sellers, your WhatsApp number and the areas you farm." },
      { step: "The toolkit is open", detail: "Enquiries, Planner, Deal Radar, Area Intelligence, Pitch Kit, Paperwork and your standing, all free." },
    ],
    limits: [
      "Claiming never changes your rank, your score or who receives leads. It is control of the page, not a lever on the ranking.",
      "Your photo and your message are moderated before they go public, because they appear next to independent data.",
      "One claim per profile, verified against the email. If someone else has claimed a profile that is yours, tell us and we will sort it out.",
      "Your score does not change when you claim it. It is computed from transaction records either way.",
    ],
    tryIt: { href: "/claim", label: "Find and claim your profile", cta: "Free, and it stays free." },
    tiers: "Free. No card.",
  },
  {
    slug: "plans-and-billing",
    title: "Plans you can start and stop yourself, that never touch your ranking",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "Three paid tiers that add tools and depth, self-serve from the dashboard, with a billing portal you control. None of them move you up the rankings.",
    whatItIs: [
      "The agent product is free, and three optional tiers add more: Verified at S$29 a month, Professional at S$69, and Elite at S$149. They raise the limits on things like documents and building pages, and unlock deeper analysis of your own performance.",
      "Upgrading happens in the dashboard and takes effect immediately. Changing or cancelling runs through a billing portal in your own account, not through an email to us.",
    ],
    whyWeBuiltIt: [
      "We had to be paid by someone, and the choice of who determines whether the rankings can be trusted. Portals are paid by agents for placement, which is why their results look the way they do. We are paid by agents for tools, and the ranking is computed from government records that no payment touches.",
      "That distinction is only credible if the paid tiers visibly do not buy prominence. So they buy capacity and insight into your own record, never position, never leads, never a badge that outranks someone with a better record.",
      "Self-serve cancellation matters for the same reason. A subscription you have to email someone to escape is a subscription that is counting on friction.",
    ],
    whoItHelps: [
      { who: "Agents doing enough volume to hit the free limits", how: "More documents, more building pages, and deeper reporting on your own record." },
      { who: "Every agent, paying or not", how: "A ranking that cannot be bought, which is only worth something if it is true of the person above you as well." },
      { who: "Sellers", how: "The list you see is ordered by record, not by who paid us this month." },
    ],
    useCase: {
      title: "Deciding whether to pay for something you are already using free",
      body: "You have been using the free tools for a month and you are running into the document limit in a busy rental season. You upgrade in the dashboard, it takes effect immediately, and the limit lifts. Your position on the board does not move, which is exactly what you would want to be true of the agent ranked above you.",
    },
    walkthrough: [
      { step: "Open Plan and billing", detail: "In your dashboard settings, with your current plan and what it includes." },
      { step: "Pick a tier", detail: "The differences are stated as limits and features, not as visibility." },
      { step: "It unlocks immediately", detail: "No waiting for a webhook to catch up." },
      { step: "Change or stop it yourself", detail: "Manage billing opens the payment portal in your own account: change plan, update the card, or cancel." },
    ],
    limits: [
      "No tier changes your AgentScore, your search position, or how leads are allocated. That is enforced in the code, and it is the point of the whole model.",
      "Paid tiers do not add a badge or styling that makes you look better ranked than your record supports.",
      "Prices are in Singapore dollars per month and are shown before you commit.",
      "Cancelling stops the renewal and you keep the tier until the period you paid for ends.",
    ],
    tryIt: { href: "/for-agents#pricing", label: "See what each plan includes" },
  },
  {
    slug: "agent-comparison",
    title: "Every CEA-registered agent, ranked on their actual transaction record",
    status: "live",
    audience: "everyone",
    shipped: "2026-04",
    summary:
      "A public page for every registered property agent in Singapore, built from government transaction records rather than from what the agent says about themselves.",
    whatItIs: [
      "Every agent registered with the Council for Estate Agencies has a page here, claimed or not, unless they have asked us to take theirs down. It carries an AgentScore from 0 to 100, how many sales against how many rentals they have on record, whether they usually act for the seller or the buyer, the areas and property types they work, a year-by-year activity chart and their recent recorded deals.",
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
      "An agent can ask us to take their profile down, and we do it.",
    ],
    tryIt: { href: "/property-agents", label: "Compare agents", cta: "Free, no account." },
  },
  {
    slug: "seller-shortlist",
    title: "For sellers: a shortlist on the record, then quotes you can compare",
    status: "live",
    audience: "sellers",
    shipped: "2026-06",
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
      "If an agent has not recorded a sale in two years, that sits on their row while you are choosing, not after.",
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
    ],
    tryIt: { href: "/sell", label: "Get your shortlist", cta: "Always free for sellers." },
  },
  {
    slug: "verified-reviews",
    title: "Reviews that are tied to a real deal",
    status: "live",
    audience: "everyone",
    shipped: "2026-06",
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
      body: "You have narrowed it to two agents with similar deal counts in your town. The record cannot separate them, because on the numbers they are the same. A review from a seller who completed a sale through us, in a block clearly marked as verified, is the thing that can: it says what working with them was actually like. Where one exists, it is the tiebreaker.",
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
    slug: "share-your-record",
    title: "Put your record where you already have attention",
    status: "live",
    audience: "agents",
    shipped: "2026-06",
    summary:
      "A rank card, a live score badge for your email signature or website, and a valuation widget on your own site that sends the enquiry to you.",
    whatItIs: [
      "Four things you can copy out of the dashboard: a rank card to share, a badge showing your AgentScore that stays current wherever you paste it, a valuation widget for your own website, and a link for asking a past client to review you.",
      "The badge and the widget are embed snippets that come pre-filled with your own profile, so it is copy once, paste once.",
      "The widget is the one that earns: a visitor to your site asks for a valuation, and because it is your widget, the enquiry is yours.",
    ],
    whyWeBuiltIt: [
      "An agent's own website and email signature are where they already have someone's attention, and a self-written claim to be the area expert is worth very little there. A score computed by someone else, from records the agent cannot edit, is worth considerably more.",
      "It also solves the awkward part of proof. Nobody wants to write 'I am the top agent in Tampines' under their own name. A badge that says it for you, and that a reader can click through and check, does the same job without the cringe.",
    ],
    whoItHelps: [
      { who: "Agents with their own site or a personal brand", how: "Independent proof on your own turf, and a valuation form that feeds you rather than a portal." },
      { who: "Agents who hate self-promotion", how: "The claim is made by the data, and the reader can verify it in one click." },
    ],
    useCase: {
      title: "An email signature that does some work",
      body: "You paste the badge into your signature. Every quote, every follow-up and every cold introduction now carries a live score that updates itself as you close deals, and anyone who is curious can click it and see the record behind it rather than taking your word for it.",
    },
    walkthrough: [
      { step: "Open the Find tab", detail: "Look for the Share your record card." },
      { step: "Pick what you need", detail: "Rank card, website badge, lead widget, or the ask-for-a-review link." },
      { step: "Copy the snippet", detail: "The embed code already has your profile in it." },
      { step: "Paste it", detail: "Into your site, your signature or a message. The badge redraws from your record, so it never goes stale." },
    ],
    limits: [
      "The badge shows what your record supports. You cannot edit the number, which is the reason it is worth showing.",
      "The widget collects a valuation enquiry on your site. It is not a full listing portal or a CRM.",
      "Pasting the badge does not change your rank or your position anywhere on our site.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "my-home",
    title: "My Home: save your home once, and watch what it is worth",
    status: "live",
    audience: "sellers",
    shipped: "2026-07",
    summary:
      "Keep your valuation behind a private link, see how the estimate has moved since you saved it, and get told when it changes materially.",
    whatItIs: [
      "Run a valuation and you can keep it. You get a private link to your home, and every time you open it the estimate is recomputed from the latest transactions with the change since you saved it shown next to it.",
      "It carries the comparable sales the estimate rests on, and for an HDB flat your MOP countdown.",
      "We email you when the estimate moves enough to matter, and once a month otherwise.",
    ],
    whyWeBuiltIt: [
      "Deciding to sell is not a moment, it is a slow year of wondering. Most people check a valuation once, lose the tab, and hear nothing until an agent's flyer arrives.",
      "A saved home turns that into something you can watch, on the same transaction data the agent rankings use, without anyone calling you.",
      "It also means the first thing you see when you are finally ready is the evidence, not an advertisement.",
    ],
    whoItHelps: [
      { who: "Owners who might sell in the next year or two", how: "A number you can check whenever you wonder, and a nudge when it actually moves." },
      { who: "HDB owners approaching MOP", how: "Your countdown next to your estimate, so the two questions are answered in one place." },
    ],
    useCase: {
      title: "Thinking about selling, but not this month",
      body: "You value your flat out of curiosity and save it. Over the next eight months you open the link now and then and see the estimate move with the market, and the comparable sales that moved it. When one of your neighbours sells well, the estimate reflects it, and you decide to start looking at agents. Nobody called you once in those eight months.",
    },
    walkthrough: [
      { step: "Value your home", detail: "In the valuation tool, with the details you know." },
      { step: "Save it", detail: "You get a private link. That link is the only way in, so keep it." },
      { step: "Come back whenever", detail: "The estimate is recomputed on every visit, with the change since you saved it and the comparable sales behind it." },
      { step: "Get told when it moves", detail: "An email when the estimate changes materially, and a monthly update otherwise." },
    ],
    limits: [
      "An estimate from recent transactions is not a formal valuation. It cannot see your renovation, your view or your floor's quirks.",
      "The link is private but not password protected. Anyone you send it to can see the home you saved.",
      "It covers homes we hold transaction data for. Unusual properties will have thin comparables, and the page says so rather than guessing.",
      "You can stop the emails at any time, and we do not pass your home to agents.",
    ],
    tryIt: { href: "/tools/valuation", label: "Value your home and keep it" },
  },
  {
    slug: "agent-emails",
    title: "Two emails a month, and only when there is something in them",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "A weekly note with your profile views and fresh prospects in your farm areas, and a monthly note with your standing and how it moved. Nothing when there is nothing to say.",
    whatItIs: [
      "The weekly email carries how many sellers viewed your profile in the last seven days, and up to a handful of fresh transactions from the areas you farm.",
      "The monthly email carries your standing band and whether you moved since last month.",
      "If a week has no views and no prospects, you get nothing. Silence is a feature.",
    ],
    whyWeBuiltIt: [
      "Agents do not live in our dashboard, and they should not have to. If something happened that is worth their attention, it should come to them.",
      "The discipline is skipping the empty ones. A weekly email that arrives with nothing in it teaches people to ignore the one that matters, which is a slow way to destroy the only channel you have.",
    ],
    whoItHelps: [
      { who: "Claimed agents", how: "The two things worth knowing without opening anything: is anyone looking, and is anything moving in my patch." },
    ],
    useCase: {
      title: "A Monday morning that starts with a prospect",
      body: "You open your email on Monday and see that eleven sellers viewed your profile last week, and that three flats in one of your towns changed hands recently. You have not opened the dashboard in a fortnight, but you know where to knock this week.",
    },
    walkthrough: [
      { step: "Claim your profile", detail: "Both emails go to your claimed address." },
      { step: "Add your farm areas", detail: "That is what fills the prospect half of the weekly email." },
      { step: "Read it, or do not", detail: "Every email links straight back to the thing it is about. Unsubscribe is one click and we honour it." },
    ],
    limits: [
      "A quiet week means no email. That is deliberate.",
      "The weekly prospects only exist if you saved farm areas.",
      "These are notifications, not a newsletter, and we do not sell your address to anyone.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "free-tools",
    title: "The arithmetic that decides whether a move is possible",
    status: "live",
    audience: "everyone",
    shipped: "2026-06",
    summary:
      "Stamp duty, affordability, net sale proceeds, commission, an online valuation and an MOP tracker, free and without an account. Two more for agents: a CEA advertising checker, and a letter of intent generator that needs a claimed profile.",
    whatItIs: [
      "A set of tools for the arithmetic that decides whether a move is possible: buyer's and seller's stamp duty including ABSD, what you can borrow under the current lending rules, what you actually walk away with after commission, duty, the loan and your CPF refund, and what your home is worth from recent transactions.",
      "For agents there are two more: a checker that tests an advertisement against CEA's advertising requirements before it goes out, and the letter of intent generator, which needs a claimed profile because the letter goes out over your name and CEA registration.",
    ],
    whyWeBuiltIt: [
      "The question that actually stops people is not which agent to use, it is whether the move works at all. Sellers kept asking us the same thing in different words: after the loan, the CPF refund and the commission, what do I actually walk away with, and is it enough for the next place.",
      "Duty rates and lending limits in Singapore move, sometimes more than once a year. We show the rates each answer used so you can check the working rather than trust the number, which matters most when the answer is close to the line.",
      "They are free and they do not ask for your details. A calculator that requires your phone number is a lead form wearing a costume. The one thing that is saved is a valuation you choose to keep, which becomes a private link only you have.",
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
      { step: "Take the net proceeds calculator as the example", detail: "It answers the question most sellers actually have: what is left." },
      { step: "Tell it what you are selling for", detail: "The expected sale price, and the property type." },
      { step: "Tell it what comes off", detail: "Outstanding loan, the CPF you used plus the accrued interest you have to refund, the agent commission you agreed, and legal fees." },
      { step: "Read the cash in hand", detail: "Each deduction is itemised, with the CPF refund separated out, because that is the number people forget and the one that decides whether the next purchase is possible." },
      { step: "Check the working", detail: "Every rate and rule used is shown. Nothing is stored, and no calculator asks who you are." },
    ],
    limits: [
      "They are estimates for planning. Confirm duty with IRAS and your loan with your bank before you commit.",
      "The valuation is an estimate from recent transactions in your area, not a formal valuation, and it cannot see your renovation or your view.",
      "Rules change. We keep these current and stamp what we used, but check anything close to the line.",
      "The calculators store nothing to give you an answer. If you ask the valuation or the MOP tracker to tell you when your number moves, we keep the address you gave us for that, and only for that.",
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
      "Your position against other agents active in your area, month-over-month movement, and four counts of what sellers did with your profile.",
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
      { step: "Claim and sign in", detail: "Both cards sit at the top of the Today tab." },
      { step: "Read your band", detail: "Top ten percent, top quarter, top half or building, for the area your record centres on." },
      { step: "Read the movement", detail: "Up, down or held since last month, when we have a snapshot from the previous month for the same area." },
      { step: "Read your demand", detail: "Profile views, shortlist appearances, invitations to quote and sellers won, each with its window." },
    ],
    limits: [
      "It ranks you in one area, the one your record centres on. Multi-area standing is not built yet.",
      "Movement is month to month and needs a snapshot from the previous month in the same area, so a newly claimed profile will not show it at first.",
      "We hold back the raw position and the movement line for agents in the bottom quarter and show a forward-looking line instead, because a raw number there discourages more than it informs.",
      "A shortlist appearance means our matching put you in front of a seller, not that a seller personally saved you.",
      "Profile views are raw counts and are not deduplicated by person.",
      "Nothing here changes your rank or who receives leads. It is a mirror, not a lever.",
    ],
    tiers: "Free on every plan.",
  },
  {
    slug: "deal-radar",
    title: "Deal Radar: the blocks in your farm areas coming up on MOP",
    status: "live",
    audience: "agents",
    shipped: "2026-07",
    summary:
      "Pick up to five towns or districts you work, and see which blocks have flats coming up on their five-year MOP, and what has sold there recently, from official records.",
    whatItIs: [
      "A prospecting list built from the same government transaction records the rest of the site runs on. You name up to five HDB towns or private districts you farm, and Deal Radar returns two lists.",
      "First, blocks where flats changed hands about five years ago, so those owners are approaching the end of their Minimum Occupation Period. Second, the most recent sales recorded in those areas in the last 180 days.",
      "Each row is one real recorded transaction. An HDB row is a block and street with the flat type, storey range, month and price; a private row is the development, property type, floor range, size, month and price. Any row can be turned into a co-branded seller report you can send.",
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
      { step: "Open the Find tab", detail: "Deal Radar sits at the top of the Find tab in your dashboard." },
      { step: "Add your farm areas", detail: "Choose HDB town or District, pick the area, press Add. Up to five, the same on every plan." },
      { step: "Read the MOP list", detail: "Block and street, flat type, storey range, and the note telling you which month the flat was bought and that it is approaching the five-year MOP." },
      { step: "Read recent sales", detail: "The most recent sales in those areas over the last 180 days, HDB and private, with price and month." },
      { step: "Turn a row into a conversation", detail: "Press Seller report on any row to open a co-branded report of recent comparable sales, with your photo, name and record on it, ready to send." },
    ],
    limits: [
      "These are households approaching their MOP, not owners past it, and not a complete list. We can only see flats that appear as a resale transaction about five years ago, so a household that bought their flat new from HDB never shows up.",
      "There are no names, no unit numbers and no contact details. A row is a block, a street and a recorded transaction. Everything on it is already public.",
      "It does not predict who will sell. There is no score and no likelihood model, only two signals.",
      "It covers HDB resale and private transactions. No landed-only view, no rentals, no listings.",
      "HDB records refresh weekly. Private district records depend on a manual load, so their recency is not guaranteed the same way.",
      "Five areas is the cap on every plan, including the paid ones.",
      "The feed shows the most recent rows in each list, not the full 180 days. In a busy town more has sold than we show.",
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
      "For any area you already transact in, the pricing evidence from official past sales and what the record shows about the competition, including where you rank.",
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
      { step: "Open the Find tab", detail: "Area Intelligence sits below Deal Radar and the Pitch Kit." },
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
      "Deals closed here is a combined count, with the sales figure shown beneath it. On the public profile the two are never added together. Inside this panel you are sizing up total activity in an area, so the combined number is the useful one as long as the split is visible, which it is.",
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
      "The alternative an agent reaches for is a personal brochure of past listings, which the seller has already seen three of that week and discounts accordingly. A page the agent cannot edit does the job the brochure was failing at.",
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
      { step: "Open the Find tab", detail: "The Pitch Kit card sits under Deal Radar." },
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
      "Sellers who compare agents here and shortlist you arrive in your Pipeline, ordered so the enquiries that could cost you a listing sit at the top, each with a chip showing how long it has been waiting.",
      "On an enquiry you have been invited to quote, one button drafts a first reply. The draft uses only things on record: what the seller told us about their property, area, timeline and price expectation, your own name, agency and AgentScore, and recent transactions in their town or district.",
      "Nothing is sent for you. Before a seller picks you, you do not have their number: the draft goes into the quote you send them through us. Once you win the lead, their contact details unlock and the same button drafts the follow-up you send directly.",
      "The inbox has been there since June 2026. Drafting from the record arrived in July.",
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
      body: "You open the Pipeline tab and the banner tells you two need a reply, one of them overdue. You open the oldest and press to draft a reply. Back comes a message that names the seller's flat type, their area and two recent sales nearby, under your name. You edit a line, put it into your quote and send it, then mark it replied.",
    },
    walkthrough: [
      { step: "Open the Pipeline tab", detail: "Enquiries are ordered so the ones needing you come first, with New, Aging or Overdue chips." },
      { step: "Expand an enquiry", detail: "Press Submit quote on an enquiry that is awaiting your quote." },
      { step: "Draft a reply", detail: "Press Draft a reply with AI. The result is labelled as grounded in the record." },
      { step: "Edit and copy", detail: "It is a plain editable box. Change what you want, press Copy, or redraft." },
      { step: "Send it with your quote", detail: "Paste it into the quote and submit. Then press Mark as replied to stamp the time." },
      { step: "Quote", detail: "Fill in commission, timeline, estimated range and your marketing approach and submit. If the seller picks you, their contact details unlock." },
    ],
    limits: [
      "Nothing is ever sent by us. The draft is text you copy and send yourself.",
      "It only holds seller enquiries generated here. It does not read your portal leads, your WhatsApp or your own email.",
      "Free plans get two drafts a month. Verified and above are unlimited. The inbox itself, the ordering and the quoting are free.",
      "The comparable sales are area-level, not matched to the seller's exact unit or size, and the draft says so rather than implying a valuation.",
      "It does not learn or imitate your writing style. It sticks to facts on record, which is why it can be trusted to name a price.",
      "There is no WhatsApp alert yet. The code is built and switched off, waiting on business messaging approval from Meta, and we will not guess at a date. Today a new enquiry reaches you by email.",
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
      "A public booking link you can share anywhere, turning viewing requests into a list you confirm, complete or cancel. Calendar sync is built but no agent has switched it on yet.",
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
      { who: "Buyers and tenants", how: "Ask for a time in a few taps, with no account and no phone call, and it reaches the agent in one place." },
    ],
    useCase: {
      title: "A listing that draws ten enquiries in a day",
      body: "You put your booking link in the listing and in your bio. Ten people ask to view. Instead of ten separate threads, ten requests land in your Pipeline with the property, the time and the contact. You confirm the ones that work and cancel the ones that clash, then message those ten people yourself, because we do not write to them for you. When one of the viewings turns into a deal you issue the letter of intent straight from that row.",
    },
    walkthrough: [
      { step: "Copy your link", detail: "In the Pipeline tab, the Viewings panel shows your booking link with a copy button." },
      { step: "Share it", detail: "Listings, bio, messages. The page shows your photo, agency, CEA number and AgentScore." },
      { step: "Requests arrive", detail: "You get an email and the request appears in your Pipeline marked as a new request." },
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
      { step: "Open the Find tab", detail: "Look for the Building pages card. It shows how many pages your plan allows." },
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
      "A paid plan buys you more developments to write on. It never buys a better position, a higher score or more leads, and an Elite agent's commentary is presented exactly the same way a free agent's is.",
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
      "The eight prescribed estate agency agreement forms, for sale, purchase and leasing work, exclusive and non-exclusive, will be drawn up inside the dashboard the same way the letter of intent is.",
      "The difference from a downloaded PDF will be that the rules travel with the form: the prescribed clauses locked, only the blanks and choices editable, and no way to finalise an agreement with an essential field still empty.",
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
      "You will send for signature from the document you just drew up. Each party will get their own link, review the document, consent and sign, and you will see the status move without chasing anyone.",
      "When everyone has signed, the document will seal: the draft watermark drops, a completion certificate listing every step is added to the PDF, and the executed file can no longer be edited.",
      "The audit trail is the point of building it: who opened it, when they consented, when they signed, and a fingerprint of the exact document they agreed to.",
    ],
    whyWeBuiltIt: [
      "Of the three real executed letters of intent we studied, two had been signed through a paid external e-signature service. Agents are already paying for this and already doing it. The work is simply happening outside the tool that holds the document.",
      "We looked at the independent agent tools we could find in Singapore and none of them signs the document it generates. The paperwork itself is becoming a commodity; the record of what was agreed is not.",
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
