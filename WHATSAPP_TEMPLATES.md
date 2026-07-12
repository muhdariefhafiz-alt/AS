# WhatsApp Business templates

The seller funnel uses Meta's WhatsApp Business Cloud API for high-impact
transactional messages where email lag would lose the agent or the seller.

> SG agents respond to WhatsApp in minutes; to email in hours. We send both
> in parallel — WhatsApp lands first, email is the durable record.

## Quickstart (Meta Business Manager setup)

Do this once, before any real WhatsApp send.

1. Create a [Meta Business Manager](https://business.facebook.com/) account
   for FairComparisons (or use an existing one for your company).
2. Add a **WhatsApp Business Account** under Business Settings → Accounts →
   WhatsApp Accounts.
3. Add a phone number to the WhatsApp Business Account. Verify via SMS or
   call. This becomes the sender for all platform WhatsApp messages.
4. Create an app under [developers.facebook.com](https://developers.facebook.com)
   and add the **WhatsApp** product. Note the **Phone Number ID** (it shows in
   the WhatsApp panel; not the actual phone number).
5. Generate a permanent **System User access token** with the
   `whatsapp_business_messaging` permission. Long-lived; doesn't expire.
6. Approve each template below in Business Manager → WhatsApp Manager →
   Templates → New Template. Approval takes 24–48 hours. Copy the names
   exactly. Set language = English (UK), `en_GB`.
7. Set the env vars in Vercel (and `.env.local` for local testing):
   ```
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_APP_SECRET=...           # for inbound webhook signature verify
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=... # for the GET handshake
   ```

Without the env vars, every `sendWa()` call falls through to a Tier-1
dry-run log so local dev never breaks:

```
🟡 [whatsapp/dry-run] Would send template 'agent_invite' to +6591234567
   with vars {...}. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN
   to enable real sends. See WHATSAPP_TEMPLATES.md#quickstart for Meta
   Business Manager setup.
```

## Templates

Each template's body uses positional placeholders `{{1}}, {{2}}, ...` in
the order shown. The order is locked by `app/lib/whatsapp.ts`. If you
change the order in Meta, change the order in `templateParameters()` too.

### 1. `agent_lead_alert` — sent to a CLAIMED, OPTED-IN agent when a seller picks them

This is the live agent-notification template. It is notification-only: no
seller name, area, or property type in the message. Everything stays in the
portal (the link opens the lead brief where the agent quotes). Sent ONLY to
agents who claimed their profile and provided their WhatsApp number (opt-in),
so it is WhatsApp-Business-Policy compliant.

- **Category:** Utility
- **Variables (in order):**
  1. `agent_first_name`
  2. `link` (tokened portal link to the lead brief)

**Suggested body:**

```
Hi {{1}}, you have a new seller lead in your FairComparisons dashboard.
Open it to send your fee quote before the 24-hour window closes: {{2}}
```

### 1b. `agent_invite` — legacy pre-claim invite (optional)

- **Category:** Marketing
- **Variables (in order):**
  1. `agent_first_name`
  2. `property_type` (HDB | Condo | EC | Landed)
  3. `area` (HDB town or district)
  4. `link` (deep link to /dashboard with token)

Not sent by the current invite route (which uses `agent_lead_alert` for
opted-in agents and the email magic-claim invite for unclaimed agents). Keep
the template only if you want a separate first-touch WhatsApp variant.

**Suggested body:**

```
Hi {{1}}, a seller just shortlisted you for their {{2}} in {{3}}.
Submit your fee quote within 24 hours to stay in the running.
Open your dashboard: {{4}}
```

### 2. `seller_quote_ready` — sent to seller when an invited agent submits a quote

- **Category:** Utility
- **Variables:**
  1. `seller_first_name`
  2. `agent_name`
  3. `link` (deep link to /sell/quotes/[token])

**Suggested body:**

```
{{1}}, {{2}} just sent you a quote. View it: {{3}}
```

### 3. `seller_completion_review` — sent 7 days after OTP signing

- **Category:** Utility
- **Variables:**
  1. `seller_first_name`
  2. `agent_name`
  3. `link` (deep link to /sell/review/[token])

**Suggested body:**

```
{{1}}, how did {{2}} do? 2 minutes to leave a review and help the next
seller pick well: {{3}}
```

### 4. `seller_shortlist_ready` — sent after the homeowner submits /sell

- **Category:** Utility
- **Variables:**
  1. `seller_first_name`
  2. `property_type`
  3. `area`
  4. `link` (deep link to /sell/shortlist/[token])

**Suggested body:**

```
{{1}}, your shortlist of top {{2}} agents in {{3}} is ready.
Pick up to 3 to invite: {{4}}
```

### 6. `agent_invoice_reminder` — dunning nudge for unpaid invoices (7d/14d/21d)

- **Category:** Utility
- **Variables:**
  1. `agent_first_name`
  2. `invoice_reference` (e.g. FC-2026-000123)
  3. `amount_sgd` (e.g. "S$3,260")
  4. `link` (deep link to /dashboard)

**Suggested body:**

```
{{1}}, invoice {{2}} ({{3}}) is still open. Pay via PayNow or open your
dashboard: {{4}}
```

### 5. `mop_alert` — sent ~3 months before HDB MOP eligibility

- **Category:** Marketing
- **Variables:**
  1. `town`
  2. `median_price_sgd` (e.g. "S$680,000")
  3. `link` (deep link to /tools/mop-tracker/result/[token])

**Suggested body:**

```
{{1}} HDB update: current median {{2}}. Your saved MOP snapshot is ready: {{3}}
```

## Inbound webhook

`/api/webhook/whatsapp` handles two things:

1. **Meta GET handshake** — Meta calls the URL with `hub.mode=subscribe`
   and `hub.verify_token=...`. We echo back `hub.challenge` if the token
   matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. **Inbound message POST** — Meta sends a signed payload (X-Hub-Signature-256)
   with the inbound message. We verify the signature against
   `WHATSAPP_APP_SECRET`, then log to `sg_lead_events` with `event_type =
   'wa_inbound'`. No auto-reply in v1 — we surface the message in the
   admin moderation tab for manual response.

## Opt-in

We only send WhatsApp to numbers that:

- The seller volunteered on `/sell` (or `/tools/mop-tracker`) AND ticked
  the `marketing_consent` checkbox; OR
- The agent has saved on their CEA-claimed profile (`sg_agents.whatsapp`).

CEA does not allow unsolicited transactional WhatsApp to consumers. The
`marketing_consent` gate is non-negotiable.

## Cost

Meta charges per-message based on conversation category:

| Category | SG rate (Jun 2026) |
|---|---|
| Marketing | ~S$0.039 |
| Utility | ~S$0.014 |
| Authentication | ~S$0.014 |
| Service (inbound-triggered) | Free, 24h window |

Most of our traffic is utility (quotes, completions, MOP alerts). At
1,000 monthly completions, total WhatsApp cost is roughly S$50/month —
trivial against the success-fee revenue per completion.
