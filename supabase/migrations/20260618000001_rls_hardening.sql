-- ============================================================================
-- RLS / GRANTS HARDENING, SG-owned tables (2026-06-18)
-- ============================================================================
-- Mirror of the migration applied to the live (NL-shared) DB on 2026-06-18.
-- See supabase/README.md: the live DB is authoritative; this file keeps the
-- repo in sync. Idempotent (revoke/grant/enable-rls are all safe to re-run).
--
-- Scope: only sg_* / SG-owned objects. Does NOT touch sg_agents, sg_agencies,
-- or sg_agent_transactions (the public read paths) and adds no broad REVOKE
-- that could break a live anon read.
--
-- Found by the RLS audit (cross-referencing pg_class.relrowsecurity + pg_policies
-- + anon table/column grants against the repo's anon `.from()` call sites):
--   * sg_agent_reviews leaked reviewer_email / verify_token / verify_expires /
--     ip_hash to anon (table-level SELECT grant + a status='published' read
--     policy, the policy scoped ROWS but not COLUMNS). Same class as the
--     historical platform_reviews.author_email leak.
--   * sg_ai_tracker_{brands,queries,runs,brand_hits} and
--     sg_agent_transactions_staging had RLS DISABLED while anon kept full DML
--     grants, so the public embedded anon key could read/insert/update/delete
--     them through PostgREST.
-- ============================================================================

-- (A) sg_agent_reviews, column-scope the public read. Drop table-level SELECT
--     and re-grant only the display-safe columns. The two public anon reads
--     (app/components/VerifiedReviews.tsx and GET /api/reviews) select only these
--     and filter on agent_id/status/verified_completion/pdpa_consent_review (all
--     still granted). Service-role paths (submit/verify/moderation/cron) bypass
--     grants and are unaffected. The status='published' row policy stays.
revoke select on public.sg_agent_reviews from anon, authenticated;
grant select (
  id, agent_id, reviewer_name, rating, transaction_type, comment, created_at,
  approved, completion_id, lead_id, rating_overall, seller_initials,
  verified_completion, pdpa_consent_review, status, updated_at
) on public.sg_agent_reviews to anon, authenticated;

-- (B) AI-answer tracker, make it explicitly private. Written by the CRON_SECRET
--     cron (service-role) and read by the admin "AI Search" tab (service-role).
--     Enable RLS (no anon policy) and revoke anon/authenticated grants, including
--     the non-RLS-gated ones (TRUNCATE/REFERENCES/TRIGGER) that a grant alone
--     governs.
alter table public.sg_ai_tracker_brands     enable row level security;
alter table public.sg_ai_tracker_queries    enable row level security;
alter table public.sg_ai_tracker_runs       enable row level security;
alter table public.sg_ai_tracker_brand_hits enable row level security;
revoke all on public.sg_ai_tracker_brands     from anon, authenticated;
revoke all on public.sg_ai_tracker_queries    from anon, authenticated;
revoke all on public.sg_ai_tracker_runs       from anon, authenticated;
revoke all on public.sg_ai_tracker_brand_hits from anon, authenticated;

-- The SOV view runs as its owner (postgres) and would otherwise bypass the
-- base-table RLS for anon; revoke the view grant too (admin reads via service-role).
revoke all on public.sg_ai_tracker_sov_latest from anon, authenticated;

-- (C) sg_agent_transactions_staging, service-role ingest pipeline only.
alter table public.sg_agent_transactions_staging enable row level security;
revoke all on public.sg_agent_transactions_staging from anon, authenticated;
