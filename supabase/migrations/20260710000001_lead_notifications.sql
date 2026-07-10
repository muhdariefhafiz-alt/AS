-- Per-agent notification ledger for seller-lead invites.
--
-- Why: sg_lead_shortlist.status='invited' records the seller's INTENT to
-- invite, not proof the agent was ever contacted. Sends were fire-and-forget
-- (Resend errors returned as {id:'resend-error'} and discarded; WhatsApp
-- silently dry-runs when unprovisioned), so nothing distinguished a delivered
-- invite from a silent no-op. This table records every attempt and its real
-- outcome so seller-facing copy ("Emailed <date>") and the admin can be
-- grounded in evidence, never asserted.
--
-- Applied to production via Supabase MCP on 2026-07-10.
create table if not exists public.sg_lead_notifications (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.sg_leads(id) on delete cascade,
  agent_id bigint not null references public.sg_agents(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'none')),
  -- Resend email id or Meta WhatsApp message id; null when nothing was sent.
  provider_message_id text,
  -- sent: provider accepted the message.
  -- dry_run: channel unprovisioned, send was a no-op (agent got nothing).
  -- error: provider rejected or send threw.
  -- skipped_no_channel: agent has no contact detail for any live channel.
  -- delivered / read / failed: provider webhook confirmations (WhatsApp).
  outcome text not null check (
    outcome in ('sent', 'dry_run', 'error', 'skipped_no_channel', 'delivered', 'read', 'failed')
  ),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists sg_lead_notifications_lead_idx
  on public.sg_lead_notifications (lead_id);
create index if not exists sg_lead_notifications_agent_idx
  on public.sg_lead_notifications (agent_id);
-- Webhooks join provider callbacks back to the outbound send by message id.
create index if not exists sg_lead_notifications_provider_msg_idx
  on public.sg_lead_notifications (provider_message_id)
  where provider_message_id is not null;

-- Service-role only: contains agent contact outcomes; nothing public reads it.
alter table public.sg_lead_notifications enable row level security;
revoke all on public.sg_lead_notifications from anon, authenticated;
