# Migrations — Order & Guide

> Run in order. `migrations/` is the source of truth — do not edit applied files, add a new `YYYY-MM-DD*.sql` patch.

## How to run (local)

```bash
# via podman (local DB is incubator-os-mysql-container, user docker/docker)
Get-Content api-incubator-os/migrations/2026-08-31-normalized-swot-gps.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
Get-Content api-incubator-os/migrations/2026-08-31-normalized-migration-audit.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
Get-Content api-incubator-os/migrations/2026-08-31b-patch-audit-reporting.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
Get-Content api-incubator-os/migrations/2026-09-15-results-achievements.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
```

Production (phpMyAdmin): import the same files in order before first use of `Admin → Tools → Data Migration`. `normalized-migrate.php` auto-creates tables as fallback, but prod should have them via SQL.

Verify:
```sql
SHOW TABLES LIKE 'swot_analyses';
SHOW TABLES LIKE 'normalized_migration_audits';
DESCRIBE swot_analyses; -- should have current_company_id (generated) + legacy_path via swot_items
DESCRIBE normalized_migration_audits; -- should have operation_type, migration_key, title, description, environment, commit_sha
```

## Current stack (top = most recent, run order = chronological)

| Order | File | What | Run locally? | Run in production? |
|------:|------|------|--------------|-------------------|
| 1 | `20_09_25_1.sql` | Legacy baseline | ✅ (pre-existing) | ✅ |
| 2 | `create_company_accounts_table.sql` | `company_accounts` | ✅ | ✅ |
| 3 | `create_password_reset_tokens.sql` | `password_reset_tokens` | ✅ | ✅ |
| 4 | `migrate_metadata_to_categories.sql` | category migration | ✅ | ✅ |
| 5 | `add_balance_sheet_components.sql` | balance sheet cols | ✅ | ✅ |
| 6 | `add_ratio_fields_to_metric_types.sql` | metric_types ratios | ✅ | ✅ |
| 7 | `add_title_field_to_metric_records.sql` | metric_records.title | ✅ | ✅ |
| 8 | `add_yearly_side_by_side_period_type.sql` | period_type enum | ✅ | ✅ |
| 9 | `insert_additional_ratio_metrics.sql` | seed ratios | ✅ | ✅ |
| 10 | `2026-07-09-add-token-column.sql` | add token col | ✅ | ✅ |
| 11 | `update_metric_records_for_categories.sql` | metric_records categories | ✅ | ✅ |
| 12 | `migrate-account-types.php` | PHP account-type backfill (run once via CLI) | ✅ | ✅ |
| **13** | `2026-08-31-normalized-swot-gps.sql` | **Normalized SWOT/GPS — 7 tables** (`swot_analyses` with `current_company_id` generated UNIQUE, `swot_items` + `gps_targets` with `legacy_path` UNIQUE, `gps_target_sources/tasks/updates/metrics`) — preserves `nodes` as archive | **✅ run locally — 1 analysis (Company 11), 8 items, 12 targets, 12 sources** | **✅ applied — prod `rbttaces_api` 2026-09-14** (verified `legacy_path` + `current_company_id`) |
| **14** | `2026-08-31-normalized-migration-audit.sql` | `normalized_migration_audits` (user, company_ids, result_summary, errors, status) — Admin preview/migrate audit | **✅ run locally — 1 audit row** | **✅ applied — prod `rbttaces_api` 2026-09-14** |
| **15** | `2026-08-31b-patch-legacy-path.sql` | **Idempotent patch** for installs that ran #13 before `legacy_path` fix — adds `legacy_path` + `UNIQUE(swot_analysis_id, legacy_path)` / `UNIQUE(legacy_node_id, legacy_path)` + `current_company_id` if missing | **✅ effectively applied** (main #13 already contained `legacy_path`; patch is no-op locally) | **✅ effectively applied** — main #13 already included `legacy_path`; patch not needed |
| **16** | `2026-08-31b-patch-audit-reporting.sql` | **Durable reporting** — adds `operation_type`, `migration_key`, `title`, `description`, `environment`, `commit_sha` to `normalized_migration_audits`; backfills `operation_type/migration_key/title/description` with canonical “Normalize SWOT and GPS records — Migrated legacy SWOT analyses and GPS targets from JSON nodes … Legacy nodes were retained as an archive.” Leaves `environment` NULL for unknown history (new audits set via host) | **✅ run locally** | **✅ applied — prod `rbttaces_api` 2026-09-14** |
| **17** | `2026-09-14-align-nodes-token.sql` | **Guarded repair** — aligns `nodes.token` with canonical `VARCHAR(64) NULL UNIQUE` + `idx_nodes_token` (from #10). Prod had drifted to `VARCHAR(1000)` with no UNIQUE/index. Safe to re-run; no-op where already correct | **✅ no-op** (local already canonical) | **✅ applied — prod `rbttaces_api` 2026-09-14** (3 ALTERs via phpMyAdmin) |
| **18** | `2026-09-15-results-achievements.sql` | **Sprint 007 Phase 1 — Results & Achievements foundation.** Creates `metric_type_accounts` (measure → financial account source binding), `achievements` (dated/attributable/verifiable outcomes; `kind = result\|achievement\|decision`), `achievement_evidence` (preserved review evidence); adds 9 measurement columns to `gps_target_metrics` (`baseline/target_period_type+ref`, `direction`, `calculation_method`, `maintain_tolerance_value+unit`, `calculation_version`); seeds revenue bindings (`REVENUE_TOTAL`/`REVENUE_EXPORT`/`REVENUE_ANNUAL`). Idempotent (IF NOT EXISTS + information_schema-guarded ALTERs + `ON DUPLICATE KEY UPDATE` seeds). Rollback notes in the file header | **✅ run locally — 5 bindings, 9 columns** | ⚠️ doc-of-record: applied 2026-09-14/16 (`docs/sprint-007-production-verification.md`) — **re-verify via preflight, do not assume** ([deployment package](../../docs/sprint-007-009-production-deployment.md)) |
| **19** | `2026-09-16-achievements-snapshot-guard.sql` | **Sprint 007 Phase 4 — snapshot guard.** Adds functional unique index `uq_evidence_metric_snapshot` on `achievement_evidence` over `(CASE WHEN source_type='metric_snapshot' THEN achievement_id END)` — enforces **at most one metric snapshot per achievement** (defence-in-depth against verification races, on top of the `SELECT … FOR UPDATE` lock). A stored generated column was rejected by InnoDB (error 1215, FK column); the functional index is the working equivalent. Guarded + idempotent | **✅ run locally** | ⚠️ doc-of-record: applied 2026-09-14/16 — **re-verify via preflight, do not assume** |
| **20** | `2026-09-19-calendar-events.sql` | **Sprint 008 Phase 2 — calendar events.** Creates `calendar_events` (tenant-scoped, nullable `company_id` = system-wide, all-day DATE vs timed UTC DATETIME + IANA timezone enforced by `chk_cal_time_shape`, `version`, `client_token` idempotency, soft delete) and `calendar_event_links` (six canonical entity types). Idempotent (`IF NOT EXISTS`). Requires MySQL 8.0.16+ (CHECK) | **✅ run locally** | ⬜ pending preflight ([deployment package](../../docs/sprint-007-009-production-deployment.md)) |
| **21** | `2026-09-23-sessions.sql` | **Sprint 009 — first-class Sessions.** Creates `sessions` (nullable UNIQUE `calendar_event_id`, lifecycle, summaries, cancellation, facilitator, `version`), `session_participants`, `session_agenda_items`, `session_notes` (shared/incubator visibility), `session_decisions`, `session_entity_links` (type + relationship), `session_activities` (append-only JSON timeline). Idempotent (`IF NOT EXISTS`); no existing table altered. Requires MySQL 8.0.13+ (functional index). Rollback notes in the file header | **✅ run locally (re-run proven safe)** | ⬜ pending preflight (run after #20) |
| **22** | `2026-09-24-google-calendar.sql` | **Sprint 010 Phase 1 - Google Calendar foundation (storage only).** Creates `google_calendar_connections` (one encrypted OAuth connection per user; AES-256-GCM ciphertext/nonce/tag/key-version in separate columns; status `connected\|needs_reconnect\|revoked`) and `google_event_sync` (one Google projection per local event; `UNIQUE calendar_event_id`; `meet_request_id` for a stable conference; `etag` for `If-Match`; sync_status `pending\|synced\|conflict\|failed\|detached`). Idempotent (`IF NOT EXISTS`); no existing table altered. Rollback notes in the file header | run locally (applied twice, proven idempotent) | pending (import after #21) |
| **23** | `2026-09-24-google-calendar-phase2.sql` | **Sprint 010 Phase 2 - OAuth lifecycle support.** Adds `google_calendar_connections.status` values `disconnected` (audit-preserving disconnect) and `account_mismatch` (reconnect with a different Google account while published mappings exist); adds `pending_account_email`; creates `google_oauth_states` (opaque 256-bit single-use, short-lived, tenant/user-bound OAuth state; only the SHA-256 hash is stored). Idempotent (guarded `information_schema` checks + `IF NOT EXISTS`). Amends the brief's stateless-HMAC state design, which could not enforce one-time consumption | run locally (applied twice) | pending (import after #22) |
| **24** | `2026-09-24-google-calendar-phase3.sql` | **Sprint 010 Phase 3 - publish support.** Adds `google_event_sync.conference_status` enum `none\|pending\|success\|failure` (Google's asynchronous Meet conference state, tracked independently of `sync_status`); adds `publish_claim_token` + `publish_claimed_at` (a short-TTL local lease so one event cannot be published twice concurrently, with stale-lease takeover so a crashed publish self-heals); adds `idx_gsync_claim`. Idempotent (guarded `information_schema` checks); no existing column dropped, retyped or reordered. The deterministic Google event id and the stable `meet_request_id` need no new column | run locally (applied twice) | pending (import after #23) |
| **25** | `2026-09-24-google-calendar-phase4.sql` | **Sprint 010 Phase 4 - reschedule, cancel, conflict, unpublish.** `sync_status` gains `update_pending` (a retryable local change waiting on Google) and `unpublished` (Google copy deliberately removed; mapping kept for audit). Adds `generation` (embedded in the deterministic Google event id so a republish after an unpublish never reuses a tombstoned id; a new generation gets a new conference request id), `synced_event_version` (local event version the projection reflects; idempotent reschedule + stale-worker guard), `remote_etag` (current remote etag for conflict display; NOT a snapshot of the external event), `conflict_at`, `unpublished_at`, `remote_outcome` (`deleted\|already_absent\|failed`) and `last_google_event_id` (audit). Idempotent (guarded `information_schema` checks) | run locally (applied twice) | pending (import after #24) |
| **26** | `2026-09-25-site-visits.sql` | **Sprint 011 Phase 1 - structured on-site visit reports.** Widens `sessions.session_type` (additive) with `site_visit` and creates `session_visit_reports` (one report per visit Session; `UNIQUE session_id`; report lifecycle `draft\|issued\|acknowledged`; `visit_kind`; actual visit date/location; enrolment FK; follow-up Session FK), `session_visit_items` (sectioned `discussion\|challenge\|alternative\|recommendation` content), `session_visit_signoffs` (records the exact issued `report_version_no`; `UNIQUE (report_id, role)`) and `session_visit_report_versions` (immutable `snapshot_json` audit record; `UNIQUE (report_id, version_no)`). 7 FKs, 5 unique keys; no existing table altered except the additive enum widen | run locally (applied twice) | pending (import after #25) |

## Canonical backfill values (for two-year history)

- `operation_type` = `data_migration`
- `migration_key` = `2026-08-31-normalized-swot-gps`
- `title` = `Normalize SWOT and GPS records`
- `description` = `Migrated legacy SWOT analyses and GPS targets from JSON nodes into normalized relational tables to support individual identities, relationships, tasks, progress tracking and dashboard reporting. Legacy nodes were retained as an archive.`
- `environment` = `local` (local), `production` (prod host), `staging` if host contains staging — not backfilled as `local` for prod history
- `commit_sha` = `GIT_COMMIT_SHA` env or `.git/HEAD`

## localhost check (2026-08-31)

```sql
SELECT COUNT(*) FROM swot_analyses WHERE company_id=11; -- 1
SELECT COUNT(*) FROM swot_items WHERE swot_analysis_id IN (SELECT id FROM swot_analyses WHERE company_id=11); -- 8
SELECT COUNT(*) FROM gps_targets WHERE company_id=11; -- 12
SELECT id, action, company_ids, operation_type, migration_key, environment, commit_sha, created_at FROM normalized_migration_audits ORDER BY id DESC LIMIT 5;
```

`nodes` is untouched — `SELECT COUNT(*) FROM nodes` before/after migration is identical.

## Production run (executed 2026-09-14 — `rbttaces_api`)

1. ✅ #13, #14, #16 already present; #17 (`align-nodes-token`) applied via phpMyAdmin.
2. ✅ Migration executed via `Admin → System Tools → Data Migration` (System Administrator) with explicit `companyIds` `1,5,11,14,20,22,26,59,107,120,123,126,142`, preview-gated (`50/12 · 80/5 · 62/9 · 62`, `rolled_back: yes`) then `MIGRATE_NORMALIZED_SWOT_GPS`.
3. ✅ Result `dry_run:false`, `rolled_back:false`, `errors: []` → `swot_analyses` 12 · `swot_items` 80 · `gps_targets` 62 · `gps_target_sources` 62 (all `legacy_unlinked`) · audit row `migrate` / `completed`.
4. ✅ New screens show migrated production data (Company 11 → 9 findings / 12 targets); manual SWOT→GPS link + unlink verified on prod.

Expected counts:
```sql
SELECT COUNT(*) FROM swot_analyses;        -- 12
SELECT COUNT(*) FROM swot_items;           -- 80
SELECT COUNT(*) FROM gps_targets;          -- 62
SELECT COUNT(*) FROM gps_target_sources;   -- 62 (all legacy_unlinked)
SELECT COUNT(*) FROM nodes;                -- 3319 (unchanged)
```

Do NOT run `migrate-all` or `clear` from HTTP — they are CLI-only (`normalized-migrate-cli.php`).

## Sprint 007 Phase 1 — notes for implementing Phase 3 (measurement)

**Dead code removed (2026-09-15).** `models/MetricRecord.php` and `api-nodes/enhanced-metrics.php` were deleted. `MetricRecord` inserted `year`/`quarter`/`value`/`note` — columns that do not exist in the live `metric_records` table — and was only referenced by the unused `enhanced-metrics.php`. The authoritative `metric_records` shape is the `year_`/`q1…q4`/`total`/`margin_pct`/`unit`/`notes`/`title` shape used by `Metrics.php` and `RatioCalculatorService`.

**Financial data semantics (inspected 2026-09-15 — critical for actuals).**

`company_financial_yearly_stats` (`account_id`, `financial_year_id`, `is_revenue`, `m1…m12`, generated `total_amount`):

- `m1…m12` are **nullable** (`DEFAULT 0.00`), but the live data currently has **zero NULL months** (0 of 179 rows). So month-nullness alone **cannot** distinguish "not captured" from a genuine zero.
- The only structural signal of "data captured" is the **presence of a row** for (`company_id`, `account_id`, `financial_year_id`). A row existing with all-zero months is indistinguishable from a real zero-revenue period.
- `total_amount` is a **generated column that `COALESCE`s NULL → 0**, so it silently hides missing months. **Do not use it for completeness** — read `m1…m12` directly.
- `account_id` is **nullable and often absent**: 105 of 179 revenue rows have `account_id = NULL`. Account resolution therefore cannot rely on `account_id`; use `company_accounts` **per company** (by `account_type`), and only use a pinned `account_id` where present.
- `company_accounts.account_type` in live data is almost entirely `domestic_revenue` (91 rows) plus 1 `other`; **no `export_revenue` or `expense` accounts exist yet** — so `export_revenue` bindings resolve to zero accounts and must surface as `no_accounts`, never as 0.

**Phase 3 constraints (recorded 2026-09-15).**

1. **A row existing proves a record exists — not that every month was captured.** With zero-filled months (`DEFAULT 0.00`) an all-zero row is indistinguishable from a genuine zero, so **completeness remains unknown unless another field or workflow confirms it**. Month-nullness cannot be used as the completeness signal while every month is zero-filled.
2. **An account type alone cannot identify a financial row whose `account_id` is null.** 105 of 179 revenue rows have `account_id = NULL`. Those rows **need a demonstrable link or an explicit reconciliation** before they can be attributed to a measure; otherwise **exclude them and report the count of unresolved rows** rather than silently folding them into a total.

Resulting rules for Phase 3: derive `complete` / `incomplete` / `no_accounts` from **row presence per (account, financial_year)** *plus* an explicit confirmation of captured months; honour any NULL month as incomplete; exclude unresolved (null-`account_id`) rows and report them; and never treat a missing row or binding as zero. **Do not use the generated `total_amount`** for completeness — it `COALESCE`s NULL → 0.

**Sprint 007 Phase 2 — task/outcome decoupling (2026-09-15).** Task create/update/delete no longer mutate the parent target's `status`, `completed_at`, or `manual_progress_percentage`; task completion is exposed **read-only** via `GpsTarget::taskProgress()` and included in task endpoint responses as `task_progress`. Targets that were **previously auto-completed** by the old `recalcTaskProgress` behaviour are **left unchanged** — no historical status was rewritten. Manual-review query for any environment:

```sql
SELECT id, company_id, status, completed_at, manual_progress_percentage
FROM gps_targets
WHERE progress_mode = 'tasks' AND status = 'completed';
```

**Sprint 007 Phase 3 — actuals derived (2026-09-15).** `services/TargetMeasurementService.php` reads `company_financial_yearly_stats` through the `metric_type_accounts` bindings and returns a per-period measurement. It is **read-only** (no writes; `metric_records` unused). Per-period `status` is one of `no_accounts` / `partial_coverage` / `incomplete` / `unknown` / `complete`:
* `unknown` = zero-filled rows whose capture cannot be confirmed (do not treat as `complete`);
* `partial_coverage` = only some required bindings resolve (subtotal is partial, not combined revenue);
* `incomplete` = a resolved account has no row for the period, or a required month is NULL;
* `complete` = all bindings resolved, all rows present, and rows populated (zeros confirmed).

`authoritative` / `eligible_for_achievement` require **both periods `complete` and zero unresolved (`account_id IS NULL`) rows**. Verified with controlled fixtures; the existing local data currently yields `partial_coverage` for `REVENUE_TOTAL` (no company has an `export_revenue` account) and has 105 unresolved rows across 179 — **no data was repaired or backfilled**.

**Sprint 007 Phase 4 — achievements & evidence (2026-09-16).** Adds the `achievements` lifecycle and `achievement_evidence` endpoints:
* Drafts (`unverified`) can be edited/deleted; **verified/decided records are immutable** (edit/delete → `409`).
* Verification (`verify`) is **System Administrator only** — there is **no Coach role** in this system (roles: Director / System Administrator / Judge), so no role string was invented; company scoping uses `auth_require_company_access`.
* Measurable verification computes and stores a `metric_snapshot` (via `TargetMeasurementService`) **in the same transaction** as the status change; ineligible/incomplete/unknown/partial/no-accounts/unconfigured measurements fail with `409` and leave the record unchanged.
* `reject` records a rejection **without** a snapshot; `decision` records cannot be verified/rejected and are excluded from counts.
* Corrections: `revoke` (reason required) or `supersede` (new draft via `supersedes_id`); the original record and its evidence are preserved.
* Evidence is **draft-only** (`409` once decided): both `add()` and `delete()` require the parent achievement to be `unverified`, so verified evidence is immutable. The `metric_snapshot` written by `verify()` is inserted while the parent is still `unverified` inside the same transaction. (Tightened in Phase 8 — the Phase 4 `add()` erroneously allowed appending evidence to a verified record.)
* `recorded_by` / `verified_by` / timestamps are always server-derived from the session.

**Sprint 007 Phase 8 — closure verification (2026-09-16).** Both Sprint-007 migrations were re-applied to the local schema and are **idempotent** (`2026-09-15-results-achievements.sql` guards table/column creation via `IF NOT EXISTS` / `information_schema`; `2026-09-16-achievements-snapshot-guard.sql` guards the functional unique index). A full `php -l` sweep over `api-incubator-os` is clean. The measure list endpoint (`gps-targets/measures.php`) returns globally-bound measures; with `?company_id=` it also reports a company-specific `usable`/`account_count` — a global binding must **not** be read as company-readiness (a measure with no resolving accounts surfaces as `no_accounts`). See `docs/sprint-007-phase8-proof.md` for the closure proof, pattern and deployment plan.
