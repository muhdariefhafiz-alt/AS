# Weekend to-do — launch the seller funnel

These are the operator-side tasks that unblock the first paying completion.
None require code; all require accounts/access only you have. Ordered by
priority. The WhatsApp templates are first because Meta approval takes 24-48h,
so submitting them Saturday morning means they're live by Monday.

Total time if you do everything: ~3-4 hours spread across the weekend.

---

## 1. Submit WhatsApp templates to Meta (DO THIS FIRST — 24-48h approval) · 45 min

The long pole. Submit Saturday AM so they're approved before you test Monday.

- [ ] Log into [Meta Business Manager](https://business.facebook.com/) (or create a
      FairComparisons business account)
- [ ] Add a WhatsApp Business Account under Business Settings → WhatsApp Accounts
- [ ] Add + verify a phone number (this becomes the platform sender)
- [ ] Create an app at [developers.facebook.com](https://developers.facebook.com),
      add the WhatsApp product, note the **Phone Number ID**
- [ ] Generate a permanent **System User access token** with
      `whatsapp_business_messaging` permission
- [ ] Submit all 6 templates from `WHATSAPP_TEMPLATES.md` (copy the names + bodies
      exactly, language = English UK / `en_GB`):
  - [ ] `agent_invite`
  - [ ] `seller_quote_ready`
  - [ ] `seller_completion_review`
  - [ ] `seller_shortlist_ready`
  - [ ] `mop_alert`
  - [ ] `agent_invoice_reminder`

> Until approved, every WhatsApp send dry-runs (logs, doesn't deliver). Email
> still works. So the funnel is testable Monday even if templates lag.

---

## 2. Set Vercel production env vars · 30 min

Vercel → fair-comparisons project → Settings → Environment Variables →
Production. Set every one of these:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API →
      service_role key. **Without this, the entire seller funnel is dead.**
- [ ] `KLAVIYO_API_KEY` — from Klaviyo → Settings → API Keys (private key)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` — from step 1
- [ ] `WHATSAPP_ACCESS_TOKEN` — from step 1
- [ ] `WHATSAPP_APP_SECRET` — Meta app → Settings → Basic → App Secret
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — make up any random string; you'll paste
      the same one into Meta's webhook config
- [ ] `ADMIN_EMAILS` — `lex@coachup.sg,hello@fair-comparisons.com`
- [ ] `ADMIN_SECRET` — 32+ char random string (you have one in `.env.local`
      already; reuse it). NOTE: prod may currently have it under the wrong name
      `ADMIN_SECRET_KEY` — check and rename/duplicate to `ADMIN_SECRET`.
- [ ] `CRON_SECRET` — random string; Vercel sends it to your crons as auth
- [ ] `FC_PAYNOW_UEN` — your company's PayNow UEN (shows on every invoice)
- [ ] `FC_BANK_NAME` — e.g. DBS
- [ ] `FC_BANK_ACCOUNT` — your business account number
- [ ] `IP_HASH_SALT` — any random string
- [ ] confirm `NEXT_PUBLIC_SITE_URL` is set to the live domain

After saving: trigger a redeploy (env changes only apply on next deploy).

---

## 3. Create Klaviyo flows · 60 min

Each transactional email fires a Klaviyo *event* (metric); a Flow listening on
that metric sends the actual email using `{{ event.subject }}` / `{{ event.html }}`.
You need one flow per metric. Clone your existing welcome-email flow as a
template, then change the trigger metric for each.

- [ ] `Seller Shortlist Ready`
- [ ] `Agent Notification`
- [ ] `Seller Quote Ready`
- [ ] `Seller Completion`
- [ ] `Agent Invoice`
- [ ] `MOP Alert`
- [ ] `Seller Review Request`
- [ ] `Seller Reactivation`
- [ ] `Seller Completion Verified`
- [ ] `Admin Login`

> Tip: the email HTML is fully built in the event payload, so each flow's email
> block is just `{{ event.html }}` with subject `{{ event.subject }}`. Minimal
> Klaviyo design work.

---

## 4. Point Meta webhook at the app · 10 min

(After step 1 + step 2.)

- [ ] Meta app → WhatsApp → Configuration → Webhook
- [ ] Callback URL: `https://fair-comparisons.com/api/webhook/whatsapp`
- [ ] Verify token: the same `WHATSAPP_WEBHOOK_VERIFY_TOKEN` you set in Vercel
- [ ] Subscribe to the `messages` field

---

## 5. Smoke test the full funnel · 30 min

Once 1-4 are done and deployed, walk the funnel yourself (use your own email +
a test agent profile you control). Full sequence is in `RUNBOOK.md` →
"End-to-end smoke test". Quick version:

- [ ] Submit `/sell` for a HDB town → check you get the shortlist email
- [ ] Invite an agent → check the agent invite arrives (email + WhatsApp)
- [ ] Submit a quote from the agent side → check seller quote email
- [ ] Pick the agent → log instruction → OTP → completion → check invoice email
- [ ] Log into `/admin?tab=invoices` → mark it paid → check verified badge on
      the agent's public profile

---

## 6. Line up the first real seller · ongoing

The actual business goal. Engineering is ready; you need a human to run through it.

- [ ] Identify 2-3 people in your network selling an HDB or condo in the next
      few months
- [ ] Offer to waive the platform fee on the first 3 completions in exchange for
      a testimonial / case-study consent (use the admin **Waive** action with a
      reason). Per the no-fake-data rule: only publish a testimonial once it's
      a real completed sale with real consent.
- [ ] Walk them through `/sell` personally the first time; watch where they
      hesitate (that's your next UX fix)

---

## 7. Decisions — RESOLVED (directive: "whatever GetAgent does is the path")

All five mapped to GetAgent's actual model and implemented where code was needed.

- [x] **AVM display format** → GetAgent shows an estimate *with a range*. Kept
      the low-mid-high range (prominent midpoint). No change needed.

- [x] **Exchange referral split** → GetAgent gives the referrer **50%** of the
      platform fee. Locked at 50/50. (Builds when agent density justifies.)

- [x] **Listing Monitor data source** → GetAgent uses portal data it has rights
      to; the SG-legal equivalent is your own `sg_listings` (Firecrawl-scraping
      PropertyGuru is a ToS violation GetAgent wouldn't do). Locked: own data.

- [x] **Monetisation spine** → GetAgent is **pure success-fee, no subscription,
      rankings cannot be bought.** IMPLEMENTED: agent-facing surfaces now lead
      with "free, pay 0.5% only on completion"; removed all paid-placement /
      sponsored-ranking language (dashboard, PricingCards, for-agents,
      propertyguru-alternative, best/[area], best/hdb/[town]). Paid tiers
      survive only as optional NON-ranking tools (analytics, market data).

- [x] **AI Discovery Protocol** → GetAgent uses custom JSON endpoints + llms.txt,
      exactly what's shipped. Kept custom schema. Revisit if a standard emerges.

---

*Generated across Sprints 3-4. Code shipped so far: full seller funnel,
completion + PayNow invoicing, MOP tracker, WhatsApp lib, reviews, admin
invoices + analytics, AVM, 55 sell-by-area SEO pages. Next code (no decisions
needed): AI Discovery Protocol endpoints + Redis-backed rate limiting.*
