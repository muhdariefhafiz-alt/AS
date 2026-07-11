-- Agent-reach roadmap support (agreed 2026-07-11):
-- 1. whatsapp_manual: operator one-tap wa.me sends from the admin worklist
-- 2. agency_email: FAO relay to the agent's agency office inbox (pilot)
-- 3. bounced/complained outcomes: Resend webhook flips a 'sent' email that
--    hard-bounced so seller-facing copy and the admin worklist stay honest
-- 4. sg_agents.email_status: graded deliverability (MX sweep + bounce data)
--
-- Applied to production via Supabase MCP on 2026-07-11.
alter table public.sg_lead_notifications
  drop constraint if exists sg_lead_notifications_channel_check;
alter table public.sg_lead_notifications
  add constraint sg_lead_notifications_channel_check
  check (channel in ('email', 'whatsapp', 'whatsapp_manual', 'agency_email', 'none'));

alter table public.sg_lead_notifications
  drop constraint if exists sg_lead_notifications_outcome_check;
alter table public.sg_lead_notifications
  add constraint sg_lead_notifications_outcome_check
  check (outcome in (
    'sent', 'dry_run', 'error', 'skipped_no_channel',
    'delivered', 'read', 'failed', 'bounced', 'complained'
  ));

-- Deliverability grade for the scraped address, populated by the MX sweep and
-- the Resend bounce webhook: unknown | mx_ok | no_mx | bounced | complained | verified
-- (verified = the agent proved ownership via claim/magic-link click-through).
alter table public.sg_agents
  add column if not exists email_status text,
  add column if not exists email_validated_at timestamptz;
