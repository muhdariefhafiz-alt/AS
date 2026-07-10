# FairComparisons email lifecycle

Cohesive template set for every funnel email, mapped to the real `sendEmail`
send points already in the code. Grouped by objective: **onboard, engage,
retain, update, monetize**, across two audiences (sellers, agents).

## Principles (apply to every template)

- **Voice:** direct, evidence-led, no hype. Short sentences. Lead with the
  useful thing, close with one clear action.
- **The firewall, everywhere:** "Ranked on real CEA transaction data, not
  advertising. Rankings cannot be bought." One line in the footer of every
  agent email. It is the brand and the legal moat both.
- **No fabricated numbers.** Every figure is a merge field (`{{profile_views_7d}}`,
  `{{area}}`, `{{score}}`) that renders from real data, or the line is dropped.
  Never invent a stat, quote, or testimonial.
- **PDPA:** every marketing (non-transactional) email carries a one-click
  unsubscribe and states why the person is receiving it (they claimed / they
  used a tool / they consented). Transactional emails (verify, login, lead)
  do not need unsubscribe but still get the footer.
- **No em dashes.** Premium SG register. Currency as `S$`.
- **From:** `FairComparisons <noreply@fair-comparisons.com>` (Resend, once the
  domain verifies). Reply-to a monitored inbox for the seller/agent ones.
- **One CTA per email.** A second link is fine only as a text "or" beneath it.

## Shared HTML shell

Reuse one layout so every email is consistent. This mirrors the existing
`buildVerifyEmail` / `agentInviteHtml` styling (ink header, blue button).

```ts
// app/lib/email-layout.ts
const INK = "#0a1733";
const BLUE = "#1f44ff";

export function emailShell(opts: {
  preheader: string;          // hidden inbox preview line
  heading: string;
  bodyHtml: string;           // inner paragraphs / lists
  cta?: { label: string; href: string };
  footerNote?: string;        // e.g. unsubscribe context
  unsubscribeUrl?: string;
}): string {
  const { preheader, heading, bodyHtml, cta, footerNote, unsubscribeUrl } = opts;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</span>
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb"><tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" width="560" style="background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:${INK};padding:22px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">FairComparisons</p></td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${heading}</p>
    ${bodyHtml}
    ${cta ? `<div style="margin:26px 0 6px"><a href="${cta.href}"
      style="display:inline-block;background:${BLUE};color:#fff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${cta.label}</a></div>` : ""}
  </td></tr>
  <tr><td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.5">
      Ranked on real CEA transaction data, not advertising. Rankings cannot be bought.</p>
    ${footerNote ? `<p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.5">${footerNote}</p>` : ""}
    ${unsubscribeUrl ? `<p style="margin:0;font-size:11px;color:#9ca3af"><a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a></p>` : ""}
  </td></tr>
</table></td></tr></table></body></html>`;
}
```

## Map

| Stage | Audience | Email | Trigger (`metric`) | Goal / KPI | Status |
|---|---|---|---|---|---|
| Onboard | Agent | Cold outreach | `Agent Outreach` | claim rate | exists, rewrite |
| Onboard | Agent | Claim verification | `Claim Verification` | verify rate | exists |
| Onboard | Agent | Welcome / activate | `Agent Claimed` | profile completion | exists, extend |
| Onboard | Seller | Welcome | `Consumer Welcome` | tool re-use | exists |
| Onboard | Seller | Shortlist ready | `Seller Shortlist Ready` | invite an agent | exists |
| Engage | Agent | New seller lead | `Agent Notification` | quote within 24h | exists |
| Engage | Agent | Weekly digest | `Weekly Digest` | login / respond | exists |
| Engage | Seller | Quote ready | `Seller Quote Ready` | pick an agent | exists |
| Retain | Agent | Your standing | `Standing Digest` | habit / retention | exists |
| Retain | Seller | Completion | `Seller Completion` | review + referral | exists |
| Retain | Seller | Review request | `Seller Review Request` | published review | exists |
| Retain | Seller | Reactivation | `Seller Reactivation` | resume funnel | exists |
| Update | Seller | MOP eligibility | `MOP Alert` | start selling | exists |
| Update | Seller | Valuation change | `AVM Update` | re-engage | exists |
| Monetize | Agent | Upgrade prompt | `Agent Upgrade` (new) | subscribe | NEW |
| Monetize | Agent | Payment failed | `Agent Dunning` (new) | recover card | NEW |

---

# Stage 1: Onboard

### A1. Agent cold outreach  (`Agent Outreach`)
To an active, unclaimed agent. Publicly listed business email only. This is the
one that starts the whole supply loop.

- **Subject:** `{{first_name}}, your FairComparisons profile is live (and public)`
- **Alt subject:** `You rank #{{rank}} of {{area_total}} agents in {{area}}`
- **Preheader:** Your CEA record is already on your public page. Claim it free.
- **Body:**
  > Your CEA transaction record is public, so FairComparisons already has a page
  > for you at [your profile]({{profile_url}}) that sellers in {{area}} can see.
  >
  > Right now it shows your record only. Claim it, free, to add your photo, a
  > short bio, and start receiving seller leads matched to your area. Claiming
  > never changes your ranking. We rank on the CEA data alone.
- **CTA:** `Claim your profile` -> `{{profile_url}}#claim`
- **Footer note:** You are receiving this because your details are publicly
  listed as a CEA-registered salesperson. Not you? Ignore this email.
- **Notes:** subject variant B (`rank`) only fires when `rank` is known. DNC and
  publicly-listed-business-contact rules apply; send from a warmed domain.

### A2. Agent claim verification  (`Claim Verification`)  — transactional
- **Subject:** `Verify your profile claim, {{first_name}}`
- **Preheader:** One click confirms this profile is yours. Link expires in 24h.
- **Body:**
  > You asked to claim the FairComparisons profile for {{agent_name}}. Confirm
  > it is you and your profile goes live in seconds.
- **CTA:** `Verify and claim profile` -> `{{verify_url}}`
- **Notes:** already implemented. No unsubscribe (transactional).

### A3. Agent welcome / activate  (`Agent Claimed`)
Sent on verify. First retention moment: get them to complete the profile so
they look good to sellers.
- **Subject:** `{{first_name}}, your profile is live. 3 things to finish it.`
- **Preheader:** Add your photo and WhatsApp so sellers know who they are picking.
- **Body:**
  > Your profile is live and sellers in {{area}} can now invite you to quote.
  > Your AgentScore is **{{score}}**, computed only from your CEA record.
  >
  > Agents who complete these three convert far more of the sellers who view them:
  > 1. Add a professional photo
  > 2. Add your WhatsApp number (this is how seller leads reach you fastest)
  > 3. Write two lines on how you work
- **CTA:** `Complete your profile` -> `{{dashboard_url}}`
- **Footer note:** You will get a short weekly report on your leads and views.
  Manage or turn off anytime.
- **Notes:** the WhatsApp ask here is what makes future lead delivery work.
  Consider a 48h follow-up if photo/WhatsApp still empty.

### A4. Seller welcome  (`Consumer Welcome`)
After a seller first uses a tool (valuation, MOP, /sell) and leaves an email.
- **Subject:** `Your agent shortlist, and how we rank them`
- **Preheader:** Free for sellers. No agent pays for placement. Ever.
- **Body:**
  > Thanks for using FairComparisons. Two things worth knowing before you pick
  > an agent:
  >
  > We rank every CEA-registered agent on their **real transaction record**, not
  > on advertising. No agent can pay to rank higher. That is the whole point.
  >
  > And it is free for you. We are paid by optional agent subscriptions, never by
  > taking a cut of your sale.
- **CTA:** `See agents for your home` -> `{{sell_url}}`
- **Unsubscribe:** yes.

### A5. Seller shortlist ready  (`Seller Shortlist Ready`)
The first real value moment. **This is the leak** in the current funnel: sellers
stall here because the nudge never arrives. Make it unmissable.
- **Subject:** `{{first_name}}, your {{property_type}} shortlist is ready`
- **Preheader:** {{shortlist_count}} agents ranked on real sales in {{area}}.
- **Body:**
  > We ranked the agents who actually sell {{property_type}} in {{area}} on their
  > CEA record. Your shortlist of {{shortlist_count}} is ready.
  >
  > Pick up to 3 and we will ask them to send you a fee quote. No obligation, and
  > you only ever hear from the ones you choose.
- **CTA:** `View your shortlist` -> `{{shortlist_url}}`
- **Unsubscribe:** yes.
- **Notes:** send a single reminder at 48h if `status` is still `shortlisted`
  and no agent invited. This one reminder likely recovers the most revenue on
  the whole map.

---

# Stage 2: Engage

### B1. Agent new seller lead  (`Agent Notification`)
The money email. A seller picked this agent. Speed is everything (the data:
first responder wins the majority of the time).
- **Subject:** `New seller in {{area}}: quote within 24h`
- **Preheader:** {{property_type}}, {{est_value_range}}, timeline {{timeline}}.
- **Body:**
  > A homeowner selected you to quote on selling their {{bedrooms}}{{property_type}}
  > in {{area}}.
  >
  > Timeline: **{{timeline}}**. Estimated value: {{est_value_range}}.
  >
  > Send a fee quote within 24 hours to stay in the running. No platform fee
  > until completion.
- **CTA:** `Submit your quote` -> `{{lead_url}}`
- **Notes:** fire email + WhatsApp together (WhatsApp lands in seconds; email is
  the durable record). Response time is captured here and feeds the score.

### B2. Agent weekly digest  (`Weekly Digest`)
Retention through visible value. Only send lines that have real numbers.
- **Subject:** `{{profile_views_7d}} sellers viewed your profile this week`
- **Preheader:** Your rank, views, and any new leads in {{area}}.
- **Body:**
  > This week on your FairComparisons profile:
  > - **{{profile_views_7d}}** profile views
  > - Rank **#{{rank}}** of {{area_total}} in {{area}}
  > - **{{new_leads}}** new seller {{new_leads_word}}
  >
  > {{#if incomplete_profile}}Your profile is missing a {{missing_item}}. Sellers
  > skip profiles without one.{{/if}}
- **CTA:** `Open your dashboard` -> `{{dashboard_url}}`
- **Unsubscribe:** yes. Suppress the whole send if every number is zero (do not
  email "0 views" as it reads as failure).

### B3. Seller quote ready  (`Seller Quote Ready`)
An agent responded. Push the seller to compare and choose.
- **Subject:** `{{agent_name}} sent you a quote`
- **Preheader:** Compare fees, plans and records side by side.
- **Body:**
  > {{agent_name}} has sent a fee quote for your {{property_type}} in {{area}}.
  > {{#if other_quotes}}You now have {{quote_count}} quotes to compare.{{/if}}
  >
  > Compare them on fee, marketing plan and, most importantly, each agent's real
  > sales record in your area.
- **CTA:** `Compare your quotes` -> `{{quotes_url}}`
- **Unsubscribe:** yes.

---

# Stage 3: Retain

### C1. Agent standing digest  (`Standing Digest`)
Supply-side retention. Percentile band, not a raw rank, so it motivates without
demoralising. Feeds the "your standing" panel.
- **Subject:** `You are in the top {{percentile_band}} of agents in {{area}}`
- **Preheader:** Where you stand this month, and what moves it.
- **Body:**
  > On the CEA record for {{area}}, you are in the **top {{percentile_band}}** of
  > active agents this month.
  >
  > What lifts standing: recent seller-side sales in your area, and responding
  > fast to the leads you receive. Both are things you already do. We just make
  > them visible to sellers.
- **CTA:** `See your standing` -> `{{standing_url}}`
- **Unsubscribe:** yes.

### C2. Seller completion + review  (`Seller Completion` / `Seller Review Request`)
Sale done. Congratulate, then ask for the review (the UGC that becomes the moat).
- **Subject:** `Congratulations on selling your {{property_type}}`
- **Preheader:** One quick thing that helps the next seller in {{area}}.
- **Body:**
  > Congratulations on completing the sale of your {{property_type}} in {{area}}.
  >
  > Would you take 60 seconds to review {{agent_name}}? Verified reviews from real
  > sellers are the single most useful thing for the next person choosing an agent
  > here, and yours is verified because we saw the transaction.
- **CTA:** `Leave a verified review` -> `{{review_url}}`
- **Unsubscribe:** yes.

### C3. Seller reactivation  (`Seller Reactivation`)
Win-back: started the funnel, never invited an agent.
- **Subject:** `Still selling your {{property_type}} in {{area}}?`
- **Preheader:** Your ranked shortlist is still here. Pick up where you left off.
- **Body:**
  > A while back you started comparing agents for your {{property_type}} in
  > {{area}}. Your shortlist, ranked on real CEA sales, is still ready.
  >
  > Whenever you are ready, pick up to 3 agents and we will get you fee quotes. No
  > pressure, no cost.
- **CTA:** `Resume your shortlist` -> `{{shortlist_url}}`
- **Unsubscribe:** yes. Send once, then suppress.

---

# Stage 4: Update

### D1. Seller MOP eligibility  (`MOP Alert`)
Your flat just hit its Minimum Occupation Period. High-intent moment.
- **Subject:** `Your flat in {{town}} is now eligible to sell`
- **Preheader:** Median resale in {{town}} is {{median_price}}. See who is selling.
- **Body:**
  > Your HDB flat in {{town}} has reached its Minimum Occupation Period, so you
  > can now sell on the open market.
  >
  > Median resale in {{town}} is currently **{{median_price}}**. When you are
  > ready, see the agents who actually sell in {{town}}, ranked on their record.
- **CTA:** `See agents in {{town}}` -> `{{town_url}}`
- **Unsubscribe:** yes.

### D2. Seller valuation change  (`AVM Update`)
Home value estimate moved meaningfully.
- **Subject:** `Your {{property_type}} estimate changed to {{new_estimate}}`
- **Preheader:** Based on the latest transactions in {{area}}.
- **Body:**
  > Based on recent sales in {{area}}, our estimate for your {{property_type}} is
  > now **{{new_estimate}}** ({{direction}} {{change_pct}} since your last check).
  >
  > This is a data estimate, not a valuation. If you are thinking of selling, an
  > agent with a real record in {{area}} will price it properly.
- **CTA:** `Refresh your estimate` -> `{{valuation_url}}`
- **Unsubscribe:** yes. Only fire when `change_pct` exceeds a threshold, so it
  stays a signal, not noise.

---

# Stage 5: Monetize

### E1. Agent upgrade prompt  (`Agent Upgrade`)  — NEW
Fired when a claimed agent hits a value ceiling: after their Nth received lead,
or when they try a gated feature. Subscription-led, never a cut of a sale.
- **Subject:** `You have received {{lead_count}} seller leads, {{first_name}}`
- **Alt subject:** `Unlock {{gated_feature}} on your profile`
- **Preheader:** Upgrade to respond faster and show sellers more.
- **Body:**
  > Sellers keep picking you: **{{lead_count}}** have invited you to quote so far.
  >
  > A {{plan_name}} subscription lets you {{plan_benefit_1}} and
  > {{plan_benefit_2}}. It never changes your ranking. Your rank is earned on the
  > CEA record and cannot be bought, for anyone. A subscription just gives you
  > better tools to win the sellers who already found you.
- **CTA:** `See plans` -> `{{pricing_url}}`
- **Unsubscribe:** yes (marketing).
- **Notes:** the honesty ("subscription never changes ranking") is the pitch,
  not a disclaimer. It is why an agent can trust the leads are real.

### E2. Agent payment failed / dunning  (`Agent Dunning`)  — NEW
Recover a lapsing subscriber before involuntary churn.
- **Subject:** `Your card could not be charged, {{first_name}}`
- **Preheader:** Update it to keep your {{plan_name}} tools active.
- **Body:**
  > We could not process your {{plan_name}} subscription. Your public profile and
  > ranking are unaffected (those are always free), but your subscription tools
  > will pause on {{grace_end_date}} unless the card is updated.
- **CTA:** `Update payment` -> `{{billing_url}}`
- **Notes:** 3-step cadence (day 0, 3, 6) then downgrade to free, not delete.
  Reassure that ranking/profile stay live so it never reads as a threat to their
  public presence.

---

## Implementation notes

- Each email above maps to an existing `sendEmail({ metric })` call site (or the
  two NEW ones for monetize). Replace the inline HTML in those routes with
  `emailShell(...)` + the copy here, so all 16 share one layout.
- Merge fields come from the same query each route already runs. Where a field is
  optional (`rank`, `other_quotes`), drop the line rather than render a blank.
- Suppression rules that matter: no "0 views" digest; single reminder only for
  shortlist and reactivation; AVM only past a change threshold.
- Unsubscribe: wire `{{unsubscribe_url}}` to a token that flips a per-metric or
  global marketing-consent flag. Transactional (verify, login, lead, quote,
  dunning) do not carry it.
- All of this is dead in the water until Resend delivers. Once the domain
  verifies, one clean deploy lights up every one of these.
