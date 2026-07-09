# Incubator OS — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Angular 19 SPA)                  │
│  localhost:4200                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AppShell (authGuard)                                  │  │
│  │  ├── CompanyShell (/company/:id)                       │  │
│  │  │   ├── Overview, Assessment, SWOT, GPS Targets       │  │
│  │  │   ├── FinancialShell (10 sub-tabs)                  │  │
│  │  │   ├── ComplianceShell (5 sub-tabs)                 │  │
│  │  │   └── CoachingGuideShell (4 sub-tabs)              │  │
│  │  ├── GrantFundingShell (/admin/grant-funding)          │  │
│  │  │   └── ApplicantShell (/applications/:id)            │  │
│  │  │       └── Overview (stage-based workspace)          │  │
│  │  └── Admin (clients, programs, cohorts, users, etc.)   │  │
│  └───────────────────────────────────────────────────────┘  │
│              │ HTTP (JSON)                                   │
│              ▼                                               │
│  http://localhost:8080/                                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Apache + PHP 8.1 Backend                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  api-nodes/  (generic CRUD endpoints)                  │  │
│  │  ├── node/       get-node, add-node, update-node, etc. │  │
│  │  ├── company/    company-specific CRUD                 │  │
│  │  ├── financial/  financial item CRUD                   │  │
│  │  ├── grant/      grant-specific queries                │  │
│  │  └── user/       user CRUD                             │  │
│  ├── api/grant-applications/  (capability endpoints)      │  │
│  │   ├── queries/   get-overview                          │  │
│  │   └── commands/  update-application, import-companies   │  │
│  ├── models/        PDO-based data models                 │  │
│  │   ├── Node.php          Generic JSON node CRUD         │  │
│  │   ├── Company.php       Companies table                │  │
│  │   ├── User.php          Users table                    │  │
│  │   ├── CompanyFinancialYearlyStats.php                  │  │
│  │   └── ...                                              │  │
│  └── services/      Business logic services               │  │
│      └── grant-applications/GrantApplicationService.php  │  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database                            │
│  incubator_os                                                │
│  Tables:                                                     │
│  ├── nodes              JSON-based generic storage           │
│  ├── companies          Structured company data              │
│  ├── users              User accounts + directors            │
│  ├── company_financial_yearly_stats  m1-m12 monthly data     │
│  ├── company_financial_items         Cost/revenue items      │
│  ├── financial_years    Predefined FY periods               │
│  ├── categories / categories_item    Hierarchical grouping   │
│  └── ...                                                    │
└─────────────────────────────────────────────────────────────┘
```

## Data Model: The Node Pattern

The core architectural decision is a **hybrid data model**:

### Nodes Table (JSON-in-column)
The `nodes` table stores polymorphic entities as JSON in a `data` column:

```sql
nodes (id, type, parent_id, company_id, data JSON, created_at, updated_at)
```

This allows any entity type without schema migrations:
- `grant_application` — full application with directors, checklist, documents inline
- `grant_bank_statement` — monthly turnover per financial year
- `grant_compliance` — compliance statuses
- `grant_workflow` — workflow stage definitions
- `form_submission` — dynamic form responses
- `form_template` — form definitions

### Structured Tables
Entities that need relational integrity, indexing, or joins use dedicated tables:
- `companies` — company records with typed columns (booleans, decimals, FKs)
- `users` — user accounts with `company_id` FK
- `company_financial_yearly_stats` — monthly financial data (m1-m12 columns)
- `company_financial_items` — cost/revenue line items with amounts
- `categories` / `categories_item` — hierarchical groupings (client → program → cohort)

### When to Use Which

| Use Case | Storage | Reason |
|---|---|---|
| Grant applications, workflows, form submissions | `nodes` JSON | Flexible schema, frequent field changes |
| Companies, users | Structured tables | Relational integrity, FK constraints, indexing |
| Financial monthly data | Structured tables | Numeric aggregation, reporting queries |
| Cohort membership | `categories_item` | Many-to-many with status tracking |

## Frontend Architecture

### Standalone Components (no NgModules)
Every component is `standalone: true` with explicit imports. No shared module pattern.

### Routing
- **AppShell** (`/`) — authenticated shell with `authGuard`
- **Lazy loading** — compliance, coaching, financial revenue-capture, and all grant-funding routes are lazy
- **Context persistence** — `ContextService` (BehaviorSubject) preserves `clientId`, `programId`, `cohortId` across navigation via query params

### State Management
- **Angular Signals** — modern reactive state (`signal()`, `computed()`) used in all new components
- **BehaviorSubject** — `ContextService` for cross-component context
- **Local component state** — plain properties for simple data

### Service Layer
- **`NodeService`** — generic CRUD wrapper around node endpoints
- **Domain services** — `CompanyService`, `GrantApplicationService`, `GrantApplicationApiService` wrap NodeService with typed methods
- **Financial services** — `FinancialChartService`, `FinancialComparisonService`, `FinancialItemHandlerService` for chart data and CRUD

## Backend Architecture

### Endpoint Pattern
Each PHP file is a standalone endpoint:

```
api-nodes/{resource}/{action}.php
  ├── include config/Database.php, headers.php, model
  ├── parse input ($_GET, php://input)
  ├── instantiate model
  ├── call model method
  └── echo json_encode($result)
```

### Model Pattern
Each model class:
- `declare(strict_types=1)`
- `WRITABLE` constant for whitelisted columns (security)
- `filterWritable()` to strip unapproved fields
- PDO with prepared statements
- `castRow()` for consistent type casting in responses

### Capability Endpoints (newer pattern)
```
api/grant-applications/
  queries/get-overview.php       → GrantApplicationService::getOverview()
  commands/update-application.php → GrantApplicationService::updateApplication()
  commands/execute-import.php     → GrantApplicationService::executeImportToCompanies()
```

These encapsulate business logic in a service class rather than scattering it across endpoint files.

## Key Architectural Patterns

### 1. Import/Undo Pattern
The grant application → company import follows a transactional pattern:
- **Dry run** — preview without writing
- **Execute** — create/update companies, migrate bank statements, create director users, attach to cohort
- **Undo** — detach from cohort, clear company_id, delete created users, delete created companies
- **Safety flag** — `is_existing_company` on the node prevents undo from deleting pre-existing companies

### 2. Upsert Pattern
Both frontend (`GrantApplicationService.saveBankStatement()`) and backend (`CompanyFinancialYearlyStats.upsert()`) use upsert logic: find existing by unique key, update if found, insert if not.

### 3. Denormalized Summary Pattern
Bank statement stats (`bank_statement_months`, `bank_statement_grand_total`) are stored on the parent application node and updated on every change. This avoids repeated aggregation queries at the cost of data duplication.

### 4. Stage-Based Workflow
Grant applications use a configurable workflow with stages (Applied → Due Diligence → Screening → Demo → Approved/Declined). Each stage defines:
- Which UI components are visible (`components[]`)
- Available actions with target stages
- Checklist requirements

### 5. Financial Year (Mar-Feb)
All financial data uses a March–February financial year with months stored as `m1` (Mar) through `m12` (Feb). This is consistent across both the grant bank statements and the company financial yearly stats.

## Module Boundaries

| Module | Route | Frontend Dir | Backend Dir | Data Store |
|---|---|---|---|---|
| Company Management | `/company/:id` | `company-shell/` | `api-nodes/company/` | `companies` table + `company_financial_*` tables |
| Grant Applications | `/admin/grant-funding` | `grant-funding/` | `api-nodes/grant/` + `api/grant-applications/` | `nodes` table (JSON) |
| Compliance | `/company/:id/compliance` | `compliance/` | `api-nodes/compliance/` | `nodes` table |
| Coaching Guide | `/company/:id/coaching` | `coaching-guide/` | `api-nodes/coaching/` | `nodes` table |
| Admin (clients, programs, cohorts) | `/admin/` | `admin/` | `api-nodes/category/` | `categories` + `categories_item` tables |
| Dynamic Forms | `/admin/form-templates` | `admin/form-templates/` | `api-nodes/form-template/` | `nodes` table |
| Users | `/users` | `admin/users/` | `api-nodes/user/` | `users` table |

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | Angular 19 (standalone components) |
| Styling | Tailwind CSS v4 + SCSS |
| Charts | Chart.js (via `lucide-angular`) |
| Backend | PHP 8.1 (custom MVC, no framework) |
| Database | MySQL 8 |
| Containerization | Podman/Docker |
| API format | JSON over HTTP |
| Auth | Session-based (PHP `$_SESSION`) |
