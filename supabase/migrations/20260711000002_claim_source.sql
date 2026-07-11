-- Distinguish how a claim happened: banner (email-verify loop) vs magic_invite
-- (agent proved address ownership by acting on a per-agent signed invite link).
--
-- Applied to production via Supabase MCP on 2026-07-11.
alter table public.sg_claim_requests
  add column if not exists source text;
