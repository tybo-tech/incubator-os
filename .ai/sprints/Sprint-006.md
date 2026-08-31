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
podman exec incubator-os-container php /var/www/html/api-nodes/imports/normalized-migrate-cli.php --action=migrate --companyIds=11
# verify: 1 analysis, 8 items, 12 targets, 12 sources
```

Do NOT run production migration yet.

## Tasks

### Phase 1 — Services (Angular 19, standalone, signals, inject(), OnPush)

- [ ] `src/services/normalized/swot.service.ts` — `SwotAnalysis`, `SwotItem` typed interfaces; methods: `listAnalyses(companyId)`, `getCurrent(companyId)`, `listItems(analysisId|companyId, quadrant?)`, `countsByQuadrant(companyId)`, `setCurrent(analysisId)`, `create/update/delete` (admin/coach)
- [ ] `src/services/normalized/gps.service.ts` — `GpsTarget`, `GpsTargetSource`, `GpsTargetTask`, `GpsTargetUpdate` interfaces; methods: `listTargets(companyId)`, `groupedByCategory(companyId)`, `dashboardCounts(companyId)`, `listBySwotItem(swotItemId)`, `listByTarget(targetId)`, `link/unlink`, `tasks` CRUD + `reorder`, `updates` history/latest, `metrics` attach/detach (read-only for 006)
- [ ] `src/services/normalized/migration.service.ts` — `preview(companyIds)`, `migrate(companyIds, confirm)`, `getAuditHistory(limit, offset)`, `getCounts()`. Wraps `POST /api-nodes/imports/normalized-migrate.php` with `ApiBase` + `withCredentials`. Handles `401/403` → redirect to login.
- [ ] Extend `src/services/service.ts` if needed for `isLocalApi` correctness (already fixed: `hostname==='localhost'`)

### Phase 2 — Hierarchy UI (Company 11 demo)

- [ ] Route `company/:id/swot-v2` (or feature-flag `?v=normalized` on existing `swot`) — lazy-loaded `SwotHierarchyPageComponent` (standalone, OnPush, signals)
  - Load `currentAnalysis` + `items` grouped by `category` (strength/weakness/opportunity/threat) — 4 quadrants
  - Each `swot_item` row: description, impact/priority/status, `recommended_response`, `owner_label`, `target_date`; expand → linked `gps_targets` via `gps_target_sources/list-by-swot-item`
  - Linked target card shows `category`, `title`, `status`, `due_date`, `progress_mode`, `manual_progress_percentage`, tasks count, last update; click → GPS detail
  - Empty states per quadrant via `app-empty-state`, loading via signals
- [ ] Route `company/:id/gps-targets-v2` — lazy-loaded `GpsTargetsHierarchyPageComponent`
  - Grouped by `category` (finance, strategy_general, sales_marketing, personal_development) — matches `gps_targets/grouped.php`
  - Each target: collapsible tasks (`gps_target_tasks/list`), updates timeline (`gps_target_updates/history`), metrics chips (read-only), source provenance (`legacy_unlinked` vs `swot_item` link)
  - Actions: create/edit target, add task, add update, link/unlink SWOT source (admin/coach)
  - Uses `swot_items` lookup for link picker (company-scoped)
- [ ] Shared: `app-card`, `app-stat-card`, `app-page-header`, `app-section`, `app-empty-state` (already present) — no new icon fonts; use `app-icon` map

### Phase 3 — Dashboard Cards (Operational Source)

- [ ] `src/components/company-shell/pages/dashboard` or `company/:id/overview` enhancement — `DashboardNormalizedCardsComponent` (or extend `ReportsOverviewComponent`)
  - Calls `gps/dashbaord-counts?company_id=11` and `swot_items counts` → cards: `Total SWOT items by quadrant`, `GPS by category`, `Overdue`, `At-risk`, `Due this month`, `Completed %`, `No update since X`
  - Drill-down links to hierarchy pages with filters
  - Data comes from normalized tables only, not `nodes`

### Phase 4 — Admin → System Tools → Data Migration

- [ ] Route `admin/system-tools/data-migration` — lazy-loaded `DataMigrationPageComponent`, `canActivate: [authGuard, adminGuard]` (System Administrator/Coordinator only)
  - Company selector: multi-select or comma-separated IDs → explicit `companyIds` array (default `[11]` locally, `[59,11]` for prod demo; never default to all)
  - `Preview migration` button → `POST preview` → renders summary: `nodes_seen/selected`, `analyses/items_created/skipped`, `targets_created/skipped/sources`, `duplicates_flagged` (expandable IDs), `errors/warnings`, `companies_processed`
  - `Run migration` button disabled until preview success → enabled + requires typed `MIGRATE_NORMALIZED_SWOT_GPS` in text input → `POST migrate` → shows result + inline error handling
  - `clear` / `migrate-all` never shown (CLI-only) — page notes `clear is CLI-only via normalized-migrate-cli.php`
  - Audit history table: `GET` via `counts` audit? Actually read `normalized_migration_audits` via new endpoint `api-nodes/imports/migration-audit-list.php` (or reuse `counts` + direct query) — columns: timestamp, user (email/role), action, companyIds, status, counts, errors; paginated, filtered by company
  - Handles `401/403` → login/forbidden message; shows `GET not allowed` hint if mis-used
- [ ] Backend for audit list (if not already): `api-nodes/imports/migration-audit-list.php` — `System Administrator` only, `POST` or `GET` with pagination, reads `normalized_migration_audits` ordered by `created_at DESC`
- [ ] Success criteria: Admin can run full local flow `preview [11]` → verify `8/12` → `migrate [11]` → audit row appears → hierarchy pages immediately reflect new data without refresh (signals)

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
* Admin migration screen is System Administrator only, POST-only, requires explicit `companyIds` + typed confirm, and audit-logs every run to `normalized_migration_audits`
* Dashboard cards derive from `gps_targets/dashboard-counts` + `swot_items` quadrant counts, not `nodes`
* All new components are standalone, OnPush, signals, `inject()`, `@if`/`@for`, lazy-loaded
* `php -l` clean for any new PHP (audit-list), `ng build` passes, no `*ngIf`/`*ngFor`, no `ALLOW_HTTP_MIGRATE`
