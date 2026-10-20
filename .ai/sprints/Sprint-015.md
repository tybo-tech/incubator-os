# Sprint 015 — Coach Workspace and Portfolio Dashboard

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support
> **Status**: Draft — ready for implementation after Sprint 013 + 014 and Discovery decision D1/D4
> **Baseline**: `main` @ `4163b03`
> **Depends on**: **Sprint 013** (profile completeness), **Sprint 014** (pending submissions),
> existing Sessions, GPS/Results, compliance, financial indicators
> **Duration**: Multi-phase (6 phases, sequential execution)
> **Previous work (locked capabilities)**: Company profile, directors/ownership, compliance,
> financial indicators, normalized SWOT/GPS, Results/Achievements, Sessions, calendar events,
> `AuthGuard`, `app-tab-bar`, `ViewStateService`.

---

## Objective

Give a coach a **workspace**, not another report: one screen that answers

> *Which of my companies need me this week, why, and what should I do next?*

This sprint delivers:

1. **Assignments** — an explicit user ↔ company relationship, so a coach's portfolio is a fact,
   not a guess.
2. **Explainable company health** — a derived 0–100 score with five weighted components, each with a
   reason and evidence, never typed and never unexplained.
3. **A portfolio dashboard** — KPI tiles, an attention queue, filters, grouped/table views and saved
   views.
4. **A company 360 strip** — health, reasons, last financial capture, next session and pending
   submissions at the top of the company Overview.
5. **Correct access** — Advisors/Staff see only assigned companies; Coordinators/System
   Administrators see all; Directors see their own company.
6. **A sensible landing page** — each user lands on the surface that matches their role.

**Explicitly not this sprint:** a new `Coach` role (see D1), report generation (Sprint 016), revenue
attribution per product, or AI recommendations.

---

## Existing Foundation (Locked)

- **No `Coach` role exists** (`helpers/AuthGuard.php:67`). Roles stay `System Administrator`,
  `Coordinator`, `Judge`, `External Judge`, `Advisor`, `Director`, `Staff`
  (`src/models/simple.schema.ts:209-216`).
- **`auth_require_company_access`** — admins all, everyone else own `company_id`. Extended, not
  replaced (see Architecture Decisions).
- **`companies`, `users`, `categories_item`** — identity, directors and enrolment
  (`client`/`program`/`cohort`). Assignments reference these; they do not duplicate enrolment.
- **Company capability** — `GetOverview`, `ProfileCompleteness`, `FinancialSummary`, `OwnershipSummary`.
- **Financial indicators** — `nodes` type `financial_indicators`, JSON `data.meta.financialYear` /
  `data.meta.month` (`capabilities/financial-indicators/Repository/FinancialIndicatorRepository.php:88-109`).
  `month` is a **calendar month (1 = January)**. This is the monthly capture truth.
- **`company_financial_yearly_stats`** — annual account rows. **Not** a monthly recency signal
  (`migrations/README.md:98-113`), and `FinancialSummary.capturedMonths` counts non-zero months rather
  than captured months (`CompanyRepository.php:66-84`). Do not use either for health.
- **Sessions** — `sessions.status`, `sessions.completed_at`, `sessions.calendar_event_id`;
  upcoming dates resolve via `calendar_events.start_at` / `start_date`.
- **GPS/Results** — `gps_targets` (`status`, `due_date`, `priority`), `gps_target_tasks`
  (`status`, `due_date`, `completed_at`), `achievements`. **Legacy `action_items` is excluded** from
  health scoring (free-text status, not part of the normalized model).
- **Compliance** — `companies.cipc_status`, `has_valid_bbbbee`, `has_tax_clearance`,
  `is_sars_registered`, `has_cipc_registration`, `bbbee_expiry_date`, `tax_pin_expiry_date`.
- **Submissions** — `submission_changes.company_id/status` from Sprint 014.
- **Angular** — `ViewStateService`, `app-icon`, `.sw-*`, tab bar, lazy routes.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Company assignment | **Introduces** — user ↔ company with assignment role and period |
| Portfolio access policy | **Introduces** — deterministic scope for every read |
| Company health | **Introduces** — derived score, band, reasons, evidence |
| Health snapshots | **Introduces** — daily snapshot for trend (forward-only) |
| Portfolio query | **Introduces** — one endpoint for tiles + list + filters |
| Portfolio dashboard | **Introduces** — tiles, attention queue, table/grouped views, saved views |
| Company 360 strip | **Introduces** — health summary on the company Overview |
| Assignment admin | **Introduces** — single and bulk (cohort/program) assignment |
| Role-aware navigation | **Extends** — nav and landing route by role/assignments |
| `AuthGuard` company access | **Extends** — assignment-aware check for staff |

---

## Domain Model

```
users ──1:N── company_assignments ──N:1── companies
                     │                      │
                     │                      ├──1:N── company_health_snapshots
                     │                      ├──1:N── submission_changes (Sprint 014)
                     │                      ├──1:N── sessions
                     │                      ├──1:N── gps_targets
                     │                      └──1:N── financial indicators (nodes)
                     │
              categories_item (program/cohort context, read-only)
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `company_assignments` | `capabilities/portfolio` | `id` BIGINT, `tenant_id` INT default 1, `company_id` INT FK, `user_id` INT FK, `assignment_role` `ENUM('lead','support','reviewer')` default `lead`, `program_id` BIGINT NULL, `cohort_id` BIGINT NULL, `starts_on` DATE NOT NULL, `ends_on` DATE NULL, `is_active` TINYINT(1) default 1, `note` VARCHAR(255) NULL, `created_by` INT NULL, timestamps; `UNIQUE (company_id, user_id, assignment_role)`; indexes `(user_id, is_active)`, `(company_id, is_active)`, `(program_id)`, `(cohort_id)` |
| `company_health_snapshots` | `capabilities/portfolio` | `id` BIGINT, `company_id` INT FK, `snapshot_date` DATE, `score` TINYINT UNSIGNED, `band` `ENUM('on_track','watch','at_risk')`, `components_json` JSON, `reasons_json` JSON, `computed_at` DATETIME; `UNIQUE (company_id, snapshot_date)` |

### Lookup Collections

| Lookup | Values | Source |
| --- | --- | --- |
| `assignment_role` | `lead`, `support`, `reviewer` | enum column |
| health `band` | `on_track` (`>= 75`), `watch` (`50–74`), `at_risk` (`< 50`) | derived |
| portfolio sort | `need`, `name`, `recent`, `due` | query parameter |
| portfolio view | `table`, `grouped` | UI state (`ViewStateService`) |

### Collection Links

| Link | Kind | Cascade |
| --- | --- | --- |
| `company_assignments.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `company_assignments.user_id` → `users.id` | FK | `ON DELETE CASCADE` |
| `company_assignments.program_id` / `.cohort_id` → `categories.id` | FK | `ON DELETE SET NULL` |
| `company_health_snapshots.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |

### Invariants

1. An assignment always names an existing company and an existing user; the user must be a staff
   role, never a `Director` (directors are scoped by `users.company_id`).
2. `(company_id, user_id, assignment_role)` is unique. Re-assigning reactivates the row and updates
   `ends_on`; it does not create duplicates.
3. `starts_on <= ends_on` when `ends_on` is present. An assignment with `ends_on < today` is inactive
   for scoping even if `is_active = 1`; the daily sweep flips it.
4. Health is **derived on read**. `company_health_snapshots` is a record of what the derivation
   produced on that day, never an input to the current score.
5. Every health component returns `{code, weight, earned, max, reason, evidence}`. A component with
   no data scores `0` **and says so** ("no financial indicators captured"). No silent zeros.
6. A company with no active assignment is visible to admins only.
7. The dashboard never exposes a company the viewer cannot access, including via aggregate tiles.
8. Aggregates (tiles, counts) use the **same scope** as the list. A tile cannot count a company the
   list hides.
9. Health scoring reads only existing facts. It never invents a revenue, a session or a compliance
   date.
10. `at_risk` is not a stored company status; it is a projection of the current score and reasons.

### Company health contract

Weights sum to **100**. Bands: **On track** `>= 75`, **Watch** `50–74`, **At risk** `< 50`.

| Component | Weight | Signal | Reason codes |
| --- | ---: | --- | --- |
| **Profile** | 20 | Sprint 013 `ProfileCompleteness.score × 0.2` | `profile_incomplete`, `profile_no_offerings` |
| **Financial capture** | 25 | Latest `nodes` financial-indicator record vs today. `data.meta.month` is a **calendar month (1 = January, 12 = December)**; `data.meta.financialYear` is the calendar year it belongs to. Fiscal-year ordering is display-only. | `financial_current`, `financial_1_month_late` (15), `financial_2_months_late` (8), `financial_3_plus_late`/`financial_none` (0) |
| **Compliance** | 20 | **Effective validity** per item: `has_valid_bbbbee` **AND** (`bbbee_valid_status` is null/`Valid`) **AND** (`bbbee_expiry_date` is null or `>= today`); same rule for tax with `has_tax_clearance`/`tax_valid_status`/`tax_pin_expiry_date`. Weights: CIPC status 6 (`cipc_status = 'IN BUSINESS'`), B-BBEE 6, tax 4, SARS 2, CIPC registration 2 (`has_cipc_registration = 1`). Expiry within 30 days flags but does not zero the component. | `compliance_cipc_not_in_business`, `compliance_cipc_registration_missing`, `compliance_bbbee_expired`, `compliance_bbbee_expiring`, `compliance_bbbee_status_invalid`, `compliance_tax_expired`, `compliance_tax_expiring`, `compliance_tax_status_invalid`, `compliance_sars_missing` |
| **Execution** | 20 | Open `gps_targets` weighted by status (`at_risk` 2×) and overdue `gps_target_tasks` (`due_date < today`, `status != 'completed'`); full marks when there is active work and none is overdue. **Legacy `action_items` is excluded** (free-text status, `context_type swot|gps`, not part of the normalized model). | `execution_no_targets`, `execution_targets_at_risk`, `execution_overdue_tasks` |
| **Engagement** | 15 | Last completed Session: `<= 30 d` 15, `31–60 d` 10, `61–90 d` 5, `> 90 d`/`none` 0; an upcoming Session within 14 days adds a reason (not points) | `engagement_recent_session`, `engagement_no_session_60d`, `engagement_no_session_90d`, `engagement_next_session` |

Each component returns its evidence (IDs, dates, counts). The total is rounded to an integer.
Thresholds live in one class (`CompanyHealthWeights`) — not scattered.

**Financial month rule.** `data.meta.financialYear` + `data.meta.month` are **calendar** values
(`month` 1 = January; see `financial-form.component.ts:115-120` and
`AnnualReportResponse::monthNameToNumber`). Convert with `FinancialMonth::toDate($year, $month)` and
compare that date to today. Fiscal-year ordering (`March … February`) is used **only** when displaying
an annual report, never to interpret stored values. Never use `company_financial_yearly_stats` or
`FinancialSummary.capturedMonths` for recency: `capturedMonths` counts months where the value is `> 0`
(`CompanyRepository.php:66-84`), so it cannot distinguish a real zero from a missing capture.

---

## Architecture Decisions

- **Assignments are the access fact, roles are the capability.** A `Coordinator` may administer
  assignments; an `Advisor`/`Staff` consumes the portfolio they are assigned. No new auth role (D1).
- **`AuthGuard` is extended, not forked.** Add
  `auth_require_company_access_for_user(PDO $db, array $user, int $companyId)` (assignment-aware) and
  use it in every **new** company-scoped endpoint. Leave the existing
  `auth_require_company_access($user, $companyId)` untouched for legacy endpoints until they are
  migrated deliberately.
- **One portfolio query.** `GetPortfolio` returns tiles + list in one response so the counts and the
  rows can never disagree.
- **Batch, do not loop.** Signals are fetched with grouped queries (one per signal family) and merged
  in PHP; no per-company query inside a loop.
- **Financial recency reads `nodes` financial indicators**, because that is the monthly record the
  Financial Indicators screen shows. The annual `company_financial_yearly_stats` rows cannot express
  monthly recency (zero-filled months).
- **Health is a projection, not a table.** Snapshots are a separate, forward-only trend log.
- **The dashboard is a workspace.** Every row has a next action and a drill-through; it is not a
  chart wall.
- **Landing route is resolved, not hardcoded.** `/` stays for admins; staff with assignments land on
  `/portfolio`; directors land on their company Overview.

---

## Routes

| Route | Component | Access |
| --- | --- | --- |
| `/portfolio` | `PortfolioDashboardComponent` | Staff with active assignments, Coordinators, System Administrators |
| `/portfolio?program=:id&cohort=:id&band=:band&advisor=:id&q=` | same | Filters preserved in the URL |
| `/admin/assignments` | `AssignmentAdminComponent` | Coordinator, System Administrator |
| `/admin/assignments?cohort=:id` | same | Bulk assign a cohort |
| `GET /api/portfolio/queries/get-portfolio.php` | — | Session; scope enforced server-side |
| `GET /api/portfolio/queries/get-company-health.php?id=` | — | Session; company access |
| `GET /api/portfolio/queries/list-assignments.php` | — | Session; company access or admin |
| `POST /api/portfolio/commands/assign-company.php` | — | Coordinator / System Administrator |
| `POST /api/portfolio/commands/unassign-company.php` | — | Coordinator / System Administrator |
| `POST /api/portfolio/commands/bulk-assign.php` | — | Coordinator / System Administrator |
| `POST /api/portfolio/commands/snapshot-health.php` | — | CLI / System Administrator |

---

## Phases

### Phase 1 — Assignments and access policy

Make "my companies" a real, enforceable fact.

#### Tasks

- [ ] **1.1** Create `migrations/2026-10-22-company-assignments.sql` — **run order #31** — idempotent:
  the assignment and health-snapshot tables, FKs, unique key and indexes; plus a guarded index
  `idx_nodes_type_company (type, company_id)` if missing, and `idx_sessions_company_completed
  (company_id, status, completed_at)`.
- [ ] **1.2** Add `docs/deployment/verify-015-portfolio.sql` (tables, indexes, FK presence, duplicate
  assignment check) and the **run order #31** row in `api-incubator-os/migrations/README.md`.
- [ ] **1.3** Create `capabilities/portfolio/Repository/AssignmentRepository.php`:
  `listByUser`, `listByCompany`, `assign`, `reactivate`, `unassign`, `bulkAssign`, `activeUserIds`.
  All writes are transactional.
- [ ] **1.4** Create `Contracts/PortfolioAccessPolicy.php`:
  - `scopeFor(array $user): array` → `['type' => 'all'|'assigned'|'company'|'none', 'companyId' => ?int]`;
  - `canAccessCompany(array $user, int $companyId, PDO $db): bool`;
  - rules: System Administrator / Coordinator → `all`; Advisor / Staff / Judge → `assigned`;
    Director → `company` (own); `External Judge` and any unknown role → `none`.
- [ ] **1.5** Add `auth_require_company_access_for_user(PDO $db, array $user, int $companyId)` to
  `helpers/AuthGuard.php`; it delegates to `PortfolioAccessPolicy` and returns `403` JSON on denial.
  Use it in all new endpoints from this sprint. Do **not** change the legacy function's behaviour.
- [ ] **1.6** Create `Application/Commands/AssignCompany.php`, `UnassignCompany.php`,
  `BulkAssign.php` (cohort/program → user) with request DTOs; validate that the target user is a staff
  role and the company/cohort exists; write an audit entry.
- [ ] **1.7** Create `Application/Queries/ListAssignments.php` (by company and by user).
- [ ] **1.8** Create endpoints under `api/portfolio/{queries,commands}/` per the route table; all use
  `auth_require_user` + the new access check; admin commands require `auth_is_admin`.
- [ ] **1.9** Build `src/app/admin/assignments/assignment-admin.component.ts` — search staff, search
  company/cohort, assign with role, bulk-assign a cohort, unassign, and show current assignments.
  Follow the Financial Indicators visual language.
- [ ] **1.10** Add an "Assigned team" card to the company Overview (read-only list + link to the admin
  screen for admins).
- [ ] **1.11** Backfill: assign each company's existing coach only where an explicit, verifiable
  signal exists (e.g. `sessions.facilitator_user_id` on the most recent completed Session). Record
  the backfill in the migration notes and show it in the UI as "suggested", never silently applied.
  If no safe signal exists, leave assignments empty.

#### Exit Criteria

- [ ] Migration applies twice locally; the duplicate-assignment check returns zero rows.
- [ ] An Advisor with one assignment can read that company; the same Advisor gets `403` for an
  unassigned company through the new guard.
- [ ] A Coordinator can assign and unassign; the change is visible on the company and the portfolio.
- [ ] Bulk assign by cohort creates exactly one row per company/user/role and is idempotent.
- [ ] A Director cannot be assigned as a coach; the API returns `400`.
- [ ] Legacy endpoints that still use the old guard behave exactly as before.

---

### Phase 2 — Health projection and portfolio query

Build the explainable score and the one endpoint the dashboard needs.

#### Tasks

- [ ] **2.1** Create `capabilities/portfolio/Contracts/FinancialMonth.php` — `toDate(int $year,
  int $month)` where `month` is a **calendar month (1 = January)** and `year` is the calendar year;
  `monthsLate(?array $latest)` returns the whole-month difference from today; `currentPeriod()` returns
  the current calendar year/month. A separate `fiscalOrder()` helper may order March–February for
  display only. Unit-test January, February, March, December and a 13-month gap.
- [ ] **2.2** Create `Repository/HealthSignalRepository.php` with **batched** queries:
  - profile completeness (reuse `ProfileCompleteness` per company, fed by batched company/offering rows);
  - latest financial indicator per company: `JSON_EXTRACT(data,'$.meta.financialYear')` +
    `JSON_EXTRACT(data,'$.meta.month')`, filtered by `type = 'financial_indicators'`, one grouped
    query (month is a calendar month);
  - compliance fields (already on `companies`), using the effective-validity rule;
  - GPS targets by status/due and overdue `gps_target_tasks` (`due_date`, `status`), grouped counts —
    **not** legacy `action_items`;
  - last completed Session and next calendar event (grouped by company);
  - pending submissions count (`submission_changes`, grouped).
- [ ] **2.3** Create `Contracts/CompanyHealth.php` — `for(array $signals): array` returning
  `{score, band, components[], reasons[]}` exactly as the contract table above. One reason per
  component that is not full marks; each reason carries `code`, `message`, `evidence`.
- [ ] **2.4** Create `Contracts/CompanyHealthWeights.php` — all weights, thresholds and expiry windows
  in one place. No magic numbers in the projection.
- [ ] **2.5** Create `Application/Queries/GetCompanyHealth.php` and
  `api/portfolio/queries/get-company-health.php`.
- [ ] **2.6** Create `Application/Queries/GetPortfolio.php` — accepts `program`, `cohort`, `advisor`,
  `band`, `q`, `sort`, `page`; resolves scope; returns
  `{ tiles, companies[], filters, meta }` where each company carries
  `{ id, name, sector, band, score, reasons, lastSession, nextSession, lastFinancialMonth,
     pendingSubmissions, openTargets, overdueActions, profileScore }`.
  Tiles: total companies, at risk, watch, on track, pending submissions, sessions this week,
  financials captured this month.
- [ ] **2.7** Implement sorting (`need` = lowest score first, then most overdue; `name`; `recent`;
  `due`) and pagination (25 default, 100 max). Counts in `tiles` reflect the **filtered, scoped** set.
- [ ] **2.8** Create `Application/Commands/SnapshotCompanyHealth.php` + `scripts/portfolio-snapshot.php`
  (CLI) writing one row per active company per day (idempotent via the unique key).
- [ ] **2.9** Add `Repository/PortfolioRepository.php` only if a query does not belong to
  `HealthSignalRepository`; do not create a god repository.
- [ ] **2.10** Add a PHP harness `tests/PortfolioHealth.php` with fixtures for: perfect company (100),
  no financials (financial = 0 + reason), expired B-BBEE, 3 overdue tasks, no sessions, and a company
  with no assignment (invisible to an Advisor).

#### Exit Criteria

- [ ] `get-portfolio` returns tiles and rows whose counts agree exactly for every filter combination.
- [ ] An Advisor's response contains only assigned companies; an admin's contains all; a Director gets
  `403` on `/portfolio` (they use the company view).
- [ ] Every company in the response has five components summing to its score, and at least one reason
  when the score is below 100.
- [ ] A company with no financial indicators scores `0` on that component and reports
  `financial_none` — it is never shown as "up to date".
- [ ] Calendar-month tests pass for January, February, March and December, including a 13-month gap.
- [ ] The execution component ignores `action_items` and reads `gps_target_tasks` only.
- [ ] The endpoint executes a constant number of queries for 1, 10 and 100 companies (assert in the
  harness via a query counter).
- [ ] Snapshot CLI writes one row per company per day and a second run the same day changes nothing.

---

### Phase 3 — Portfolio dashboard UI

Build `/portfolio` as a workspace.

#### Tasks

- [ ] **3.1** Create `src/app/features/portfolio/portfolio-dashboard.component.ts` (lazy route) with a
  header (title, "My portfolio" vs "All companies" based on scope), refresh, and a filter bar.
- [ ] **3.2** Create `components/portfolio-tiles.component.ts` — total, at risk, watch, on track,
  pending submissions, sessions this week, financials captured. Each tile is a filter shortcut.
- [ ] **3.3** Create `components/attention-queue.component.ts` — top 8 companies by need, each with
  score, band, the **first two reasons**, and a primary next action ("Review submission",
  "Capture financials", "Book a session", "Open company").
- [ ] **3.4** Create `components/portfolio-table.component.ts` — company, sector, band/score,
  last session, last financial month, open targets, pending submissions, next action. Sortable
  headers; row click opens the company Overview.
- [ ] **3.5** Create `components/portfolio-grouped.component.ts` — group by programme/cohort with
  per-group band counts; collapse state persisted.
- [ ] **3.6** Create `components/portfolio-filters.component.ts` — search, programme, cohort,
  assignment role, band, "needs attention only". Filters sync to the URL query string and survive a
  refresh.
- [ ] **3.7** Persist view state with `ViewStateService` under `portfolio-view:${userId}` (view mode,
  filters, sort, collapsed groups, page size) using the established `effect()` pattern.
- [ ] **3.8** Add loading skeletons, an empty state ("No companies assigned yet — ask a coordinator"),
  an error state with retry, and a "last updated" timestamp.
- [ ] **3.9** Make every reason chip link to the company tab that fixes it (profile → Profile,
  financial → Financial Indicators, compliance → Overview compliance card, execution → Targets,
  engagement → Sessions/Calendar).
- [ ] **3.10** Responsive pass: tiles and table become cards under 768 px; attention queue first.
- [ ] **3.11** Icons via `app-icon`; add semantic names if missing (`chart-pie`, `exclamation-triangle`,
  `clock`, `arrow-path`). No Font Awesome.

#### Exit Criteria

- [ ] `/portfolio` renders for an assigned Advisor and for a Coordinator, with different scopes.
- [ ] Clicking a tile filters the list to exactly the companies it counted.
- [ ] Sorting by need puts the lowest score first and is stable across pages.
- [ ] Grouped/table toggle, filters, sort and collapse survive navigation and refresh.
- [ ] Every reason chip navigates to the correct company tab.
- [ ] Empty, loading and error states are all reachable and correct.
- [ ] The page is usable at 375 px with no horizontal scroll.
- [ ] `ng build --configuration development` has zero errors and zero new warnings.

---

### Phase 4 — Company 360 strip and drill-through

Bring the workspace into the company.

#### Tasks

- [ ] **4.1** Create `company-health-strip.component.ts` — band/score pill, top reason, last session,
  last financial capture, pending submissions, next action. Placed at the top of the Overview.
- [ ] **4.2** Make the strip's reasons expandable to the full component breakdown (five rows with
  earned/max and evidence) — the same data as the dashboard, not a second calculation.
- [ ] **4.3** Add a "Back to portfolio" affordance when the viewer arrived from `/portfolio`
  (`?from=portfolio`), preserving filters via `ContextService` or a return URL.
- [ ] **4.4** Add health trend (last 30 snapshots) as a sparkline **only if** snapshots exist; hide it
  otherwise rather than showing a flat line.
- [ ] **4.5** Ensure the strip respects access: a Director sees their own score, an assigned coach sees
  it, an unassigned staff user gets `403` from the API and the strip is hidden.

#### Exit Criteria

- [ ] The Overview shows the strip for an authorised viewer and hides it cleanly for an unauthorised one.
- [ ] The component breakdown matches `get-company-health` field-for-field.
- [ ] "Back to portfolio" restores the previous filters.
- [ ] No duplicate health calculation exists in the frontend.

---

### Phase 5 — Role-aware navigation and landing

Stop showing every user every admin tool.

#### Tasks

- [ ] **5.1** Convert `nav.component.ts` `navItems` into a computed list filtered by
  `AuthService` role and portfolio scope. Admin items (`Users`, `Industries`, `Form Templates`,
  `Tools`, `Activity Log`, assignment admin) are hidden for non-admins.
- [ ] **5.2** Add the `Portfolio` nav item (first) for staff with assignments/admins.
- [ ] **5.3** Add a landing resolver for `/`: System Administrator/Coordinator → existing reports
  overview; Advisor/Staff/Judge → `/portfolio`; Director → `/company/:id/overview`; unknown → login
  or an explicit "no access" page.
- [ ] **5.4** Guard the new admin screen with `adminGuard` and the portfolio route with a
  `portfolioGuard` that allows staff/admins only.
- [ ] **5.5** Add a "switch to company view" link on the portfolio header for Directors viewing their
  own company (read-only awareness).
- [ ] **5.6** Update `AppShell`/nav mobile behaviour so the filtered list renders correctly collapsed.

#### Exit Criteria

- [ ] An Advisor sees Portfolio, Companies, Tasks, Calendar; not Users/Industries/Tools/Form Templates.
- [ ] A Director lands on their company Overview after login and cannot open `/admin/*`.
- [ ] A Coordinator sees the admin items and the reports overview at `/`.
- [ ] Deep-linking to a hidden route still enforces the guard (nav hiding is not security).
- [ ] No existing admin screen broke for an admin user.

---

### Phase 6 — Performance, hardening and verification

#### Tasks

- [ ] **6.1** Load-test the portfolio query with the local dataset and a synthetic 500-company fixture;
  record query count and response time. Target: **< 400 ms** and a **constant** query count.
- [ ] **6.2** Add `EXPLAIN` notes for every new query; add missing indexes only when proven.
- [ ] **6.3** Verify access control with a matrix test: System Administrator, Coordinator, Advisor
  (assigned/unassigned), Staff, Judge, Director, unknown role.
- [ ] **6.4** Verify aggregate leakage: tiles must not include companies the list excludes.
- [ ] **6.5** Add a CSV export of the **current filtered portfolio** (server-side, scoped) for
  coaches who need a spreadsheet; include the reasons column. (No PDF — that is Sprint 016.)
- [ ] **6.6** Add a daily expiry sweep for assignments (`ends_on < today`) to the same CLI runner.
- [ ] **6.7** Update `capabilities/portfolio/AI.md`, `feature.json`, the migration README and the
  deployment manifest.
- [ ] **6.8** Record the session and tick the sprint.

#### Exit Criteria

- [ ] Query count is constant across 1/10/100/500 companies and the 500-company response is < 400 ms
  locally.
- [ ] The full access matrix passes with no data leakage in list, tiles or CSV.
- [ ] CSV export matches the on-screen filtered list row for row.
- [ ] Assignment expiry is idempotent and does not break historical snapshots.
- [ ] `php -l` passes; harness passes; `npm run prod` succeeds.
- [ ] Session file and sprint checkboxes are updated.

---

## Execution Order

```
Phase 1 ──> Assignments + access policy
    │
    ▼
Phase 2 ──> Health projection + portfolio query
    │
    ▼
Phase 3 ──> Portfolio dashboard UI
    │
    ▼
Phase 4 ──> Company 360 strip + drill-through
    │
    ▼
Phase 5 ──> Role-aware navigation + landing
    │
    ▼
Phase 6 ──> Performance, hardening, verification
```

Phase 1 must ship before any health data is exposed. Phase 2 must not be merged without the access
matrix tests.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   ├── 2026-10-22-company-assignments.sql             (new — run order #31)
│   └── README.md                                       (run order #31 row)
├── docs/deployment/verify-015-portfolio.sql            (new)
├── helpers/AuthGuard.php                               (extend — new function)
├── capabilities/portfolio/
│   ├── AI.md / feature.json                            (new)
│   ├── Application/
│   │   ├── Commands/
│   │   │   ├── AssignCompany.php                       (new)
│   │   │   ├── UnassignCompany.php                     (new)
│   │   │   ├── BulkAssign.php                          (new)
│   │   │   └── SnapshotCompanyHealth.php               (new)
│   │   └── Queries/
│   │       ├── GetPortfolio.php                        (new)
│   │       ├── GetCompanyHealth.php                    (new)
│   │       └── ListAssignments.php                     (new)
│   ├── Contracts/
│   │   ├── PortfolioAccessPolicy.php                   (new)
│   │   ├── CompanyHealth.php                           (new)
│   │   ├── CompanyHealthWeights.php                    (new)
│   │   └── FinancialMonth.php                          (new)
│   └── Repository/
│       ├── AssignmentRepository.php                    (new)
│       └── HealthSignalRepository.php                  (new)
├── api/portfolio/
│   ├── queries/{get-portfolio,get-company-health,list-assignments}.php (new)
│   └── commands/{assign-company,unassign-company,bulk-assign,snapshot-health}.php (new)
└── scripts/portfolio-snapshot.php                      (new)

src/app/
├── features/portfolio/
│   ├── portfolio-dashboard.component.ts                (new)
│   ├── portfolio.service.ts                            (new)
│   └── components/
│       ├── portfolio-tiles.component.ts                 (new)
│       ├── attention-queue.component.ts                 (new)
│       ├── portfolio-table.component.ts                 (new)
│       ├── portfolio-grouped.component.ts               (new)
│       ├── portfolio-filters.component.ts               (new)
│       └── health-reasons.component.ts                  (new)
├── admin/assignments/assignment-admin.component.ts     (new)
├── components/company-shell/company-overview/
│   └── company-health-strip.component.ts               (new)
├── components/nav/nav.component.ts                     (role-aware)
├── auth/portfolio.guard.ts                             (new)
├── app.routes.ts                                       (routes + landing resolver)
└── shared/components/app-icon/app-icon.ts              (icons)
```

---

## Out of Scope

- **A new `Coach` role** — rejected in D1; assignments carry the relationship.
- **Report PDFs and email distribution** — Sprint 016.
- **AI recommendations or "next best action" generation** — the next action is rule-based and
  explainable.
- **Revenue-per-product attribution** — needs a product→account link, reserved.
- **Editing another user's assignments from the dashboard** — admin screen only.
- **Redesigning the existing Reports Overview** — it stays for admins.
- **Changing compliance, ownership or financial calculations.**
- **Historical health backfill** — snapshots start the day the feature ships.

---

## Future Modules (Reserved)

- Coach workload balancing (assignment counts and capacity).
- Portfolio goals per programme (cohort-level health targets).
- Alerting (email/WhatsApp digest when a company moves to `at_risk`).
- Session quality scoring (visit report outcomes).
- Multi-coach teams with lead/support permissions on writes.

---

## Definition of Done

The sprint is complete when:

- [ ] All six phases and their exit criteria are satisfied.
- [ ] "Coach" is implemented as assignments, with no invented auth role.
- [ ] An Advisor sees only assigned companies; admins see all; directors see their own.
- [ ] Every company health score is derived, sums to its components, and explains every lost point.
- [ ] The dashboard answers "who needs me this week and why" in one screen and one click.
- [ ] The company Overview carries the same health truth as the dashboard.
- [ ] Aggregates cannot leak companies the viewer cannot access.
- [ ] Navigation and landing routes match the user's role and scope.
- [ ] `ng build --configuration development` is clean; `npm run prod` succeeds; `php -l` passes.
- [ ] The access matrix and query-count assertions pass.
- [ ] Migration run order **#31** is recorded and the verify script is under `docs/deployment/`.
- [ ] Session file and sprint checkboxes are updated.
