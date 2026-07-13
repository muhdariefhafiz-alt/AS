-- My Home v1 (board Option A): fields for the tracked-homeowner surface.
-- flat_type: exact HDB flat type at capture (the avm-updates cron previously
-- proxied everything as 4 ROOM). keys_date: optional key-collection date for
-- the MOP countdown. digest_last_sent_at: monthly-cadence tracking so the
-- owner digest can send on a schedule, not only on >=2% value moves.
-- Applied to production via Supabase MCP on 2026-07-13.
alter table public.sg_leads
  add column if not exists flat_type text,
  add column if not exists keys_date date,
  add column if not exists digest_last_sent_at timestamptz;
