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
| **18** | `2026-09-15-results-achievements.sql` | **Sprint 007 Phase 1 — Results & Achievements foundation.** Creates `metric_type_accounts` (measure → financial account source binding), `achievements` (dated/attributable/verifiable outcomes; `kind = result\|achievement\|decision`), `achievement_evidence` (preserved review evidence); adds 9 measurement columns to `gps_target_metrics` (`baseline/target_period_type+ref`, `direction`, `calculation_method`, `maintain_tolerance_value+unit`, `calculation_version`); seeds revenue bindings (`REVENUE_TOTAL`/`REVENUE_EXPORT`/`REVENUE_ANNUAL`). Idempotent (IF NOT EXISTS + information_schema-guarded ALTERs + `ON DUPLICATE KEY UPDATE` seeds). Rollback notes in the file header | **✅ run locally — 5 bindings, 9 columns** | ⏳ not yet (Phase 1 review gate) |

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

Implication for Phase 3: derive `complete` / `incomplete` / `no_accounts` from **row presence per (account, financial_year)**, honour any NULL month as incomplete, and never treat a missing row/binding as zero.
