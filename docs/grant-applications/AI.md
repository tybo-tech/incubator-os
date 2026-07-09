# Grant Applications — AI Context

## Feature Summary
Grant funding workflow at `/admin/grant-funding/applications/:id` with stage-based review (Applied → Due Diligence → Screening → Demo → Approved/Declined). Bank statements are captured per financial year (Mar→Feb) with 12 monthly turnover inputs and auto-save.

## Main Components
- `ApplicantShellComponent` — shell with applicant identity and current stage badge
- `ApplicantOverviewComponent` — stage workspace with workflow tabs, embeds all child panels
- `ApplicantBankStatementsComponent` — monthly turnover table, one row per FY, auto-save on input, emits stats to parent

## Key Services
- `GrantApplicationService` — CRUD for grant nodes via generic NodeService
- `GrantApplicationApiService` — dedicated grant API (overview, update, import)
- `NodeService` — generic JSON node CRUD against MySQL

## Main APIs
- `GET /api-nodes/node/get-nodes.php?type=grant_bank_statement&parentId=N` — list bank statements
- `POST /api-nodes/node/add-node.php` — create bank statement row
- `PUT /api-nodes/node/update-node.php` — update bank statement row
- `DELETE /api-nodes/node/delete-node.php?nodeId=N` — delete bank statement row
- `GET /api/grant-applications/queries/get-overview.php?applicantId=N` — full overview
- `PUT /api/grant-applications/commands/update-application.php` — update application

## Business Rules
- Bank statement upsert: find existing by financial_year_id, update or create — frontend
- Denormalized stats (months, grandTotal) saved to parent node on every change — should move to backend
- Auto-save debounced at 800ms — frontend
- Row sorting by fy_start_year — frontend

## Known Problems
- Dual service pattern (NodeService vs dedicated API)
- Denormalized stats stored on parent node instead of computed
- `confirm()` dialog instead of modal
- No error state UI in bank statements component

## Current Technical Debt
- Legacy `getBankStatements()` in `GrantApplicationApiService` duplicates `GrantApplicationService`
- No dedicated bank statement capability endpoint

## Suggested Backend Capability
`GrantBankStatementCapability` with queries: `getBankStatements(applicationId)`, `getBankStatementSummary(applicationId)` and commands: `saveBankStatement(applicationId, data)`, `deleteBankStatement(id)`

## Important Files
- `src/app/admin/grant-funding/applicant-shell/pages/applicant-bank-statements.component.ts`
- `src/app/admin/grant-funding/services/grant-application.service.ts`
- `src/app/admin/grant-funding/services/grant-application-api.service.ts`
- `src/app/admin/grant-funding/interfaces/grant-application.interfaces.ts`
- `src/app/admin/grant-funding/applicant-shell/applicant-shell.component.ts`
- `src/app/admin/grant-funding/applicant-shell/pages/applicant-overview.component.ts`
- `src/services/node.service.ts`
