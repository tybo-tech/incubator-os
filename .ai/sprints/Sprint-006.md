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

### Phase 2 — Hierarchy UI (Company 11 demo) — **Operational UI done in Sprint 006 continuation (prototype-matched)**

- [x] Route `company/:id/swot-v2` — lazy-loaded `SwotHierarchyPage` (standalone, OnPush, signals, prototype `ios-*` styling) — quadrants Strength/Weakness/Opportunity/Threat, real counts 2/5/0/1=8, expand item → linked GPS targets with `list-by-swot-item`, provenance not faked
- [x] Route `company/:id/gps-targets-v2` — lazy-loaded `GpsHierarchyPage` (standalone, OnPush, signals, 2-col `ios-target-grid`) — grouped by `finance/strategy_general/sales_marketing/personal_development` 5/5/1/1=12, category headers with counts, source line per target
- [x] SWOT → GPS workflows: **Link existing** target (dropdown of unlinked company targets → `gps-target-sources/link.php` with `assertSameCompany` + `legacy_unlinked` cleanup), **Create & link** target (`gps-targets/create.php` + `link.php` sequential, correct `source_type='swot_item'`), **Unlink** with confirm (`unlink.php` by `id` or `gps_target_id+swot_item_id` — removes only `gps_target_sources` row, `DELETE` does not cascade to `gps_targets`), idempotent re-link, `legacy_unlinked` targets show “Legacy import — not linked to a SWOT item”
- [x] GPS target **create/edit** via `gps-targets/create.php`/`update.php` (Reactive-ish Forms, `withCredentials`, validation `description` required, `progress 0..100`, `category/priority/status` enums, `due_date`/`owner_label`/`progress_mode` handling, backend `generateTitle` fallback)
- [x] **Tasks** per target: `gps-target-tasks/list.php` (sorted `sort_order`), `create.php` (auto `nextSortOrder`), `update.php` (edit title / toggle `completed`↔`not_started` with `completed_at` handling, `recalcTaskProgress` backend-driven when `progress_mode='tasks'`), `reorder.php` (transactional `sort_order` update), `delete.php` (with `recalc`), inline add/edit/complete/↑↓/delete, `newTaskTitle` per target, `tasks()[id]` signals, refresh parent `manual_progress_percentage`/`status` via `getTarget`
- [x] **Progress updates** history: `gps-target-updates/history.php` (newest-first `recorded_at DESC`), `add.php` (validates `0..100`, `status` mapping, `note`, `recorded_by`, transactional `manual_progress` sync when `progress_mode='manual'`), inline add form per target (`progress/status/note`), `author`/`timestamp` display, backend error surfaced user-friendly, `dashboardCounts` refreshed after mutation
- [x] Shared prototype tokens: `ios-*` CSS variables (`--ios-navy/blue/purple/green/orange/red/line/canvas`), `ios-summary` 4 cards, `ios-swot` left-border per quadrant, `ios-target` purple left-border, `ios-progress` bar, `ios-tasks` dashed, responsive `@media 760px` 2→1 column, no new icon fonts, no redesign beyond prototype

### Phase 3 — Dashboard Cards (Operational Source) — **Done**

- [x] `src/app/features/normalized/dashboard-cards/dashboard-cards.component.ts` — `DashboardNormalizedCardsComponent` (standalone, OnPush, signals) — fetches `gps-targets/dashboard-counts.php` (`total/by_category/by_status/overdue/at_risk/due_30_days`) + `swot-analyses/list.php` + `swot-items/list.php` (quadrant breakdown), computes `swotTotal` 8, `gpsTotal` 12, `overdue/atRisk/due30`, `byCategory` finance/strategy_general etc., `avgProgress` (avg `manual_progress_percentage`), 4 cards grid with drill-down `routerLink` to `swot-v2`/`gps-targets-v2`, integrated into `CompanyOverviewComponent` above metrics (non-destructive, `companyIdNumber()` input)
- [x] `gps-targets-v2` retains `total` + `overdue`/`at_risk`/`due_this_month` via `dashboardCounts`; `swot-v2` retains quadrant counts + linked/active/overall summary

### Phase 4 — Admin → System Tools → Data Migration — **Hardened 2026-08-31 + wording cleanup 2026-08-31**

- [x] Route `admin/system-tools/data-migration` — lazy-loaded `DataMigrationPage`, `canActivate: [authGuard, migrationAdminGuard]` — **System Administrator only** (`auth_is_migration_admin` / `isSystemAdministrator()` strict; Coordinator/Director → `403 Forbidden — preview/migrate requires System Administrator`)
  - Company selector: comma-separated IDs → explicit `companyIds` array (default `[11]` locally, `[59,11]` for prod demo; never default to all)
  - `Preview migration` button → `POST preview` → renders summary: `nodes_seen/selected`, `analyses/items_created/skipped`, `targets_created/skipped/sources`, `duplicates_flagged` (expandable IDs), `errors/warnings`, `companies_processed`
  - **Stale-preview fix:** `previewedCompanyIds` saved; `canMigrate` requires exact match (sorted equality), `onIdsChange()` invalidates, `hasPreviewErrors()` blocks migrate — preview for `11` cannot be used to migrate `59`; `computed()` correctly invalidates via `signal()` for `companyIdsInput`/`confirmInput`
  - `Run migration` button disabled until preview success **for exact IDs, no errors, and exact phrase** → requires typed `MIGRATE_NORMALIZED_SWOT_GPS` → `POST migrate` → shows result + inline error handling
  - `clear` / `migrate-all` never shown (CLI-only, HTTP 403) — page notes `clear is CLI-only via normalized-migrate-cli.php`; `GET ?action=` → `405`, `migrate` without confirm → `400`, `401/403` → login/forbidden
  - **Durable reporting:** audit history table `Date | Type | Migration | Action | Description | User | Status` — reads `normalized_migration_audits` via `migration-audit-list.php` with `operation_type='data_migration'`, `migration_key='2026-08-31-normalized-swot-gps'`, `title='Normalize SWOT and GPS records'`, `description='Migrated legacy SWOT analyses and GPS targets from JSON nodes into normalized relational tables to support individual identities, relationships, tasks, progress tracking and dashboard reporting. Legacy nodes were retained as an archive.'`, `environment` host-based, `commit_sha` env/.git; **Wording cleanup:** toggle now “Include preview attempts” + “Showing migration runs; toggle to include dry-runs. Failed runs remain visible.” / “Showing migration runs including previews.” / “No migration runs yet — toggle ‘Include preview attempts’ to see dry-runs.” — `filteredAudits` `action==='migrate'` includes `failed` (important), preview rows `action==='preview'` map `Status` → `previewed`/`completed`/`failed` with `showPreviews` toggle defaulting to completed+failed runs
- [x] Backend `api-nodes/imports/normalized-migrate.php` — hardened: POST-only, SA-only `auth_is_migration_admin`, explicit `companyIds` required, `confirm` required, audit inserts canonical `operation_type/data_migration`, `migration_key`, `title`, `description`, `environment`, `commit_sha`, `ALLOW_HTTP_MIGRATE` removed, `clear`/`migrate-all` CLI-only 403
- [x] Backend `api-nodes/imports/migration-audit-list.php` — SA-only strict, generic 500 error (detailed logged server-side), returns durable columns, `operation_type/migration_key/title/description/environment/commit_sha`
- [x] Success criteria verified localhost 2026-08-31: `preview [11]` → `38/1` `0/0` `duplicates 1` → `migrate [11]` with `MIGRATE_NORMALIZED_SWOT_GPS` → `rolled_back:false` idempotent `0 created` → audit row `migrate` `completed` `data_migration` `2026-08-31-normalized-swot-gps` `local`; `ng serve` `http://localhost:55593/admin/system-tools/data-migration` stale `11→59` → Run disabled + amber “Preview is stale”, toggle “Include preview attempts” shows `previewed` + `completed`

### Phase 5 — Routing, Guards, Navigation — **Done**

- [x] `adminGuard` + `migrationAdminGuard` via `authGuard` + `auth_is_admin` / `auth_is_migration_admin` (`helpers/AuthGuard.php` + `auth.service.ts` `isSystemAdministrator()`) for `admin/tools` (admin) and `admin/system-tools/data-migration` (SA-only)
- [x] Routes `src/app/app.routes.ts`: `AppShell` children `admin/system-tools/data-migration` + `admin/tools`; `CompanyShell` children `company/:id/swot-v2` + `company/:id/gps-targets-v2` (lazy-loaded, `canActivate:[authGuard]`) — also `company/:id/overview` stays; removed duplicate top-level `company/:id/swot-v2` to keep shell header (same URL, now inside `CompanyShell`)
- [x] Nav links: `AppShell` sidebar → `Tools` → `System Tools — Data Migration` (SA-only, `ToolsDashboardPage` at `/admin/tools` with `Data Import` + `System Tools — Data Migration` cards); `CompanyShell` `companyTabs` now `Overview` → `SWOT Workspace` (`swot-v2`, `fas fa-layer-group`) → `GPS Targets` (`gps-targets-v2`, `fas fa-bullseye`) → `Assessment` → `SWOT (Legacy)` → `GPS (Legacy)` → `BEE Compliance` → `Financial Indicators` → `Coaching / Guide` … — `TabBarComponent` `maxVisible 7` + overflow, `isTabActive` checks `startsWith /company/:id/:route`, queryParams preserved via `ContextService`

### Phase 6 — Verification (Local, Company 11) — **Passed 2026-08-31 via `curl.exe` API + `ng serve` 55593**

- [x] `ng serve` `http://localhost:55593` login SA `mrnnmthembu@gmail.com` / `Test123!` (hash reset via `php password_hash`) → `company/11/swot-v2` shows **8 items** `strength 2 / weakness 5 / opportunity 0 / threat 1` via `swot_analyses/list.php?company_id=11` + `swot-items/list.php?swot_analysis_id=12`; expand → initially `0 linked` (all `legacy_unlinked` 12) — prototype `ios-swot` open/close, `ios-summary` 8/0/0/~%
- [x] `company/11/gps-targets-v2` shows **12 targets** `finance 5 / strategy_general 5 / sales_marketing 1 / personal_development 1` via `gps-targets/grouped.php` + `dashboard-counts.php` `total 12 overdue 11 at_risk 0 due_30_days`; 12 sources all `legacy_unlinked` initially, tasks/updates empty
- [x] Link one SWOT `weakness #46 Cash flow` → GPS `target #46 Remove existing partner` via `gps-target-sources/link.php` (`assertSameCompany`, `legacy_unlinked` row removed) → `list-by-swot-item.php?swot_item_id=46` `1` + `list-by-target.php?gps_target_id=46` `source_type='swot_item'` `swot_description='Cash flow'` — provenance appears on both screens (`From SWOT weakness: Cash flow` vs `Legacy import — not linked`)
- [x] Refresh `list-by-swot-item`/`list-by-target` → relationship persists (second GET same)
- [x] Unlink via `unlink.php?id=49` → `list-by-swot-item` `0`, `gps-targets/get.php?id=46` still exists `id 46` — unlink removes only `gps_target_sources` row, not `gps_targets`
- [x] Re-link for task flow, set `gps-targets/update.php` `progress_mode='tasks'`, `gps-target-tasks/create.php` `QA task 1` + `QA task 2` → `list.php` `2` ordered `1,2`, `reorder.php` `ordered_ids=[2,1]` → `2,1` persisted, `update.php id=1 status='completed'` → `gps-targets/get.php` `manual_progress_percentage 50` `status in_progress` backend-driven `recalcTaskProgress` (1/2), `update.php` `progress_mode='manual'` + `gps-target-updates/add.php` `75% in_progress QA update 75%` → `history.php` `1` newest `75%` author/timestamp, `dashboard-counts` refreshed `total 12 in_progress 3`
- [x] Dashboard cards `CompanyOverview` `DashboardNormalizedCardsComponent` reflect `swot_items:8` `S2 W5 O0 T1`, `gps_targets:12` `Fin5 Strat5 SM1 PD1`, `overdue 11 at_risk 0 due30`, `avgProgress` via `listTargets` avg, links to `swot-v2`/`gps-targets-v2` drill-down
- [x] `admin/system-tools/data-migration` → `preview [11]` `38/1 0/0` `duplicates 1 Co11 38→1964` → `migrate [11]` with `MIGRATE_NORMALIZED_SWOT_GPS` → `analyses_created:0` idempotent `rolled_back:false` → audit row `migrate` `completed` `data_migration` `2026-08-31-normalized-swot-gps` `Normalize SWOT and GPS records` `local`
- [x] `nodes` **2400 before / 2400 after** `SELECT COUNT(*) FROM nodes` via `podman exec ... mysql` — `nodes` untouched as archive (legacy `nodes` never written to; selects use `resolveCompanyId` fallback `nodes.company_id>0 ? col : CAST(data->>'$.company_id')`)
- [x] No `ALLOW_HTTP_MIGRATE`; `GET ?action=` → `405` (tested earlier), `POST` without SA → `403 Forbidden — preview/migrate requires System Administrator (Coordinator not permitted)` (Director `fezimshengu@gmail.com` blocked for `preview`), `migrate` without confirm → `400`, `swot-analyses/list.php?company_id=99` as Director 11 → `403 Forbidden — you do not have access to this company` (company isolation via `auth_require_company_access` / `auth_enforce_request` + `assertSameCompany` for link), `Director` can still `list.php?company_id=11`
- [x] Previous SA flows still green: `ng build` passes (warnings only), `php -l` clean for `GpsTarget.php` `GpsTargetSource.php` `GpsTargetTask.php` `GpsTargetUpdate.php` `AuthGuard.php` `create.php` etc., no `*ngIf`/`*ngFor`, `CompanyShell` tabs `SWOT Workspace`/`GPS Targets` navigate, `Tools` → `Data Migration` wording “Include preview attempts” / “Showing migration runs…” verified; cleanup: deleted QA tasks `1,2`, unlinked `46`, reset `manual 0 not_started` to restore 12 `legacy_unlinked` baseline

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

## Review — Sprint 006 continuation (2026-08-31 — prototype operational UI + full QA)

**Scope closed:**

* **Prototype fidelity:** `docs/designs/swot-gps-hierarchy-prototype/swot-gps-prototype` `index.html`/`styles.css`/`app.js` mapped to `ios-*` tokens (`--ios-navy/blue/purple/green/orange/red/line/canvas`), `ios-summary` 4, `ios-swot` left-border `strength green / weakness red / opportunity blue / threat orange`, `ios-target` purple, `ios-progress`, `ios-tasks` dashed, `ios-target-grid` 2-col → 1-col `@media 760px`, `ios-heading`/`legend`/`kicker`/`badge`/`priority` preserved; no redesign, no new deps, `ChangeDetectionStrategy.OnPush` + `signals` + `computed` + `inject()` + `@if`/`@for` + `FormsModule` + `standalone` + `withCredentials`
* **Services expanded:** `GpsService` now `getTarget/createTarget/updateTarget/deleteTarget/link/unlink/unlinkByTargetAndSwot/tasks/createTask/updateTask/deleteTask/reorderTasks/updates/addUpdate` (+ `swot_description`/`swot_category`/`owner_label`/`recorded_by` optional interface fields); existing 33 endpoints reused, no new endpoint needed (all ops via `gps-targets/*`, `gps-target-sources/*`, `gps-target-tasks/*`, `gps-target-updates/*`)
* **Security:** every read/mutation `auth_require_user` + `auth_enforce_request` (merges `GET+JSON` for `company_id/gps_target_id/swot_*`) + `auth_require_target_access`/`auth_require_swot_*_access` + `assertSameCompany` (link) + `transactions` for `reorder`/`addUpdate`/`recalcTaskProgress`; `company_id` never trusted from browser alone; `php -l` clean; stable `400` with `error` JSON, server `error_log` not leaked
* **QA:** `2400 → 2400` nodes, `swot-v2` 8 `gps-targets-v2` 12, link/unlink/provenance, tasks add/reorder/complete 50%, update 75% newest-first, dashboard refresh, isolation `403` for cross-company + migration SA-only, wording “Include preview attempts” / “Showing migration runs…” verified; `ng build` pass, `ng serve http://localhost:55593` + `curl.exe` API sweep `qa2.ps1` all 16 steps pass, cleanup restores `legacy_unlinked` baseline; production migration **remains paused** until explicit go-ahead
