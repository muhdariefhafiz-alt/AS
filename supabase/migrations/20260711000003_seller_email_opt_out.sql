-- Seller unsubscribe suppression: the unsubscribe page told sellers they were
-- unsubscribed while every seller marketing sender (reminder, reactivation,
-- review requests, AVM updates, MOP alerts) kept mailing them. This column is
-- the suppression flag; the unsubscribe POST sets it and every marketing
-- sender checks it. Transactional sends (quote arrived, pick confirmation)
-- remain exempt.
--
-- Applied to production via Supabase MCP on 2026-07-11.
alter table public.sg_leads
  add column if not exists email_opt_out_at timestamptz;
