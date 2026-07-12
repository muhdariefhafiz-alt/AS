-- Explicit WhatsApp opt-in for automated lead alerts. Set when a CLAIMED,
-- consented agent provides their WhatsApp number in their own dashboard (the
-- claim contact-consent text already names WhatsApp). Scraped numbers on
-- unclaimed agents never get this, so they are manual-operator-only and never
-- auto-messaged through the WhatsApp API. This column is the compliance gate:
-- isAgentReachable treats WhatsApp as an automated channel only when it is set.
--
-- Applied to production via Supabase MCP on 2026-07-12.
alter table public.sg_agents
  add column if not exists whatsapp_opt_in_at timestamptz;
