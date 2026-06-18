# Supabase DB logic (snapshot)

Until 2026-06-17 the SG database logic, the entire AgentScore engine, the refresh
functions, the data-study caches, the agent flags and the AI tracker, lived
**only inside Supabase** (applied via the MCP, never mirrored in git). That made
the most important business logic invisible in the repo and unrecoverable if the
DB were lost. These migrations capture it.

## Important caveats

- **The live DB is authoritative, not this folder.** These files are
  point-in-time snapshots (`CREATE OR REPLACE` / `CREATE ... IF NOT EXISTS`), safe
  to re-run. When you change a function or table, change it in the DB (Supabase
  MCP `apply_migration`) **and** add/update a migration here so the two stay in
  sync.
- **The DB is SHARED with the NL sibling** (MakelaarsScan, repo `../web`), same
  project `yhfdahkzukxglwikcdlo`. Only SG-relevant objects are captured here; the
  NL app owns its own migrations for `makelaar_*`, `platform_reviews`, `funda_*`,
  `ai_tracker_*` (note: NL's tracker is `ai_tracker_*`; SG's is `sg_ai_tracker_*`).
- The project ID for the MCP is `yhfdahkzukxglwikcdlo`.

## What is captured

- `20260617000001_db_logic_snapshot.sql` — the scoring engine and getters:
  `calculate_agent_scores`, `refresh_area_top_agents`, `refresh_agent_market_stats`,
  `refresh_agent_concentration_stats`, `refresh_agent_flags`, `run_daily_score_refresh`,
  `get_agent_txn_record`, `get_agent_track_record`, `get_agent_market_study`, plus
  the legacy `recalculate_sg_agent_scores`.
- `20260617000002_caches_flags_ai_tracker.sql` — `agent_market_stats`,
  `agent_concentration_stats`, the `sg_agents.agent_flags` column, the
  `sg_ai_tracker_*` tables + `sg_ai_tracker_sov_latest` view + seed, RLS/grants,
  and the pg_cron note.

## Still uncaptured (follow-up if you want a full mirror)

- The read-only data getters: `get_district_*`, `get_hdb_town_*`, `get_project_*`,
  `get_top_agents_in_*`, `get_freehold_premium_by_district`, `get_sg_median_*`,
  `get_postcode_market_data`, `get_funnel_counts`, `get_listing_stats`, etc. They
  are stable and lower-risk, but still DB-only. Dump with
  `select pg_get_functiondef(oid) from pg_proc where ...`.
- The full `sg_*` table DDL and their RLS policies (see `lessons_rls_landmines`:
  ~70 of 145 tables have no policy). A `pg_dump --schema-only` would capture these.
- The pg_cron `daily-score-refresh` job (registered in the DB at `0 18 * * *`),
  noted in `_0002` but not auto-created by these files.
