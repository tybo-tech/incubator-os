# Grant Applications — Full Analysis

## Context Discovery

```
Feature: Grant Applications
Module: admin/grant-funding
Entry Route: /admin/grant-funding/applications/:id
Parent: ApplicantShellComponent
Lazy: Yes (lazy loaded)
Capability: Grant Applications
```

## Routing

```
/admin/grant-funding/applications (list)
↓
/admin/grant-funding/applications/:id (ApplicantShellComponent)
└── /applications/:id/overview     → ApplicantOverviewComponent (lazy)
└── /applications/:id/compliance   → ApplicantComplianceComponent (lazy)
└── /applications/:id/bank-statements → ApplicantBankStatementsComponent (lazy)
```

**Guards:** `authGuard` on parent `AppShellComponent`

## Component Tree

```
ApplicantShellComponent
│   Purpose: Shell with sticky header, applicant identity, current stage badge
│   Services: GrantApplicationService, WorkflowService
│   State: application (signal), isLoading (signal)
│   Computed: initial, currentStage, currentStageBgClass, currentStageDotClass
│
└── ApplicantOverviewComponent (default route)
    │   Purpose: Stage-based workspace with workflow tabs, ID card, bank summary,
    │            checklist, and stage-specific panels
    │   Services: GrantApplicationApiService, WorkflowService
    │   State: data (signal), isLoading, selectedStage, showEditModal, overview
    │   Children:
    │   ├── ApplicantIdCardComponent
    │   ├── ApplicantEditModalComponent
    │   ├── ApplicantBankStatementSummaryComponent
    │   ├── ApplicantChecklistComponent
    │   ├── ApplicantCompanyInfoComponent
    │   ├── ApplicantAddressComponent
    │   ├── ApplicantOwnershipComponent
    │   ├── ApplicantDirectorsComponent
    │   ├── ApplicantDocumentsComponent
    │   ├── ApplicantComplianceComponent
    │   ├── ApplicantBankStatementsComponent ← ROOT COMPONENT
    │   ├── ApplicantInterviewComponent
    │   ├── ApplicantBusinessProcessComponent
    │   └── ApplicantStageActionsComponent
    │
    └── ApplicantBankStatementsComponent (embedded via [embeddedApplicantId])
        │   Purpose: Monthly turnover capture by financial year (Mar→Feb).
        │            One row per FY, 12 month columns, auto-save on input.
        │   Inputs: embeddedApplicantId (number)
        │   Outputs: statsChanged (EventEmitter<{months, grandTotal}>)
        │   Services: GrantApplicationService
        │   State: isLoading (signal), showFyDropdown (signal), rows (signal<FyRow[]>),
        │          toast (signal)
        │   Computed: grandTotal, availableFys
        │   Methods: loadStatements(), addFyRow(), saveRow(), deleteRow(),
        │            onMonthInput(), recalcTotal(), toggleFyDropdown()
        │   Constants: FINANCIAL_YEARS, FY_MONTH_COLUMNS
```

## Services

### GrantApplicationService (`src/app/admin/grant-funding/services/grant-application.service.ts`)
- `getBankStatements(applicationId)` → `GET /api-nodes/node/get-nodes.php?type=grant_bank_statement&parentId=N`
- `saveBankStatement(applicationId, data)` → upsert: finds existing by financial_year_id, updates or creates
- `deleteBankStatement(id)` → `DELETE /api-nodes/node/delete-node.php?nodeId=N`
- `getCompliance(applicationId)` → `GET /api-nodes/node/get-nodes.php?type=grant_compliance&parentId=N`
- `saveCompliance(applicationId, data)` → upsert
- `getApplicationById(id)` → `GET /api-nodes/node/get-node.php?nodeId=N`
- `createApplication(data)` → `POST /api-nodes/node/add-node.php`
- `updateApplication(id, data)` → `GET + PUT /api-nodes/node/update-node.php`
- `deleteApplication(id)` → `DELETE /api-nodes/node/delete-node.php?nodeId=N`
- `getAllApplications()` → `GET /api-nodes/node/get-nodes-by-type.php?type=grant_application`

### GrantApplicationApiService (`src/app/admin/grant-funding/services/grant-application-api.service.ts`)
- `getOverview(applicantId)` → `GET /api/grant-applications/queries/get-overview.php?applicantId=N`
- `updateApplication(applicantId, data)` → `PUT /api/grant-applications/commands/update-application.php`
- `getCohorts()` → `GET /api-nodes/category/list-categories.php?type=cohort`
- `executeImport(applicantIds, cohortId, status)` → `POST /api/grant-applications/commands/execute-import-companies.php`
- `undoImport(cohortId)` → `POST /api/grant-applications/commands/undo-import-companies.php`

### NodeService (`src/services/node.service.ts`)
- Generic CRUD for JSON nodes stored in MySQL
- Endpoints: `get-node.php`, `get-nodes.php`, `get-nodes-by-type.php`, `add-node.php`, `update-node.php`, `delete-node.php`, `add-nodes-batch.php`, `update-nodes-batch.php`

## State Management

| State | Location | Type |
|---|---|---|
| Bank statement rows | `ApplicantBankStatementsComponent.rows` | `signal<FyRow[]>` |
| Grand total | `ApplicantBankStatementsComponent.grandTotal` | Computed signal |
| Available FYs to add | `ApplicantBankStatementsComponent.availableFys` | Computed signal |
| Loading state | `ApplicantBankStatementsComponent.isLoading` | Signal |
| Toast notifications | `ApplicantBankStatementsComponent.toast` | Signal |
| Dropdown visibility | `ApplicantBankStatementsComponent.showFyDropdown` | Signal |
| Row save timeout | `FyRow.saveTimeout` | Local property (debounce) |
| Application data | `ApplicantOverviewComponent.data` | Signal |
| Denormalized bank stats | `IGrantApplicationData.bank_statement_months/grand_total` | Stored on parent node |

## Data Flow

```
ApplicantBankStatementsComponent.ngOnInit()
│
├── route.parent.params → applicantId → loadStatements()
│   └── grantService.getBankStatements(applicantId)
│       └── GET /api-nodes/node/get-nodes.php?type=grant_bank_statement&parentId=N
│           └── PHP → Node.php → MySQL
│               └── JSON → GrantBankStatement[]
│                   └── Convert to FyRow[], sort by fy_start_year
│
├── User edits month input → onMonthInput(row)
│   ├── recalcTotal(row) → updates row.total
│   ├── Clear existing saveTimeout
│   └── setTimeout → saveRow(row, silent=true) at 800ms debounce
│       └── grantService.saveBankStatement(applicantId, data)
│           ├── GET existing statements → find match by financial_year_id
│           ├── If match: PUT /api-nodes/node/update-node.php
│           └── If no match: POST /api-nodes/node/add-node.php
│               └── Response → row.nodeId = node.id
│                   └── emitStats() → statsChanged.emit({months, grandTotal})
│                       └── ApplicantOverviewComponent.onBankStatsChanged()
│                           └── save({bank_statement_months, bank_statement_grand_total})
│                               └── PUT /api/grant-applications/commands/update-application.php
│
├── User clicks "Add Financial Year" → addFyRow(fy)
│   └── Insert new FyRow sorted by fy_start_year
│
└── User clicks delete → deleteRow(row)
    ├── If no nodeId: remove from UI only
    └── If has nodeId: confirm → grantService.deleteBankStatement(nodeId)
        └── DELETE /api-nodes/node/delete-node.php?nodeId=N
            └── emitStats()
```

## Write Operations

| Operation | Trigger | Service Method | API Endpoint | Side Effects |
|---|---|---|---|---|
| Save bank statement row | Month input (800ms debounce) | `saveBankStatement()` | POST/PUT node | Updates row.nodeId, emits statsChanged |
| Delete bank statement row | Delete button + confirm | `deleteBankStatement()` | DELETE node | Removes row, emits statsChanged |
| Add FY row | Dropdown selection | None (local) | — | Inserts sorted FyRow into signal |
| Update denormalized stats | `statsChanged` event | `updateApplication()` | PUT update-application.php | Updates parent node data |

## Business Logic

| Logic | Location | Classification |
|---|---|---|
| Row sorting by fy_start_year | `loadStatements()` + `addFyRow()` | Should remain in frontend |
| Grand total calculation | `grandTotal` computed signal | Should remain in frontend |
| Available FYs filter (exclude used) | `availableFys` computed signal | Should remain in frontend |
| Month input border color (null/0/value) | `monthInputClass()` | Should remain in frontend |
| Auto-save debounce (800ms) | `onMonthInput()` | Should remain in frontend |
| Bank statement upsert logic | `saveBankStatement()` | Should remain in frontend (optimistic UI) |
| Stats emission to parent | `emitStats()` | Should remain in frontend |
| Denormalized stats save to parent node | `onBankStatsChanged()` | Should move to backend (trigger on bank statement save) |

## Technical Debt

### Frontend
1. **Dual service pattern** — `GrantApplicationService` (NodeService-based) and `GrantApplicationApiService` (dedicated API) both exist. Bank statements use the former, overview uses the latter.
2. **Denormalized stats on parent node** — `bank_statement_months` and `bank_statement_grand_total` are stored on the application node and updated on every bank statement change. This should be a computed query, not stored data.
3. **`confirm()` dialog** — `deleteRow()` uses browser `confirm()` instead of a proper modal.
4. **Console.log in production** — `saveBankStatement()` logs to console.
5. **No error state UI in bank statements** — `loadStatements()` error handler only sets `isLoading(false)` with no error message displayed.
6. **`GrantApplicationApiService.getBankStatements()` is a legacy fallback** — duplicates `GrantApplicationService.getBankStatements()`.

### Backend
1. **No dedicated bank statement endpoint** — Uses generic Node CRUD instead of a capability endpoint.
2. **No computed bank statement summary endpoint** — Summary must be calculated client-side or stored denormalized.

## Recommendations

### Priority: High
- Remove `confirm()` dialog — replace with proper modal component
- Add error state UI to `ApplicantBankStatementsComponent`
- Remove legacy `getBankStatements()` from `GrantApplicationApiService`

### Priority: Medium
- Create dedicated bank statement capability endpoint (GET/POST/PUT/DELETE)
- Move denormalized stats calculation to backend (trigger on bank statement save)
- Consolidate `GrantApplicationService` and `GrantApplicationApiService`

### Priority: Low
- Remove console.log from production code
- Add loading skeleton instead of spinner
