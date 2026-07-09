# Feature Analyzer

## Purpose

Given a root Angular component, produce complete end-to-end technical documentation of that feature. The output becomes the knowledge base that future AI sessions use to understand, refactor, or extend the feature without rediscovering the codebase.

## Inputs

Accepts one root Angular component path or name:

```
src/app/admin/grant-funding/applicant-shell/pages/applicant-overview.component.ts
```

or

```
ApplicantOverviewComponent
```

## Output Structure

Generate exactly **4 files** in `docs/{capability}/`:

| # | File | Content |
|---|---|---|
| 1 | `README.md` | Full analysis — component tree, routing, services, API, backend, data flow, business rules, technical debt, recommendations |
| 2 | `AI.md` | Single-page AI-optimized summary for future sessions (follow the template below) |
| 3 | `ComponentTree.md` | Full component hierarchy with responsibilities, inputs, outputs, and dependencies |
| 4 | `Api.md` | All HTTP endpoints with request/response shapes and backend file mapping |

### Folder Structure

```
docs/{capability}/
├── README.md
├── AI.md
├── ComponentTree.md
└── Api.md
```

### AI.md Template

```markdown
# {Feature} — AI Context

## Feature Summary
One paragraph describing what this feature does.

## Main Components
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

## Analysis Workflow

### Phase 1 — Context Discovery

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

Output to `README.md`:

```
Feature: Grant Applications
Module: admin/grant-funding
Entry Route: /admin/grant-funding/applications
Parent: ApplicantShellComponent
Lazy: Yes
Capability: Grant Applications
```

### Phase 2 — Component Analysis + Tree

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

Then recursively discover all child components. For each child document:

- Responsibility
- Inputs
- Outputs
- Events
- Services
- Dependencies

Continue until no more child components exist.

**Output to `ComponentTree.md`** — generate a component hierarchy:

```
ApplicantOverview
├── ApplicantHeader
├── ApplicantChecklist
│   ├── ChecklistItem
│   └── StatusIcon
├── ApplicantBankSummary
└── WorkflowTimeline
```

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

**Output to `README.md`.**

### Phase 4 — Service + State Analysis

For every injected service, read the full service file. Extract:

- Methods
- API calls (URL, method, params, response)
- Caching strategy
- State management (signals, subjects)
- Observables
- Transformations

Document where state lives:

- Signals (component-level vs service-level)
- BehaviorSubjects
- Subjects
- Computed values
- Local component state
- Session storage
- Local storage
- Route params / query params as state

**Output to `README.md`.**

### Phase 5 — API Discovery + Backend Analysis

Every HTTP request becomes documentation. For each endpoint:

- URL
- HTTP method
- Parameters
- Response shape
- Purpose

Then follow every endpoint into the PHP backend:

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

**Output to `Api.md`.**

### Phase 6 — Write Operations

Document every write operation (POST, PUT, PATCH, DELETE):

- Trigger (user action, lifecycle hook, etc.)
- Payload shape
- Validation (frontend and backend)
- Side effects (state updates, navigation, toasts)
- Refresh strategy (reload list, patch local state, etc.)

**Output to `README.md`.**

### Phase 7 — Data Flow + Business Logic

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

**Output to `README.md`.**

### Phase 8 — Technical Debt + Recommendations

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

Generate prioritized recommendations:

```
Priority: High
- Move merge logic to backend
- Replace 6 API calls with one capability endpoint

Priority: Medium
- Move workflow assembly into GrantApplicationService
- Pass data through @Input instead of child API calls
```

**Output to `README.md`.**

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
- **Generate exactly 4 files — no more, no less**
- **Write each file incrementally as phases complete, not all at the end**

## Startup Sequence

1. Read the root component file
2. Execute Phase 1 (Context Discovery) — append to `README.md`
3. Execute Phase 2 (Component Analysis + Tree) — write to `ComponentTree.md`
4. Execute Phase 3 (Routing Analysis) — append to `README.md`
5. Execute Phase 4 (Service + State Analysis) — append to `README.md`
6. Execute Phase 5 (API + Backend Analysis) — write to `Api.md`
7. Execute Phase 6 (Write Operations) — append to `README.md`
8. Execute Phase 7 (Data Flow + Business Logic) — append to `README.md`
9. Execute Phase 8 (Technical Debt + Recommendations) — append to `README.md`
10. Write `AI.md` summary
