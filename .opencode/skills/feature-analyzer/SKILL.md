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

### Phase 0 — Context Discovery

Before reading any code, determine where the component lives:

- Feature name
- Angular module / feature folder
- Route configuration (from `app.routes.ts`)
- Parent page / shell component
- Lazy-loaded or eagerly loaded
- Guards
- Resolvers
- Shared components used
- Feature boundaries (admin, public, shared)

Output:

```
Feature: Grant Applications
Module: admin/grant-funding
Entry Route: /admin/grant-funding/applications
Parent: ApplicantShellComponent
Lazy: Yes
Capability: Grant Applications
```

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

### Phase 3 — Routing Analysis

Document navigation flow:

```
Applicant List
↓
Applicant Shell
↓
Applicant Overview
↓
Applicant Checklist
```

For each route:

- Route path
- Route params
- Query params
- Guards
- Resolvers
- Navigation flow (what links to what)

### Phase 4 — Service Analysis

For every injected service, read the full service file. Extract:

- Methods
- API calls (URL, method, params, response)
- Caching strategy
- State management (signals, subjects)
- Observables
- Transformations

### Phase 5 — State Analysis

Document where state lives:

- Signals (component-level vs service-level)
- BehaviorSubjects
- Subjects
- Computed values
- Local component state
- Session storage
- Local storage
- Route params / query params as state

### Phase 6 — API Discovery

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

### Phase 7 — Write Analysis

Document every write operation (POST, PUT, PATCH, DELETE):

- Trigger (user action, lifecycle hook, etc.)
- Payload shape
- Validation (frontend and backend)
- Side effects (state updates, navigation, toasts)
- Refresh strategy (reload list, patch local state, etc.)

### Phase 8 — Backend Analysis

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

### Phase 9 — Data Flow

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

### Phase 10 — Business Logic Detection

Search specifically for logic that may belong in the backend:

- `if` / `switch` statements with business rules
- Calculations and transformations
- Status mapping
- Workflow transitions
- Permissions
- Validation
- JSON merging / formatting
- Decision trees

Classify each as:

```
Should remain in frontend (UI-only presentation logic)
Should move to backend capability (business rules)
```

### Phase 11 — API Inventory

Generate a dedicated inventory table:

| Endpoint | Used By | Method | Purpose | Candidate Capability |
|---|---|---|---|---|
| get-node.php | ApplicantOverview | GET | Load application | Grant Applications |
| get-nodes.php | Checklist | GET | Load checklist | Grant Applications |
| update-node.php | ApplicantService | PUT | Save application | Grant Applications |

### Phase 12 — Business Capability

Infer the business capability:

```
Capability: Grant Applications
Purpose: View and update applicant information
Commands: updateApplication()
Queries: getOverview()
Dependencies: Workflow, Compliance, Bank Statements, Dynamic Forms
```

### Phase 13 — Technical Debt

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

### Phase 14 — Capability Migration Plan

Propose the target backend capability:

```
Current: 6 CRUD endpoints
↓
Proposed: GrantApplicationCapability
  Queries:
    getOverview()
  Commands:
    updateApplication()
    submit()
    approve()
```

### Phase 15 — Recommendations

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
| `AI.md` | Concise AI-optimized summary for future sessions |
| `ComponentTree.md` | Full component hierarchy with responsibilities |
| `Frontend.md` | Component details, signals, methods, template logic |
| `Routing.md` | Route configuration, navigation flow, guards |
| `State.md` | State management (signals, subjects, storage) |
| `Services.md` | Angular services, methods, API calls, caching |
| `Api.md` | All HTTP endpoints with request/response shapes |
| `Backend.md` | PHP services, models, business rules, validation |
| `DependencyGraph.md` | Full dependency graph (components → services → API → backend) |
| `DataFlow.md` | End-to-end data flow diagram |
| `BusinessRules.md` | Detected business logic with migration classification |
| `TechnicalDebt.md` | Issues found in frontend and backend |
| `MigrationPlan.md` | Proposed backend capability with endpoint mapping |
| `Recommendations.md` | Prioritized improvement suggestions |

### AI.md Format

```markdown
# {Feature} — AI Context

## Feature Summary
One paragraph describing what this feature does.

## Main Components
- {Component} — {responsibility}
- {Component} — {responsibility}

## Key Services
- {Service} — {purpose}

## Main APIs
- {endpoint} — {purpose}

## Business Rules
- {rule} — {location} — {should move to backend?}

## Known Problems
- {issue}

## Current Technical Debt
- {debt}

## Suggested Backend Capability
{capability name} with {queries} and {commands}

## Important Files
- {file path}
```

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
- Classify business logic as frontend vs backend
- Always propose a migration plan

## Startup Sequence

1. Read the root component file
2. Execute Phase 0 (Context Discovery) — understand where the component lives
3. Execute Phase 1 (Component Analysis)
4. Execute Phase 2 (Component Tree) — recurse into children
5. Execute Phase 3 (Routing Analysis) — document navigation
6. Execute Phase 4 (Service Analysis) — read all injected services
7. Execute Phase 5 (State Analysis) — document state management
8. Execute Phase 6 (API Discovery) — document every HTTP call
9. Execute Phase 7 (Write Analysis) — document every write operation
10. Execute Phase 8 (Backend Analysis) — follow endpoints into PHP
11. Execute Phase 9 (Data Flow) — assemble the full flow
12. Execute Phase 10 (Business Logic Detection) — classify logic
13. Execute Phase 11 (API Inventory) — build endpoint table
14. Execute Phase 12 (Business Capability) — infer the capability
15. Execute Phase 13 (Technical Debt) — identify issues
16. Execute Phase 14 (Migration Plan) — propose target capability
17. Execute Phase 15 (Recommendations) — prioritize fixes
18. Write output files to `docs/{capability}/`
