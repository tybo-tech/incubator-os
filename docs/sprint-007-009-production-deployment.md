# Incubator OS - Sprint 007/008/009 Production Deployment Package

**Status: PREPARED AND VERIFIED LOCALLY - NOT DEPLOYED.**
No production action has been taken or authorised. Deployment halts at a hard hold-point until the
returned preflight evidence (Phase 3) has been reviewed.

| Field | Value |
|---|---|
| Repository | `incubator-os` |
| Branch | `main` |
| Prepared at HEAD | `2732e3b` |
| Sprint 007 backend completion | `2fa0052` |
| Sprint 008 calendar persistence | `6420d11` |
| Sprint 009 sessions | `2732e3b` |
| Production site | `https://app.rbttacesd.co.za` |
| Production API base | `https://app.rbttacesd.co.za/api/` |
| Production database | `rbttaces_api` |
| Server root folder | `/app.rbttacesd.co.za` |
| Local reference DB | `incubator_os` (MySQL 8.0.43) |

> This document describes a manual procedure for a human operator using phpMyAdmin (SQL) and FileZilla
> (files). It contains no production credentials and no commands that read protected files
> (`php.ini`, `.htaccess`, `.env`, logs, server config). If a production value is required, a safe
> read-only query or checklist is provided instead.

---

## 1. What is being deployed

Three sequential sprints, delivered together because Session (009) depends on Calendar (008), which
depends on nothing new, and Results/Achievements (007) is an independent earlier layer.

| Sprint | Feature | Backend | Frontend | Migration |
|---|---|---|---|---|
| 007 | Results & Achievements | `api-nodes/achievements`, `achievement-evidence`, `metric-type-accounts`, `gps-targets/*`, models, `TargetMeasurementService` | Results page, target popup, financial target entry | `2026-09-15-results-achievements.sql`, `2026-09-16-achievements-snapshot-guard.sql` |
| 008 | Calendar | `capabilities/calendar/**`, `api/calendar/**` | Calendar month + agenda, event modal | `2026-09-19-calendar-events.sql` |
| 009 | Sessions | `capabilities/sessions/**`, `api/sessions/**`, calendar guard additions | Sessions page + workspace, schedule modal, calendar session indicator | `2026-09-23-sessions.sql` |

**Do not assume Sprint 007 is already deployed.** The preflight (section 3) classifies each migration as
MISSING / PARTIAL / PRESENT / PRESENT BUT INVALID and the procedure branches on that result.

---

## 2. Dependency chain

### 2.1 Migration dependencies (locked order)

```
1. 2026-09-15-results-achievements.sql        (Sprint 007)  - independent
2. 2026-09-16-achievements-snapshot-guard.sql (Sprint 007)  - REQUIRES achievement_evidence (run 1)
3. 2026-09-19-calendar-events.sql             (Sprint 008)  - independent
4. 2026-09-23-sessions.sql                    (Sprint 009)  - REQUIRES companies + calendar_events (run 3)
```

Verified by SQL inspection:

| Claim | Evidence |
|---|---|
| Each migration is idempotent | `IF NOT EXISTS` on every CREATE; column adds guarded via `information_schema`; index guard via `information_schema.STATISTICS`; seeds via `ON DUPLICATE KEY UPDATE` |
| Re-running is safe | All four re-run locally with exit 0 and no error (repeated, including a third pass) |
| Later migrations reference only earlier structures | 007b targets `achievement_evidence` (from 007a); 009 FKs reference `companies` (pre-existing) and `calendar_events` (from 008) |
| Calendar must exist before Sessions | `fk_sessions_event` references `calendar_events`; preflight Section C makes this an explicit STOP if violated |
| Snapshot guard present before evidence is exercised | `uq_evidence_metric_snapshot` is created by 007b, which the procedure runs immediately after 007a and verifies before any achievement verification smoke test |
| No migration silently modifies unrelated structures | 007a adds 9 columns to the **existing** `gps_target_metrics` (guarded, additive, nullable) - the only touch of a pre-existing table; no other pre-existing table is altered |
| Rollback is reverse dependency order | Stated in each file header; summarised in section 7 |

### 2.2 MySQL version requirements

| Feature used | Minimum version | Local verified |
|---|---|---|
| Functional (expression) unique index `uq_evidence_metric_snapshot` | 8.0.13 | 8.0.43 âœ… |
| `CHECK` constraint `chk_cal_time_shape` | 8.0.16 | 8.0.43 âœ… |
| Generated stored columns (`account_id_key`, `dedupe_key`) | 5.7 | 8.0.43 âœ… |
| `JSON` columns (`snapshot_json`, `payload`) | 5.7 | 8.0.43 âœ… |
| Functional index over a FK column (InnoDB workaround) | 8.0.13 | 8.0.43 âœ… |

**Hard stop if production MySQL < 8.0.16.** The preflight (Section A) reports `VERSION()`; confirm it is
8.0.16 or newer before applying anything.

### 2.3 Backend code dependencies (deploy order)

The capability endpoints include their dependencies explicitly (`include_once`), so the order below is
for safe progressive upload, not strict runtime linkage. Uploading in this order keeps each layer's
dependencies on disk before its consumers.

```
Layer 1  Contracts / domain value objects   (18 files)  - no dependencies
Layer 2  Repositories & models              (11 files)  - depend on Layer 1
Layer 3  Policies, services & helpers       (10 files)  - depend on Layers 1-2
Layer 4  Application (commands & queries)   (22 files)  - depend on Layers 1-3
Layer 5  Feature manifests                  (2 files)   - documentation
Layer 6  Endpoint bootstrap & wiring        (23 files)  - depend on Layers 1-4
Layer 7  Public PHP endpoints               (31 files)  - depend on Layers 1-6
```

Full per-file list with SHA-256: [`backend-manifest-sha256.md`](backend-manifest-sha256.md).

### 2.4 Frontend dependencies

Angular is a compiled SPA. It must be deployed **after** the backend and **after** the migrations pass,
because the Calendar and Sessions screens call the new endpoints immediately. See
[`angular-manifest-sha256.md`](angular-manifest-sha256.md).

---

## 3. Read-only production preflight

**Primary file (use this one):** [`preflight-summary-readonly.sql`](deployment/preflight-summary-readonly.sql)
**Full-detail file:** [`preflight-readonly.sql`](deployment/preflight-readonly.sql)

> **phpMyAdmin shows only the last statement's result grid in the SQL tab.** If you paste a
> multi-statement script you may see nothing. `preflight-summary-readonly.sql` is therefore a
> **single `UNION ALL` statement** that always renders one grid (`section | item | value`), with a
> final `J. VERDICT` block that gives the action per migration. Use it.
> The full-detail file is for operators who can run each statement separately.

Run it in phpMyAdmin against `rbttaces_api` **before any change**. It is entirely read-only and
self-guarded (reads of not-yet-created tables degrade to a "missing" note instead of erroring).

It reports, in order:

| Section | Reports |
|---|---|
| A | Database name, MySQL version, sql_mode, storage engine |
| B | **Classification matrix** for 007a / 007b / 008 / 009 |
| C | Explicit calendar-before-sessions dependency verdict |
| D | Prerequisite table row counts (companies, users, gps_*, metric_types, accounts, stats, nodes) |
| E | Sprint 007 readiness: unresolved rows, export-account coverage, seeded bindings, revenue measure defs |
| F | Existing row counts in the new tables (0 expected on first deploy) |
| G | Collision scan: non-InnoDB or foreign objects using canonical names |
| H | The 9 additive `gps_target_metrics` measurement columns |

### 3.1 Classification meaning

| Classification | Meaning | Action |
|---|---|---|
| `MISSING` | No objects from that migration exist | Safe to apply that migration |
| `PRESENT` | All expected objects exist and match | Skip it (re-running is harmless but unnecessary) |
| `PARTIAL - STOP` | Some objects exist | **HARD STOP.** Do not import blindly; reconcile manually |
| `PRESENT BUT INVALID - STOP` | All tables exist but structure differs | **HARD STOP.** Investigate drift |

### 3.2 Expected classifications

| Production state | 007a | 007b | 008 | 009 |
|---|---|---|---|---|
| Untouched (pre-007) | MISSING | MISSING (blocked) | MISSING | MISSING |
| 007 already deployed | PRESENT | PRESENT | MISSING | MISSING |
| Fully current | PRESENT | PRESENT | PRESENT | PRESENT |

### 3.2a DRY RUN against a copy of the production data (local)

Before the live preflight, the operator exported the production database
(`rbttaces_api (14).sql`, MySQL 8.0.46) and it was inspected **locally in throwaway scratch
databases** - no production server was contacted. Migrations **008 and 009 were applied to the
scratch copy**, succeeded with exit 0, were idempotent on the second run, and every post-migration
integrity invariant returned **0**. This proved the two pending migrations are safe against the real
production data shapes before touching production.

### 3.2b LIVE PREFLIGHT RESULT (operator, phpMyAdmin, 2026-09-23) - the binding record

The operator ran [`preflight-summary-readonly.sql`](deployment/preflight-summary-readonly.sql)
against **production `rbttaces_api`** in phpMyAdmin. It returned 39 rows, one grid. The decisive rows:

| Section | Item | Value |
|---|---|---|
| A. ENVIRONMENT | database | `rbttaces_api` |
| A. ENVIRONMENT | mysql_version | `8.0.46-cll-lve` |
| A. ENVIRONMENT | mysql_8_0_16_ok | **YES** |
| B. 007a RESULTS/ACHIEVEMENTS | status | **PRESENT - skip 007a** |
| C. 007b SNAPSHOT GUARD | status | **PRESENT - skip 007b** |
| D. 008 CALENDAR | status | **MISSING - safe to apply 008** |
| E. 009 SESSIONS | status | **MISSING - safe to apply 009 (AFTER 008)** |
| E. 009 SESSIONS | calendar_before_sessions | **OK** |
| F. PREREQUISITES | companies / users / gps_targets / metric_types / company_accounts / company_financial_yearly_stats | 131 / 106 / 63 / 20 / 91 / 173 |
| G. 007 READINESS | unresolved_account_rows | **100** |
| G. 007 READINESS | companies_with_unresolved_rows | **62** |
| G. 007 READINESS | export_account_rows | **0** |
| G. 007 READINESS | companies_with_export_accounts | **0** |
| H. EXISTING NEW-TABLE DATA | achievements | **0** |
| H. EXISTING NEW-TABLE DATA | achievement_evidence | **0** |
| H. EXISTING NEW-TABLE DATA | metric_type_accounts | 5 |
| H. EXISTING NEW-TABLE DATA | calendar_events / sessions | **-1 (do not exist)** |
| I. COLLISIONS | non_innodb_or_non_table_objects | **0** |
| J. VERDICT | any_partial_blocker | **NO** |

**Verdict accepted.** The live grid matches the export inspection exactly, with one benign drift:

> **Drift noted:** the export showed `achievements` = 1 (company 120, `unverified`, no evidence);
> the live preflight shows **0**. The single unverified achievement was removed between export and
> preflight (normal application use). It had **no verified snapshot**, so this changes nothing:
> there is still **no verified achievement or evidence in production**. Rollback of 007 remains clean.

**Result: the hold-point is cleared for the approved actions below - but nothing has been executed.**
No migration has been applied to production and no file has been uploaded. Execution is the manual
operator step (section 4).

> **Approved actions:** apply `008` then `009` (run order #20, #21). **Skip** `007a` and `007b`
> (already PRESENT). Proceed to backend upload only after both migrations verify.

> **Do not rely on the historical record.** The 007 tables were counted live here; the historical
> record is only corroboration.

### 3.3 Sprint 007 known production limitations to carry forward (measure, do not assume)

* Historically ~**105** rows in `company_financial_yearly_stats` had `account_id IS NULL` (unresolved).
* Revenue is **not authoritative** where a company lacks `export_revenue` accounts; combined
  `REVENUE_TOTAL` is `partial_coverage` for those companies. Nothing is repaired or backfilled.
* These figures were measured on the **local** reference dataset. Section E measures the **production**
  values; record the live numbers and treat any drift as expected, not an error.

### 3.4 Hard hold-point

> **No migration and no file may be deployed until the returned preflight grids are reviewed.**
> If any migration is `PARTIAL - STOP` or `PRESENT BUT INVALID - STOP`, stop and report.

---

## 4. Deployment procedure (manual, ordered)

> Steps 1-6 are read-only/backup. Steps 7+ change production. Do not skip the hold-point.

### Step 1 - Confirm maintenance window
- Notify users; confirm no active data entry. Note the start time.

### Step 2 - Back up the database
- phpMyAdmin â†’ `rbttaces_api` â†’ Export â†’ SQL â†’ save `rbttaces_api-pre-007009-<date>.sql`.
- Confirm the file exists and is non-trivial in size; confirm it is restorable (open the first lines).

### Step 3 - Back up every production file that will be replaced or deleted
- Download the current production backend folders that will change:
  `api/api-nodes/` (the touched subfolders), `api/models/`, `api/services/`, `api/helpers/`,
  and the whole `api/capabilities/` (if present), `api/api/`.
- Download the current Angular doc root (`index.html` + `main-*.js` + `styles-*.css` + `chunk-*.js`).
- Store these backups **outside** the web root.

### Step 4 - Record the current production state
- Record the current `index.html` and `main-*.js` filenames from the live site (view-source or network tab).
- Record the preflight output (section 3) verbatim.

### Step 5 - Run the read-only preflight
- Run [`preflight-summary-readonly.sql`](deployment/preflight-summary-readonly.sql) in phpMyAdmin
  (one grid; the `J. VERDICT` rows give the action per migration).
- Save the grid.

### Step 6 - Decide (HARD HOLD-POINT)
- If MySQL version < 8.0.16 â†’ **STOP.**
- If any migration is `PARTIAL - STOP` or `PRESENT BUT INVALID - STOP` â†’ **STOP** and report.
- If Section C is `VIOLATED` â†’ **STOP.**
- Otherwise continue with the migrations classified `MISSING`, in locked order.

### Step 7 - Apply only the missing migrations, in locked order
**For the confirmed production state (section 3.2b), the required actions are exactly:**

```
1. 2026-09-15-results-achievements.sql         -> SKIP (007a already PRESENT)
2. 2026-09-16-achievements-snapshot-guard.sql  -> SKIP (007b already PRESENT)
3. 2026-09-19-calendar-events.sql              -> APPLY  (run order #20)
4. 2026-09-23-sessions.sql                     -> APPLY  (run order #21, only after #20 PRESENT)
```

In phpMyAdmin: select `rbttaces_api`, SQL tab, paste the migration file, Go. Do one at a time.

> **Expected phpMyAdmin output for a migration:** the DDL statements each report *"MySQL returned an
> empty result set (i.e. zero rows)"* - that is **normal and correct** for `CREATE TABLE` / `SET`
> statements. A benign warning *"#1681 Integer display width is deprecated"* may also appear on
> MySQL 8; it is informational, not an error. Only a red `#NNNN` error matters.

### Step 8 - Verify each migration before continuing

Run the integrity checker **for the stage you are at** (both are single-grid `UNION ALL` files; every
`(expect 0)` row must be 0, every `(expect 1)` row must be 1):

| After applying | Run this file | Why |
|---|---|---|
| **008** (calendar), before 009 | [`post-008-integrity-summary.sql`](deployment/post-008-integrity-summary.sql) | The full checker reads the session tables, which 009 has not created yet - it would fail with `#1146`. Stage 1 checks only the 007 + 008 objects. |
| **009** (sessions), after both | [`post-migration-integrity-summary.sql`](deployment/post-migration-integrity-summary.sql) | Adds the session structure + invariants. |

Do not proceed to the next migration until the current stage verifies. You can also re-run
[`preflight-summary-readonly.sql`](deployment/preflight-summary-readonly.sql) - the applied migration
must now read `PRESENT`.

### Step 9 - Upload backend files in dependency order
Using FileZilla, upload the files in [`backend-manifest-sha256.md`](backend-manifest-sha256.md) in
Layer 1 â†’ Layer 7 order, into the production `/api/` folder (see path mapping in section 5).

**Must NOT be overwritten** (production-specific settings differ from local). This is the documented
never-upload list and **none of these appear in the manifest** - confirm before any bulk upload:

```
api/config/Database.php
api/config/headers.php
api/common/common.php
api/models/User.php
api/api-nodes/imports/index.php
api/api-nodes/imports/read-json.php
api/api-nodes/imports/normalizers.php
api/api-nodes/imports/*.json
```

Also never upload: local `.env` files (none exist in this repo), server logs (`error_log`), temp/backup
files (`*.bak`, `*.tmp`), IDE folders (`.idea/`, `.vscode/` except the shared JSON), local upload/storage
folders, container-only configuration (`docker-compose.yml`, `Dockerfile`) unless explicitly required, and
the test harness (`api/tests/*.ps1`).

### Step 10 - Run safe authentication and authorization smoke tests
Run the Authentication + isolation checks from [`smoke-tests.md`](smoke-tests.md). Do not deploy the
frontend until they pass.

### Step 11 - Deploy the Angular build last
Build locally, then upload the contents of `dist/nodes/browser/` per
[`angular-manifest-sha256.md`](angular-manifest-sha256.md) into the Angular doc root.

### Step 12 - Clear only safe caches
- Hard-refresh the browser (Ctrl+F5). If a CDN/host cache fronts the site, purge only the static app
  paths. Do not clear database or server caches you cannot identify.

### Step 13 - Post-deployment verification
Run the full [`smoke-tests.md`](smoke-tests.md) checklist and the integrity SQL.

### Step 14 - Record evidence and final status
- Save the post-migration integrity output, the smoke-test results, and the deployed `main-*.js` hash.
- Update `.ai/sessions/` with the deployment session and record the final SHA.

---

## 5. FileZilla upload manifest (exact)

**Production upload root for backend: the existing `/api/` folder.**

Path mapping (verified against the deployed capability features `api/company`, `api/financial-indicators`):

| Repository | Production | Example |
|---|---|---|
| `api-incubator-os/api/...` | `/api/api/...` | `api-incubator-os/api/sessions/queries/list.php` â†’ `/api/api/sessions/queries/list.php` |
| `api-incubator-os/capabilities/...` | `/api/capabilities/...` | `.../capabilities/sessions/Services/...` â†’ `/api/capabilities/sessions/Services/...` |
| `api-incubator-os/api-nodes/...` | `/api/api-nodes/...` | `.../api-nodes/achievements/create.php` â†’ `/api/api-nodes/achievements/create.php` |
| `api-incubator-os/models/`, `services/`, `helpers/` | `/api/models/`, `/api/services/`, `/api/helpers/` | |

> **Preventing accidental `/api/api/` nesting:** the double `api` is correct **only** for repository paths
> that already contain `api/`. Never create `/api/api/` as a *new folder for the whole repo*, and never
> upload the `api-incubator-os` folder itself. Navigate INTO `/api/` and upload `capabilities/`, `api/`,
> `api-nodes/`, `models/`, `services/`, `helpers/` as subfolders. Uploading `api-incubator-os` into `/api/`
> would create `/api/api-incubator-os/` and break every include path and every frontend URL.

The exact repositoryâ†’destination pairs, with per-file SHA-256, are in
[`backend-manifest-sha256.md`](backend-manifest-sha256.md).

### 5.1 Deletions (only after consumer proof)
Two files are deleted in Sprint 007:
- `api-incubator-os/models/MetricRecord.php` â†’ `/api/models/MetricRecord.php`
- `api-incubator-os/api-nodes/enhanced-metrics.php` â†’ `/api/api-nodes/enhanced-metrics.php`

**Consumer search (performed, no executable consumer found):** `MetricRecord` was dead, schema-incompatible
code whose only instantiator was `enhanced-metrics.php`, which had zero references from `src/`. Remaining
hits are documentation and an unrelated TypeScript interface `IMetricRecord` (the live `metric_records`
`q1â€¦q4` shape). **Delete these two production files only after confirming the same with a fresh search on
the deployed tree.** Deletion is optional for correctness (they are unreachable), so if unsure, leave them.

---

## 6. Safe smoke tests

See [`smoke-tests.md`](smoke-tests.md). Uses normal application functionality only; creates clearly
identifiable disposable records and documents safe cleanup. No immutable proof record is destroyed.

---

## 7. Rollback strategy

See [`rollback-matrix.md`](rollback-matrix.md). Summary of the critical rule:

> **Do not casually drop Calendar, Session, Achievement, or Evidence tables once production users have
> written data.** Prefer restoring backed-up files, restoring the previous frontend bundle, disabling
> affected navigation, keeping forward-compatible additive tables in place, and forward-fixing. Dropping
> tables is permitted only before live writes or through an explicitly approved database restore.
> **Verified Achievement snapshots must never be silently destroyed or mutated.**

Rollback source of truth is the Step 2/3 backups plus the previous commit `34a0dd5` (pre-008/009) and
`2fa0052` (pre-008/009, post-007) in Git.

---

## 8. Hard-stop conditions

Stop immediately and report if any of these occur:

| # | Condition |
|---|---|
| 1 | Schema mismatch: any migration reads `PARTIAL - STOP` or `PRESENT BUT INVALID - STOP` |
| 2 | Authentication failure: authenticated requests unexpectedly return 401, or unauthenticated requests return 200 |
| 3 | Company/tenant isolation failure: a user sees or writes another company's data |
| 4 | Missing dependency: a backend endpoint returns a PHP include/fatal error |
| 5 | Unexpected migration row changes: a supposedly additive migration changes existing row counts |
| 6 | Generic 500 responses on any deployed endpoint |
| 7 | SQL or exception details exposed to clients (raw SQLSTATE / stack trace in the response body) |
| 8 | Broken Results/Achievement flows (existing Results screen fails to load) |
| 9 | Calendar timezone/date shifting (an all-day event moves a day, or a timed event shifts zone) |
| 10 | Session/calendar atomicity failure (a Session created without its event, or an orphan event) |

---

## 9. Deliverables in this package

| Deliverable | Path |
|---|---|
| This deployment document | `docs/sprint-007-009-production-deployment.md` |
| Read-only preflight SQL (single grid) | `docs/deployment/preflight-summary-readonly.sql` |
| Read-only preflight SQL (full detail) | `docs/deployment/preflight-readonly.sql` |
| Post-migration integrity SQL - stage 1 (after 008) | `docs/deployment/post-008-integrity-summary.sql` |
| Post-migration integrity SQL - stage 2 (after 009, single grid) | `docs/deployment/post-migration-integrity-summary.sql` |
| Post-migration integrity SQL (full detail) | `docs/deployment/post-migration-integrity.sql` |
| Backend SHA-256 manifest | `docs/deployment/backend-manifest-sha256.md` |
| Angular SHA-256 manifest | `docs/deployment/angular-manifest-sha256.md` |
| Smoke-test checklist | `docs/deployment/smoke-tests.md` |
| Rollback matrix | `docs/deployment/rollback-matrix.md` |

---

## 10. Local verification performed (before commit)

| Check | Result |
|---|---|
| PHP lint, all deployable backend files | 103/103 clean |
| Migrations idempotent (all four, re-run) | exit 0, no error |
| Preflight SQL (migrated DB) | classifies all four `PRESENT`; no SQL errors |
| Preflight SQL (fresh pre-007 DB) | classifies all four `MISSING`; no SQL errors |
| Integrity SQL | runs clean; all invariants 0 rows on local |
| `Sessions.ps1` | 105/105 |
| `CalendarEvents.ps1` | 65/65 |
| Calendar + Session unit tests | 20/20 |
| Production Angular build | clean, no budget warnings |
| Known unrelated Angular failures | 9 (documented baseline - left untouched) |

> The 9 unrelated baseline Angular failures (AppComponent, AppShell, Nav, Companies, and the 5 chart
> components - all standalone components declared in `declarations` instead of imported) pre-date these
> sprints and are **not** repaired. They do not affect the production build, which compiles clean.

---

## 11. Production hold-point status

**Preflight: RECEIVED AND ACCEPTED (2026-09-23).** See section 3.2b. Verdict: `any_partial_blocker = NO`.

| Migration | Decision |
|---|---|
| 007a `results-achievements` | **SKIP** (already PRESENT) |
| 007b `achievements-snapshot-guard` | **SKIP** (already PRESENT) |
| 008 `calendar-events` | **APPLY** |
| 009 `sessions` | **APPLY (after 008)** |

**Nothing has been executed by the agent.** The remaining hold-point is the operator's continuation of
the manual steps in section 4.

### 11.1 Execution progress log (operator)

| Step | Status |
|---|---|
| Preflight | ✅ accepted (section 3.2b) |
| 007a / 007b | ✅ skipped (already PRESENT) |
| **008 `2026-09-19-calendar-events.sql`** | ✅ **APPLIED to production** (DDL reported the normal "empty result set"; benign `#1681` deprecation warning) |
| 008 verification | ⏳ attempt failed: the *full* integrity checker was run and errored `#1146 Table 'rbttaces_api.sessions' doesn't exist` because it reads session tables before 009 exists. **Fixed** - use [`post-008-integrity-summary.sql`](deployment/post-008-integrity-summary.sql) for this stage. |
| 009 `2026-09-23-sessions.sql` | ⏳ pending (after the 008 verification passes) |
| 009 verification | ⏳ pending ([`post-migration-integrity-summary.sql`](deployment/post-migration-integrity-summary.sql)) |
| Backend upload (Layers 1-7) | ⏳ pending |
| Auth/Calendar/Sessions smoke tests | ⏳ pending |
| Angular deploy | ⏳ pending |
| Full smoke + evidence | ⏳ pending |

**Next action for the operator:** run [`post-008-integrity-summary.sql`](deployment/post-008-integrity-summary.sql)
(stage 1). If it is clean, apply `2026-09-23-sessions.sql`, then run
[`post-migration-integrity-summary.sql`](deployment/post-migration-integrity-summary.sql) (stage 2).

