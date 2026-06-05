# Klaviyo flows + WhatsApp templates — build deck

Everything you need to wire up notifications this weekend: the tracked events,
the personalization properties each carries, and full copy (subject, preheader,
headline, sub-headline, body, CTA, footer) for every flow.

---

## How the plumbing works (read first — 2 min)

The app does NOT send emails directly. For each transactional moment it:
1. Upserts a Klaviyo **Profile** (the recipient).
2. Tracks a Klaviyo **Event** (a "metric") whose properties include a fully
   pre-built `subject` and `html`.

So you have **two ways to build each flow** — pick per flow:

- **Fast path (recommended for launch):** Flow trigger = the metric → one Email
  action → Subject: `{{ event.subject }}` → Body: drag in an HTML block set to
  `{{ event.html }}`. Done. The copy below is already baked into `event.html`;
  you don't have to rebuild it. Use this to go live fast.
- **Native path (nicer long-term):** Build a Klaviyo-designed template using the
  copy + properties below. More work, more control, better deliverability tuning.

Either way: **one Flow per metric**, triggered on that metric.

> The fast path means the copy below is FYI/reference — the emails already look
> like this. Use the native path only when you want to redesign.

---

## Setup checklist

- [ ] Klaviyo account + `KLAVIYO_API_KEY` (private key) in Vercel prod
- [ ] One Flow per metric below (12 flows)
- [ ] Each flow: trigger on the metric, single email, `{{ event.subject }}` +
      `{{ event.html }}` (fast path)
- [ ] Footer/unsubscribe block (Klaviyo injects this; ensure your account footer
      has company name + unsubscribe — PDPA requirement)
- [ ] WhatsApp: 6 templates submitted to Meta (see `WHATSAPP_TEMPLATES.md`)

---

## Tracked events (Klaviyo metrics)

| Metric (trigger) | Fires when | Key properties available |
|---|---|---|
| `Seller Shortlist Ready` | Homeowner submits `/sell` | `lead_token`, `property_type`, `area`, `shortlist_size` |
| `Agent Notification` | Agent is invited / picked | `lead_token`, `agent_id`, `property_type`, `kind` (invite\|picked) |
| `Seller Quote Ready` | An invited agent submits a quote | `lead_token`, `agent_id`, `kind` (quote\|withdraw) |
| `Seller Completion` | Agent logs the completed sale | `lead_token`, `agent_id` |
| `Seller Completion Verified` | Admin marks the invoice paid | `lead_id`, `kind` (verified) |
| `Agent Invoice` | Invoice issued + 7/14/21/28d reminders + paid | `invoice_reference`, `amount_sgd`, `stage`, `kind` |
| `Seller Review Request` | 7 days after OTP signing (cron) | `lead_token` |
| `Review Confirmation` | Someone submits an open agent review | `agent_id` |
| `MOP Alert` | ~3 months before HDB MOP (cron) | `lead_token`, `town`, `flat_type` |
| `AVM Update` | Tracked home value moves >2% (cron) | `lead_token`, `move_pct` |
| `Seller Reactivation` | Lead goes stale 30d (cron) | `lead_token` |
| `Admin Login` | Admin requests a magic link | `login_url` |

---

## Flow copy

Brand voice: plain, direct, no hype, no em dashes. Teal accent (#0d9488).
All deep links use `https://fair-comparisons.com`.

### 1. Seller Shortlist Ready
- **Trigger:** `Seller Shortlist Ready`
- **Subject:** `Your {{ event.shortlist_size }} matched agents are ready`
- **Preheader:** Ranked on real CEA transaction records. Pick up to 3.
- **Headline:** {{ first_name }}, your shortlist is ready.
- **Sub-headline:** The agents who actually sell {{ event.property_type }} in {{ event.area }}.
- **Body:** Based on actual CEA transaction records, we matched you with agents who consistently close in your area. Pick up to 3 to invite. Each one submits a fee quote within 24 hours. You only choose after you've seen their quotes.
- **CTA:** View your shortlist → `/sell/shortlist/{{ event.lead_token }}`
- **Footer:** Free for sellers. Agents only pay if you complete a sale through them.

### 2. Agent Notification — invited (`kind = invite`)
- **Subject:** `New seller in {{ event.area }} — quote within 24h`
- **Preheader:** A homeowner shortlisted you. No fee until completion.
- **Headline:** {{ agent_first_name }}, you've been shortlisted.
- **Sub-headline:** A seller picked you to quote on their {{ event.property_type }}.
- **Body:** Submit a fee quote within 24 hours to stay in the running. There's no platform fee until the sale completes, and your ranking is earned on your record, never bought.
- **CTA:** Submit your quote → `/dashboard`
- **Footer:** You're listed free on FairComparisons. Pay 0.5% only on completion.

### 3. Agent Notification — picked (`kind = picked`)
- **Subject:** `You won the instruction`
- **Preheader:** The seller chose you. Next steps inside.
- **Headline:** {{ agent_first_name }}, you've been instructed.
- **Sub-headline:** The seller picked you at {{ commission_pct }}% commission.
- **Body:** Congratulations. A platform fee of 0.5% of the sale price + GST is due only on completion. Log the OTP and completion dates in your dashboard as they happen.
- **CTA:** Open dashboard → `/dashboard`

### 4. Seller Quote Ready
- **Trigger:** `Seller Quote Ready`
- **Subject:** `{{ agent_name }} sent you a quote`
- **Preheader:** Compare commission, timeline, and approach.
- **Headline:** {{ first_name }}, a quote just came in.
- **Sub-headline:** From {{ agent_name }}.
- **Body:** View their commission, estimated timeline, and how they'll market your home. You can wait for the others or instruct any agent already in.
- **CTA:** See the quote → `/sell/quotes/{{ event.lead_token }}`

### 5. Seller Completion (review prompt)
- **Trigger:** `Seller Completion`
- **Subject:** `Your sale completed — leave {{ agent_first_name }} a review`
- **Preheader:** Two minutes. Helps the next seller in your area.
- **Headline:** {{ first_name }}, your sale completed.
- **Sub-headline:** We hope it went smoothly.
- **Body:** A short, honest review of {{ agent_name }} helps the next seller pick well. Public reviews show initials only.
- **CTA:** Leave a review → `/sell/review/{{ event.lead_token }}`

### 6. Seller Completion Verified
- **Trigger:** `Seller Completion Verified`
- **Subject:** `Your sale is confirmed on FairComparisons`
- **Preheader:** Thanks for using us to find a great agent.
- **Headline:** {{ first_name }}, your sale in {{ area }} is confirmed.
- **Body:** Thanks for trusting FairComparisons. If you ever sell or upgrade again, your matched agents are one click away.
- **CTA:** (optional) Browse the market → `/property-agents`

### 7. Agent Invoice (issued — `kind = invoice` / `stage = 0`)
- **Trigger:** `Agent Invoice`
- **Subject:** `Invoice {{ event.invoice_reference }} · {{ event.amount_sgd }} due`
- **Preheader:** 0.5% success fee. PayNow or bank transfer.
- **Headline:** {{ agent_first_name }}, invoice {{ event.invoice_reference }}.
- **Sub-headline:** {{ event.amount_sgd }} due in 14 days.
- **Body:** Your referred sale completed. Pay by PayNow (UEN in the invoice) or bank transfer, referencing {{ event.invoice_reference }}. Your verified completion goes live on your public profile once payment clears.
- **CTA:** View invoice / pay → `/dashboard`

### 7b. Agent Invoice — reminders (`kind = reminder`, `stage = 7|14|21|28`)
- **Subject (7/14/21):** `Reminder: invoice {{ event.invoice_reference }} ({{ event.amount_sgd }})`
- **Subject (28, escalation):** `Action needed: invoice {{ event.invoice_reference }} is overdue`
- **Body (escalates by stage):**
  - 7d: A quick reminder that invoice {{ event.invoice_reference }} is open.
  - 14d: Still open. Pay by PayNow to the UEN on the invoice, reference {{ event.invoice_reference }}.
  - 21d: This invoice is now three weeks old. Please settle or reply if there's an issue.
  - 28d: This invoice is overdue. Please settle it or contact us so we can resolve it.
- **CTA:** Open dashboard → `/dashboard`
- **Footer:** Already paid? Reply and we'll reconcile within one business day.

### 8. Seller Review Request (cron, OTP+7d)
- **Trigger:** `Seller Review Request`
- **Subject:** `How did {{ agent_name }} do? 2 minutes to leave a review`
- **Preheader:** Initials only. Helps the next seller choose.
- **Headline:** {{ first_name }}, how did {{ agent_name }} do?
- **Body:** Two minutes. Public reviews show initials only. Your honest review helps the next seller in your area pick well.
- **CTA:** Leave a review → `/sell/review/{{ event.lead_token }}`

### 9. Review Confirmation (open-review double opt-in)
- **Trigger:** `Review Confirmation`
- **Subject:** `Confirm your review of {{ agent_name }}`
- **Preheader:** One click and your review goes live.
- **Headline:** Confirm your review of {{ agent_name }}.
- **Body:** One click and your review publishes. This is how we keep fake reviews out — only people with a real email can publish.
- **CTA:** Confirm and publish → (the app supplies the exact link in `event.html`)
- **Footer:** Didn't write this review? Ignore this email and nothing is published.

### 10. MOP Alert (cron)
- **Trigger:** `MOP Alert`
- **Subject:** `{{ event.town }} HDB market update — your saved MOP snapshot`
- **Preheader:** Your flat is approaching MOP. Here's where the market is.
- **Headline:** {{ event.town }} HDB market update.
- **Sub-headline:** Your flat is nearing its MOP date.
- **Body:** Current median resale for your flat type in {{ event.town }} is in your snapshot, along with the top 3 HDB agents in your town. When you're ready to sell, your shortlist is one click away.
- **CTA:** See your snapshot → `/tools/mop-tracker/result/{{ event.lead_token }}`

### 11. AVM Update (cron)
- **Trigger:** `AVM Update`
- **Subject:** `Your home value moved {{ event.move_pct }}%`
- **Preheader:** Fresh estimate from recent transactions.
- **Headline:** Your home's estimated value just moved.
- **Body:** Based on recent transactions, your estimated value range has shifted by {{ event.move_pct }}%. See the latest range and, when you're ready, get matched with an agent.
- **CTA:** See the latest estimate → `/tools/valuation/result/{{ event.lead_token }}`

### 12. Seller Reactivation (cron, 30d stale)
- **Trigger:** `Seller Reactivation`
- **Subject:** `Still thinking of selling? Pick up where you left off`
- **Preheader:** Your shortlist is still here, updated with the latest data.
- **Headline:** {{ first_name }}, your shortlist is still here.
- **Body:** When you're ready to sell, your matched agents are one click away. Rankings update with the latest transaction data, so it's always current.
- **CTA:** Pick up where I left off → `/sell/shortlist/{{ event.lead_token }}`

---

## WhatsApp templates (Meta Business Manager)

Submit these 6 (full setup in `WHATSAPP_TEMPLATES.md`). Language `en_GB`.
Variables are positional `{{1}}, {{2}}, ...` in the order shown.

1. **agent_invite** (Marketing) — vars: agent_first_name, property_type, area, link
   > Hi {{1}}, a seller just shortlisted you for their {{2}} in {{3}}. Submit your fee quote within 24 hours to stay in the running. Open your dashboard: {{4}}

2. **seller_quote_ready** (Utility) — vars: seller_first_name, agent_name, link
   > {{1}}, {{2}} just sent you a quote. View it: {{3}}

3. **seller_completion_review** (Utility) — vars: seller_first_name, agent_name, link
   > {{1}}, how did {{2}} do? 2 minutes to leave a review and help the next seller pick well: {{3}}

4. **seller_shortlist_ready** (Utility) — vars: seller_first_name, property_type, area, link
   > {{1}}, your shortlist of top {{2}} agents in {{3}} is ready. Pick up to 3 to invite: {{4}}

5. **mop_alert** (Marketing) — vars: town, median_price_sgd, link
   > {{1}} HDB update: current median {{2}}. Your saved MOP snapshot is ready: {{3}}

6. **agent_invoice_reminder** (Utility) — vars: agent_first_name, invoice_reference, amount_sgd, link
   > {{1}}, invoice {{2}} ({{3}}) is still open. Pay via PayNow or open your dashboard: {{4}}

---

## Footer / compliance boilerplate (every email)

```
FairComparisons · Independent property agent comparison · Singapore.
Rankings based on CEA transaction data, not advertising.
You're receiving this because you used FairComparisons. Unsubscribe anytime.
```

PDPA: marketing sends (MOP Alert, AVM Update, Seller Reactivation) only go to
profiles with `marketing_consent = true`. Transactional sends (shortlist, quotes,
invoices, review confirmation) are allowed without marketing consent. The app
already enforces this gate before firing the event.
