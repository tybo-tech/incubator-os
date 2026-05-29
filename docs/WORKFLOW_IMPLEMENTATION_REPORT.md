# Workflow Implementation Report
**Date:** 2025  
**Module:** Grant Funding — Dynamic Workflow System  
**Build status:** ✅ Clean (no errors or warnings)

---

## Overview

The grant module has been refactored from a hardcoded status machine
(`applied → interview → approved / declined`) into a **configurable, data-driven
workflow system**. Workflows are defined as JSON documents that can be versioned per
funding cycle. No code changes are required to update stage labels, add new stages, or
change action buttons.

---

## Files Changed

| File | Type | Summary |
|---|---|---|
| `interfaces/grant-application.interfaces.ts` | Modified | Added `IWorkflowStage`, `IWorkflow`, `GRANT_WORKFLOW_2026`; loosened status fields to `string` |
| `services/workflow.service.ts` | **New** | `WorkflowService` — all workflow logic |
| `applicant-shell/pages/applicant-checklist.component.ts` | Rewritten | Dynamic stage bar, dynamic action buttons, checklist enforcement |
| `services/grant-application.service.ts` | Modified | `createApplication()` now sets `workflow_id: 'grant-2026'` |

---

## New Interfaces (`grant-application.interfaces.ts`)

```ts
interface IWorkflowStage {
  key: string;                // unique stage identifier (e.g. 'due_diligence')
  label: string;              // display name
  color: string;              // tailwind colour token
  type: 'entry' | 'validation' | 'review' | 'evaluation' | 'final';
  requires_checklist?: boolean;  // gates forward transitions on checklist completion
  actions?: string[];         // available action verbs at this stage
}

interface IWorkflow {
  id: string;                 // e.g. 'grant-2026'
  name: string;
  stages: IWorkflowStage[];
}
```

`IStatusHistoryEntry.status` and `IGrantApplicationData.status` were loosened from
the `ApplicationStatus` union to `string` to support arbitrary stage keys from any
loaded workflow. `workflow_id?: string` was added to `IGrantApplicationData`.

---

## Seed Workflow — `GRANT_WORKFLOW_2026`

| # | Key | Label | Type | Checklist gate | Actions |
|---|---|---|---|---|---|
| 1 | `applied` | Applied | entry | — | `move_to_due_diligence`, `decline` |
| 2 | `due_diligence` | Due Diligence | validation | ✅ | `pass`, `decline` |
| 3 | `screening` | Screening | review | — | `move_to_demo`, `decline` |
| 4 | `demo` | Demo | evaluation | — | `approve`, `decline` |
| 5 | `approved` | Approved | final | — | `reopen` |
| 6 | `declined` | Declined | final | — | `reopen` |

The `declined` stage is excluded from the visual progress bar (it is a side track, not
a forward milestone).

---

## WorkflowService (`services/workflow.service.ts`)

| Method | Purpose |
|---|---|
| `getWorkflow(id)` | Look up a workflow by id; falls back to `GRANT_WORKFLOW_2026` |
| `getStage(workflow, key)` | Find a stage by key; returns `null` for unknown keys |
| `getNextStage(workflow, currentKey)` | Returns the next non-final stage in sequence |
| `canTransitionWith(stage, action)` | True if the stage lists this action |
| `resolveTargetStage(workflow, currentKey, action)` | Maps action → target stage key |
| `getActionLabel(action)` | Human-readable label for an action verb |
| `isDeclineAction(action)` | `true` for `'decline'` |
| `isReopenAction(action)` | `true` for `'reopen'` |
| `getProgressStages(workflow)` | All stages except `'declined'` (for the progress bar) |

**Action resolution rules:**

```
decline  → 'declined'
approve  → 'approved'
reopen   → 'applied'
pass / move_to_* → next non-final stage in array
```

---

## ApplicantChecklistComponent Changes

### Stage Progress Bar (new)
A horizontal stepper renders every stage returned by `getProgressStages()`.  
- Completed stages show a green checkmark dot  
- Current stage shows the stage's branded colour  
- Upcoming stages are gray  
- A red banner appears when status is `declined`  
- An amber banner appears when the status is not found in the workflow (legacy records)

### Dynamic Action Buttons (replaces hardcoded buttons)
Buttons are generated from `currentStage().actions`:
- `decline` → red outline button
- `reopen` → amber outline button  
- everything else → blue filled button with arrow icon

### Checklist Enforcement (new)
When the current stage has `requires_checklist: true` (only `due_diligence` in the seed):
- An amber warning banner is displayed above the action buttons
- Forward-progress buttons are disabled until all checklist items are checked
- Decline is still permitted even with incomplete checklist

### Unknown Stage Handling (backward compat)
If `status` is not found in the active workflow (e.g., old `interview` or `draft`
records), a fallback banner is shown and a "Resume Application" button is rendered
that calls `reopen` → moves the application back to `applied`.

---

## Adding a New Workflow

1. Define a new `IWorkflow` constant in `grant-application.interfaces.ts`  
2. Register it in `WorkflowService.registry`  
3. Set `workflow_id` on the application record to the new workflow's `id`

No component changes are required.

---

## Backward Compatibility

- Existing records with `status: 'applied' | 'approved' | 'declined'` work without
  migration — those keys exist in `GRANT_WORKFLOW_2026`
- Records with `status: 'interview'` or `'draft'` show the fallback banner and can be
  resumed with one click
- The `ApplicationStatus` type is preserved in the interfaces for reference but is no
  longer used as a constraint on `status` fields

---

## Build Verification

```
Application bundle generation complete. [39s]
Output location: dist/nodes
✅ No errors, no warnings
```
