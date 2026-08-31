# Migrations — Order & Guide

> Run in order. `migrations/` is the source of truth — do not edit applied files, add a new `YYYY-MM-DD*.sql` patch.

## How to run (local)

```bash
# via podman (local DB is incubator-os-mysql-container, user docker/docker)
Get-Content api-incubator-os/migrations/2026-08-31-normalized-swot-gps.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
Get-Content api-incubator-os/migrations/2026-08-31-normalized-migration-audit.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
Get-Content api-incubator-os/migrations/2026-08-31b-patch-audit-reporting.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
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
| **13** | `2026-08-31-normalized-swot-gps.sql` | **Normalized SWOT/GPS — 7 tables** (`swot_analyses` with `current_company_id` generated UNIQUE, `swot_items` + `gps_targets` with `legacy_path` UNIQUE, `gps_target_sources/tasks/updates/metrics`) — preserves `nodes` as archive | **✅ run locally — 1 analysis (Company 11), 8 items, 12 targets, 12 sources** | **❌ NOT YET — run via phpMyAdmin before first Admin migration** |
| **14** | `2026-08-31-normalized-migration-audit.sql` | `normalized_migration_audits` (user, company_ids, result_summary, errors, status) — Admin preview/migrate audit | **✅ run locally — 1 audit row** | **❌ NOT YET** |
| **15** | `2026-08-31b-patch-legacy-path.sql` | **Idempotent patch** for installs that ran #13 before `legacy_path` fix — adds `legacy_path` + `UNIQUE(swot_analysis_id, legacy_path)` / `UNIQUE(legacy_node_id, legacy_path)` + `current_company_id` if missing | **✅ effectively applied** (main #13 already contained `legacy_path`; patch is no-op locally) | **Run if prod ran #13 early, else skip (main #13 already includes it)** |
| **16** | `2026-08-31b-patch-audit-reporting.sql` | **Durable reporting** — adds `operation_type`, `migration_key`, `title`, `description`, `environment`, `commit_sha` to `normalized_migration_audits`; backfills `operation_type/migration_key/title/description` with canonical “Normalize SWOT and GPS records — Migrated legacy SWOT analyses and GPS targets from JSON nodes … Legacy nodes were retained as an archive.” Leaves `environment` NULL for unknown history (new audits set via host) | **✅ run locally** | **❌ NOT YET** |

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

## Production checklist (when UI is ready)

1. Import #13, #14, #16 via phpMyAdmin (in order).
2. If prod already had #13 without `legacy_path`, also import #15.
3. Login as `System Administrator` → `Admin → Tools → Data Migration` → `Preview [59,11]` → verify `8/12` etc. → `Migrate` with `MIGRATE_NORMALIZED_SWOT_GPS` → check `normalized_migration_audits` row with durable description.

Do NOT run `migrate-all` or `clear` from HTTP — they are CLI-only (`normalized-migrate-cli.php`).
