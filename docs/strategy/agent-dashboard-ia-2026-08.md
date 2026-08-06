# The dashboard should follow the deal, not the tool

Agent dashboard information architecture, August 2026. Written against the code
and the database as they stand on 2026-08-06, not against memory.

---

## 1. What is actually there today

Five tabs: **Home, Leads, Grow, Paperwork, Profile**, holding 31 distinct panels
plus 8 pieces of always-on chrome.

| Tab | What lives in it |
|---|---|
| Home | Standing, "what needs you today" worklist, profile-completeness hero, first-run paperwork nudge, demand stats, Verified upsell chip, contact-clicks tile, a 7-card tool launcher |
| Leads | Seller enquiries (LeadsInbox), viewings (PlannerPanel) |
| Grow | Deal Radar, Pitch Kit, Performance, Area Intelligence, Building Pages, AgentNet upload, Share card |
| Paperwork | DocumentsPanel (LOI + tenancy agreement) |
| Profile | Identity and edit form, plan and billing |

Two of those tab names are tools, not work. "Grow" is a drawer of seven
unrelated instruments. "Paperwork" is a filing cabinet. An agent does not wake
up wanting to do paperwork; they want to close the flat they showed on Saturday.

## 2. The decisive finding: there is no deal

Verified against the schema on 2026-08-06.

- **No deal entity exists.** No table in the public schema contains `deal`,
  `pipeline`, `stage`, `opportunity`, `matter` or `engagement`.
- **There is no property key anywhere.** `sg_viewings.property_label` is free
  text. `sg_documents.fields->>'premises_address'` is untyped JSONB. A viewing
  and a letter of intent for the same unit cannot be joined today.
- **The agent key is fragmented three ways**: `sg_agents.id` (bigint),
  `cea_registration` (text, which is what `sg_viewings` uses), and `agent_slug`.
- **Every agent work-in-progress table is empty**: `sg_viewings` 0,
  `sg_documents` 0, `sg_lead_quotes` 0, `sg_lead_completions` 0,
  `sg_building_pages` 0, `sg_agent_calendar` 0, `sg_agent_farm_areas` 0,
  `sg_agent_reviews` 0. Five real claimed agents, none paying.

This is why the dashboard feels messy, and it is a deeper cause than tab
labelling. The product has one surface per stage of the agent's job and no
thread running through them. The only cross-stage handoff that exists anywhere
is the confirmed-viewing row's "Issue a letter of intent", which jumps to
Paperwork with the property prefilled. That single handoff is the most-liked
thing in the product precisely because it is the only place the software
understands that two stages are the same deal.

The emptiness is not an argument for waiting. It is the argument for doing this
now: there is no production data to migrate and no agent habit to disrupt.

## 3. The workflow to lean into

From our own primary research, not assumption:

- **Rentals are the job.** 63% of recorded CEA activity is rentals; roughly
  three rental contracts for every resale (about 130k rentals vs 41k resales in
  2025). 66% of registered agents have no sale on file at all.
- **The rental sequence** is: prospect → pitch → mandate (prescribed Estate
  Agency Agreement, s 44(1) EAA) → enquiry → viewing → **LOI** → **tenancy
  agreement** → completion → reputation.
- **The viewing is the hinge.** It is where a lead becomes a deal, and it is the
  moment the agent is standing in the flat with a phone.
- **The sale branch is deliberately truncated**: HDB resale OTP is a hard never
  (HDB-issued and serialised), private resale OTP/S&P is backlog.

So the dashboard should be tuned to the rental sequence, and the pivot point it
must make effortless is viewing → offer.

## 4. Verdict on the proposed tabs

Proposed: **Leads (views, inquiries) → Appointments & Contact (scheduling,
future unified inbox) → Deals → Admin (LOI, contract, invoicing)**.

**Right, and for the right reason.** Tabs should be named after the agent's work
and ordered along the value chain. Today's are named after our tools. That is
the actual defect.

**Three corrections.**

1. **Do not split Leads from Appointments.** In the agent's head an enquiry
   becoming a viewing is one conversation, and it is the only cross-stage
   handoff we have working. Splitting it across two tabs makes the agent change
   rooms in the middle of the single task the product is best at.

2. **"Deals" cannot be a tab yet, because there is no deal.** It is not a tab,
   it is the spine. Build the record first and the other tabs become views of
   it. A Deals tab shipped before the entity is an empty room with a good name.

3. **Drop "Admin".** Three problems: it is where work goes to be forgotten, it
   collides with the name of our own operator console, and two of its four
   contents do not exist. E-signing and CEA prescribed forms are published on
   the public roadmap as *next up*, not built. Invoicing exists only in a PRD,
   and in Singapore the commission invoice is **agency-branded with commission
   payable to the agency**, not the salesperson billing a client directly. Never
   mint a tab that leads nowhere.

**One omission.** The proposal drops prospecting entirely. With zero leads and
zero documents for real agents today, Deal Radar, Area Intelligence and Building
Pages are the only things a real agent can currently use. Remove them and the
dashboard becomes four empty rooms.

## 5. Recommended architecture

Four tabs. The deal is the spine, not a tab.

```
Today      one answer to "what needs me now", assembled from every stage
Pipeline   the deal spine: Enquiry -> Viewing -> Offer -> Agreement -> Completed
Find       prospecting: Deal Radar, Area Intelligence, Building Pages, Pitch Kit, Share
You        profile, plan, standing, performance, public profile
```

**Pipeline absorbs three of today's tabs.** A deal row opens to show the
property, the parties, its viewings, its documents and its one next action.
Enquiries are deals at the first stage. Viewings are events on a deal. The LOI
and tenancy agreement are documents on a deal. Paperwork stops being a drawer
and becomes the part of a deal where you generate what the stage needs.

**Find keeps the top of the funnel alive**, renamed from a noun ("Grow") to the
verb the agent is performing.

**You** takes the identity and money surfaces out of the workflow tabs, where
they currently interrupt it.

Stage model, deliberately shallow, and every transition driven by a real event
rather than a dropdown the agent has to remember to update:

| Stage | Entered when |
|---|---|
| Enquiry | a lead is assigned, or the agent starts a deal by hand |
| Viewing | a viewing is booked on the deal |
| Offer | a letter of intent on the deal reaches finalised |
| Agreement | a tenancy agreement on the deal reaches signed |
| Completed | the agent marks it done, or a completion is recorded |
| Lost | the agent marks it lost, with an optional one-word reason |

## 6. What this is not

- Not a CRM. No contact database, no email sync, no lead scoring.
- Not invoicing. Blocked on legal review and, in Singapore, agency-billed.
- Not a sale-side conveyancing tool. The OTP branch stays out.
- Not a promise of the unified inbox. The contact spine and timeline shipped;
  two-way email relay is schema only, and personal-WhatsApp mirroring is DOA.

---

# User stories

**Epic:** The dashboard follows the deal, not the tool.

**Primary persona, Wei Ling, rental salesperson.** Rentals are 63% of CEA
activity and 66% of agents have no sale on file, so she is the median user. Two
to four live deals at a time, works from her phone between viewings, papers a
deal a few times a month rather than daily.

**Secondary persona, Alan, sale-side salesperson.** Fewer deals, longer cycles,
more time between stages, more likely on desktop.

**Third persona, the operator.** Needs to know whether the restructure moved
adoption, from data that excludes sandbox accounts.

Points are Fibonacci, sized against this codebase (a migration plus a panel plus
its API is typically a 5).

---

## Sprint 1: the spine (21 points)

Nothing in this sprint changes the tab bar. It builds the record everything else
will hang from, and proves it against real use before any IA churn.

### S1. A deal exists, and it knows the property (5)

> As Wei Ling, I want everything about one flat to sit in one record, so my
> viewing and my letter of intent for the same unit stop being unrelated files.

**Acceptance criteria**
- `sg_deals` exists with: id, agent_id (bigint, FK to sg_agents.id), stage,
  property_label, postal_code, property_type, counterparty_name,
  counterparty_contact, side (landlord or tenant, seller or buyer), rent_or_price,
  source, created_at, updated_at, closed_at, lost_reason.
- Stage is constrained to: enquiry, viewing, offer, agreement, completed, lost.
- `sg_viewings` and `sg_documents` each gain a nullable `deal_id` FK.
- The agent key is `sg_agents.id` everywhere on the new table. `sg_viewings`
  keeps its `agent_cea_no` column but gains `deal_id` so the fragmentation stops
  spreading.
- RLS on, no policy, service-role only, consistent with the operator spine.
- A postal code is optional, because an agent at a viewing may not have it.

**Notes:** greenfield. All target tables are empty, so no backfill and no
migration risk.

### S2. Every existing entry point creates or joins a deal (5)

> As Wei Ling, I never want to be asked to "create a deal". It should already
> exist by the time I need it.

**Acceptance criteria**
- Booking a viewing creates a deal at stage `viewing` if none matches, and
  attaches to the existing deal when the property label matches an open deal for
  that agent (case and whitespace insensitive).
- Starting a document from a viewing row attaches it to that viewing's deal.
- Starting a document from anywhere else creates a deal at stage `offer` for an
  LOI, or `agreement` for a tenancy agreement, seeded from the document's
  property field.
- Chaining an LOI into a tenancy agreement keeps both documents on the SAME deal.
- A seller lead assigned to the agent creates a deal at stage `enquiry`.
- No entry point ever asks the agent to name a deal. The property is the name.
- Sandbox agents create deals normally, but their deals never reach any metric.

### S3. Pipeline replaces Leads (5)

> As Wei Ling, I want to open one tab and see every live deal and what each one
> is waiting on.

**Acceptance criteria**
- The Leads tab becomes Pipeline. Deals are grouped by stage in workflow order,
  most recently touched first inside each group.
- A row shows: property, counterparty, stage, the single next action, and how
  long it has been sitting.
- Seller enquiries still appear, as deals at the enquiry stage, with the reply
  action intact.
- Empty state names the loop rather than apologising: how a deal starts, with a
  button to start one and a link to Find.
- Works at 375px with no horizontal scroll.
- `?tab=leads` continues to resolve, to Pipeline.

### S4. A deal opens to everything about it (3)

> As Wei Ling, I want to tap a deal and see its viewings and its documents
> together, so I stop hunting across tabs.

**Acceptance criteria**
- A deal detail view shows property and parties, its viewings with dates, its
  documents with statuses, and stage history.
- The stage-appropriate action is the primary control: at `viewing`, "Issue a
  letter of intent"; at `offer` with a finalised LOI, "Create the tenancy
  agreement" (the existing chain, which carries the terms across).
- Documents open in the existing editor; nothing about generation changes.
- Editing the property label on a deal does not rewrite documents already
  finalised.

### S5. Stages move themselves (3)

> As Wei Ling, I want the stage to be right without maintaining it, because I
> will not maintain it.

**Acceptance criteria**
- Finalising an LOI on a deal moves it to `offer`. Marking a tenancy agreement
  signed moves it to `agreement`. Booking a viewing on an enquiry moves it to
  `viewing`.
- Stage never moves backwards automatically.
- The agent can override stage by hand, including to `lost` with an optional
  reason, and a manual override is never overwritten by a later automatic move.
- Every transition writes a funnel event carrying from-stage, to-stage and
  trigger, excluded for sandbox agents.

---

## Sprint 2: the surface (21 points)

### S6. Paperwork stops being a tab (3)

> As Wei Ling, I want documents where the deal is, not in a separate cabinet.

**Acceptance criteria**
- The Paperwork tab is removed. Its contents live inside a deal, plus an "All
  documents" view reachable from Pipeline for the agent who is looking for a
  file rather than a deal.
- **`?tab=paperwork&newDoc=loi&newDocFrom=broadcast` still works**, because the
  live launch announcement links to exactly that. It creates a deal, opens the
  new LOI inside it, and still attributes the entry as `broadcast`.
- The first-run letterhead card keeps working and now starts a deal.
- The quota and its messaging are unchanged.

### S7. Today answers one question (5)

> As Wei Ling, I want the first screen to tell me the single thing to do next,
> not to show me six panels.

**Acceptance criteria**
- Today shows at most three items, drawn from real state in priority order:
  unanswered enquiry, viewing to confirm or that just happened without a
  follow-up, deal sitting at a stage past its typical dwell time, unfinished
  profile.
- Each item states the deal it belongs to and links straight into it.
- When there is genuinely nothing, the calm state suggests one prospecting
  action from Find rather than inventing urgency.
- The 7-card tool launcher is deleted. Tabs are the launcher.

### S8. Grow becomes Find, and the mirror moves to You (2)

> As Wei Ling, I want the tab to be named after what I am doing.

**Acceptance criteria**
- Grow is renamed Find and keeps Deal Radar, Area Intelligence, Building Pages,
  Pitch Kit and Share.
- Standing, Performance and the benchmarking block move to You, with Profile and
  plan and billing.
- `?tab=grow` resolves to Find. No dead internal links anywhere in the repo,
  including emails and the roadmap.

### S9. Start a deal from a viewing on a phone in under 30 seconds (3)

> As Wei Ling, standing in the flat with the tenant still there, I want to open
> the offer before I leave.

**Acceptance criteria**
- From Today or Pipeline on a 375px screen: viewing row, one tap to the deal,
  one tap to issue the LOI, with property and parties already filled.
- Measured end to end on a real device profile, target under 30 seconds and
  under 6 taps.
- No horizontal scroll, tap targets at least 40px.

### S10. The operator can see whether it worked (3)

> As the operator, I want to know whether deals actually progress, not just
> whether the tabs look nicer.

**Acceptance criteria**
- `sg_pipeline_tracker()` RPC returns, excluding sandbox: deals created, deals by
  stage, median dwell time per stage, stage-to-stage conversion, deals reaching
  agreement, and the counter-metric of deals stuck past 30 days.
- Surfaced as an admin card next to the paperwork tracker.
- Security definer, search_path pinned, revoked from public and anon and
  authenticated, granted to service_role.

### S11. Empty pipeline teaches the loop (2)

> As a new agent with nothing yet, I want to understand what this is for.

**Acceptance criteria**
- The empty state shows the five stages as a diagram with one line each, and two
  real actions: start a deal by hand, or open Find.
- No fake sample data, no invented counts.

### S12. Nothing that does not exist gets a room (2)

> As the operator, I want the IA to stop advertising things we have not built.

**Acceptance criteria**
- No tab, subtab or empty panel for e-signing, CEA prescribed forms, invoicing
  or Telegram.
- Where a stage has no tool yet (mandate, completion), the deal shows the stage
  with no control rather than a disabled one.
- The public roadmap remains the only place unbuilt work is described, and keeps
  its future-tense headings.

---

## Backlog, with the reason each is not in these two sprints

| Item | Why not now |
|---|---|
| Commission invoice on a completed deal | Agency-branded and agency-payable in Singapore; inside the pending legal review |
| Unified inbox inside the deal | Contact spine and timeline shipped, two-way email relay is schema only |
| E-signing, CEA prescribed forms | Published as *next up*; CEA position on third-party e-signing of prescribed forms is an open written question |
| Mandate stage with the prescribed Estate Agency Agreement | Depends on the forms work above; s 44(1) makes it the highest-value stage to add next |
| Sale-side OTP and S&P | HDB resale OTP is a hard never; private resale is lawyer-dominated |

## Sequencing note

Sprint 1 ships behind the existing tab names. If the deal spine turns out to be
wrong, it is deleted without an agent ever having seen a changed dashboard. Only
Sprint 2 moves furniture, and by then the spine has real rows in it.
