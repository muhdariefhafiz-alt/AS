-- CRITICAL revenue-path fix: the check constraint allowed ('free','pro','premium')
-- but the app's tier model (lib/tiers.ts, /api/checkout, Stripe webhook) writes
-- ('free','verified','professional','elite'). The first paid subscription would
-- have violated the constraint and the upgrade write would have failed. All rows
-- were 'free' at the time of the swap, so it is safe. Found 2026-07-12 during
-- standing-badge verification; applied to production via Supabase MCP.
alter table public.sg_agents drop constraint sg_agents_subscription_tier_check;
alter table public.sg_agents add constraint sg_agents_subscription_tier_check
  check (subscription_tier = any (array['free'::text, 'verified'::text, 'professional'::text, 'elite'::text]));
