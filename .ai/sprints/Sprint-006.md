# Sprint 006 — Normalized SWOT/GPS Hierarchy + Dashboard + Admin Migration

## Goal

Build the operational UI on top of the normalized tables (`swot_analyses`, `swot_items`, `gps_targets`, `gps_target_sources`, `gps_target_tasks`, `gps_target_updates`, `gps_target_metrics`, `normalized_migration_audits`) using **Company 11** as the local demo dataset. Add a System Administrator migration screen at `Admin → System Tools → Data Migration` that safely drives the already-hardened `POST /api-nodes/imports/normalized-migrate.php` endpoint (preview → verify → confirmed migrate + audit history). No production migration until this UI is proven locally.

## Context

* Sprint 005 completed: 7 normalized tables + `normalized_migration_audits`, 7 models, 33 endpoints + `AuthGuard`, `NormalizedMigrator` with `resolveCompanyId()` (column `>0` else JSON `data.company_id`) and ISO `toDateTime` fix, Admin HTTP `preview`/`migrate` with `MIGRATE_NORMALIZED_SWOT_GPS` confirm, `clear`/`migrate-all` CLI-only, audit log.
* Local legacy dataset: `nodes (12).sql` — 2394 nodes, 45 `swot_analysis`, 6 `gps_targets`. Company 11 is the realistic demo: 38 SWOT nodes (latest `1964`), 1 GPS node (`1986`). Local migration for 11 produces `1` current analysis, `8` items (strength 2, weakness 5, threat 1, 3 junk skipped), `12` targets (finance 5, strategy_general 5, sales_marketing 1, personal_development 1, 2 skipped), `12` `legacy_unlinked` sources, idempotent re-runs.
* Company 59 is the junk-filter demo (`AI` → header only, 0 items).
* Production is Apache-only: SQL files must be deployed via phpMyAdmin/normal deploy before first screen use; endpoint auto-create is fallback only.
* Existing legacy UI lives at `company/:id/swot` (`SwotTabComponent`) and `company/:id/gps-targets` (`GpsTargetsTabComponent`) reading `nodes` via `NodeService`. New UI will read normalized endpoints and coexist behind a feature flag / route version for Sprint 006.

## Local Pre-req (already done, re-run if cleared)

```bash
mysql -u docker -pdocker incubator_os < migrations/2026-08-31-normalized-swot-gps.sql
mysql -u docker -pdocker incubator_os < migrations/2026-08-31-normalized-migration-audit.sql
mysql -u docker -pdocker incubator_os < migrations/2026-08-31b-patch-audit-reporting.sql  # adds operation_type, migration_key, title, description, environment, commit_sha
podman exec incubator-os-container php /var/www/html/api-nodes/imports/normalized-migrate-cli.php --action=migrate --companyIds=11
# verify: 1 analysis, 8 items, 12 targets, 12 sources
```

Do NOT run production migration yet.

## Tasks

### Phase 1 — Services (Angular 19, standalone, signals, inject(), OnPush) — **Done in 0c9e9eb**

- [x] `src/services/normalized/swot.service.ts` — `SwotAnalysis`, `SwotItem` typed interfaces; methods: `listAnalyses(companyId)`, `getCurrent(companyId)`, `listItems(analysisId|companyId, quadrant?)`, `countsByQuadrant(companyId)`, `setCurrent(analysisId)`, `create/update/delete` (admin/coach)
- [x] `src/services/normalized/gps.service.ts` — `GpsTarget`, `GpsTargetSource`, `GpsTargetTask`, `GpsTargetUpdate` interfaces; methods: `listTargets(companyId)`, `groupedByCategory(companyId)`, `dashboardCounts(companyId)`, `listBySwotItem(swotItemId)`, `listByTarget(targetId)`, `link/unlink`, `tasks` CRUD + `reorder`, `updates` history/latest, `metrics` attach/detach (read-only for 006)
- [x] `src/services/normalized/migration.service.ts` — `preview(companyIds)`, `migrate(companyIds, confirm)`, `getAuditHistory(limit, offset)`, `getCounts()`. Wraps `POST /api-nodes/imports/normalized-migrate.php` with `ApiBase` + `withCredentials`. Handles `401/403` → redirect to login.
- [x] Extend `src/services/service.ts` if needed for `isLocalApi` correctness (already fixed: `hostname==='localhost'`)

### Phase 2 — Hierarchy UI (Company 11 demo) — **Read-only scaffold done in 0c9e9eb**

- [x] Route `company/:id/swot-v2` — lazy-loaded `SwotHierarchyPageComponent` (standalone, OnPush, signals) — read-only quadrants, linked targets via `list-by-swot-item`
- [x] Route `company/:id/gps-targets-v2` — lazy-loaded `GpsTargetsHierarchyPageComponent` — grouped by `category`, tasks/updates collapsible (read-only), metrics chips
- [x] Shared: `app-card`, `app-stat-card`, `app-page-header`, `app-section`, `app-empty-state` — no new icon fonts
- [ ] **Remaining:** create/edit targets, add/reorder tasks, progress updates, source provenance UI, SWOT-to-GPS link/unlink interface, nav links

### Phase 3 — Dashboard Cards (Operational Source) — **Partial (counts via gps-hierarchy only)**

- [x] `gps-targets-v2` shows `total` + `overdue`/`at_risk`/`due_this_month` via `dashboardCounts`; `swot-v2` shows quadrant counts
- [ ] Full `DashboardNormalizedCardsComponent` on `company/:id/overview` with drill-down links — TODO

### Phase 4 — Admin → System Tools → Data Migration — **Hardened 2026-08-31 (review fixes)**

- [x] Route `admin/system-tools/data-migration` — lazy-loaded `DataMigrationPageComponent`, `canActivate: [authGuard, migrationAdminGuard]` — **System Administrator only** (Coordinator cannot migrate; `auth_is_migration_admin` / `isSystemAdministrator()` strict)
  - Company selector: multi-select or comma-separated IDs → explicit `companyIds` array (default `[11]` locally, `[59,11]` for prod demo; never default to all)
  - `Preview migration` button → `POST preview` → renders summary: `nodes_seen/selected`, `analyses/items_created/skipped`, `targets_created/skipped/sources`, `duplicates_flagged` (expandable IDs), `errors/warnings`, `companies_processed`
  - **Stale-preview fix:** `previewedCompanyIds` saved; `canMigrate` requires exact match (sorted equality), `onIdsChange()` invalidates, `hasPreviewErrors()` blocks migrate — preview for `11` cannot be used to migrate `59`
  - `Run migration` button disabled until preview success **for exact IDs, no errors, and exact phrase** → requires typed `MIGRATE_NORMALIZED_SWOT_GPS` → `POST migrate` → shows result + inline error handling
  - `clear` / `migrate-all` never shown (CLI-only, HTTP 403) — page notes `clear is CLI-only via normalized-migrate-cli.php`
  - **Durable reporting:** audit history table now shows `Date | Type | Migration | Description | User | Status` — reads `normalized_migration_audits` via `migration-audit-list.php` with columns `operation_type`, `migration_key`, `title`, `description`, `environment`, `commit_sha` (immutable human description: “Migrated legacy SWOT analyses and GPS targets from JSON nodes into normalized relational tables…”)
  - Handles `401/403` → login/forbidden (SA-only), `GET ?action=` → `405`, `migrate` without confirm → `400`
- [x] Backend `api-nodes/imports/normalized-migrate.php` — hardened: POST-only, SA-only `auth_is_migration_admin`, explicit `companyIds` required, `confirm` required, audit inserts canonical `operation_type=data_migration`, `migration_key=2026-08-31-normalized-swot-gps`, `title`, `description`, `environment` (host-based), `commit_sha` (env/.git), `ALLOW_HTTP_MIGRATE` removed
- [x] Backend `api-nodes/imports/migration-audit-list.php` — SA-only strict, generic 500 error (detailed logged server-side), returns durable columns
- [ ] Success criteria: Admin can run full local flow `preview [11]` → verify `8/12` → `migrate [11]` with confirm → audit row with durable description appears → hierarchy pages immediately reflect new data without refresh (signals) — *verified via ng serve runtime needed*

### Phase 5 — Routing, Guards, Navigation

- [ ] Add `adminGuard` (reuse `authGuard` + `auth_is_admin` check via `UserService` or `AuthService` role check) for `admin/system-tools/*`
- [ ] Register new routes in `src/app/app.routes.ts` as lazy-loaded children under `path: ''` → `AppShellComponent` → `children: [{ path: 'admin/system-tools/data-migration', loadComponent: ... }]`, and `company/:id/swot-v2`, `company/:id/gps-targets-v2`
- [ ] Add nav links: `AppShell` sidebar → `Admin → System Tools → Data Migration` (admin only), `CompanyShell` tabs → `SWOT (Normalized)` / `GPS (Normalized)` alongside legacy tabs for Sprint 006

### Phase 6 — Verification (Local, Company 11)

- [ ] `ng serve` → login as System Administrator (advisor1@south32esdcentre.co.za etc.) → `company/11/swot-v2` shows 8 items across quadrants, expand → 0 linked targets initially (all `legacy_unlinked`)
- [ ] `company/11/gps-targets-v2` shows 12 targets grouped, 12 sources all `legacy_unlinked`, tasks/updates empty initially
- [ ] Link one SWOT item → GPS target via `link.php` → verify `list-by-target` and `list-by-swot-item` reflect, hierarchy updates
- [ ] Dashboard cards reflect `swot_items:8`, `gps_targets:12`, categories, statuses
- [ ] `admin/system-tools/data-migration` → `preview [11]` → `8/12/37 duplicates` → `migrate [11]` with confirm → `analyses_created:0` (idempotent) → audit row appears
- [ ] Clear via CLI `php normalized-migrate-cli.php --action=clear --companyIds=11` → hierarchy shows 0 → preview/migrate again → back to 8/12
- [ ] `nodes` table untouched throughout (SELECT COUNT(*) before/after)
- [ ] No `ALLOW_HTTP_MIGRATE` usage; `GET ?action=` returns `405`; `POST` without admin returns `401/403`; `migrate` without confirm returns `400`

## Out of Scope

* Full backfill of all companies (sample `[11]` + `[59]` only for 006)
* Metric-driven progress (`gps_target_metrics` → `metric_records` wiring) — read-only chips only
* Auto-linking `source_key` heuristic
* Production SQL deployment (documented, but runs via phpMyAdmin — not in Sprint 006 code)

## Acceptance Criteria

* Normalized hierarchy pages read exclusively from normalized endpoints (no `NodeService` for SWOT/GPS)
* Company 11 demo renders correct counts locally and is idempotent via `legacy_node_id`/`legacy_path`
* Admin migration screen is System Administrator only (Coordinator blocked, `migrationAdminGuard` + `auth_is_migration_admin`), POST-only, stale-preview guarded (exact IDs + no errors + confirm), and audit-logs every run to `normalized_migration_audits` with durable `operation_type`, `migration_key`, `title`, `description`, `environment`, `commit_sha`
* Audit history displays `Date | Type | Migration | Description | User | Status` with immutable description — two-year survivability
* Dashboard cards derive from `gps_targets/dashboard-counts` + `swot_items` quadrant counts, not `nodes`
* All new components are standalone, OnPush, signals, `inject()`, `@if`/`@for`, lazy-loaded
* `php -l` clean for any new PHP (audit-list), `ng build` passes, no `*ngIf`/`*ngFor`, no `ALLOW_HTTP_MIGRATE`, `migration-audit-list` returns generic error (detailed logged server-side)

## Review — Commit `0c9e9eb` → `7e59bc4` (2026-08-31)

**Status: Strong localhost UI scaffold — NOT production-ready Sprint 006 completion yet.**

Findings closed in `7e59bc4`:

1. **[HIGH] Stale preview → FIXED** — `previewedCompanyIds` + `isPreviewCurrent()` + `onIdsChange()` + `hasPreviewErrors()` block; `canMigrate` now requires exact ID match and zero errors.
2. **[HIGH] Durable reporting → FIXED** — `migrations/2026-08-31b-patch-audit-reporting.sql` + `audit_migration()` canonical `operation_type`, `migration_key`, `title`, `description`, `environment`, `commit_sha`; Admin table now `Date|Type|Migration|Description|User|Status`; `migration-audit-list.php` returns new columns.
3. **[MEDIUM] Audit endpoint leak → FIXED** — `error_log` server-side, `500` generic client message.
4. **[MEDIUM] SA-only policy → FIXED** — `auth_is_migration_admin()` / `isSystemAdministrator()` / `migrationAdminGuard` — Coordinator cannot preview/migrate/audit; wording now consistent `System Administrator (Coordinator not permitted)`.

## Review — Commit `7e59bc4` (follow-up)

**High — computed() vs ngModel:** plain `companyIdsInput`/`confirmInput` broke `computed` tracking → fixed via `signal('11')`/`signal('')` + `[ngModel]="companyIdsInput()" (ngModelChange)="companyIdsInput.set($event)"`, `canMigrate`/`isPreviewCurrent` now correctly invalidate, stale `11→59` and missing confirm now disable Run.

**Medium — preview vs completed indistinguishable:** added `Action` column (`preview`/`migrate`) and mapped `Status` to `previewed`/`completed`/`failed` (`success+preview→previewed`, `success+migrate→completed`), `filteredAudits` computed with `showPreviews` toggle (default completed only) — table now `Date|Type|Migration|Action|Description|User|Status`.

**Small — env backfill:** patch now leaves `environment` as `NULL` for unknown historical rows instead of falsely `local`; new audits set `environment` via host detection (`localhost→local`, else `production`) and `commit_sha` via env/.git.

Remaining Sprint scope (still TODO for full 006 completion):

* Dashboard integration/cards (beyond grouped counts)
* Create/edit targets, add/reorder tasks, progress updates, source provenance UI
* SWOT-to-GPS link/unlink interface + navigation links
* Verified interactive/runtime flow via `ng serve` (build ≠ response envelope correctness) — test PHP `data` envelope shapes against services
* Production migration remains paused until runtime verification passes
