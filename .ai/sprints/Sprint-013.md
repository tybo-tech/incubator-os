# Sprint 013 — Company Profile 360

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support
> **Status**: Draft — ready for implementation after Discovery-013-016 decisions D1–D6
> **Baseline**: `main` @ `4163b03`
> **Depends on**: Discovery-013-016 (D2, D6), Sprint 011 profile work, Sprint 012 (optional, does not block)
> **Duration**: Multi-phase (4 phases, sequential execution)
> **Previous work (locked capabilities)**: Company capability (`api/company/*`), directors + derived
> ownership, compliance card, financial indicators, `industries` taxonomy, `app-icon`, `ViewStateService`,
> `.sw-*` popup contract.

---

## Objective

Make the company profile the **single, complete and explainable source of truth** for who the business
is and what it sells.

When this sprint is done a coach can open `/company/:id/profile` and see, without leaving the page:

1. **Sector** — the existing `industries` taxonomy, shown as a full path.
2. **What the business does** — a long-form description, not a 255-character tagline.
3. **Who it sells to** — business, consumer, or both — plus a target-market statement.
4. **What it sells** — a persisted catalogue of products and services with prices and price basis.
5. **How complete the profile is** — a derived score with a gap list that links to the fix.

And every other surface (Overview, coaching guide, executive report, portfolio dashboard, reports)
reads the same facts from the same place.

---

## Existing Foundation (Locked)

Must **NOT** be redesigned. Reuse or expose only.

- **Capability convention** — `capabilities/company/` + thin `api/company/queries|commands/*.php`.
  No business logic in `api-nodes/`.
- **`helpers/AuthGuard.php`** — `auth_require_user`, `auth_require_company_access`; tenant `1`, server-derived.
- **`core/Infrastructure/TransactionManager.php`** — command handlers own the transaction.
- **`companies`** — identity, contact, compliance flags, `industry_id`. Extend; do not duplicate.
- **`industries`** — hierarchical sector taxonomy with `parent_id`, `is_active`, `display_order`.
  Admin → Industries is the maintenance surface.
- **Directors + ownership** — derived from `users` (role `Director`, `status='active'`) by
  `OwnershipSummary` / `DirectorSummary`. Do not touch.
- **Compliance score** — edited on the Overview card, stored on `companies` flags. Do not move.
- **Financial indicators** — `nodes` type `financial_indicators`, calculated in
  `FinancialIndicatorCalculator`. Read-only here.
- **Angular** — standalone components, lazy routes under `CompanyShellComponent`, `.sw-modal`
  contract (fixed header/footer, scrollable body, no backdrop close), `app-icon` only,
  `ViewStateService` for view persistence.
- **`app-tab-bar`** — tab order is data-driven in `company-shell.component.ts:95-177`.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Company profile | **Extends** — long description, buyer type, target market, website, founded year |
| Sector classification | **Extends** — surface `industry_id`, resolve and display the industry path |
| Product & service catalogue | **Introduces** — company-scoped offerings with price, basis, status and order |
| Profile completeness | **Introduces** — derived 0–100 score, band, gap list with actionable codes |
| Profile revisions | **Introduces** — immutable snapshot per accepted profile change |
| Profile UI | **Introduces** — Profile tab with identity, positioning, offerings, completeness |
| Overview / coaching guide / executive report | **Extends** — read the profile instead of duplicating it |

---

## Domain Model

```
industries (existing, hierarchical)
      │ parent_id
      ▼
companies ──1:N── company_products_services
    │  │
    │  └──1:N── company_profile_revisions
    │
    └──1:N── users (role='Director')        ← untouched
    └──1:N── financial indicators (nodes)   ← untouched
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `companies` (extended) | `capabilities/company` | `description` **TEXT** (was `varchar(255)`), `buyer_type` `ENUM('b2b','b2c','both','unknown')` default `unknown`, `target_market` TEXT, `website` VARCHAR(255), `founded_year` SMALLINT NULL, existing `industry_id`, `service_offering` retained as a one-line headline |
| `company_products_services` | `capabilities/company` | `id` BIGINT, `tenant_id` INT default 1, `company_id` INT FK, `kind` `ENUM('product','service')`, `name` VARCHAR(200), `description` TEXT NULL, `unit_price` DECIMAL(14,2) NULL, `price_basis` `ENUM('unit','hour','day','month','project','custom')` default `unit`, `price_notes` VARCHAR(255) NULL, `currency` CHAR(3) default `ZAR`, `target_segment` VARCHAR(255) NULL, `is_active` TINYINT(1) default 1, `sort_order` INT default 0, `created_by` INT NULL, `updated_by` INT NULL, timestamps |
| `company_profile_revisions` | `capabilities/company` | `id` BIGINT, `company_id` INT FK, `revision_no` INT, `snapshot_json` JSON, `changed_fields_json` JSON, `source` `ENUM('profile_edit','submission_apply','migration')` default `profile_edit`, `changed_by` INT NULL, `created_at`; `UNIQUE (company_id, revision_no)` |

All new tables carry `tenant_id INT NOT NULL DEFAULT 1` where they are company-scoped, plus
`created_at` / `updated_at`.

### Lookup Collections

| Lookup | Values | Source |
| --- | --- | --- |
| `buyer_type` | `b2b`, `b2c`, `both`, `unknown` | enum column |
| product `kind` | `product`, `service` | enum column |
| `price_basis` | `unit`, `hour`, `day`, `month`, `project`, `custom` | enum column |
| `currency` | `ZAR` (single value this sprint) | column default |
| revision `source` | `profile_edit`, `submission_apply`, `migration` | enum column |
| sector | existing `industries` rows (`is_active = 1`) | `industries` |

### Collection Links

| Link | Kind | Cascade |
| --- | --- | --- |
| `companies.industry_id` → `industries.id` | FK (existing, verify) | `ON DELETE SET NULL` |
| `company_products_services.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `company_profile_revisions.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |

### Invariants

1. Every offering belongs to **exactly one** company; the company is resolved server-side from the
   route/body and checked with `auth_require_company_access` — never trusted from the client alone.
2. `unit_price IS NULL` means **price not captured**, not zero. The UI shows "No price" and the
   completeness projection counts it as a gap. A captured price must be `>= 0`.
3. Offerings are **deactivated, never hard-deleted** (`is_active = 0`), so revisions, reports and
   future submissions never point at a vanished row.
4. `buyer_type` and `target_market` are **typed facts**, never inferred from products, forms or AI.
5. Sector is the **most specific active** `industries` row; display resolves the full ancestor path.
   An inactive or missing industry is shown as "Sector not set" and scores as a gap.
6. `description` is plain text, max 5,000 characters. `service_offering` stays a one-line headline.
7. Completeness is **derived on read**, never stored. The same projection is used by every consumer.
8. Every accepted `UpdateProfile` writes **one** revision row (snapshot after the change + changed
   field names). A no-op update writes nothing.
9. `revision_no` is monotonic per company; a gap or duplicate is a defect.
10. Profile writes are only performed by `UpdateProfile` (coach-side) or, from Sprint 014,
    `ApplySubmission`. No other command may write profile columns.
11. `founded_year`, when present, must be between 1900 and the current year.
12. `website`, when present, must be an `http(s)` URL; it is stored without trailing whitespace.

### Profile completeness (the contract)

Weights sum to **100**. The projection returns `score`, `band`, `missing[]` and `met[]`; each item
carries a stable `code`, a human message and an `action` (tab section to focus).

| Component | Weight | Rule |
| --- | ---: | --- |
| Sector set | 15 | `industry_id` resolves to an active industry |
| Description | 15 | `description` present and `>= 120` characters |
| Buyer type | 10 | `buyer_type != 'unknown'` |
| Target market | 10 | `target_market` present and `>= 40` characters |
| Contact block | 15 | `contact_person`, `contact_number`, `email_address` all present |
| Location | 10 | `city` **and** `business_location` present |
| Offerings | 15 | at least one active offering |
| Pricing | 10 | **every** active offering has `unit_price` (or `price_basis='custom'` with `price_notes`) |

Bands: **Complete** `>= 90`, **Strong** `70–89`, **Partial** `40–69`, **Thin** `< 40`.

Gap codes (stable, used by the UI and Sprint 015 health reasons):
`profile_sector_missing`, `profile_description_short`, `profile_buyer_type_missing`,
`profile_target_market_missing`, `profile_contact_incomplete`, `profile_location_missing`,
`profile_no_offerings`, `profile_unpriced_offerings`.

---

## Architecture Decisions

- **One profile query.** `GetProfile` returns company + industry path + offerings (active and
  inactive) + completeness + latest revision. `GetOverview` keeps its current shape and gains only
  `profileCompleteness` so the Overview card does not need a second call.
- **Products are a child collection of the Company capability**, not a new capability. They have no
  meaning without a company and share its access rules.
- **PATCH semantics for profile.** `UpdateProfile` only writes fields that are present in the request;
  an explicit `null` clears an optional field (`target_market`, `website`, `founded_year`).
  `name` remains non-clearable.
- **Revisions are written inside the same transaction** as the update. A failed update writes nothing.
- **Completeness lives in one PHP class** (`ProfileCompleteness`) and is projected into the response.
  The Angular side never re-implements the weights.
- **Sector is not a free-text field.** The UI uses a searchable picker over `industries`; if a sector
  is genuinely missing, the user is sent to Admin → Industries rather than typing a parallel value.
- **The Profile tab is the editor; Overview is the summary.** Overview keeps a compact card and links
  to the tab. No duplicate edit forms.
- **Description storage widens to TEXT.** The existing `varchar(255)` truncates real business
  descriptions and is the single most limiting column on the profile.

---

## Routes

| Route | Component | Notes |
| --- | --- | --- |
| `/company/:id/profile` | `ProfilePageComponent` | New tab, position **2** after Overview |
| `/company/:id/profile?section=positioning` | same | Deep link from a completeness gap |
| `/company/:id/profile?section=offerings` | same | Deep link from a completeness gap |
| `/industries` | existing admin | "Sector not listed?" escape hatch |

Tab order after this sprint:
`Overview → Profile → Directors → Assessment → SWOT Workspace → Targets → Results → Calendar →
Sessions → BEE Compliance → Financial Indicators → Coaching / Guide → Purchases → Seed Funding →
legacy tabs`.

---

## Phases

### Phase 1 — Data foundation and migration

Build the storage the profile needs, without changing any existing behaviour.

#### Tasks

- [ ] **1.1** Create `migrations/2026-10-20-company-profile-360.sql`, idempotent and guarded:
  - widen `companies.description` from `varchar(255)` to `TEXT` (guard with `information_schema`);
  - add `buyer_type`, `target_market`, `website`, `founded_year` with safe defaults;
  - create `company_products_services` with FKs, `idx_cps_company_active`
    (`company_id`, `is_active`, `sort_order`) and a `CHECK (unit_price IS NULL OR unit_price >= 0)`;
  - create `company_profile_revisions` with `UNIQUE (company_id, revision_no)` and
    `idx_cpr_company_created`;
  - verify `companies.industry_id` has an FK to `industries`; add it only if missing.
- [ ] **1.2** Backfill **without inventing facts**: `buyer_type = 'unknown'` for all rows; do **not**
  copy `service_offering` into `description`; do **not** create offerings. A backfill that guesses
  would poison completeness.
- [ ] **1.3** Add `migrations/deployment/verify-013-profile-360.sql` — table existence, column types,
  FK presence, row counts, and a query proving no company lost `name`/`registration_no`.
- [ ] **1.4** Write rollback notes in the migration header (drop the two tables, drop the four
  columns, narrow `description` back to `varchar(255)` only after a length check).
- [ ] **1.5** Run the migration twice locally to prove idempotency; capture before/after
  `SELECT COUNT(*) FROM companies` and `SELECT COUNT(*) FROM nodes`.

#### Exit Criteria

- [ ] Migration applies cleanly on the local Docker database **twice**, with no error on the second run.
- [ ] `DESCRIBE companies` shows `description` as `text`, plus the four new columns.
- [ ] `SHOW TABLES LIKE 'company_products_services'` and `... 'company_profile_revisions'` both return a row.
- [ ] Company count is unchanged and every existing `industry_id` still resolves.
- [ ] The verification SQL returns `PRESENT` for every object and `0` orphaned offerings.

---

### Phase 2 — Backend capability

Extend the Company capability with the new fields, the offerings collection, completeness and revisions.

#### Tasks

- [ ] **2.1** Extend `capabilities/company/Contracts/Requests/UpdateProfileRequest.php` with
  `?string $description`, `?string $buyerType`, `?string $targetMarket`, `?string $website`,
  `?int $foundedYear`. Keep `industryId` (already present).
- [ ] **2.2** Validate in `UpdateProfile`: description `<= 5000`, buyer type in the enum, website
  `http(s)`, founded year `1900..currentYear`, target market `<= 1000`. Invalid input throws
  `InvalidArgumentException`; the endpoint returns `400` with a field-keyed error (same shape as today).
- [ ] **2.3** Map the new fields in `UpdateProfile` as a patch and keep the existing
  compliance/identity mappings. The endpoint must distinguish **absent** from **explicit `null`** by
  checking `array_key_exists` on the decoded body and passing a `clearFields` list into the command;
  explicit `null` clears `target_market`, `website` and `founded_year`, while an absent key leaves
  them untouched.
- [ ] **2.4** Create `CompanyProductRepository` with
  `listByCompany(int $companyId, bool $includeInactive = true)`, `create`, `update`, `deactivate`,
  `reorder`, `countActive`, `countUnpricedActive`. Every read filters by `company_id` **and**
  `tenant_id`.
- [ ] **2.5** Create command use cases `CreateProductService`, `UpdateProductService`,
  `DeactivateProductService`, `ReorderProductServices` with request DTOs. Each runs inside
  `TransactionManager`, stamps `created_by`/`updated_by` from the session, and returns `CommandResult`.
- [ ] **2.6** Create `ProfileRevisionRepository` with `nextRevisionNo`, `record`, `listByCompany`, and
  call it from `UpdateProfile` **inside the same transaction** (snapshot after the update, changed
  field names only, `source='profile_edit'`). Skip the write when nothing changed.
- [ ] **2.7** Create `IndustryRepository::pathFor(int $industryId)` returning
  `{id, name, path, isActive}` by walking `parent_id` (max depth guard 6). Used by profile, overview
  and reports.
- [ ] **2.8** Create `Contracts/Projections/ProfileCompleteness.php` — the single implementation of
  the weights and gap codes above. Signature: `for(array $company, array $offerings): array`.
- [ ] **2.9** Create `Contracts/Projections/ProductServiceSummary.php` and
  `Contracts/Responses/CompanyProfileResponse.php`.
- [ ] **2.10** Create `Application/Queries/GetProfile.php` and
  `api/company/queries/get-profile.php` (GET `id`, auth + company access).
- [ ] **2.11** Create the four command endpoints under `api/company/commands/`:
  `create-product-service.php`, `update-product-service.php`, `deactivate-product-service.php`,
  `reorder-product-services.php`. All POST, JSON, auth + access, `400` on validation failure.
- [ ] **2.12** Add `profileCompleteness` to `GetOverview` (and to `CompanyOverviewResponse`) by calling
  `ProfileCompleteness`; do not add offerings to the overview payload.
- [ ] **2.13** Extend `capabilities/company/AI.md` and `feature.json` with the new queries, commands,
  DTOs and invariants.
- [ ] **2.14** Add a CLI/PHP harness (`tests/CompanyProfile360.php`) covering: completeness fixture
  scores, price-null gap, inactive offering exclusion, revision monotonicity, cross-company access
  rejection.

#### Exit Criteria

- [ ] `GET get-profile.php?id=N` returns company fields, resolved industry path, offerings and
  completeness for an existing company, and `403` for a user without access.
- [ ] `POST update-profile.php` round-trips `description`, `buyer_type`, `target_market`, `website`,
  `founded_year`; a subsequent `get-profile` returns identical values.
- [ ] An invalid buyer type, a negative price and a future founded year each return `400` with a
  field-specific message and write nothing.
- [ ] Creating, editing, deactivating and reordering an offering all persist; deactivated rows remain
  readable but are excluded from completeness.
- [ ] Completeness equals the fixture expectation for: empty profile (`0`), contact + location only
  (`25`), fully populated with priced offerings (`100`), and one unpriced offering (loses `10`).
- [ ] Every accepted profile update increments `revision_no` by exactly 1; a no-op update adds no row.
- [ ] `php -l` passes on every touched PHP file.

---

### Phase 3 — Profile UI

Build the Profile tab and its sections in the Financial Indicators visual language.

#### Tasks

- [ ] **3.1** Add the `profile` route to `app.routes.ts` under `company/:id` and insert the
  **Profile** tab after Overview in `company-shell.component.ts` (icon `building-office` or
  `identification`, whichever exists in `ICON_PATHS`; add it if missing).
- [ ] **3.2** Create `src/app/components/company-shell/pages/profile/profile-page.component.ts` —
  page header (company + sector path + completeness chip), section nav (Identity, Positioning,
  Offerings, Completeness) driven by `?section=`, loading/error/empty states.
- [ ] **3.3** Create `profile-identity-card.component.ts` — name, trading name, registration number,
  contact person/number/email, address, city, suburb, business location, website, founded year.
  Reuses the existing `update-profile` command; no new endpoint.
- [ ] **3.4** Create `industry-picker.component.ts` — searchable hierarchical picker over
  `GET /api-nodes/industries` (or the existing industries service); displays the full path; shows
  "Sector not listed? Manage industries" linking to `/industries`.
- [ ] **3.5** Create `profile-positioning-card.component.ts` — long description (textarea with
  `5000` counter and guidance placeholder), buyer type segmented control (`B2B`, `B2C`, `Both`,
  `Not set`), target market textarea, `service_offering` one-liner.
- [ ] **3.6** Create `product-service-table.component.ts` — columns Offering, Type, Price, Basis,
  Status; sort by `sort_order`; row actions Edit / Deactivate / Move up / Move down; empty state
  with "Add your first product or service"; mobile card layout.
- [ ] **3.7** Create `product-service-form-dialog.component.ts` — add/edit dialog using the `.sw-modal`
  contract (fixed head/foot, scrollable body, **no backdrop close**), `.sw-*` classes, disabled submit
  while saving, inline validation, price formatted in ZAR, `price_basis='custom'` reveals
  `price_notes`.
- [ ] **3.8** Create `profile-completeness.component.ts` — score ring, band label, met/missing list
  with **Fix** buttons that navigate to the relevant section, and a one-line explanation of how the
  score is calculated.
- [ ] **3.9** Extend `company-overview.component.ts` with a compact "Business profile" card: sector
  path, buyer type, offering count, completeness chip, link to the tab. Remove any duplicated profile
  fields from Overview that now live in the Profile tab (do not remove the compliance card).
- [ ] **3.10** Extend `company-capability.service.ts` with `getProfile`, `createProductService`,
  `updateProductService`, `deactivateProductService`, `reorderProductServices`, and TypeScript
  interfaces mirroring the DTOs.
- [ ] **3.11** Persist view state with `ViewStateService` under `company-profile-view:${companyId}`
  (active section, offerings sort, collapsed cards, show-inactive toggle). Use the established
  constructor `effect()` pattern guarded until the company resolves.
- [ ] **3.12** Icons via `app-icon` only; add any missing semantic names to `ICON_PATHS`
  (`building-office`, `identification`, `tag`, `currency-dollar` already exists, `queue-list`,
  `arrow-up`, `arrow-down`). No Font Awesome, no raw inline SVG.
- [ ] **3.13** Responsive pass at 375 / 768 / 1280 px; ensure the offerings table becomes cards on
  mobile and the completeness panel stacks above the sections.

#### Exit Criteria

- [ ] `/company/:id/profile` renders for a real company and loads without console errors.
- [ ] All identity and positioning fields round-trip: edit → save → refresh → values persist.
- [ ] An offering can be added, edited, deactivated and reordered; prices render as `R 1 250,00`
  (or the project's existing ZAR format) and "No price" is explicit.
- [ ] The completeness ring and gap list update immediately after a save, with no full page reload.
- [ ] "Fix" on each gap lands on the correct section with the relevant field focused.
- [ ] Dialogs never close on backdrop click; header and footer stay fixed while the body scrolls.
- [ ] View state survives navigation away and back, and a refresh.
- [ ] `ng build --configuration development` completes with zero errors and zero new warnings.
- [ ] No Font Awesome classes or `<i class="fa…">` were introduced.

---

### Phase 4 — Integration and consistency

Make the rest of the application read the profile instead of re-asking for it.

#### Tasks

- [ ] **4.1** Replace the in-memory catalogue in
  `src/app/components/coaching-guide/products-services.component.ts` with the persisted
  `company_products_services` list (read-only summary + link to Profile to edit). Keep the coaching
  guide's own projections out of scope.
- [ ] **4.2** Add a "Business profile" section to the company executive report
  (`src/app/components/companies/company-detail/executive-report/`) — sector path, description,
  buyer type, target market, offerings table with prices.
- [ ] **4.3** Show sector and completeness on the company list/portfolio surfaces where a company
  row already exists (`companies-list.component.ts`), using the new projection rather than a new query.
- [ ] **4.4** Update the built-in form template guidance to state that the profile is the source of
  truth for products/pricing/target market (copy only — do not delete the questions).
- [ ] **4.5** Update `capabilities/company/AI.md`, `feature.json` and `docs/company-capability-plan.md`
  with the final profile contract.
- [ ] **4.6** Record the finish in the next `.ai/sessions/` file (next sequence number, today's date)
  and tick this sprint's tasks.

#### Exit Criteria

- [ ] The coaching guide's Products & Services screen shows the same offerings as the Profile tab.
- [ ] The executive report renders the profile section for a company with and without offerings.
- [ ] The company list shows a completeness indicator that matches `get-profile` for the same company.
- [ ] No screen asks the user to re-enter a profile fact that already exists in `companies` or
  `company_products_services`.
- [ ] Production build (`npm run prod`) succeeds; only pre-existing warnings remain.
- [ ] Session file and sprint checkboxes are updated.

---

## Execution Order

```
Phase 1 ──> Data foundation and migration
    │            (schema + verification, no behaviour change)
    ▼
Phase 2 ──> Backend capability
    │            (fields, offerings, completeness, revisions)
    ▼
Phase 3 ──> Profile UI
    │            (Profile tab, dialogs, completeness panel)
    ▼
Phase 4 ──> Integration and consistency
                 (coaching guide, report, list, docs)
```

Each phase must satisfy its **Exit Criteria** before the next begins. Phases 1–2 are independently
deployable; Phase 3 must not ship without Phase 2.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   ├── 2026-10-20-company-profile-360.sql            (new)
│   └── deployment/verify-013-profile-360.sql          (new)
├── capabilities/company/
│   ├── Application/
│   │   ├── Commands/
│   │   │   ├── UpdateProfile.php                      (extend)
│   │   │   ├── CreateProductService.php               (new)
│   │   │   ├── UpdateProductService.php               (new)
│   │   │   ├── DeactivateProductService.php           (new)
│   │   │   └── ReorderProductServices.php             (new)
│   │   └── Queries/
│   │       ├── GetOverview.php                        (extend)
│   │       └── GetProfile.php                         (new)
│   ├── Contracts/
│   │   ├── Projections/
│   │   │   ├── ProfileCompleteness.php                (new)
│   │   │   └── ProductServiceSummary.php              (new)
│   │   ├── Requests/
│   │   │   ├── UpdateProfileRequest.php               (extend)
│   │   │   ├── CreateProductServiceRequest.php        (new)
│   │   │   ├── UpdateProductServiceRequest.php        (new)
│   │   │   └── ReorderProductServicesRequest.php      (new)
│   │   └── Responses/CompanyProfileResponse.php       (new)
│   └── Repository/
│       ├── CompanyRepository.php                      (extend)
│       ├── CompanyProductRepository.php               (new)
│       ├── ProfileRevisionRepository.php              (new)
│       └── IndustryRepository.php                     (new)
└── api/company/
    ├── queries/get-profile.php                        (new)
    └── commands/
        ├── create-product-service.php                 (new)
        ├── update-product-service.php                 (new)
        ├── deactivate-product-service.php             (new)
        └── reorder-product-services.php               (new)

src/app/
├── components/company-shell/
│   ├── company-shell.component.ts                     (tab order)
│   ├── company-overview/company-overview.component.ts  (summary card)
│   └── pages/profile/
│       ├── profile-page.component.ts                  (new)
│       └── components/
│           ├── profile-identity-card.component.ts      (new)
│           ├── profile-positioning-card.component.ts   (new)
│           ├── profile-completeness.component.ts       (new)
│           ├── industry-picker.component.ts            (new)
│           ├── product-service-table.component.ts      (new)
│           └── product-service-form-dialog.component.ts (new)
├── app.routes.ts                                      (route)
├── services/company-capability.service.ts             (client)
└── shared/components/app-icon/app-icon.ts             (icons)
```

---

## Out of Scope

- **Entrepreneur submissions and links** — Sprint 014.
- **Portfolio dashboard and health scoring** — Sprint 015.
- **Report generation and distribution** — Sprint 016.
- **Document/file uploads** (company registration documents, price lists, images) — no document vault
  in this sprint.
- **Multi-currency** — `currency` exists but only `ZAR` is written.
- **Price history / price lists per customer** — current price only.
- **Migrating legacy form answers or `consolidated_assessment` data into the profile** — explicitly
  deferred; a backfill that guesses violates invariant 4.
- **AI-generated descriptions or sectors** — no inference.
- **Deleting `service_offering`** — retained as the one-line headline for backward compatibility.
- **Redesigning the compliance card, directors, financial indicators or ownership derivation.**

---

## Future Modules (Reserved)

- Products linked to financial accounts (revenue per offering).
- Price-list attachments and quotes.
- Sector-specific benchmark metrics.
- Profile verification/attestation workflow (a coach signs off profile accuracy).
- Profile data quality rules per programme/funder.

These must not be pre-built here. The schema above leaves room: offerings already carry `currency`,
`price_basis` and `target_segment`; revisions already carry `source`.

---

## Definition of Done

The sprint is complete when:

- [ ] All four phases and their exit criteria are satisfied.
- [ ] A company profile can be completed end-to-end without touching the database.
- [ ] Sector, description, buyer type, target market, offerings and prices persist and reload correctly.
- [ ] Completeness is derived by one backend projection and matches the UI in every state.
- [ ] Every profile change writes exactly one revision; no-ops write none.
- [ ] The Profile tab follows the established visual language (header, summary cards, `.sw-*` dialogs,
      `app-icon`, ZAR formatting, responsive layout).
- [ ] Overview, coaching guide and executive report read the same facts; nothing is duplicated.
- [ ] No legacy financial screen was modified.
- [ ] `ng build --configuration development` is clean; `npm run prod` succeeds.
- [ ] `php -l` passes on all touched PHP; the harness in `tests/CompanyProfile360.php` passes.
- [ ] Migration is idempotent and verified locally; deployment notes list every file and the order.
- [ ] Session file and sprint checkboxes are updated.
