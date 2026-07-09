# Company Management — Full Analysis

## Context Discovery

```
Feature: Company Management
Module: company-shell
Entry Route: /company/:id
Parent: AppShellComponent (authenticated)
Lazy: No (eagerly loaded)
Capability: Company Management
```

## Routing

```
/companies (list)
↓
/company/:id (CompanyShellComponent)
├── /company/:id/overview       → CompanyOverviewComponent
├── /company/:id/assessment     → AssessmentTabComponent (from company-detail/)
├── /company/:id/swot           → SwotTabComponent (from company-detail/)
├── /company/:id/gps-targets    → GpsTargetsTabComponent (from company-detail/)
├── /company/:id/financials     → FinancialShellComponent
│   ├── /financials/revenue-capture    → CompanyRevenueCaptureComponent (lazy)
│   ├── /financials/monthly-revenue    → MonthlyRevenueComponent
│   ├── /financials/cost-capture       → CostStructureDemoComponent
│   ├── /financials/bank-statements    → BankStatementsComponent
│   ├── /financials/revenue            → RevenueComponent
│   ├── /financials/profits            → ProfitsComponent
│   ├── /financials/cost-structure    → QuarterlyCostSummaryComponent
│   ├── /financials/balance-sheet     → BalanceSheetComponent
│   ├── /financials/ratios             → RatiosComponent
│   ├── /financials/funds-received    → FundsReceivedComponent
│   └── /financials/employee-count    → EmployeeCountComponent
├── /company/:id/compliance     → ComplianceShellComponent
│   ├── /compliance/annual-returns          (lazy)
│   ├── /compliance/beneficial-ownership    (lazy)
│   ├── /compliance/tax-registrations       (lazy)
│   ├── /compliance/bbbee-compliance        (lazy)
│   └── /compliance/other-statutory-tasks   (lazy)
└── /company/:id/coaching       → CoachingGuideShellComponent
    ├── /coaching/products-services  (lazy)
    ├── /coaching/marketing          (lazy)
    ├── /coaching/sales              (lazy)
    └── /coaching/coaching-notes     (lazy)
```

**Query params preserved across all child routes:** `clientId`, `programId`, `cohortId` (via `ContextService.getQueryParams()`)

**Guards:** `authGuard` on parent `AppShellComponent` (applied to all children via `canActivateChild`)

## Services

### CompanyService (`src/services/company.service.ts`)
- `getCompanyById(id)` → `GET /api-nodes/company/get-company.php?id=N`
- `getCompanyByRegNo(regNo)` → `GET /api-nodes/company/get-company.php?registration_no=X`
- `addCompany(data)` → `POST /api-nodes/company/add-company.php`
- `updateCompany(id, data)` → `POST /api-nodes/company/update-company.php`
- `upsertCompanyByRegNo(regNo, data)` → `POST /api-nodes/company/upsert-company-by-regno.php`
- `searchCompanies(filters, limit, offset)` → `GET /api-nodes/company/search-companies.php`
- `searchCompaniesAdvanced(options)` → `GET /api-nodes/company/search-companies.php`
- `listCompanies(limit, offset)` → `GET /api-nodes/company/list-companies.php`
- `getCompaniesByIndustry(industryId, options)` → `GET /api-nodes/company/list-companies.php`
- `deleteCompany(id)` → `POST /api-nodes/company/delete-company.php`
- `setIndustryByName(companyId, industryName)` → `POST /api-nodes/company/set-industry-by-name.php`
- `bulkImportCompanies(companies, upsertByRegNo)` → `POST /api-nodes/company/bulk-import-companies.php`

### ContextService (`src/services/context.service.ts`)
- `BehaviorSubject<AppContext>` holding `{clientId, programId, cohortId, companyId}`
- `extractContextFromRoute(route)` — reads query params and route params
- `getQueryParams()` — returns non-null context values as query params object
- `navigateWithContext(router, path)` — navigates with preserved context
- `hasCompanyContext()` — checks all 4 IDs are present
- `clearContext()` — resets to all nulls

### Financial Shell Services
- `FinancialChartService` — pie chart data generation with color palettes
- `FinancialComparisonService` — year-over-year line/bar chart data
- `FinancialItemHandlerService` — standardized CRUD for financial table items
- `RevenueCaptureHelperService` — transforms yearly stats to UI format, saves account data

## State Management

| State | Location | Type |
|---|---|---|
| Company data | `CompanyShellComponent.company` | Local property |
| Company ID | `CompanyShellComponent.companyId` | Route param |
| Context (client/program/cohort) | `ContextService.context$` | BehaviorSubject |
| Current URL for tab highlighting | `CompanyShellComponent.currentUrl` | Local property |
| Financial items | `FinancialBaseComponent.items` | Signal |
| Loading/error states | `FinancialBaseComponent.isLoading/hasError` | Signal |
| Unsaved changes | `FinancialBaseComponent.unsavedChanges` | Signal<Map> |
| Financial context | `FinancialBaseComponent.financialContext` | Computed signal |

## Data Flow

```
CompanyShellComponent.ngOnInit()
│
├── contextService.extractContextFromRoute(route)
│   └── reads queryParams → updates BehaviorSubject<AppContext>
│
├── route.params → companyId → loadCompanyInfo()
│   └── companyService.getCompanyById(id)
│       └── GET /api-nodes/company/get-company.php?id=N
│           └── PHP → Node.php → MySQL
│               └── JSON Response → ICompany
│
├── contextService.context$ → subscribes to context changes
│
└── router.events (NavigationEnd) → tracks currentUrl for tab highlighting
```

## Write Operations

| Operation | Trigger | Service Method | API Endpoint | Side Effects |
|---|---|---|---|---|
| Load company | Route param change | `getCompanyById()` | `GET get-company.php` | Updates metrics |
| Bulk save financial items | User save | `bulkUpdateFinancialItems()` / `bulkCreateFinancialItems()` | POST | Refreshes data, clears unsaved |
| Persist single item | User save | `updateCompanyFinancialItem()` / `addCompanyFinancialItem()` | POST | Refreshes profit summary |
| Delete financial item | User delete | `deleteCompanyFinancialItem()` | POST | Refreshes items list |
| Save account data | User save | `saveMonthlyData()` | POST | Updates yearly stats |
| Create empty record | Add account | `addYearlyStats()` | POST | Adds to local array |
| Delete account | User delete | `deleteYearlyStats()` | POST | Removes from local array |

## Business Logic

| Logic | Location | Classification |
|---|---|---|
| Compliance score calculation (4 factors → percentage) | `CompanyOverviewComponent.updateCompanyMetrics()` | Should remain in frontend (UI presentation) |
| Compliance status text generation | `CompanyOverviewComponent.getComplianceStatus()` | Should remain in frontend |
| Metric card assembly | `CompanyOverviewComponent.updateCompanyMetrics()` | Should remain in frontend |
| SWOT category normalization (plural/singular) | `SwotComponent.convertToSwotItems()` | Should move to backend (data normalization) |
| GPS progress percentage calculation | `GpsTargetsComponent.getProgressPercentage()` | Should remain in frontend |
| GPS status mapping (pending→not_started, etc.) | `GpsTargetsComponent.mapActionItemStatusToGpsStatus()` | Should move to backend (status enum mapping) |
| Financial year monthly totals | `FinancialComparisonService.calculateMonthlyTotals()` | Should remain in frontend (chart data prep) |
| Year-over-year growth rate calculation | `FinancialComparisonService.getComparisonSummary()` | Should move to backend (business calculation) |
| Unsaved changes tracking | `FinancialBaseComponent.trackUnsavedChange()` | Should remain in frontend |
| Bulk save separation (new vs existing) | `FinancialBaseComponent.bulkSaveChanges()` | Should remain in frontend |

## Technical Debt

### Frontend
1. **Orphaned `pages/` directory** — `AssessmentComponent`, `SwotComponent`, `GpsTargetsComponent` (~1,700 lines) are not wired into routes. Routes use `AssessmentTabComponent`, `SwotTabComponent`, `GpsTargetsTabComponent` from `company-detail/` instead.
2. **Duplicate SWOT implementations** — `swot.component.ts` (872 lines, monolithic) and `swot-refactored.component.ts` (308 lines, service-delegated) both exist. Neither is used by current routes.
3. **Orphaned `company-financials/`** — `CompanyFinancialsComponent` (242 lines) is not referenced in routes. `FinancialShellComponent` is the canonical implementation.
4. **Mixed routing patterns** — Financial routes mix `component:` (eager) and `loadComponent:` (lazy) inconsistently. Only `revenue-capture` uses lazy loading.
5. **Console.log in production code** — `CompanyShellComponent`, `ContextService`, `FinancialShellComponent`, `FinancialBaseComponent` all log to console.
6. **Mock data in `CompanyFinancialsComponent`** — Hardcoded values (R 2.4M revenue, etc.) with no API integration.
7. **Mock data in `FinancialDashboardComponent`** — Executive summary uses hardcoded mock values, not real data.
8. **`FinancialDashboardComponent` is unused** — Not referenced in any route or template.

### Backend
1. **Missing capability endpoints** — No single "get company overview" endpoint; each tab makes separate API calls.
2. **Duplicated CRUD** — Multiple PHP files for company CRUD instead of a single capability service.

## Recommendations

### Priority: High
- Delete or wire up `pages/` directory components
- Delete `swot.component.ts` (monolithic) and keep `swot-refactored.component.ts`
- Delete `company-financials/` directory
- Delete `FinancialDashboardComponent` if unused
- Remove console.log calls from production code

### Priority: Medium
- Standardize financial routes — use `loadComponent:` consistently
- Replace mock data in `CompanyFinancialsComponent` with real API calls or remove the component
- Move SWOT category normalization to backend
- Move GPS status mapping to backend
- Move year-over-year growth calculation to backend

### Priority: Low
- Add route guards on child routes if needed
- Consider lazy loading Assessment, SWOT, and GPS Targets tabs
