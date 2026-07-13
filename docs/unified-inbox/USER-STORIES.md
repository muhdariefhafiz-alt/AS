# FairComparisons Unified Inbox - User Stories

## Epic 0 - Contact Identity Spine (Foundation)
Goal: Give every conversation a person to belong to, so a timeline is even possible. Back-link today's per-form leads and orphaned WhatsApp events to one resolved contact.

### 0.1 Resolve a person from a lead
As a solo SG agent, I want every seller enquiry, booking, and inbound message to be automatically grouped under one contact, so that I see one person instead of scattered form rows.

**Acceptance Criteria**
```gherkin
Given two sg_lead rows share a normalized phone (+65 xxxx) or lowercased email
When the identity-resolution function runs
Then both rows resolve to the same sg_contacts record
And the contact exposes a stable contact_id used by the Inbox and timeline
```
```gherkin
Given a wa_inbound event exists with a phone that matches a known lead
When resolution runs
Then the previously-orphaned event is linked to that contact
And it appears on the contact's timeline
```
`[Must]` · Phase 0

### 0.2 Snapshot the live lead schema into migrations
As an FC operator/admin, I want the MCP-applied sg_lead_* tables verified and committed into supabase/migrations, so that the schema the inbox builds on is reproducible and not silently drifting.

**Acceptance Criteria**
```gherkin
Given sg_leads, sg_lead_shortlist, sg_lead_quotes and sg_lead_completions were applied via MCP
When I verify their live columns via Supabase MCP
Then a migration file reproducing those exact columns exists in supabase/migrations/
And CI can rebuild the schema from migrations alone
```
`[Must]` · Phase 0

### 0.3 No PII leak before pick
As a seller (external), I want my contact details withheld from agents until I actually pick one, so that shortlisting an agent does not expose my phone and email prematurely.

**Acceptance Criteria**
```gherkin
Given a contact linked to a lead with status != 'picked'
When an agent opens that contact in the Inbox
Then name/area/intent are visible but phone and email are masked
And the contact store never returns raw PII for a pre-pick lead
```
```gherkin
Given the lead status transitions to 'picked'
When the agent reloads the contact
Then the seller's phone and email become visible
And the release is recorded on the timeline with a timestamp
```
`[Must]` · Phase 0

### 0.4 PII residency decision enforced
As an FC operator/admin, I want the contact + inbound-message store pinned to a DPO-approved Supabase region, so that centralizing seller/buyer PII is PDPA-defensible.

**Acceptance Criteria**
```gherkin
Given a data-residency decision signed off by the DPO
When the contact and message tables are provisioned
Then they live only in the approved region
And a residency check is part of the deploy checklist
```
`[Must]` · Phase 0/1

---

## Epic 1 - Fact-Grounded AI Draft Replies
Goal: Collapse the reply to one tap. The draft cites the agent's real record, never mimics voice, never auto-sends.

### 1.1 Turn on grounded drafts in production
As a solo SG agent, I want a one-tap AI draft that cites my real AgentScore and recent area comps, so that I can reply first and sound expert in seconds.

**Acceptance Criteria**
```gherkin
Given ANTHROPIC_API_KEY is set in production
And a lead with a brief exists for an agent with a primary_area and recent sales
When the agent requests a draft
Then a reply is generated grounded on the agent's stats plus up to 5 area_recent_sales comps
And the draft is shown editable, never auto-sent
```
```gherkin
Given ANTHROPIC_API_KEY is not set
When a draft is requested
Then the route returns a graceful 503
And the UI shows "drafting unavailable" rather than an error crash
```
`[Must]` · Phase 0

### 1.2 See what the draft used
As a solo SG agent, I want the draft to show which numbers it cited, so that I trust it and can verify before sending.

**Acceptance Criteria**
```gherkin
Given a generated draft
When it renders
Then a "drafted from" line lists the sources used (e.g. "your 3 recent Tampines transactions + 2 street comps")
And each cited figure is traceable to a real record, not invented
```
`[Should]` · Phase 0

### 1.3 CEA-safe language guardrails
As an FC operator/admin, I want drafts to refuse banned advertising claims, so that no agent is exposed to a CEA advertising breach.

**Acceptance Criteria**
```gherkin
Given the draft engine composes a reply
When it would otherwise output "cheapest", "No.1", or a guarantee
Then those claims are stripped or rephrased per the CEA-advert ruleset
And the guardrail runs on every draft regardless of tier
```
`[Must]` · Phase 0

### 1.4 Edit and mark-sent
As a solo SG agent, I want to edit a draft and copy/mark it as sent, so that I stay in control and my reply reflects my judgment.

**Acceptance Criteria**
```gherkin
Given a draft is displayed
When I edit the text and choose "copy" or "mark replied"
Then the edited version is stored on the timeline as an outbound message
And no message is ever sent on my behalf without my action
```
`[Must]` · Phase 0/1

### 1.5 Draft feedback signal
As an FC operator/admin, I want a thumbs/edit signal captured per draft, so that I can detect rejected drafts and fix the prompt before a bad draft burns trust.

**Acceptance Criteria**
```gherkin
Given an agent discards or heavily edits a draft
When they act on it
Then an edit-distance / thumbs signal is recorded against the draft
And admin can view a drafts-rejected report
```
`[Should]` · Phase 0

### 1.6 Draft with no data to cite (edge)
As a solo SG agent, I want an honest draft even when I have no transactions in that area, so that the reply never fabricates a track record.

**Acceptance Criteria**
```gherkin
Given the agent has no recent sales or comps for the lead's area
When a draft is requested
Then the draft omits any transaction claims and uses a neutral, compliant opener
And it does not invent a transaction or a comp
And a hint suggests the agent add specifics manually
```
`[Must]` · Phase 0

---

## Epic 2 - Unified Inbox & Money-at-Risk Triage
Goal: One place that unifies every FC-originated conversation, ordered by what will cost commission if ignored.

### 2.1 One inbox across FC-originated streams
As a solo SG agent, I want lead shortlist rows, inbound email replies, Planner booking requests, and WhatsApp events in one contact-keyed inbox, so that I stop losing FairComparisons leads scattered across alerts, email and portals.

**Acceptance Criteria**
```gherkin
Given a contact has a lead, an inbound email reply, and a sg_viewings booking request
When the agent opens the Inbox
Then all three appear as one thread grouped under that contact
And each item shows its source channel badge
```
`[Must]` · Phase 1

### 2.2 Sort by money at risk
As a solo SG agent, I want the inbox sorted by commission at risk, so that the deal most likely to slip is at the top.

**Acceptance Criteria**
```gherkin
Given multiple open leads
When the Leads tab loads
Then items are ordered: new/unanswered first, then aging-unanswered by SLA, then quoted-awaiting-pick
And a summary line reads e.g. "2 leads need a reply, 1 aging 18h"
```
`[Must]` · Phase 0/1

### 2.3 SLA aging countdown
As a solo SG agent, I want each unanswered lead to show a countdown, so that I feel the urgency before the lead goes cold.

**Acceptance Criteria**
```gherkin
Given a lead has been unanswered past the aging threshold
When I view it
Then an SLA countdown / "aging" flag is shown
And it escalates visually as time passes
```
`[Should]` · Phase 0/1

### 2.4 Scope-honest empty state
As a solo SG agent, I want the inbox to be clear that it holds FairComparisons conversations only, so that I never expect my personal WhatsApp chats and read the feature as broken.

**Acceptance Criteria**
```gherkin
Given an agent with no FC leads yet
When they open the Inbox
Then the empty state says "every FairComparisons lead in one place"
And it never claims to unify the agent's whole WhatsApp or existing client chats
```
`[Must]` · Phase 1

---

## Epic 3 - Per-Contact Relationship Timeline
Goal: One chronological record of every interaction with a person, migrating from lead-keyed to contact-keyed.

### 3.1 See the full history for a contact
As a solo SG agent, I want a single timeline of all inbound, outbound, notes and documents for a contact, so that I can pick up any conversation without hunting.

**Acceptance Criteria**
```gherkin
Given a contact with emails, a booking, drafts sent, and a note
When I open the contact
Then a chronological timeline shows every event with channel and timestamp
And documents attached to the contact are listed inline
```
`[Must]` · Phase 1

### 3.2 wa.me click-to-chat logged to timeline
As a solo SG agent, I want the honest wa.me escape hatch to my own number logged, so that conversations that move to my personal WhatsApp still leave a breadcrumb.

**Acceptance Criteria**
```gherkin
Given a contact with a known phone
When I click the wa.me launcher
Then WhatsApp opens a chat from my own number
And a "handed off to WhatsApp" event is written to the contact timeline
```
`[Should]` · Phase 1

### 3.3 Don't promise a timeline the model can't support (guard)
As an FC operator/admin, I want the relationship timeline gated on the contact entity existing, so that we never market a cross-channel history before identity resolution is live.

**Acceptance Criteria**
```gherkin
Given the sg_contacts entity and resolution function are not yet deployed
When the timeline feature flag is evaluated
Then the timeline UI stays hidden
And no marketing copy references a relationship timeline
```
`[Must]` · Phase 0/1

---

## Epic 4 - Inbound Email Capture
Goal: Today only outbound send + a delivery/bounce webhook exist. Capture inbound email so email threads are two-way.

### 4.1 Receive a seller's email reply in the inbox
As a solo SG agent, I want a seller's reply to my FC email to land in the inbox thread, so that the conversation is complete without leaving the platform.

**Acceptance Criteria**
```gherkin
Given a seller replies to an FC-originated email
When the inbound email is received and parsed
Then it is stored, resolved to the contact, and shown in that contact's thread
And the agent is notified per their notification settings
```
`[Must]` · Phase 1

### 4.2 Inbound email mechanism chosen and documented
As an FC operator/admin, I want the inbound capture mechanism decided (Resend inbound parse vs mailbox/IMAP vs forwarding address), so that Phase-1 build shape is unambiguous.

**Acceptance Criteria**
```gherkin
Given the inbound-email decision is recorded
When Phase 1 begins
Then the chosen mechanism is implemented behind one route/thread store
And bounce/delivery events continue to be reconciled to the same thread
```
`[Must]` · Phase 1

### 4.3 Unmatched inbound email (edge)
As an FC operator/admin, I want inbound email that matches no known contact to be quarantined, not dropped, so that a genuine reply is never silently lost.

**Acceptance Criteria**
```gherkin
Given an inbound email whose sender resolves to no contact
When it is processed
Then it is stored in an "unresolved" queue rather than discarded
And an admin can manually link it to a contact
```
`[Should]` · Phase 1

---

## Epic 5 - Team Collaboration (assign / label / notes / seats)
Goal: Let a team lead route work to juniors without losing the record. Near-zero marginal cost, Professional/Elite tier.

### 5.1 Assign a lead to a colleague
As a team lead with junior agents, I want to assign an inbox conversation to a junior with a note, so that the right person handles it and nothing is dropped between us.

**Acceptance Criteria**
```gherkin
Given a team lead viewing a contact
When they assign it to a junior agent and add a note
Then the junior sees it in their inbox with the note
And the assignment + note appear on the contact timeline with author and time
```
`[Should]` · Phase 1

### 5.2 Tag / label for triage
As a solo SG agent, I want to label conversations (e.g. "hot", "financing", "just browsing"), so that I can triage my money queue at a glance.

**Acceptance Criteria**
```gherkin
Given a contact in the inbox
When I add or remove a label
Then the label persists on the contact and is filterable in the inbox
```
`[Should]` · Phase 1

### 5.3 Internal notes stay internal
As a team lead with junior agents, I want notes visible only to my team, so that I can coach without the seller ever seeing internal comments.

**Acceptance Criteria**
```gherkin
Given a note added to a contact
When the note is stored and rendered
Then it is visible only to team members, never sent to the seller/buyer
And it is visually distinct from outbound messages
```
`[Must]` · Phase 1

### 5.4 Team seats (Elite)
As a team lead with junior agents, I want to add colleague seats under my Elite plan, so that my whole desk works the same inbox.

**Acceptance Criteria**
```gherkin
Given an Elite subscription with N seats
When the team lead invites a colleague
Then the colleague gets access up to the seat cap
And exceeding the cap prompts a seat upgrade, never a rank change
```
`[Could]` · Phase 2/3

### 5.5 Auto-labeling trained on office history (Elite)
As a team lead with junior agents, I want incoming conversations auto-labeled from our office history, so that triage is done before anyone opens the inbox.

**Acceptance Criteria**
```gherkin
Given an Elite team with sufficient labeled history
When a new conversation arrives
Then a suggested label is applied automatically and marked as auto
And a human can override it, feeding the correction back
```
`[Could]` · Phase 3

---

## Epic 6 - Notifications & the Change-Trigger
Goal: The fresh lead is the manufactured cue that pulls the agent in. Budget-capped, deep-linked to the pre-drafted reply.

### 6.1 Fresh-lead alert deep-links to the draft
As a solo SG agent, I want a new-lead alert that opens straight to the row with the AI draft ready, so that replying is one tap from the notification.

**Acceptance Criteria**
```gherkin
Given a new seller lead lands for a shortlisted agent
When the alert fires (email/push)
Then it deep-links into the exact inbox row
And a grounded draft is pre-generated on arrival
```
`[Must]` · Phase 0/1

### 6.2 Aging-lead nudge, budget-capped
As a solo SG agent, I want a single escalating nudge on an aging unanswered lead, so that I clear it before it dies - without being spammed.

**Acceptance Criteria**
```gherkin
Given a lead crosses the aging threshold unanswered
When the nudge cadence evaluates
Then at most one escalating nudge is sent per lead
And total nudge spend is bounded by a hard budget cap
```
`[Should]` · Phase 1

### 6.3 Resurrection rides the real lead, not a win-back
As an FC operator/admin, I want a dormant agent re-engaged by a real lead in their area, so that reactivation costs nothing extra and stays honest.

**Acceptance Criteria**
```gherkin
Given a dormant claimed agent
When a real seller lead lands in their farm area and shortlists them
Then a "a seller in [area] shortlisted you" message is sent
And no generic "we miss you" campaign is used for the inbox
```
`[Should]` · Phase 1

### 6.4 Notification preferences
As a solo SG agent, I want to choose which alerts I get and on which channel, so that I control interruption without missing money.

**Acceptance Criteria**
```gherkin
Given the agent opens notification settings
When they toggle channels (email/push/WhatsApp-if-live) and event types
Then future alerts honor the preferences
And fresh-lead alerts cannot be silently over-suppressed below a safe floor with a warning shown
```
`[Should]` · Phase 1

---

## Epic 7 - Consent, Opt-in & Unsubscribe (PDPA)
Goal: Every channel to a person is consent-gated. Opt-in is stamped, unsubscribe is honored everywhere.

### 7.1 Agent supplies own number to enable WhatsApp
As a solo SG agent, I want to opt in by providing my own number, so that WhatsApp reachability is enabled only with my consent.

**Acceptance Criteria**
```gherkin
Given an agent updates their profile with a phone number
When they save
Then a WhatsApp opt-in is stamped with a timestamp
And reachability treats the agent as WhatsApp-eligible only after opt-in
```
`[Must]` · Phase 1

### 7.2 Seller consent before contact
As a seller (external), I want my consent recorded before any agent messages me, so that my details are only used the way I agreed.

**Acceptance Criteria**
```gherkin
Given a seller submits the /sell funnel
When consent is captured
Then a lawful basis + timestamp is stored against the contact
And no outbound message is sent without a recorded basis
```
`[Must]` · Phase 1

### 7.3 Unsubscribe honored across channels
As a seller (external), I want one unsubscribe to stop messages on all channels, so that opting out actually works.

**Acceptance Criteria**
```gherkin
Given a seller clicks unsubscribe in an email or replies STOP on WhatsApp
When the suppression is recorded
Then email and WhatsApp sends to that contact are both blocked
And the suppression is visible on the contact timeline
```
`[Must]` · Phase 1/2

### 7.4 Messaging an unconsented number (edge)
As an FC operator/admin, I want sends to unconsented numbers hard-blocked, so that we never breach PDPA or WhatsApp policy.

**Acceptance Criteria**
```gherkin
Given a contact with no recorded consent for WhatsApp
When any code path attempts a WhatsApp send
Then the send is blocked before dispatch
And the attempt is logged for audit, with wa.me offered as the manual fallback
```
`[Must]` · Phase 2

---

## Epic 8 - Packaging, Free/Paid Line & Draft Meter
Goal: The inbox is the spine of the paid tiers. Never gate ranking, the base inbox, or the seller's first reply.

### 8.1 Free-forever response loop invariant
As a seller (external), I want the agent I pick to always be able to reply to me for free, so that the marketplace actually connects us.

**Acceptance Criteria**
```gherkin
Given an agent on the Free tier
When a seller lead arrives
Then the base lead inbox, the first reply, and a monthly free draft allowance are available at no cost
And a code-level guard in tiers.ts prevents gating the first reply or ranking
```
`[Must]` · Phase 1

### 8.2 Draft volume meter
As a solo SG agent, I want to see how many free drafts I've used, so that I understand the value before I hit the cap.

**Acceptance Criteria**
```gherkin
Given a Free agent generating drafts
When they open the inbox
Then a counter shows "7 of 10 free drafts used"
And the count is enforced server-side per agent per month
```
`[Should]` · Phase 1

### 8.3 Upgrade prompt at the aha, not a pricing page
As a solo SG agent, I want the upgrade nudge right after a draft I actually send, so that the offer lands when I've just felt the value.

**Acceptance Criteria**
```gherkin
Given a Free agent hits the draft cap or has just copied/sent a draft
When the upgrade prompt fires
Then it appears in-context at that moment, not only on a generic pricing page
And it frames price against one saved commission, never against ranking
```
`[Should]` · Phase 1

### 8.4 Tier gating on depth, not rank
As an FC operator/admin, I want Verified/Professional/Elite to gate draft volume, timeline horizon, assignment and channels, so that we monetize tools while ranking stays unbuyable.

**Acceptance Criteria**
```gherkin
Given the tier grid in tiers.ts
When a capability is evaluated
Then Free/Verified/Professional/Elite differ only on draft volume, timeline horizon, colleague assignment, farm areas, and channel breadth
And no tier alters search order, shortlist standing, or visibility
```
`[Must]` · Phase 1

### 8.5 Live draft preview for a free agent (show, don't tell)
As a solo SG agent evaluating FairComparisons, I want to watch a real grounded draft generate on my own lead before paying, so that I believe the value.

**Acceptance Criteria**
```gherkin
Given a Free agent with at least one real lead
When they open that lead
Then they can generate a real grounded draft live
And on hitting the volume cap they see the upgrade path
```
`[Should]` · Phase 1

---

## Epic 9 - Two-Way FC WhatsApp (Phase 2)
Goal: Proactive + reactive WhatsApp on FairComparisons' OWN WABA, inside the 24h window, budget-capped, honestly gated. Never the agent's personal WhatsApp.

### 9.1 Reply inside the 24h window
As a solo SG agent, I want to reply free-form to a contact within 24h of their last message, so that a live WhatsApp conversation flows from the inbox.

**Acceptance Criteria**
```gherkin
Given isWhatsAppLive() is true and the contact messaged within 24h
When the agent sends a reply from the inbox
Then the message is delivered via the FC WABA and logged to the contact timeline
```
`[Could]` · Phase 2

### 9.2 Message outside the 24h window (edge)
As a solo SG agent, I want to be told when I must use a template because the window closed, so that my message is not silently rejected.

**Acceptance Criteria**
```gherkin
Given the last inbound message from a contact is older than 24h
When the agent tries to send a free-form WhatsApp
Then the UI blocks free-form and offers an approved template instead
And sending the template counts against the per-account budget cap
```
`[Must]` · Phase 2

### 9.3 Honest gating before activation
As an FC operator/admin, I want two-way WhatsApp hidden until Meta-ops activation (#39) is complete, so that we never market a channel we can't deliver.

**Acceptance Criteria**
```gherkin
Given WABA, System User token, approved templates or webhook verify token are missing
When isWhatsAppLive() is evaluated
Then two-way WhatsApp is disabled and only wa.me click-to-chat is offered
And no copy implies a two-way WhatsApp inbox
```
`[Must]` · Phase 2

### 9.4 Per-account message budget cap
As an FC operator/admin, I want a hard monthly WhatsApp spend cap per account, so that per-message pricing cannot scale spend silently like the prior dormant-cron burn.

**Acceptance Criteria**
```gherkin
Given an account nearing its monthly message budget
When the cap is reached
Then further paid sends are blocked and the operator is alerted
And utility templates inside the 24h window are preferred to bound cost
```
`[Must]` · Phase 2

---

## Epic 10 - Agent's Own Gmail (Phase 3)
Goal: Extend the timeline to the agent's own client email only after the core inbox retains. Reuse the shipped calendar-OAuth pattern.

### 10.1 Connect Gmail via restricted-scope OAuth
As a solo SG agent, I want to connect my own Gmail, so that my existing client email appears alongside FC conversations in the timeline.

**Acceptance Criteria**
```gherkin
Given the agent starts Gmail connect
When they complete restricted-scope OAuth (reusing the calendar-OAuth flow)
Then their client emails are ingested and resolved to contacts
And revoking access stops ingestion and is recorded
```
`[Could]` · Phase 3

### 10.2 Gate Gmail on retention + compliance
As an FC operator/admin, I want Gmail deferred until Phase-1 retention is proven and CASA review passes, so that we don't over-platform or breach restricted-scope rules.

**Acceptance Criteria**
```gherkin
Given Phase-1 daily-open retention is unproven OR Google restricted-scope verification is incomplete
When the Gmail feature flag is evaluated
Then Gmail connect stays disabled
And a founder go/no-go decision is required to enable it
```
`[Must]` · Phase 3

---

## Epic 11 - Activation Instrumentation & Responsiveness Loop
Goal: Measure Setup → Aha → Habit against the right denominator, and feed genuine speed back into standing without buying rank.

### 11.1 Three-rung activation ladder
As an FC operator/admin, I want distinct Setup, Aha and Habit events, so that I optimize the aha→habit gap instead of vanity "claimed" counts.

**Acceptance Criteria**
```gherkin
Given the inbox is instrumented
When an agent turns on alerts + confirms a reply channel
Then a setup_done event fires
When they send their first AI-drafted reply on a real lead
Then a first_draft_sent (aha) event fires
When they send 3+ replies across 2+ leads within 14 days
Then a habit_3replies event fires
```
`[Must]` · Phase 0

### 11.2 Adoption measured against the right denominator
As an FC operator/admin, I want adoption reported against claimed, lead-receiving agents, so that a healthy high-severity feature is not mis-read as dead.

**Acceptance Criteria**
```gherkin
Given the admin activation funnel
When adoption is computed
Then the denominator is agents who received >= 1 lead, never all ~30k CEA agents
And sub-80% adoption is flagged as "something is broken", not an acceptable niche
```
`[Must]` · Phase 0/1

### 11.3 Response-time stat surfaced to the agent
As a solo SG agent, I want to see my median first-reply time, so that I can see speed earning me more leads.

**Acceptance Criteria**
```gherkin
Given the agent replies to leads over time
When they open the dashboard
Then a "median first-reply: 22 min" stat is shown
And it updates as new replies are recorded
```
`[Should]` · Phase 1

### 11.4 Responsiveness feeds standing - fairness-audited, not pay-to-rank
As an FC operator/admin, I want genuine responsiveness to influence standing without any paid tier buying rank, so that the trust wedge holds.

**Acceptance Criteria**
```gherkin
Given responsiveness affects shortlist standing or the guarantee-reachable pool
When the standing is computed
Then only genuine reply behavior counts, audited for fairness
And no subscription tier can alter rank, order, or visibility
```
`[Must]` · Phase 1

### 11.5 Weekly "your week on FairComparisons" digest
As a solo SG agent, I want a weekly summary of leads, reply time, quotes and standing movement, so that I'm pulled back to the money queue.

**Acceptance Criteria**
```gherkin
Given a week of activity for a claimed agent
When the weekly digest runs
Then the agent receives leads received, median reply time, quotes, and standing movement
And the send is budget-capped and unsubscribe-aware
```
`[Should]` · Phase 1

---

## Epic 12 - Negative & Edge Cases (cross-cutting)
Goal: Protect the core-accuracy promise. One bad draft or mis-fired alert is an existential trust event, not cosmetic.

### 12.1 Never auto-send
As a seller (external), I want to be sure no message reaches me without a human agent choosing to send it, so that I'm not auto-messaged by a bot.

**Acceptance Criteria**
```gherkin
Given any draft, nudge, or AI-generated reply
When it is produced
Then it requires an explicit human send action (except consented, templated system nudges)
And no path auto-sends a free-form reply to a seller/buyer on the agent's behalf
```
`[Must]` · Phase 0

### 12.2 Duplicate / late lead alert (edge)
As a solo SG agent, I want lead alerts de-duplicated and time-accurate, so that a doubled or stale ping doesn't destroy my trust in the platform.

**Acceptance Criteria**
```gherkin
Given a lead notification could fire more than once
When the alert pipeline runs
Then each lead alert is delivered at most once per channel
And late/duplicate deliveries are suppressed and logged
```
`[Must]` · Phase 0/1

### 12.3 Personal-WhatsApp ingest is refused (documented won't)
As an FC operator/admin, I want any attempt to ingest an agent's personal WhatsApp explicitly refused, so that we never ban an agent's livelihood number or breach PDPA.

**Acceptance Criteria**
```gherkin
Given a request or feature idea to mirror an agent's consumer WhatsApp chats
When it is evaluated
Then it is rejected with the documented rationale (no API, ban risk, PDPA)
And only the FC-provisioned WABA + wa.me remain as WhatsApp surfaces
```
`[Must]` · All phases

### 12.4 Draft engine down mid-session (edge)
As a solo SG agent, I want the inbox to stay usable if drafting is temporarily unavailable, so that I can still reply manually and never lose a lead.

**Acceptance Criteria**
```gherkin
Given the draft service returns 503 mid-session
When the agent opens a lead
Then the inbox still shows the lead and a manual reply box
And a non-blocking "drafting temporarily unavailable" notice is shown
```
`[Should]` · Phase 0/1

### 12.5 Conversation migrates off-platform (edge)
As a solo SG agent, I want the record to persist even after the seller and I move to my personal WhatsApp, so that my response-time and standing value survive the leak.

**Acceptance Criteria**
```gherkin
Given a contact whose live conversation has moved to the agent's personal WhatsApp
When the agent views the contact
Then the FC timeline still holds all pre-handoff messages, reply-time stats, and the handoff event
And retention value (record, standing, reports) remains intact without owning the off-platform chat
```
`[Should]` · Phase 1

### 12.6 Co-branded AgentScore-backed seller report
As a solo SG agent, I want to generate a co-branded report from the contact's record using AgentScore/URA/HDB data, so that I keep a durable, non-leaking reason to stay subscribed.

**Acceptance Criteria**
```gherkin
Given a Professional+ agent and a contact with a resolved record
When they generate a seller report
Then it is produced from real AgentScore/URA/HDB data and co-branded
And it contains no CEA-banned claims and no invented figures
```
`[Should]` · Phase 1