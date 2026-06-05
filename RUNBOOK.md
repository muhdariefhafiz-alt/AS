# FairComparisons SG — Runbook

Operational reference for the seller funnel (the GetAgent-style /sell flow) on
fair-comparisons.com.

## Architecture in one paragraph

Next.js 16 on Vercel + Supabase (`yhfdahkzukxglwikcdlo`, ap-southeast-1).
The directory side (30,740 CEA agents, 730K transactions, district/HDB/agency
pages) is read-mostly. The seller funnel writes to RLS-protected tables
(`sg_leads`, `sg_lead_shortlist`, `sg_lead_quotes`, `sg_lead_completions`,
`sg_lead_events`) and is reachable ONLY through `supabaseAdmin()` (service-role
key). Notifications go out via Klaviyo (email) + Meta WhatsApp Cloud API, both
with dry-run fallbacks when keys are missing.

## Required production env vars

Set ALL of these in Vercel → Production before launch:

| Var | Used by | Without it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | every seller-funnel write | all `/sell/*`, `/api/sell/*`, `/api/mop/*` throw |
| `KLAVIYO_API_KEY` | all email | emails dry-run (logged, not sent) |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sends | WhatsApp dry-runs |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp sends | WhatsApp dry-runs |
| `WHATSAPP_APP_SECRET` | inbound webhook verify | webhook accepts unverified (dev only) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta handshake | webhook GET returns 500 |
| `ADMIN_EMAILS` | admin login allowlist | nobody can log into /admin |
| `ADMIN_SECRET` | admin magic-link HMAC | admin auth throws |
| `CRON_SECRET` | all cron auth | crons reject Vercel's scheduled calls |
| `FC_PAYNOW_UEN` | invoice PayNow QR | invoices show "TBC" |
| `FC_BANK_NAME`, `FC_BANK_ACCOUNT` | invoice bank details | shows fallback |
| `IP_HASH_SALT` | lead IP hashing | uses default salt |
| `NEXT_PUBLIC_SITE_URL` | all deep links | links point at fallback domain |
| `UPSTASH_REDIS_REST_URL` | durable rate limiting | falls back to in-memory (resets on cold-start) |
| `UPSTASH_REDIS_REST_TOKEN` | durable rate limiting | falls back to in-memory |

> `UPSTASH_*` are optional. Without them rate limits are in-memory (fine to
> launch; per-IP caps just reset on each serverless cold-start). Provision a
> free Upstash Redis (Singapore region) when traffic grows past tens of
> requests/sec to make the caps durable across instances.

## Operator setup (one-time, NOT code)

1. **Klaviyo flows** — create one flow per metric, each using the existing
   `event.subject` / `event.html` template pattern:
   `Seller Shortlist Ready`, `Agent Notification`, `Seller Quote Ready`,
   `Seller Completion`, `Agent Invoice`, `MOP Alert`, `Seller Review Request`,
   `Seller Reactivation`, `Seller Completion Verified`, `Admin Login`.
2. **Meta WhatsApp templates** — submit all 6 from `WHATSAPP_TEMPLATES.md`.
   Approval takes 24–48h. Code dry-runs until they're live.
3. **Cron schedules** — already in `vercel.json`; verify they appear in
   Vercel → Settings → Cron Jobs after deploy.

## Cron schedule (all UTC)

| Cron | UTC | SGT | What |
|---|---|---|---|
| mop-alerts | 01:00 | 09:00 | alert MOP watchers ~3mo out |
| review-requests | 02:15 | 10:15 | request review 7d post-OTP |
| invoice-reminders | 03:15 | 11:15 | dunning 7/14/21/28d |
| verify-completions | 04:00 | 12:00 | reconcile sale price vs URA/HDB |
| expire-leads | 05:00 | 13:00 | expire 30d-stale leads |

## End-to-end smoke test (run after every deploy that touches the funnel)

1. **Lead** — POST `/api/sell/lead` with a HDB town (e.g. TAMPINES) + valid
   email + `pdpa_consent:true`. Expect `{ token, shortlist_size > 0 }`.
2. **Shortlist** — GET `/sell/shortlist/<token>`. Expect ranked agents render.
3. **Invite** — POST `/api/sell/invite` with 1–3 `agent_ids` from the
   shortlist. Expect agent invite email + WhatsApp fire (check logs for
   dry-run lines if keys absent).
4. **Quote** — as a claimed agent, POST `/api/sell/quote` (cea_registration +
   matching claimed_email). Expect seller "quote ready" notification.
5. **Pick** — POST `/api/sell/pick` with the quote_id. Expect
   `sg_lead_completions` row created, lead status `instructed`.
6. **Completion** — POST `/api/sell/completion/log` stage=instruction →
   stage=otp → stage=completion with a sale_price. Expect invoice email +
   `fee_status='invoiced'`.
7. **Admin** — `/admin?tab=invoices`. Expect the new invoice listed. Click
   "Paid". Expect `fee_status='paid'`, agent "verified completion" email.
8. **Profile** — agent's public profile shows "1 verified completion" chip.
9. **Review** — GET `/sell/review/<token>` (after OTP). Submit a review.
   Expect it on the agent profile under "Verified seller reviews".
10. **Reconcile** — manually GET `/api/cron/verify-completions` (with
    CRON_SECRET bearer). Expect `verification_status` set to matched/no_record.

## First paying completion checklist

The sprint-3 definition of done. Walk a real SG seller through:

- [ ] Seller submits `/sell` for a real property
- [ ] Seller invites ≥1 agent, agent submits a real quote
- [ ] Seller instructs the winning agent
- [ ] Agent logs instruction → OTP → completion with the real sale price
- [ ] Invoice emailed; agent pays via PayNow
- [ ] Admin marks invoice paid (`fee_status='paid'`)
- [ ] `verify-completions` cron resolves `verification_status`
- [ ] "Verified completion" badge live on the agent's public profile
- [ ] Full event trail present in `sg_lead_events` for the lead

> First 3 completions: consider waiving the fee in exchange for a case-study
> consent. Set `fee_status='waived'` via the admin Waive action with reason.

## Common issues

- **`supabaseAdmin requires ... SERVICE_ROLE_KEY`** in logs → env var missing
  in that environment. Expected locally; must be set in Vercel prod.
- **Emails not arriving** → check `KLAVIYO_API_KEY` set AND the matching
  Klaviyo flow exists for that metric. Dry-run logs show what would've sent.
- **WhatsApp not arriving** → templates not yet Meta-approved, or env missing.
  Look for `🟡 [whatsapp/dry-run]` log lines.
- **Admin can't log in** → email not in `ADMIN_EMAILS`, or `ADMIN_SECRET`
  mismatch between login and verify. The login route logs the magic link;
  grep Vercel logs for `[admin/login] magic link issued`.
- **Cron returns 401** → `CRON_SECRET` mismatch; Vercel sends it as
  `Authorization: Bearer <CRON_SECRET>`.
