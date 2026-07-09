# Grant Applications — API Inventory

## Bank Statement Endpoints (via NodeService)

| Endpoint | Method | Used By | Parameters | Response | Purpose |
|---|---|---|---|---|---|
| `get-nodes.php` | GET | `GrantApplicationService.getBankStatements()` | `type=grant_bank_statement`, `parentId={applicationId}` | `GrantBankStatement[]` | List bank statements for an application |
| `add-node.php` | POST | `GrantApplicationService.saveBankStatement()` (create) | `{type, parent_id, data}` | `GrantBankStatement` | Create new bank statement row |
| `update-node.php` | PUT | `GrantApplicationService.saveBankStatement()` (update) | `{id, type, data}` | `GrantBankStatement` | Update existing bank statement row |
| `delete-node.php` | DELETE | `GrantApplicationService.deleteBankStatement()` | `nodeId` | `any` | Delete bank statement row |

## Application Endpoints (via NodeService)

| Endpoint | Method | Used By | Parameters | Response | Purpose |
|---|---|---|---|---|---|
| `get-node.php` | GET | `GrantApplicationService.getApplicationById()` | `nodeId` | `GrantApplication` | Fetch single application |
| `get-nodes-by-type.php` | GET | `GrantApplicationService.getAllApplications()` | `type=grant_application` | `GrantApplication[]` | List all applications |
| `add-node.php` | POST | `GrantApplicationService.createApplication()` | `{type, data}` | `GrantApplication` | Create application |
| `update-node.php` | PUT | `GrantApplicationService.updateApplication()` | `{id, type, data}` | `GrantApplication` | Update application |
| `delete-node.php` | DELETE | `GrantApplicationService.deleteApplication()` | `nodeId` | `any` | Delete application |

## Compliance Endpoints (via NodeService)

| Endpoint | Method | Used By | Parameters | Response | Purpose |
|---|---|---|---|---|---|
| `get-nodes.php` | GET | `GrantApplicationService.getCompliance()` | `type=grant_compliance`, `parentId={applicationId}` | `GrantCompliance[]` | Get compliance record |
| `add-node.php` | POST | `GrantApplicationService.saveCompliance()` (create) | `{type, parent_id, data}` | `GrantCompliance` | Create compliance record |
| `update-node.php` | PUT | `GrantApplicationService.saveCompliance()` (update) | `{id, type, data}` | `GrantCompliance` | Update compliance record |

## Dedicated Grant API Endpoints (via GrantApplicationApiService)

| Endpoint | Method | Used By | Parameters | Response | Purpose |
|---|---|---|---|---|---|
| `queries/get-overview.php` | GET | `GrantApplicationApiService.getOverview()` | `applicantId` | `ApplicantOverview` | Full overview with workflow, application, DD answers |
| `commands/update-application.php` | PUT | `GrantApplicationApiService.updateApplication()` | `{applicantId, data}` | `GrantApplication` | Update application data |
| `commands/execute-import-companies.php` | POST | `GrantApplicationApiService.executeImport()` | `{cohort_id, status}` | `ImportResult` | Import applicants to cohort |
| `commands/undo-import-companies.php` | POST | `GrantApplicationApiService.undoImport()` | `{cohort_id}` | `UndoResult` | Undo import |

## Backend File Mapping

```
api-incubator-os/api-nodes/node/
├── get-node.php
├── get-nodes.php
├── get-nodes-by-type.php
├── add-node.php
├── update-node.php
├── delete-node.php
├── add-nodes-batch.php
└── update-nodes-batch.php

api-incubator-os/api-nodes/grant/
├── applicants.php
├── applicant-submissions.php
├── applicant-financial-summary.php
├── financial-overview.php
├── schedule.php
└── form-analytics.php

api-incubator-os/api/grant-applications/
├── queries/
│   └── get-overview.php
└── commands/
    ├── update-application.php
    ├── execute-import-companies.php
    └── undo-import-companies.php
```

## IGrantBankStatementData Shape

```typescript
interface IGrantBankStatementData {
  financial_year_id: number;      // FK to financial_years table
  financial_year_name: string;     // e.g. "FY 2024/2025"
  m1?: number;   // Mar (fy_start_year) — undefined = not captured
  m2?: number;   // Apr
  m3?: number;   // May
  m4?: number;   // Jun
  m5?: number;   // Jul
  m6?: number;   // Aug
  m7?: number;   // Sep
  m8?: number;   // Oct
  m9?: number;   // Nov
  m10?: number;  // Dec
  m11?: number;  // Jan (fy_end_year)
  m12?: number;  // Feb (fy_end_year)
  total_amount: number;
  notes?: string;
}
```

## Predefined Financial Years

```typescript
const FINANCIAL_YEARS = [
  { id: 2,  name: 'FY 2020/2021', fy_start_year: 2020 },
  { id: 3,  name: 'FY 2021/2022', fy_start_year: 2021 },
  { id: 4,  name: 'FY 2022/2023', fy_start_year: 2022 },
  { id: 5,  name: 'FY 2023/2024', fy_start_year: 2023 },
  { id: 1,  name: 'FY 2024/2025', fy_start_year: 2024 },
  { id: 7,  name: 'FY 2025/2026', fy_start_year: 2025 },
  { id: 8,  name: 'FY 2026/2027', fy_start_year: 2026 },
  { id: 9,  name: 'FY 2027/2028', fy_start_year: 2027 },
  { id: 10, name: 'FY 2028/2029', fy_start_year: 2028 },
  { id: 11, name: 'FY 2029/2030', fy_start_year: 2029 },
  { id: 12, name: 'FY 2030/2031', fy_start_year: 2030 },
  { id: 13, name: 'FY 2031/2032', fy_start_year: 2031 },
  { id: 14, name: 'FY 2032/2033', fy_start_year: 2032 },
];
```
