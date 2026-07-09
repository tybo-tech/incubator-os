# Feature Analyzer

## Purpose

Given a root Angular component, produce complete end-to-end technical documentation of that feature. The output becomes the knowledge base that future AI sessions use to understand, refactor, or extend the feature without rediscovering the codebase.

## Inputs

Accepts one root Angular component path or name.

```
src/app/admin/grant-funding/applicant-shell/pages/applicant-overview.component.ts
```

or

```
ApplicantOverviewComponent
```

## Analysis Workflow

### Phase 1 — Component Analysis

Read the component's TS, template, and styles. Extract:

- Purpose
- Inputs (`@Input()`)
- Outputs (`@Output()`)
- Signals
- Variables
- Computed values
- Methods
- Lifecycle hooks
- Events
- Models / Interfaces used

### Phase 2 — Component Tree

Recursively discover all child components. For each child document:

- Responsibility
- Inputs
- Outputs
- Events
- Services
- Dependencies

Generate a component hierarchy:

```
ApplicantOverview
├── ApplicantHeader
├── ApplicantChecklist
│   ├── ChecklistItem
│   └── StatusIcon
├── ApplicantBankSummary
└── WorkflowTimeline
```

Continue until no more child components exist.

### Phase 3 — Service Analysis

For every injected service, read the full service file. Extract:

- Methods
- API calls (URL, method, params, response)
- Caching strategy
- State management (signals, subjects)
- Observables
- Transformations

### Phase 4 — API Discovery

Every HTTP request becomes documentation:

```
ApplicantService
↓
GET api/grant-applications/queries/get-overview.php
```

Document each endpoint:

- URL
- HTTP method
- Parameters
- Response shape
- Purpose

### Phase 5 — Backend Analysis

Follow every endpoint into the PHP backend:

```
get-overview.php
↓
GrantApplicationService.php
↓
Node.php
↓
Database
```

Document:

- Endpoint file
- Service class and methods
- Repository / Model used
- Business rules
- Validation
- Response shape

### Phase 6 — Data Flow

Generate a complete data flow diagram:

```
ApplicantOverviewComponent
↓
GrantApplicationService (Angular)
↓
GET /api/grant-applications/queries/get-overview.php
↓
GrantApplicationService (PHP)
↓
Node
↓
Database
↓
JSON Response
↓
Angular
↓
Child Components
```

### Phase 7 — Business Capability

Infer the business capability:

```
Capability: Grant Applications
Purpose: View and update applicant information
Commands: updateApplication()
Queries: getOverview()
Dependencies: Workflow, Compliance, Bank Statements, Dynamic Forms
```

### Phase 8 — Technical Debt

Identify:

**Frontend:**
- Duplicated API calls
- Duplicated transformations
- Business logic in UI
- Unnecessary state
- Multiple HTTP requests where one would do

**Backend:**
- Missing capability endpoints
- Duplicated CRUD
- Business logic inside endpoint files
- Missing validation

### Phase 9 — Recommendations

Generate prioritized recommendations:

```
Priority: High
- Move merge logic to backend
- Replace 6 API calls with one capability endpoint

Priority: Medium
- Move workflow assembly into GrantApplicationService
- Pass data through @Input instead of child API calls
```

## Output Structure

Create a documentation folder at `docs/{capability}/` with these files:

| File | Content |
|---|---|
| `README.md` | Capability overview, purpose, commands, queries, dependencies |
| `ComponentTree.md` | Full component hierarchy with responsibilities |
| `Frontend.md` | Component details, signals, methods, template logic |
| `Services.md` | Angular services, methods, API calls, caching |
| `Api.md` | All HTTP endpoints with request/response shapes |
| `Backend.md` | PHP services, models, business rules, validation |
| `DataFlow.md` | End-to-end data flow diagram |
| `TechnicalDebt.md` | Issues found in frontend and backend |
| `Recommendations.md` | Prioritized improvement suggestions |

## Golden Rules

- Never stop at one component — follow every child recursively
- Follow every injected service
- Follow every HTTP request
- Follow every backend endpoint
- Follow every PHP service
- Follow every repository/model
- Produce complete end-to-end documentation
- Detect duplicated business logic
- Suggest capability-based refactoring
- Generate text-based diagrams
- Record unknown dependencies instead of guessing

## Startup Sequence

1. Read the root component file
2. Execute Phase 1 (Component Analysis)
3. Execute Phase 2 (Component Tree) — recurse into children
4. Execute Phase 3 (Service Analysis) — read all injected services
5. Execute Phase 4 (API Discovery) — document every HTTP call
6. Execute Phase 5 (Backend Analysis) — follow endpoints into PHP
7. Execute Phase 6 (Data Flow) — assemble the full flow
8. Execute Phase 7 (Business Capability) — infer the capability
9. Execute Phase 8 (Technical Debt) — identify issues
10. Execute Phase 9 (Recommendations) — prioritize fixes
11. Write output files to `docs/{capability}/`
