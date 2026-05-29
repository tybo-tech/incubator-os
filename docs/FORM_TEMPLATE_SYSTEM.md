# Form Template System

Complete reference for the form template feature — from data model to UI to workflow integration.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [Node Storage Pattern](#3-node-storage-pattern)
4. [Backend API](#4-backend-api)
5. [Angular Service Layer](#5-angular-service-layer)
6. [Admin UI — Template Builder](#6-admin-ui--template-builder)
7. [Admin UI — Responses View](#7-admin-ui--responses-view)
8. [Public Form (Shareable Link)](#8-public-form-shareable-link)
9. [Interview Component (Internal Workflow)](#9-interview-component-internal-workflow)
10. [Workflow Integration](#10-workflow-integration)
11. [Seed Templates](#11-seed-templates)
12. [Routing](#12-routing)
13. [Data Flow Diagrams](#13-data-flow-diagrams)

---

## 1. Overview

The Form Template system provides two separate collection paths for a single template:

| Path | Who fills it | Node type | Respondent captured |
|---|---|---|---|
| **Public link** (`/f/:id`) | Anyone with the URL (applicants) | `form_response` | director name, email, company name, registration number |
| **Interview workflow** (admin fills on behalf of applicant) | Admin/interviewer | `form_submission` | company name stored as `applicant_label`; scoped by `company_id` |

Both paths feed into a single unified **Responses View** (`/admin/form-templates/:id/responses`) that aggregates and distinguishes the two sources with source badges.

---

## 2. Data Model

All interfaces live in:
`src/app/admin/form-templates/interfaces/form-template.interfaces.ts`

### 2.1 Question (`IFormQuestion`)

```ts
interface IFormQuestion {
  id: string;           // stable, never randomised on render
  label: string;        // question text
  type: QuestionType;   // 'text' | 'textarea' | 'boolean' | 'number' | 'select'
  required: boolean;
  options?: string[];   // only for type === 'select'
  children?: IFormQuestion[];   // conditional follow-ups
  visibleIf?: { value: any };   // show this question when parent answer === value
}
```

Answers are stored **flat** (`Record<string, any>` keyed by `question.id`) even though the template is a tree. This simplifies querying and analytics.

### 2.2 Section (`IFormSection`)

```ts
interface IFormSection {
  id: string;
  title: string;
  order: number;
  questions: IFormQuestion[];
}
```

### 2.3 Template Data (`IFormTemplateData`)

```ts
interface IFormTemplateData {
  name: string;
  description?: string;
  version: number;
  sections: IFormSection[];
}
```

### 2.4 Submission Data (`IFormSubmissionData`)

Created by the **interview workflow** (admin fills on behalf of applicant).

```ts
interface IFormSubmissionData {
  form_template_id: number;     // node id of the template
  form_template_name: string;   // denormalised for display
  submitted_at: string;         // ISO datetime
  status: 'draft' | 'submitted';
  answers: Record<string, any>; // flat — keyed by question id
  applicant_label?: string;     // company name from the grant application
  meta?: {
    interviewer_notes?: string;
    comments?: IFormComment[];
  };
}
```

### 2.5 Public Response Data (`IFormResponseData`)

Created when an applicant fills in the **public shareable link**.

```ts
interface IFormResponseRespondent {
  director_name: string;
  email: string;
  company_name: string;
  registration_number: string;   // CIPC number
}

interface IFormResponseData {
  form_template_id: number;
  form_template_name: string;
  respondent: IFormResponseRespondent;   // ← captured on public form
  answers: Record<string, any>;          // flat — same shape as submission
  submitted_at: string;
  status: 'draft' | 'submitted';
}
```

> **Why two separate interfaces?**
> The public path captures a `respondent` object (name, email, company, reg number) because the respondent is unknown. The interview path already knows the company — it reads `company_name` from the loaded grant application and stores it as `applicant_label`. When the system is flexible enough to support multiple applicants per company, the `respondent` struct can be projected from the `company_id` instead.

---

## 3. Node Storage Pattern

The system uses the generic `INode<T>` pattern. Every record in the `nodes` table has:

| Column | Purpose |
|---|---|
| `id` | Auto-increment primary key |
| `type` | One of the constants in `FORM_NODE_TYPES` |
| `parent_id` | Scopes the node under a parent |
| `company_id` | Scopes the node to a company |
| `data` | JSON — the typed payload `T` |

### Node type constants

```ts
const FORM_NODE_TYPES = {
  TEMPLATE:   'form_template',
  SUBMISSION: 'form_submission',
  RESPONSE:   'form_response',
}
```

### Storage layout

```
form_template   (id=2303)
  parent_id = null
  company_id = null

form_response   ← public link submission
  parent_id = 2303      (template id)
  company_id = null

form_submission ← internal interview submission
  parent_id = 2303      (template id)
  company_id = <effectiveCompanyId>
```

Both `form_response` and `form_submission` use `parent_id = templateId`. This means:

- `getNodes('form_response', templateId)` → all public responses for a template
- `getNodes('form_submission', templateId)` → all internal submissions across all companies
- `getNodes('form_submission', templateId, companyId)` → internal submissions for one company only ✓

---

## 4. Backend API

### 4.1 Node model (`api-incubator-os/models/Node.php`)

The `search()` method now accepts three filters:

```php
public function search($type = null, $parentId = null, $companyId = null)
{
    $query = "SELECT * FROM nodes WHERE 1=1";
    if ($type)      $query .= " AND type = ?";
    if ($parentId)  $query .= " AND parent_id = ?";
    if ($companyId) $query .= " AND company_id = ?";
    // ...
}
```

### 4.2 Generic node endpoint (`api-incubator-os/api-nodes/node/get-nodes.php`)

```
GET /api-nodes/node/get-nodes.php?type=X&parentId=Y&companyId=Z
```

Accepts all three params, all optional, any combination. This is the single endpoint used for every collection query.

### 4.3 Add node (`api-incubator-os/api-nodes/node/add-node.php`)

```
POST /api-nodes/node/add-node.php
Body: { type, data, parent_id, company_id }
```

### 4.4 Get nodes by company (`api-incubator-os/api-nodes/node/get-nodes-by-company.php`)

```
GET /api-nodes/node/get-nodes-by-company.php?company_id=X&type=Y
```

Available but not used by the form system — superseded by the combined `get-nodes.php?companyId=` filter.

---

## 5. Angular Service Layer

### 5.1 `NodeService` (`src/services/node.service.ts`)

The generic node query method now accepts `companyId`:

```ts
getNodes(type?: string, parentId?: number, companyId?: number | null): Observable<INode<T>[]>
// → GET get-nodes.php?type=...&parentId=...&companyId=...
```

### 5.2 `FormTemplateService` (`src/app/admin/form-templates/services/form-template.service.ts`)

#### Templates

| Method | Description |
|---|---|
| `getAllTemplates()` | All `form_template` nodes |
| `getTemplateById(id)` | Single template by node id |
| `createTemplate(data)` | Adds new `form_template` node |
| `updateTemplate(id, data)` | Replaces data on existing template |
| `deleteTemplate(id)` | Deletes template node |

#### Internal Submissions (interview workflow)

| Method | Description |
|---|---|
| `getAllSubmissionsForTemplate(templateId)` | All `form_submission` nodes for a template (all companies) — used by the responses view |
| `getSubmissionsByTemplate(companyId, templateId)` | `form_submission` nodes scoped to one company + one template. `companyId` is **always required** (never null). Callers use `effectiveCompanyId`. |
| `createSubmission(templateId, companyId, data)` | Saves a new interview submission. `parent_id = templateId`, `company_id = companyId` |
| `updateSubmission(id, data)` | Patches data on existing submission |
| `deleteSubmission(id)` | Deletes submission |

#### Public Responses (shared link)

| Method | Description |
|---|---|
| `getResponses(templateId)` | All `form_response` nodes for a template |
| `createResponse(templateId, data)` | Saves a new public response. `parent_id = templateId`, `company_id = null` |
| `updateResponse(id, data)` | Patches data on existing response |
| `deleteResponse(id)` | Deletes response |

---

## 6. Admin UI — Template Builder

**Route:** `/admin/form-templates` (list) → `/admin/form-templates/:id` (builder)

**File:** `src/app/admin/form-templates/form-template-builder.component.ts`

**Features:**
- Create new templates from scratch or from a seed (built-in) template
- Add / rename / reorder sections
- Add questions with type, label, required toggle
- Add `select` options inline
- Add conditional children to any question — visibility rule is set per-child
- Save as a `form_template` node (auto-navigates to the saved id URL)
- "View responses" button navigates to the responses view
- Copy shareable public link button

---

## 7. Admin UI — Responses View

**Route:** `/admin/form-templates/:id/responses`

**File:** `src/app/admin/form-templates/form-template-responses.component.ts`

Loads both `form_response` (public) and `form_submission` (internal/interview) nodes in parallel using `forkJoin`, normalises them into a unified `NormalizedEntry[]`, and displays them sorted newest-first.

### Normalised entry shape

```ts
interface NormalizedEntry {
  id: number;
  source: 'public' | 'internal';  // drives the source badge colour
  label: string;         // display name for the respondent/company
  subLabel: string;      // secondary info line
  status: 'draft' | 'submitted';
  date: string;
  answers: Record<string, any>;
  interviewerNotes?: string;  // only set for internal entries
}
```

### Stats bar

| Stat | Description |
|---|---|
| Total responses | All entries combined |
| Submitted | `status === 'submitted'` across both sources |
| In progress | `status === 'draft'` across both sources |
| Via public link | `source === 'public'` count |
| Via interview | `source === 'internal'` count |

### Cards

Each entry card shows:
- Display name + **source badge** (blue "Public" / violet "Interview") + status badge
- Sub-label (email + company for public; interviewer notes summary for internal)
- Date
- "View answers" expander — for internal entries, shows the interviewer notes block at the top

---

## 8. Public Form (Shareable Link)

**Route:** `/f/:id` (no auth, no app shell)

**File:** `src/app/public/public-form/public-form.component.ts`

**Flow:**
1. Load template by `:id`
2. Respondent fills in the **identity step first** — captures:
   - Director / respondent full name
   - Email address
   - Company name
   - CIPC registration number
3. Respondent answers template sections
4. On submit — `FormTemplateService.createResponse(templateId, data)` saves a `form_response` node:
   - `parent_id = templateId`
   - `company_id = null`
   - `data.respondent` contains the captured identity fields above

**Share link format:** `https://<domain>/f/<templateId>`
The copy-link button in both the builder and responses view generates this URL.

---

## 9. Interview Component (Internal Workflow)

**File:** `src/app/admin/grant-funding/applicant-shell/pages/applicant-interview.component.ts`

An admin fills this questionnaire on behalf of an applicant, directly inside the applicant overview page.

### Inputs

| Input | Type | Description |
|---|---|---|
| `applicantId` | `number` | Node id of the grant application |
| `templateId` | `number \| undefined` | Template to load — comes from `IWorkflowStage.interview_template_id` |
| `companyId` | `number \| null \| undefined` | `company_id` column of the applicant node (may be null if not set in DB) |
| `companyName` | `string \| undefined` | Human-readable company name — stored as `applicant_label` on the submission |

### `effectiveCompanyId` pattern

Because `companyId` may be `null` (the applicant node's `company_id` column is not always populated), the component uses a fallback:

```ts
private get effectiveCompanyId(): number {
  return this.companyId ?? this.applicantId;
}
```

This guarantees `?companyId=` is always present in the query URL, preventing a query from returning all companies' submissions for that template.

**Rule:** `effectiveCompanyId` must be passed to both `getSubmissionsByTemplate` and `createSubmission`. When `company_id` is eventually set consistently in the DB, `companyId ?? applicantId` naturally resolves to the real `company_id`.

### Submission storage

```
form_submission node:
  parent_id  = templateId          (links to the template)
  company_id = effectiveCompanyId  (scopes to the company)
  data.applicant_label = companyName
  data.answers = { [questionId]: value, ... }
  data.meta.interviewer_notes = "..."
  data.status = 'draft' | 'submitted'
```

### States

| State | Description |
|---|---|
| `loading` | Template + existing submission loading |
| `no-template` | `templateId` input is undefined — stage has no template configured |
| `error` | Template failed to load |
| `ready` | Form is ready; existing draft auto-populated if found |

### Actions

- **Save Draft** → `persist('draft')` — saves progress without locking
- **Submit Interview** → `persist('submitted')` — marks as final
- On subsequent opens, the existing draft is loaded and the form is pre-filled

---

## 10. Workflow Integration

The interview component is embedded in the applicant overview for any workflow stage that has `interview` in its `components[]` array.

### `IWorkflowStage` additions

```ts
interface IWorkflowStage {
  // ...existing fields...
  components?: string[];            // e.g. ['interview']
  interview_template_id?: number;   // which form_template to load
}
```

### Workflow Settings

In the Workflow Settings drawer (`workflow-settings.component.ts`), admins can:
1. Toggle the `interview` checkbox for any stage
2. Select a template from a dropdown (populated from `getAllTemplates()`) → saves as `interview_template_id`

### Applicant Overview wiring

```html
<ng-container *ngIf="hasStageComponent('interview')">
  <app-applicant-interview
    [applicantId]="applicantId"
    [templateId]="selectedStageConfig()?.interview_template_id"
    [companyId]="applicantCompanyId()"
    [companyName]="data().company_name">
  </app-applicant-interview>
</ng-container>
```

`applicantCompanyId` is a signal populated from `node.company_id` when the applicant node is loaded:

```ts
applicantCompanyId = signal<number | null>(null);
// in loadData():
this.applicantCompanyId.set(node.company_id ?? null);
```

---

## 11. Seed Templates

**File:** `src/app/admin/form-templates/built-in-templates.ts`

Pre-built templates are available from the template list page under "Start from a template". Currently includes:

| Key | Name |
|---|---|
| `enterprise_interview` | Interview Questions – Enterprise Development Grant Fund |

The seed template covers six sections:
1. Personal Motivation and Vision
2. Customer Perspective and Market Research
3. Finance
4. Risk-Taking and Problem-Solving
5. Governance and ESG
6. Needs Analysis

Seed templates are not saved automatically — the admin clicks "Use this template" which opens the builder pre-populated, and saving creates a real `form_template` node in the database.

---

## 12. Routing

| Path | Component | Auth |
|---|---|---|
| `/f/:id` | `PublicFormComponent` | None |
| `/admin/form-templates` | `FormTemplatesListComponent` | Required |
| `/admin/form-templates/new` | `FormTemplateBuilderComponent` | Required |
| `/admin/form-templates/:id` | `FormTemplateBuilderComponent` | Required |
| `/admin/form-templates/:id/responses` | `FormTemplateResponsesComponent` | Required |

---

## 13. Data Flow Diagrams

### Public path

```
Applicant receives link  →  /f/<templateId>
  → loads form_template node by id
  → respondent fills identity step (name, email, company, reg number)
  → respondent fills question sections
  → createResponse(templateId, { respondent, answers, status:'submitted' })
      → nodes table: type='form_response', parent_id=templateId, company_id=null
```

### Interview path (admin fills on behalf of applicant)

```
Admin opens applicant overview
  → stage has interview component + interview_template_id
  → app-applicant-interview loads
      → getTemplateById(templateId)
      → getSubmissionsByTemplate(effectiveCompanyId, templateId)
          → GET get-nodes.php?type=form_submission&parentId=<templateId>&companyId=<effectiveCompanyId>
  → Admin fills form + saves
      → createSubmission(templateId, effectiveCompanyId, data)
          → nodes table: type='form_submission', parent_id=templateId, company_id=effectiveCompanyId
```

### Responses view aggregation

```
Admin opens /admin/form-templates/:id/responses
  → forkJoin([
      getResponses(templateId)                    → GET ...?type=form_response&parentId=templateId
      getAllSubmissionsForTemplate(templateId)     → GET ...?type=form_submission&parentId=templateId
    ])
  → normalise both into NormalizedEntry[]
  → sort by date desc
  → render with source badge: blue=Public, violet=Interview
```

### `effectiveCompanyId` resolution

```
node.company_id is set in DB  →  companyId = real company_id  →  effectiveCompanyId = companyId
node.company_id is null       →  companyId = null             →  effectiveCompanyId = applicantId
```

Either way, `?companyId=` is always non-null in the query, scoping the result to one entity only.
