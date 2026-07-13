# Unified Inbox Visual Design System (Phase 1-3)

**Status:** Design spec for Phase 1 (contact-centric inbox) through Phase 3 (agent Gmail, if applicable).
**Audience:** Designers, engineers, product.
**Date:** 2026-07-13

---

## 1. Design Principles

### 1.1 Wedge-Driven
Phase 0's strength is speed and leakage capture. Phase 1 design amplifies this by:
- **Putting money-at-risk queue front and center** — SLA aging, deal size, reply status.
- **Making proof visible** — AgentScore, transaction history, and comps are always one glance away, not buried in a modal.
- **One-tap reply** — draft is pre-generated and copyable; sending (via email, WhatsApp later) is frictionless.

### 1.2 Confidence Rebuilding
The median agent loses ~86% of leads. Retention value lives in the owned record (AgentScore movement, transaction proof, SLA responsiveness), not in individual lead wins. The design re-frames lost leads as "completed record" milestones, not failures.

### 1.3 Scope-Honest Positioning
The design never implies "all your client chats." Only FairComparisons-originated streams unify: seller leads, inbound email replies, Planner bookings, and (Phase 2) FC WhatsApp. The agent's personal WhatsApp stays inaccessible and honest (wa.me click-to-chat).

### 1.4 Single Source of Truth
A contact entity (sg_contacts) unifies identity across sources:
- Lead shortlist rows (seller, invited agent, sale/rent type)
- Inbound email replies (from seller or their other nominated agent)
- Planner bookings (viewings for this contact)
- Timeline events (reply sent, quote submitted, viewing booked, lead picked/not picked)

Without this spine, the UI is fragmented; with it, every lead is one contact record with a persistent thread.

---

## 2. Color & Typographic System

### 2.1 Brand Colors (Inherit FairComparisons)
Use the existing FC brand token system (see `app/lib/globals.css` `.fc-*` lib if available). If not available, apply:

**Primary:** `#1e40af` (deep blue, trust + professional)
**Secondary:** `#059669` (emerald, growth + opportunity)
**Accent:** `#dc2626` (red, urgency + SLA aging)
**Neutral:** `#6b7280` (slate, secondary text + disabled states)
**Background:** `#ffffff` (light mode) / `#111827` (dark mode)

### 2.2 Typography
- **Headings:** System sans-serif (e.g., -apple-system, Segoe UI, Helvetica Neue)
  - H1: 24px / 32px (inbox page title)
  - H2: 18px / 28px (contact name, timeline section headers)
  - H3: 14px / 20px (metric labels, secondary headers)
- **Body:** 14px / 20px, -0.2px letter-spacing (default text)
- **Mono:** 12px / 16px (timestamps, IDs, transactional data)
- **Weights:** 400 (regular), 600 (semibold, metric labels), 700 (bold, contact names + emphasis)

### 2.3 Spacing
- **Grid:** 8px base unit (4px, 8px, 12px, 16px, 24px, 32px, 48px)
- **Card margins:** 16px padding; 24px gap between cards
- **Dense timeline:** 12px between events within a thread

---

## 3. Core Surfaces

### 3.1 Inbox List View (Primary Entry)
**Purpose:** Show agent's queue of pending seller leads ranked by money-at-risk.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Leads Inbox (Page title)                                    │
├─────────────────────────────────────────────────────────────┤
│ Summary banner:                                             │
│ [5 leads need a reply] [oldest waiting 1d 4h]               │
│ [S$890K at stake] [3 aging >4h] [2 fresh <1h]              │
├─────────────────────────────────────────────────────────────┤
│ [Filters] [Sort: Money-at-Risk v] [View: List / Kanban]    │
├─────────────────────────────────────────────────────────────┤
│ SELLER: Mdm Tan (Tampines HDB)                              │
│ Status: URGENT [1d 8h overdue]                              │
│ Asking: S$620–660k · 3-month timeline                       │
│ Your standing: 82 · Tampines top 20%                        │
│ [Draft a reply] [View contact] [Mark replied]               │
│                                                              │
│ SELLER: Mr Lee (Clementi Condo)                             │
│ Status: AGING [4h 23m]                                      │
│ Asking: S$1.2–1.3M · ASAP                                   │
│ Your standing: 82 · Clementi top 15%                        │
│ [Draft a reply] [View contact] [Mark replied]               │
│                                                              │
│ SELLER: Mrs Ng (Bishan HDB)                                 │
│ Status: FRESH [18m]                                         │
│ Asking: S$540–580k · 2–3 months                             │
│ Your standing: 82 · Bishan top 25%                          │
│ [Draft a reply] [View contact] [Mark replied]               │
└─────────────────────────────────────────────────────────────┘
```

**Card anatomy:**
- **Contact header:** Seller name + property type + location (e.g., "Tampines HDB").
- **SLA chip:** Color-coded (red/urgent, amber/aging, green/fresh) + hours/days elapsed.
- **Deal metadata:** Asking range + timeline; always present.
- **Agent proof:** Standing score + percentile rank in this area (e.g., "top 20%").
- **Action row:** Draft, View Contact (→ full timeline), Mark Replied (one-tap).

**Sorting (default: money-at-risk):**
1. Status: URGENT (>24h) → AGING (4-24h) → FRESH (<4h)
2. Within status: Deal size desc (S$1.3M before S$600k)
3. Within deal size: Oldest first

**Summary banner:**
- Leads needing reply (count)
- Oldest lead waiting (time)
- Total at-stake commission (money-at-risk = deal midpoint × 2.5% estimated commission)
- Quick stat row: X aging >4h, Y fresh <1h, Z not replied yet

### 3.2 Contact Detail View (Timeline + Assignment)
**Purpose:** Show full relationship history (Phase 1 foundation for unified thread).

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Inbox                                             │
├─────────────────────────────────────────────────────────────┤
│ [Contact header]                                            │
│ SELLER: Mdm Tan (Tampines HDB)                              │
│ Status: OVERDUE [1d 8h]                                     │
│ Asking: S$620–660k · 3-month timeline                       │
│ Phone: +65 9XXX XXXX (verified) · Email: tan@...            │
│                                                              │
│ [Assignment] [Assign to colleague]  [Edit property]        │
├─────────────────────────────────────────────────────────────┤
│ Your proof:                                                  │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ AgentScore: 82                                            ││
│ │ Active in Tampines: 4 years                               ││
│ │ Recent sales (2024–2025):                                 ││
│ │ · Tampines St 11: S$640k (May 2026)                       ││
│ │ · Tampines Ave 2: S$625k (Jan 2026)                       ││
│ │ · Tampines St 21: S$610k (Sep 2025)                       ││
│ │ Area median: S$618k (3-room, 2025)                        ││
│ └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ TIMELINE                                                    │
│ ────────────────────────────────────────────────────────────│
│ [May 27, 2026, 3:15pm] LEAD INVITED                         │
│ Seller shortlisted you + 6 others                           │
│                                                              │
│ [May 27, 2026, 3:16pm] DRAFT VIEWED                         │
│ "Hi Mdm Tan, I've sold 3 similar units in your block..."   │
│ [Copy] [Send via email] [Save as template]                  │
│                                                              │
│ [May 27, 2026, 4:30pm] REPLY SENT                           │
│ Draft sent via email                                        │
│                                                              │
│ [May 27, 2026, 4:31pm] VIEWED                               │
│ Seller opened your email (2 min read time)                  │
│                                                              │
│ [May 27, 2026, 10:45pm] EMAIL REPLY                         │
│ "Thanks, can you arrange a viewing?"                        │
│ [Reply to seller] [Assign a viewing] [Quote]                │
│                                                              │
│ [May 28, 2026, 9:00am] VIEWING BOOKED                       │
│ May 28, 11:00am at Tampines St 11                           │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ [LEAD PICKED / NOT PICKED — outcome TBD]                    │
│                                                              │
│ Your score impact:                                          │
│ +0.5 point (fast reply within SLA) ✓                        │
│ +1.0 point (contact completed) [pending outcome]            │
│ Responsiveness: 0.95 (95th %ile, Tampines solo agents)      │
│                                                              │
│ ────────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────┘
```

**Contact header block:**
- Seller name, property, status, asking range, timeline
- PII fields (phone, email) only when contact is viewed; hidden in list

**Proof widget (always above timeline):**
- AgentScore (bold, large, primary stat)
- Years active + transaction count + area expertise
- Recent comparable sales (up to 3, most recent first, with dates)
- Area median price (context for asking range)
- Optional: transaction breakdown by type (sales vs. rentals; Phase 1 enhancement)

**Timeline:**
- Chronological, newest at top (reversed from traditional; matches messaging UX)
- Event types: LEAD_INVITED, DRAFT_VIEWED, REPLY_SENT, VIEWED, EMAIL_REPLY, VIEWING_BOOKED, QUOTE_SUBMITTED, LEAD_PICKED, LEAD_NOT_PICKED
- Each event includes:
  - Timestamp (date + time, e.g., "May 27, 2026, 3:15pm")
  - Event label (e.g., "LEAD INVITED")
  - Context (e.g., "Seller shortlisted you + 6 others")
  - Action buttons (copy, send, reply, book, quote, etc.)

**Assignment (Phase 1 feature):**
- "Assign to colleague" button for team use
- Shows current assignee
- Reassign flow (simple modal: select colleague + reason)

**Scoring/standing widget (bottom):**
- Score impact for this lead (e.g., +0.5 for fast reply)
- Overall responsiveness percentile
- Non-gamified (no badges, no leaderboard rank here; trust moat is transaction proof, not vanity)

### 3.3 Draft Reply Panel (Embedded Modal)
**Purpose:** AI-drafted reply, fact-grounded and editable, never auto-sent.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [X] Draft a reply to Mdm Tan (Tampines HDB)                 │
├─────────────────────────────────────────────────────────────┤
│ Grounded in your record:                                    │
│ • AgentScore 82 · 4 years in Tampines                        │
│ • Recent sales: S$640k, S$625k, S$610k (2024–2026)          │
│ • Area comps: S$618k median (your asking range context)      │
├─────────────────────────────────────────────────────────────┤
│ ✓ Fact-checked: all claims backed by your verified record  │
│ ⚠ Not auto-sent: edit and copy below, then send via email  │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│ Hi Mdm Tan,                                                  │
│                                                              │
│ I've sold 3 units similar to yours in Tampines in the last  │
│ 18 months. The most recent (May 2026) was a 4-room block    │
│ 123 nearby, which went for S$640k. Your asking range of     │
│ S$620–660k is well-positioned given the area median of      │
│ S$618k.                                                      │
│                                                              │
│ I'd be happy to arrange a viewing and discuss your          │
│ timeline. Are you available this week?                      │
│                                                              │
│ Best,                                                        │
│ [Agent name]                                                │
│ [Agency name]                                               │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│ [Copy to clipboard] [Send via email] [Save & close]         │
│                                                              │
│ Feedback (optional): [This is awkward] [Missing context]   │
│ [Regenerate draft]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Anatomy:**
- **Grounding statement:** Explicitly lists the facts used (AgentScore, area, recent sales, comps).
- **Fact-check badge:** Green checkmark + "all claims backed by your verified record."
- **Editable text area:** Users can modify before sending.
- **Action buttons:** Copy, Send via email (routes to email client), Save & close.
- **Feedback loop (Phase 2+):** Allows agent to flag drafts that miss the mark; trains the model.
- **Regenerate:** Re-rolls the draft if the agent doesn't like the tone.

**Constraints (from PRD):**
- 90–140 words
- Warm and professional
- No auto-send (copy-to-clipboard or manual email dispatch)
- No invented claims; only use AgentScore, recent transactions, and area comps
- Reference agent's own track record, not generic playbook

### 3.4 Free vs. Paid Line (Phase 1 Monetization)
**Purpose:** Gate draft volume and premium timeline features without gating the base inbox.

**Free tier (always):**
- Base inbox (all lead listings)
- Seller's first reply
- First 2 drafts per month
- Basic timeline (lead invited → reply sent → picked/not picked)
- SLA status and aging

**Paid tier (S$29/month, "Inbox Pro"):**
- Unlimited AI drafts
- 30-day timeline depth (inbound email, viewing bookings, full event history)
- Assignment (team inbox, colleague notes)
- Email label management (follow-up, archived, favorite contacts)
- Monthly responsiveness report (percentile + score movement)
- Early access to new channels (Phase 2: WhatsApp, Phase 3: Gmail)

**Placement:**
- "Upgrade to Inbox Pro" CTA appears on third draft attempt in a month (not in the modal; after-action)
- Pricing link in settings + on contact detail page (optional upsell)
- **Never gate:** base inbox, money-at-risk sort, seller's first reply, SLA aging, AgentScore proof

---

## 4. Layout System

### 4.1 Grid & Breakpoints
- **Desktop:** 1280px (primary target; solo agents often use phone but reply via email on desktop)
- **Tablet:** 768px (secondary; some agents use iPad for viewings + follow-up)
- **Mobile:** 375px (fallback; read-only for most, compose via email on their own app)

**Layout zones:**
- **Inbox list:** 3-column grid on desktop (lead card, expanded timeline on click), 1-col on tablet/mobile
- **Contact detail:** Full-width on all sizes; timeline scrolls vertically; proof widget sticks to top on scroll

### 4.2 Navigation
**Persistent sidebar (desktop, collapse on mobile):**
- Leads Inbox (active by default)
- Saved contacts (Phase 2+)
- Insights (agent standing + responsiveness; Phase 2)
- Settings (channel preferences, profile, logout)

**Top bar:**
- Logo / back button (mobile)
- Search (find contact by name/phone; Phase 2)
- Agent profile menu (avatar, settings, logout)

---

## 5. Interaction Patterns

### 5.1 Status & SLA Indicators
**Chips:**
- `URGENT` (red, >24h): `background: #dc2626; color: white; padding: 4px 12px; border-radius: 9999px`
- `AGING` (amber, 4–24h): `background: #f59e0b; color: #111827; padding: 4px 12px`
- `FRESH` (<4h): `background: #10b981; color: white; padding: 4px 12px`

**Card state:**
- Unread/unanswered: raised shadow + top 4px border in status color
- Replied: neutral shadow, status chip removed, gray text "Replied on [date]"
- Archived: 40% opacity + strikethrough seller name

### 5.2 Timeline Events
**Event card styles:**
```
┌─────────────────┐
│ [icon] LABEL    │ ← 12px bold, accent color
│ [timestamp]     │ ← 11px gray mono
│ Context text    │ ← 14px body
│ [inline actions]│ ← blue link text
└─────────────────┘
```

**Icons per event type:**
- LEAD_INVITED: 🎯 (target)
- DRAFT_VIEWED: ✎ (pencil)
- REPLY_SENT: ✓ (checkmark, green)
- VIEWED: 👁️ (eye)
- EMAIL_REPLY: 💬 (speech bubble)
- VIEWING_BOOKED: 📅 (calendar)
- QUOTE_SUBMITTED: 💰 (money)
- LEAD_PICKED: 🏆 (trophy, green)
- LEAD_NOT_PICKED: ✗ (x, neutral gray)

### 5.3 Modals & Overlays
- **Draft modal:** Slide from right (desktop), full-screen (mobile)
- **Assignment modal:** Center overlay, dismiss on outside click
- **Feedback modal:** Small overlay below the draft text
- **Escape key:** Closes all modals; dialog confirms unsaved changes

### 5.4 Empty States
**No leads:**
```
┌─────────────────────────────────────┐
│ You're all caught up!               │
│ All leads have replies in progress. │
│                                      │
│ [Browse past contacts]              │
│ [Invite more sellers]               │
└─────────────────────────────────────┘
```

**No leads today (but some pending):**
```
┌─────────────────────────────────────┐
│ 3 leads waiting for a reply         │
│ [View all] or check back later      │
└─────────────────────────────────────┘
```

---

## 6. Dark Mode

**Automatic support via CSS variables:**
- Light: backgrounds `#ffffff`, text `#111827`, accent `#1e40af`
- Dark: backgrounds `#111827`, text `#f3f4f6`, accent `#60a5fa` (lighter blue for contrast)

**Card shadows (light):** `0 1px 3px rgba(0,0,0,0.1); 0 1px 2px rgba(0,0,0,0.06)`
**Card shadows (dark):** `0 1px 3px rgba(0,0,0,0.3); 0 1px 2px rgba(0,0,0,0.2)`

---

## 7. Accessibility

### 7.1 WCAG 2.1 AA Compliance
- **Color contrast:** All text ≥ 4.5:1 (normal) / 3:1 (large text)
- **Focus indicators:** Visible 2px outline on all interactive elements
- **Keyboard nav:** Tab order follows DOM order; no keyboard traps
- **Semantic HTML:** Use `<button>`, `<a>`, `<form>`, `<section>` correctly
- **ARIA labels:** Status chips, timeline events, and action buttons are labeled for screen readers

### 7.2 Readable Typography
- Body text ≥ 14px
- Line height ≥ 1.5
- Max line width ≤ 75 characters (readability)
- No text only in color (use text labels + icons)

### 7.3 Motor Accessibility
- Touch targets ≥ 44×44px (mobile)
- Sufficient spacing between interactive elements (≥ 8px minimum)
- No hover-only info disclosure (use click or focus for desktop users with motor impairment)

---

## 8. Component Library (Storybook)

**Core components:**
- `SLAChip` (status + elapsed time)
- `AgentProof` (AgentScore, transactions, area comps)
- `LeadCard` (inbox list item)
- `Timeline` + `TimelineEvent`
- `DraftPanel` (AI reply, editable)
- `ContactHeader`
- `AssignmentForm`
- `UpgradePrompt` (free → paid CTA)

Each component ships with:
- Props documentation
- Accessibility notes
- Dark mode support
- Mobile breakpoint behavior

---

## 9. Animation & Micro-Interactions

### 9.1 Transitions
- **Page load:** Fade in + slide down (0.2s ease-out) for lead cards
- **Modal open:** Slide from right + fade (0.15s ease-out)
- **Status change:** Badge color fade (0.1s) when lead is marked as replied
- **Timeline:** Stagger 0.05s per event on page load

### 9.2 Hover States
- **Lead card:** Raise shadow + 2px left border accent (encourage click)
- **Action button:** 10% background darkening + cursor pointer
- **Timeline event:** Highlight background (2% accent color overlay)

### 9.3 Loading States
- **Draft generating:** Skeleton loader with animated shimmer (2s loop)
- **Sending reply:** Button shows spinner + text "Sending..."
- **Async loads:** Skeleton match card height/width; no layout shift

---

## 10. Phase-by-Phase Feature Map

### Phase 1 (Contact Inbox)
- [x] Lead list + SLA sorting (money-at-risk)
- [x] Contact detail + full timeline
- [x] AI draft (editable, not auto-sent)
- [x] Assignment (colleague @ mention)
- [x] Email label management (follow-up, archived)
- [x] Free / paid tier (2 drafts/month free)

### Phase 2 (Two-Way Channels)
- [ ] Inbound email reply parsing + display in timeline
- [ ] FC WhatsApp number + two-way messaging
- [ ] Email compose modal (send directly from inbox)
- [ ] Viewing scheduler (sg_viewings integration)
- [ ] Planner bookings in timeline

### Phase 3 (Agent Gmail, conditional)
- [ ] Google OAuth scope verification (restricted scope + CASA audit)
- [ ] Inbox unification (agent's own Gmail + FC emails)
- [ ] Starred/archived sync with agent's Gmail
- [ ] Search across all channels (agent's email + FC)

---

## 11. Responsive Behavior (Key Rules)

**Desktop (1280px+):**
- Sidebar + 3-col lead grid
- Contact detail full width on click
- Proof widget sticky on scroll

**Tablet (768–1280px):**
- Sidebar collapse to icon bar
- 2-col lead grid
- Proof widget below header (not sticky)

**Mobile (375–768px):**
- No sidebar (hamburger menu)
- 1-col lead grid
- Full-screen contact detail
- Draft modal full-screen
- Stacked layout for all dense info (proof, timeline, actions)

---

## 12. Performance & Loading

- **Inbox list:** Lazy load 10 leads on first view + infinite scroll
- **Contact detail:** Load timeline on demand (show 20 events, "load more" button)
- **Drafts:** Cache last 3 generated drafts client-side; regenerate on demand
- **Images:** Lazy load proof cards (AgentScore badge, headshot if added)

---

## 13. Scope Notes for Implementation

**Not included in Phase 1 visual design (deferred):**
- Buyer-side message unification (no buyer lead source yet)
- Leads sent via SMS or other channels (MVP: email + WhatsApp Phase 2)
- Mobile app (web-first; native app Phase 3+)
- Advanced analytics (dashboard behind "Insights" tab, Phase 2)
- Competitor comparison (Phase 3, if applicable)

**Design debt / backlog:**
- Notification center (email digest, SMS alerts for URGENT leads)
- Advanced filters (property type, area, status, assigned to, etc.)
- Bulk actions (archive, reassign, label multiple)
- Contact merge (if seller re-submits with different email)

---

## 14. Brand Voice & Copy Tone

- **Not:** Generic SaaS platitudes ("Empower your sales," "Unlock your potential")
- **Yes:** Agent-specific, grounded in reality ("Never drop a deal." "Reply first, reply backed by your real numbers.")
- **Tone:** Professional, human, no jargon. "Your AgentScore" not "User-generated trust metric."
- **Errors:** Honest and actionable ("Failed to send draft — email is required" not "Error 500")

---

## References

- **PRD:** docs/unified-inbox/PRD.md (product architecture, gates, non-goals)
- **User Stories:** docs/unified-inbox/USER-STORIES.md (acceptance criteria)
- **Strategy Memo:** docs/unified-inbox/STRATEGY.md (positioning, job to be done, growth loops)
- **Brand System:** app/lib/globals.css, app/components/Brand.tsx (existing FC design tokens)

---

**Design by:** Claude (Anthropic)
**Reviewed by:** [Lex van Lynden]
**Last updated:** 2026-07-13
