# Company Management — AI Context

## Feature Summary
Tabbed company workspace at `/company/:id` with 7 sub-features: Overview, Assessment, SWOT Analysis, GPS Targets, Financials, Compliance, and Coaching/Guide. Context (client/program/cohort IDs) is preserved across all child routes via `ContextService`.

## Main Components
- `CompanyShellComponent` — parent shell with sticky header, company info, 7 navigation tabs, context persistence
- `CompanyOverviewComponent` — displays company info, compliance status, ownership details, metric cards
- `FinancialShellComponent` — nested shell with 10 financial sub-tabs (revenue capture, cost capture, profits, balance sheet, ratios, etc.)
- `FinancialBaseComponent` — abstract base for all financial domain components (data loading, error handling, unsaved changes, bulk save)

## Key Services
- `CompanyService` — CRUD for companies via PHP API
- `ContextService` — BehaviorSubject holding `{clientId, programId, cohortId, companyId}`
- `FinancialChartService` — pie chart data generation
- `FinancialComparisonService` — year-over-year chart data
- `FinancialItemHandlerService` — standardized CRUD for financial table items
- `RevenueCaptureHelperService` — yearly stats to UI transformation

## Main APIs
- `GET /api-nodes/company/get-company.php?id=N` — fetch company by ID
- `POST /api-nodes/company/update-company.php` — update company
- `POST /api-nodes/company/bulk-import-companies.php` — bulk import
- `GET /api-nodes/financial/...` — financial item CRUD (via `CompanyFinancialItemService`)

## Business Rules
- Compliance score = average of 4 boolean factors (B-BBEE, tax, CIPC, business status) — frontend
- SWOT category normalization (plural/singular) — frontend, should move to backend
- GPS status mapping (pending→not_started, etc.) — frontend, should move to backend
- Year-over-year growth rate calculation — frontend, should move to backend

## Known Problems
- `pages/` directory (~1,700 lines) is orphaned — not wired into routes
- Duplicate SWOT implementations (monolithic + refactored)
- `CompanyFinancialsComponent` uses hardcoded mock data
- `FinancialDashboardComponent` is unused
- Console.log in production code paths

## Current Technical Debt
- Mixed eager/lazy loading in financial routes
- Business logic (category normalization, status mapping) in frontend
- No single "get company overview" backend endpoint

## Suggested Backend Capability
`CompanyCapability` with queries: `getCompany()`, `getOverview()` and commands: `updateCompany()`, `bulkImport()`

## Important Files
- `src/app/components/company-shell/company-shell.component.ts`
- `src/app/components/company-shell/company-overview/company-overview.component.ts`
- `src/app/components/company-shell/financial-shell/financial-shell.component.ts`
- `src/app/components/company-shell/financial-shell/components/financial-base.component.ts`
- `src/services/company.service.ts`
- `src/services/context.service.ts`
- `src/app/app.routes.ts`
