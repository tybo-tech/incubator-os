# Sprint 016 — Reports, Delivery and Schedules

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support
> **Status**: Draft — ready for implementation after Sprint 015
> **Baseline**: `main` @ `4163b03`
> **Depends on**: **Sprint 013** (profile), **Sprint 014** (submission requests), **Sprint 015**
> (portfolio + health), existing Sessions/visit reports, financial indicators, Results/Achievements
> **Duration**: Multi-phase (6 phases, sequential execution)
> **Previous work (locked capabilities)**: client-side PDF exports (`src/services/pdf/*`), executive
> report, grant reports, `mail/send.php` + `EmailService`, Sessions visit reports, `app-icon`,
> `ViewStateService`.

---

## Objective

Turn the data the application already holds into **three purposeful report streams**, generated
consistently and delivered safely:

1. **Entrepreneur reports** — a monthly/quarterly snapshot the entrepreneur receives by email or a
   secure link: how the business is doing, what changed, what to update, what to do next.
2. **Coach reports** — a company progress report and a portfolio summary that match exactly what the
   dashboard shows.
3. **Funder / programme reports** — programme and cohort performance, beneficiary and impact
   summaries, built from the same derived figures.

And make every report **reproducible, permissioned and auditable**: who generated it, for which
period, for whom, when it was sent, and whether delivery succeeded.

---

## Existing Foundation (Locked)

- **PDF rendering already exists as a service** — `src/services/pdf/PDF-API-Documentation.md`:
  `POST https://docs.tybo.co.za/pdf.php` with HTML → PDF. The backend will reuse the same service.
- **Existing export services** — `assessment-export.service.ts`, `financial-export.service.ts`,
  `swot-action-plan-export.service.ts`, `gps-targets-export.service.ts`,
  `document-generator.service.ts`, `pdf-template.service.ts`. These stay for on-screen "export now";
  this sprint adds server-side generation for scheduled/delivered reports and does **not** rewrite
  them.
- **Executive report** — `src/app/components/companies/company-detail/executive-report/` (company
  view). Its content is the reference for the coach company report.
- **Session visit reports** — `session_visit_reports` + `session_visit_report_versions` (Sprint 011).
  Already have their own lifecycle, sign-off and versioning. **Do not rebuild.** Register them in the
  catalogue as an existing artefact.
- **Mail** — `mail/send.php` (hardened in Sprint 014) + `config/mail.php` (never upload).
- **Projections** — `ProfileCompleteness`, `FinancialSummary`, `CompanyHealth`, `GetPortfolio`,
  ownership/compliance. Reports compose these; they do not recompute.
- **Angular** — `.sw-*`, `app-icon`, `ViewStateService`; no new chart library.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Report catalogue | **Introduces** — definition key, audience, scope, template version |
| Report generation | **Introduces** — server-side HTML render + PDF conversion, run lifecycle |
| Report storage | **Introduces** — private artefact storage + signed download |
| Report delivery | **Introduces** — email, secure link, download log |
| Report schedules | **Introduces** — weekly/monthly/quarterly runs via cron |
| Entrepreneur reporting | **Introduces** — monthly snapshot + quarterly progress |
| Coach reporting | **Introduces** — company progress + portfolio summary |
| Funder reporting | **Introduces** — programme/cohort performance + beneficiary/impact summary |
| Visit reports | **Extends** — catalogue entry and delivery, no rebuild |
| Report permissions | **Introduces** — audience + scope enforcement on every run and download |

---

## Domain Model

```
report_definitions ──1:N── report_runs ──1:N── report_deliveries
        │                       │
        │                       └── scope: company | portfolio | programme | cohort
        │
        └──1:N── report_schedules ──1:N── report_runs (created by cron)

companies / categories(program, cohort) ──> resolved scope for a run
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `report_definitions` | `capabilities/reports` | `id` INT, `report_key` VARCHAR(80) **UNIQUE**, `title` VARCHAR(200), `audience` `ENUM('entrepreneur','coach','funder')`, `scope_type` `ENUM('company','portfolio','programme','cohort')`, `template_key` VARCHAR(80), `template_version` INT default 1, `description` VARCHAR(500), `is_active` TINYINT(1) default 1, timestamps |
| `report_runs` | same | `id` BIGINT, `tenant_id` INT default 1, `report_key` VARCHAR(80), `scope_type` `ENUM('company','portfolio','programme','cohort')`, `company_id` INT NULL, `program_id` BIGINT NULL, `cohort_id` BIGINT NULL, `user_id` INT NULL (portfolio owner), `period_start` DATE NULL, `period_end` DATE NULL, `status` `ENUM('queued','generating','ready','ready_html','failed','expired')` default `queued`, `attempts` TINYINT default 0, `next_attempt_at` DATETIME NULL, `file_path` VARCHAR(500) NULL, `file_bytes` INT NULL, `mime` VARCHAR(100) NULL, `html_path` VARCHAR(500) NULL, `error_message` VARCHAR(500) NULL, `requested_by` INT NULL, `generated_at` DATETIME NULL, `expires_at` DATETIME NULL, timestamps; indexes `(status, next_attempt_at)`, `(report_key, created_at)`, `(company_id, created_at)` |
| `report_deliveries` | same | `id` BIGINT, `run_id` BIGINT FK, `channel` `ENUM('download','email','link')`, `recipient_email` VARCHAR(255) NULL, `recipient_name` VARCHAR(255) NULL, `status` `ENUM('pending','sent','failed','viewed')` default `pending`, `token_hash` CHAR(64) NULL, `token_expires_at` DATETIME NULL, `sent_at` DATETIME NULL, `viewed_at` DATETIME NULL, `error_message` VARCHAR(500) NULL, `created_by` INT NULL, timestamps; index `(run_id)`, `(token_hash)` |
| `report_schedules` | same | `id` BIGINT, `tenant_id` INT default 1, `report_key` VARCHAR(80), `scope_type` `ENUM('company','portfolio','programme','cohort')`, `company_id` INT NULL, `program_id` BIGINT NULL, `cohort_id` BIGINT NULL, `user_id` INT NULL, `cadence` `ENUM('weekly','monthly','quarterly')`, `day_of_month` TINYINT NULL, `recipients_json` JSON, `is_active` TINYINT(1) default 1, `next_run_at` DATETIME, `last_run_at` DATETIME NULL, `created_by` INT NULL, timestamps; index `(is_active, next_run_at)` |

### Lookup Collections

| Lookup | Values | Source |
| --- | --- | --- |
| `audience` | `entrepreneur`, `coach`, `funder` | enum column |
| `scope_type` | `company`, `portfolio`, `programme`, `cohort` | enum column |
| run `status` | `queued`, `generating`, `ready`, `ready_html`, `failed`, `expired` | enum column |
| delivery `channel` | `download`, `email`, `link` | enum column |
| delivery `status` | `pending`, `sent`, `failed`, `viewed` | enum column |
| `cadence` | `weekly`, `monthly`, `quarterly` | enum column |

### Initial catalogue (seeded)

| Key | Title | Audience | Scope | Template |
| --- | --- | --- | --- | --- |
| `entrepreneur.monthly_snapshot` | Monthly business snapshot | entrepreneur | company | `entrepreneur/monthly` |
| `entrepreneur.quarterly_progress` | Quarterly progress report | entrepreneur | company | `entrepreneur/quarterly` |
| `coach.company_progress` | Company progress report | coach | company | `coach/company` |
| `coach.portfolio_summary` | Portfolio summary | coach | portfolio | `coach/portfolio` |
| `coach.session_visit` | Session / site-visit report | coach | company | existing artefact (link only) |
| `funder.programme_performance` | Programme performance | funder | programme | `funder/programme` |
| `funder.cohort_performance` | Cohort performance | funder | cohort | `funder/cohort` |
| `funder.esd_beneficiary_summary` | ESD beneficiary summary | funder | programme | `funder/esd` |
| `funder.impact_summary` | Impact summary | funder | programme | `funder/impact` |

### Collection Links

| Link | Kind | Cascade |
| --- | --- | --- |
| `report_runs.report_key` → `report_definitions.report_key` | logical (unique key) | definition deactivation does not delete history |
| `report_runs.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `report_runs.program_id` / `.cohort_id` → `categories.id` | FK | `ON DELETE CASCADE` |
| `report_deliveries.run_id` → `report_runs.id` | FK | `ON DELETE CASCADE` |
| `report_schedules.company_id` / `program_id` / `cohort_id` | FK | `ON DELETE CASCADE` |

### Invariants

1. A run references an **active** `report_definition` and exactly one scope target that matches the
   definition's `scope_type`.
2. The generator resolves scope through the same access policy as the UI. A coach cannot generate a
   company report for an unassigned company; a funder report requires Coordinator/System
   Administrator.
3. Reports **compose existing projections**. No report may contain a number that cannot be traced to
   a projection or a documented aggregate of one.
4. A run is immutable once `ready`: its file, period and scope never change. Re-running creates a
   new run.
5. `attempts` is capped at 3; a failed run is retried only after `next_attempt_at`. A permanent
   failure surfaces an error to the requester, never a silent empty PDF.
6. Artefacts are written **outside the public web root** where the host allows it. Where it does not,
   the directory contains a deny-all `.htaccess`, filenames are 32+ random characters, and the only
   read path is the signed download endpoint.
7. Download tokens are 256-bit random, stored hashed, expiring (default 7 days) and bound to one
   delivery row. No public, guessable report URL exists.
8. Email recipients are explicit: never a wildcard, never a programme-wide blast without a schedule
   that records the recipient list.
9. Every delivery records its outcome. "Sent" is only set after the mailer confirms success.
10. A report run never includes data from outside its scope, including in aggregates.
11. Retention: `expires_at` defaults to **90 days**; expired runs keep their metadata and lose the
    artefact (a `reports-expire` CLI deletes files and marks `expired`).
12. Generated HTML is escaped. No user-entered field is interpolated into a template without
    escaping.
13. Report templates are versioned (`template_version`); a run records the version it used.

---

## Architecture Decisions

- **Server-side generation, asynchronous.** The HTTP request enqueues a run and returns
  `202 { runId }`. A CLI worker (cron, every minute) performs HTML → PDF and storage. Shared hosting
  has no queue daemon; cron + `queued` rows is the reliable pattern.
- **Reuse the existing PDF service.** `PdfRenderer` POSTs the HTML to the configured
  `PDF_RENDER_URL` (default `https://docs.tybo.co.za/pdf.php`). No composer dependency is added to a
  repo that has none.
- **HTML fallback.** If the PDF service fails after retries, the run stores the HTML and becomes
  `ready_html`; the delivery email links to a secure HTML view. The user still gets their report.
- **Reports are a new capability** (`capabilities/reports`) with `api/reports/*`. The old client-side
  exports remain for ad-hoc, on-screen use.
- **Template = PHP view returning HTML.** No template engine. One shared layout partial
  (`Templates/layout.php`) with header, company/funder identity, period, footer and page-break CSS.
- **The entrepreneur link is the product.** A monthly report is only useful if the entrepreneur can
  open it on a phone. Every entrepreneur delivery includes a secure link plus a PDF attachment when
  the mailer allows attachments.
- **Schedules create runs; they do not bypass review.** A schedule records its recipients up front,
  and every generated delivery is logged.
- **The coach portfolio report is the dashboard in print.** It calls `GetPortfolio` with the same
  filters; it must not re-implement the health model.
- **Existing visit reports are linked, not regenerated.** The catalogue exposes them; delivery links
  to the existing report view.

---

## Routes

| Route | Component / Endpoint | Access |
| --- | --- | --- |
| `/company/:id/reports` | `CompanyReportsComponent` | Company access (coach), Director (own) |
| `/portfolio/reports` | `PortfolioReportsComponent` | Staff with portfolio |
| `/reports` | `ReportCatalogueComponent` | Coordinator / System Administrator |
| `/r/:token` | `PublicReportComponent` (public, token) | Delivery token |
| `GET /api/reports/queries/list-definitions.php` | — | Session |
| `GET /api/reports/queries/list-runs.php` | — | Session; scoped |
| `GET /api/reports/queries/get-run.php` | — | Session; scoped |
| `POST /api/reports/commands/generate-company-report.php` | — | Company access |
| `POST /api/reports/commands/generate-portfolio-report.php` | — | Staff with portfolio |
| `POST /api/reports/commands/generate-funder-report.php` | — | Coordinator / System Administrator |
| `POST /api/reports/commands/send-report.php` | — | Owner of the run or admin |
| `GET /api/reports/public/download.php?token=` | — | Delivery token |
| `GET /api/reports/public/view.php?token=` | — | Delivery token (HTML fallback) |
| `POST /api/reports/commands/create-schedule.php` | — | Coordinator / admin |
| `POST /api/reports/commands/toggle-schedule.php` | — | Coordinator / admin |
| `GET /api/reports/queries/list-deliveries.php` | — | Run owner or admin |

---

## Phases

### Phase 1 — Catalogue, storage and run lifecycle

Build the foundation before any template.

#### Tasks

- [ ] **1.1** Create `migrations/2026-10-23-reports.sql` (idempotent): the four tables, FKs, unique
  `report_key`, indexes, and the seed catalogue from the table above (`ON DUPLICATE KEY UPDATE` on
  title/audience/scope/template so re-running is safe).
- [ ] **1.2** Create `deployment/verify-016-reports.sql` (tables, seed count, unique keys).
- [ ] **1.3** Create `capabilities/reports/Repository/ReportDefinitionRepository.php`,
  `ReportRunRepository.php`, `ReportDeliveryRepository.php`, `ReportScheduleRepository.php`.
- [ ] **1.4** Create `Contracts/ReportScope.php` — resolves and validates the scope target against
  `PortfolioAccessPolicy`; returns the company/programme/cohort rows a run may use.
- [ ] **1.5** Create `Contracts/ReportArtifactStore.php` — `put(string $bytes, string $ext): string`,
  `path(string $relative)`, `delete(string $relative)`, `exists()`. Root comes from config
  (`REPORTS_STORAGE_PATH`), defaults to `storage/reports` outside the doc root. Random filenames.
- [ ] **1.6** Create the storage directory with a deny-all `.htaccess` and an `index.html` placeholder;
  document that it must never be web-served directly.
- [ ] **1.7** Create `Application/Commands/EnqueueReport.php` — validates the definition, scope,
  access and period; inserts a `queued` run; returns `{ runId }`. No rendering in the request.
- [ ] **1.8** Create `Application/Queries/ListDefinitions.php`, `ListRuns.php`, `GetRun.php` with
  scope-aware filtering.
- [ ] **1.9** Create the endpoints for definitions, runs and enqueue; all session-protected and scoped.
- [ ] **1.10** Add `config/reports.php` (render URL, storage path, token TTL, retention days) with the
  never-upload discipline for any environment-specific values.

#### Exit Criteria

- [ ] The migration applies twice locally; the seed contains exactly the nine catalogue entries.
- [ ] Enqueuing a company report as an unassigned Advisor returns `403`; as the assigned coach returns
  a `queued` run.
- [ ] Runs are listed only for scopes the viewer can access.
- [ ] A direct HTTP request to the storage path returns `403` or `404` (verified locally).
- [ ] No report artefact path is guessable (32+ random characters).

---

### Phase 2 — Generation engine and shared layout

Make a run produce a real, valid PDF (and HTML fallback).

#### Tasks

- [ ] **2.1** Create `Services/PdfRenderer.php` — POST JSON `{html, filename, paper_size, orientation}`
  to `PDF_RENDER_URL` with a curl timeout (e.g. 20 s), validates `%PDF-` magic bytes, returns bytes or
  throws a typed `PdfRenderException`.
- [ ] **2.2** Create `Services/ReportHtmlRenderer.php` — loads the PHP template by `template_key` and
  returns HTML; provides `e()` escaping, `money()` (ZAR), `date()` and `percent()` helpers.
- [ ] **2.3** Create `Templates/layout.php` (A4, header with report title + period, company/programme
  identity, “Generated on”, page footer with page numbers via CSS) and the shared partials
  (`company-header`, `kpi-grid`, `table`, `reason-list`, `empty-state`).
- [ ] **2.4** Create `Application/Commands/GenerateReport.php` — loads the run, builds the view model
  from existing queries/projections, renders HTML, calls `PdfRenderer`, stores the artefact, marks
  `ready` (or `ready_html` on PDF failure), sets `expires_at`.
- [ ] **2.5** Create `scripts/reports-worker.php` (CLI, cron-safe) — claims queued runs with
  `SELECT … FOR UPDATE SKIP LOCKED` (or an atomic status update), caps the batch (e.g. 5), respects
  `next_attempt_at`, increments `attempts`, and exits cleanly. Idempotent if two workers overlap.
- [ ] **2.6** Add retry/backoff: 3 attempts, 1/5/15 minutes; a permanent failure stores
  `error_message` and notifies the requester in the UI.
- [ ] **2.7** Create `Application/Queries/GetRunStatus.php` for polling; the UI shows
  queued → generating → ready without a manual refresh loop hammering the server (backoff).
- [ ] **2.8** Create `scripts/reports-expire.php` — deletes artefacts older than `expires_at` and
  marks runs `expired`; keeps metadata.
- [ ] **2.9** Add `tests/ReportsGeneration.php` with a fake renderer: success, PDF service failure →
  `ready_html`, retry exhaustion → `failed`, and an escaping test (a company name containing
  `<script>` must be escaped in the HTML).

#### Exit Criteria

- [ ] A queued run becomes `ready` with a file that starts with `%PDF-` and the configured retention.
- [ ] With the renderer forced to fail, the run becomes `ready_html` and the HTML is stored.
- [ ] With the renderer forced to fail three times, the run becomes `failed` with a readable message
  and a retry action in the UI.
- [ ] Two concurrent workers never process the same run twice (assert one artefact and one status
  transition).
- [ ] A company name with HTML/script characters renders escaped and inert.
- [ ] Expiry deletes the file and leaves the metadata row.

---

### Phase 3 — Entrepreneur reports and delivery

Build the monthly snapshot, the quarterly progress report, and safe delivery.

#### Tasks

- [ ] **3.1** Create `Templates/entrepreneur/monthly.php` — headline (business name, period), revenue
  and profit trend from financial indicators, top offerings, open actions/targets, next session,
  profile completeness and "what to update", and a plain-language closing note.
- [ ] **3.2** Create `Templates/entrepreneur/quarterly.php` — progress against targets, completed
  achievements, ownership/compliance status (read-only), and next-quarter focus.
- [ ] **3.3** Ensure every number comes from an existing projection or a documented aggregate of one;
  add a `Sources` note in the template that lists the projections used (coach-facing metadata).
- [ ] **3.4** Create `SendReport` command — creates `report_deliveries` rows, generates a 256-bit
  download token (hashed at rest, 7-day TTL), sends the email with the secure link and the PDF
  attached when the mailer supports it, and records `sent`/`failed`.
- [ ] **3.5** Create the public `/r/:token` screen — resolves the delivery token, shows report metadata
  and a download button, handles expired/viewed states. `noindex`; no company list; no navigation.
- [ ] **3.6** Create the download and HTML-view endpoints with token validation, expiry and a
  `viewed_at` stamp on first open.
- [ ] **3.7** Build `CompanyReportsComponent` (`/company/:id/reports`): catalogue for the company,
  period picker, "Generate", run status, download, "Send to entrepreneur" with a confirmed recipient,
  and delivery history.
- [ ] **3.8** Add "Send monthly snapshot" to the Profile requests panel so a coach can combine a
  profile request and a report in one flow (two separate links, clearly labelled).

#### Exit Criteria

- [ ] A monthly snapshot generates for a company with financial data and for one without (with an
  explicit "no financials captured" section, not an empty page).
- [ ] The PDF opens on a phone and the email link works without a login.
- [ ] An expired token shows an expiry state; a used-but-valid token still downloads until expiry.
- [ ] Delivery history shows recipient, channel, status and timestamp.
- [ ] A failed mail send is visible and retryable; the link remains usable.
- [ ] The report contains no data from another company (fixture test with two companies).

---

### Phase 4 — Coach reports

Give the coach the same truth as the dashboard, in a document.

#### Tasks

- [ ] **4.1** Create `Templates/coach/company.php` — profile summary (sector, description, buyer type,
  target market, offerings/prices), ownership, compliance with expiry dates, financial trend, active
  targets and at-risk items, recent/next session, pending submissions, health score and reasons.
- [ ] **4.2** Create `Templates/coach/portfolio.php` — the `GetPortfolio` result: tiles, band
  distribution, attention list with reasons, and a company table. Same filters as the dashboard.
- [ ] **4.3** Create `GeneratePortfolioReport` command scoped to the requesting user's portfolio (an
  Advisor cannot generate a report for another coach's portfolio unless admin).
- [ ] **4.4** Add the report actions to the portfolio dashboard (Export CSV exists in Sprint 015;
  this adds "Generate portfolio PDF").
- [ ] **4.5** Register the existing visit report in the catalogue as a link-only artefact
  (`coach.session_visit`): the run row points at the existing report view; no PDF duplication.
- [ ] **4.6** Ensure the company report can be generated for a **period** (e.g. Q2) and states the
  period clearly on every page footer.

#### Exit Criteria

- [ ] The company progress report matches the dashboard's health score and reasons for the same company
  and date.
- [ ] The portfolio report row count matches the filtered dashboard list.
- [ ] An Advisor cannot generate a portfolio report scoped to another Advisor.
- [ ] The visit report entry opens the existing report, not a copy.
- [ ] Period selection changes the included financial/session data and is printed on the report.

---

### Phase 5 — Funder reports and schedules

Serve the programme and automate the cadence.

#### Tasks

- [ ] **5.1** Create `Templates/funder/programme.php` and `cohort.php` — enrolled companies, active
  vs withdrawn, sector distribution, revenue and jobs, compliance and B-BBEE status, ownership
  indicators, target/achievement completion, health distribution. Every figure states its period and
  source.
- [ ] **5.2** Create `Templates/funder/esd.php` — beneficiary summary: company, sector, ownership
  (derived), B-BBEE level, financial year turnover (where captured), employees, support received
  (sessions/targets), and outcomes (achievements). Wording must not claim audited Statement 400
  compliance; label it "management information".
- [ ] **5.3** Create `Templates/funder/impact.php` — programme-level change over time: revenue growth
  (with missing-data caveats), jobs, companies supported, achievements verified, sessions delivered.
- [ ] **5.4** Create `GenerateFunderReport` (Coordinator/System Administrator only) with period and
  programme/cohort scope.
- [ ] **5.5** Create `CreateSchedule` / `ToggleSchedule` / `UpdateSchedule` commands with validation:
  cadence, day-of-month (1–28), recipients (valid emails, max 20), scope.
- [ ] **5.6** Create `scripts/reports-scheduler.php` (cron) — finds due schedules, advances
  `next_run_at`, enqueues runs and delivery rows in one transaction per schedule; idempotent if run
  twice in the same minute (guard on `last_run_at`).
- [ ] **5.7** Compute `next_run_at` correctly for weekly/monthly/quarterly, including month-end and
  February; unit-test the boundaries.
- [ ] **5.8** Build the `ReportCatalogueComponent` (`/reports`) for admins: definitions, recent runs,
  schedules, delivery log, and a "send test to myself" action.

#### Exit Criteria

- [ ] Each funder report generates for a real programme and cohort with no empty sections hidden.
- [ ] A missing data set is shown as "not captured", never as `0` (e.g. turnover).
- [ ] A schedule creates exactly one run and one delivery per recipient per period; running the
  scheduler twice in the same minute does not duplicate.
- [ ] `next_run_at` is correct across month-end, 29 February and quarter boundaries.
- [ ] Only Coordinators/System Administrators can create or toggle a schedule.
- [ ] The admin catalogue shows runs, schedules and deliveries with statuses.

---

### Phase 6 — Security, retention and verification

#### Tasks

- [ ] **6.1** Verify signed-token isolation: a token cannot fetch another run; editing the URL returns
  `404`; expired tokens return `410`.
- [ ] **6.2** Verify no report path is reachable directly over HTTP in the local Docker setup; confirm
  the deny-all `.htaccess` and random filenames.
- [ ] **6.3** Add rate limiting on public download/view endpoints (per token and per hashed IP).
- [ ] **6.4** Add an audit trail for generate/send/download/view with actor, run id, recipient and
  timestamp (no PII beyond the recipient email already stored).
- [ ] **6.5** Add a data-consistency harness: for a fixed company, assert report totals equal the
  dashboard/projection values (revenue, score, counts).
- [ ] **6.6** Run retention: expire 90-day-old runs in a test fixture; confirm metadata remains and
  files are gone.
- [ ] **6.7** Verify the PDF service timeout does not block the worker forever; verify the worker
  exits non-zero on a fatal error so cron alerts.
- [ ] **6.8** Update `capabilities/reports/AI.md`, `feature.json`, the deployment manifest
  (including `storage/reports` creation and cron entries) and the never-upload list.
- [ ] **6.9** Add the cron documentation: `* * * * * php scripts/reports-worker.php`,
  `*/15 * * * * php scripts/reports-scheduler.php`, `0 2 * * * php scripts/reports-expire.php`.
- [ ] **6.10** Record the session and tick the sprint.

#### Exit Criteria

- [ ] Token isolation, expiry and rate limiting all pass.
- [ ] No artefact is publicly reachable without a token.
- [ ] Report figures equal the dashboard/projection figures in the consistency harness.
- [ ] Retention removes files and keeps metadata.
- [ ] A renderer timeout produces a `ready_html` fallback or a bounded `failed` run — never a hung
  worker.
- [ ] `php -l` passes; harnesses pass; `npm run prod` succeeds.
- [ ] Session file and sprint checkboxes are updated.

---

## Execution Order

```
Phase 1 ──> Catalogue, storage, run lifecycle
    │
    ▼
Phase 2 ──> Generation engine + shared layout
    │
    ▼
Phase 3 ──> Entrepreneur reports + delivery
    │
    ▼
Phase 4 ──> Coach reports
    │
    ▼
Phase 5 ──> Funder reports + schedules
    │
    ▼
Phase 6 ──> Security, retention, verification
```

Phases 1–2 deliver infrastructure only. Do not expose a "Generate" button to users before Phase 3
gives the report a delivery path.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   ├── 2026-10-23-reports.sql                          (new)
│   └── deployment/verify-016-reports.sql                (new)
├── config/reports.php                                  (new — never upload)
├── storage/reports/                                    (new, deny-all .htaccess)
├── capabilities/reports/
│   ├── AI.md / feature.json                            (new)
│   ├── Application/
│   │   ├── Commands/
│   │   │   ├── EnqueueReport.php                       (new)
│   │   │   ├── GenerateReport.php                      (new)
│   │   │   ├── SendReport.php                          (new)
│   │   │   ├── CreateSchedule.php                      (new)
│   │   │   ├── UpdateSchedule.php                      (new)
│   │   │   └── ToggleSchedule.php                      (new)
│   │   └── Queries/
│   │       ├── ListDefinitions.php                     (new)
│   │       ├── ListRuns.php                            (new)
│   │       ├── GetRun.php                              (new)
│   │       ├── GetRunStatus.php                        (new)
│   │       └── ListDeliveries.php                      (new)
│   ├── Contracts/
│   │   ├── ReportScope.php                             (new)
│   │   ├── ReportArtifactStore.php                     (new)
│   │   ├── ReportToken.php                             (new)
│   │   └── Responses/…                                 (new)
│   ├── Services/
│   │   ├── PdfRenderer.php                             (new)
│   │   ├── ReportHtmlRenderer.php                      (new)
│   │   └── ReportViewModelBuilder.php                  (new)
│   ├── Templates/
│   │   ├── layout.php                                  (new)
│   │   ├── partials/*.php                              (new)
│   │   ├── entrepreneur/{monthly,quarterly}.php        (new)
│   │   ├── coach/{company,portfolio}.php               (new)
│   │   └── funder/{programme,cohort,esd,impact}.php    (new)
│   └── Repository/
│       ├── ReportDefinitionRepository.php              (new)
│       ├── ReportRunRepository.php                     (new)
│       ├── ReportDeliveryRepository.php                (new)
│       └── ReportScheduleRepository.php                (new)
├── api/reports/
│   ├── queries/*.php                                   (new)
│   ├── commands/*.php                                  (new)
│   └── public/{download,view}.php                      (new)
└── scripts/
    ├── reports-worker.php                              (new)
    ├── reports-scheduler.php                           (new)
    └── reports-expire.php                              (new)

src/app/
├── features/reports/
│   ├── company-reports.component.ts                    (new)
│   ├── portfolio-reports.component.ts                  (new)
│   ├── report-catalogue.component.ts                   (new)
│   ├── reports.service.ts                              (new)
│   └── components/{report-run-card,delivery-log}.component.ts (new)
├── public/public-report/public-report.component.ts     (new)
├── app.routes.ts                                       (routes)
└── shared/components/app-icon/app-icon.ts              (icons)
```

---

## Out of Scope

- **Rewriting the existing client-side export services** — they stay for ad-hoc exports.
- **A general-purpose report builder / drag-and-drop designer** — fixed catalogue only.
- **Scheduled SMS/WhatsApp delivery** — email + secure link only.
- **Funder portal with its own login** — funder reports are generated/sent by the programme team.
- **Audited Statement 400 compliance claims** — management information only.
- **Data warehouse / BI tooling.**
- **Recomputing financial, compliance, ownership or health logic inside a template.**
- **AI-written narrative commentary** — templated, deterministic text only.

---

## Future Modules (Reserved)

- Report builder for programme-specific layouts.
- Funder self-service portal with scoped read-only access.
- Delivery analytics (open rate, per-recipient engagement) beyond `viewed_at`.
- Attachments from the document vault (does not exist yet).
- Multi-language (isiZulu / English) templates.
- Benchmark comparison across cohorts in the funder impact report.

---

## Definition of Done

The sprint is complete when:

- [ ] All six phases and their exit criteria are satisfied.
- [ ] A coach can generate and send an entrepreneur monthly snapshot from the company screen.
- [ ] A coach can generate a company progress report and a portfolio summary that match the dashboard.
- [ ] A programme manager can generate funder reports for a programme/cohort and schedule them.
- [ ] Every report is reproducible, scoped, permissioned and logged.
- [ ] Every figure traces to an existing projection; no report recomputes business logic.
- [ ] Artefacts are private, token-protected, expiring and rate-limited.
- [ ] PDF failure degrades to a readable HTML report; no user sees an empty document.
- [ ] Worker, scheduler and expiry CLIs are documented and safe to run repeatedly.
- [ ] `ng build --configuration development` is clean; `npm run prod` succeeds; `php -l` passes.
- [ ] Harnesses pass; session file and sprint checkboxes are updated.
