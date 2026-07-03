-- ============================================================================
-- Agent contact consent (2026-07-03)
-- ============================================================================
-- Mirror of the migration applied to the live (NL-shared) DB. Records an agent's
-- explicit consent to be contacted (email + WhatsApp) about seller leads, so
-- outreach has a PDPA-defensible, timestamped, versioned consent record.
--   * sg_claim_requests.contact_consent  - captured at claim submit (required)
--   * sg_agents.contact_consent_at/_version - stamped at claim verify
-- ============================================================================

alter table public.sg_claim_requests
  add column if not exists contact_consent boolean not null default false;

alter table public.sg_agents
  add column if not exists contact_consent_at timestamptz,
  add column if not exists contact_consent_version text;
