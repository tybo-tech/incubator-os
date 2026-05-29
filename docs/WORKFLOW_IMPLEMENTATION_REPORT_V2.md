# Workflow Implementation Report — V2
**Date:** April 2026  
**Module:** Grant Funding — Dynamic Workflow System  
**Build status:** ✅ Clean (no errors or warnings)  
**Addresses:** All 6 required improvements from V1 review

---

## Summary of Changes

| # | Improvement | Status |
|---|---|---|
| 1 | Explicit action → stage mapping in workflow definition | ✅ Done |
| 2 | Workflow config moved out of code (assets JSON + registry) | ✅ Done |
| 3 | Stage UI metadata (`ui.*`) for declarative component control | ✅ Done |
| 4 | Reopen uses `previous_status` instead of hardcoded `'applied'` | ✅ Done |
| 5 | Checklist `required` flag — only required items gate transitions | ✅ Done |
| 6 | Reviewer attribution (`reviewed_by`) in status history | ✅ Done |
| + | Progress bar shows terminated/cancelled state on decline | ✅ Done |

---

## Files Changed

| File | Change Type | Summary |
|---|---|---|
| `interfaces/grant-application.interfaces.ts` | Modified | New `IWorkflowAction`; updated `IWorkflowStage` with `ui?`; `IChecklistItem.required`; `IStatusHistoryEntry.reviewed_by`; `IGrantApplicationData.previous_status` |
| `services/workflow.service.ts` | Rewritten | `HttpClient`-backed registry; `getActionFromStage`; `resolveActionTarget` |
| `applicant-shell/pages/applicant-checklist.component.ts` | Updated | Implements `OnInit`; `confirmActionObj`; reviewer field; declarative variant buttons; terminated progress state |
| `src/assets/workflows/grant-2026.json` | **New** | Workflow config file, loadable at runtime without redeployment |

---

## 1. Explicit Action → Stage Mapping

### Problem (V1)
Actions like `pass` and `move_to_*` resolved their target by walking the stage array,
creating hidden coupling to stage order.

### Solution
Each action now carries its own explicit `target` in the workflow definition.

### Updated Interface

```ts
export interface IWorkflowAction {
  key: string;                           // e.g. 'pass'
  label: string;                         // UI button text
  target: string;                        // target stage key, or 'previous' sentinel
  variant?: 'primary' | 'danger' | 'secondary';
}

export interface IWorkflowStage {
  key: string;
  label: string;
  color: string;
  type: 'entry' | 'validation' | 'review' | 'evaluation' | 'final';
  requires_checklist?: boolean;
  actions?: IWorkflowAction[];
  ui?: {
    showChecklist?: boolean;
    showDocuments?: boolean;
    showEvaluation?: boolean;
  };
}
```

### Service Change
`resolveTargetStage(workflow, currentKey, action)` replaced by:

```ts
// Look up the action object from the stage definition
getActionFromStage(stage: IWorkflowStage, actionKey: string): IWorkflowAction | null

// Resolve 'previous' sentinel to actual previous_status
resolveActionTarget(action: IWorkflowAction, previousStatus?: string): string
```

The target is now read directly from `action.target` — no implicit stage ordering.

---

## 2. Workflow Config Out of Code

### Problem (V1)
`WorkflowService.registry` was hardcoded as an array constant.

### Solution
- `src/assets/workflows/grant-2026.json` — editable without redeployment  
- `WorkflowService` uses `HttpClient` to load and cache it at component init  
- Falls back silently to the built-in TypeScript constant if the file is unavailable

```ts
// Component ngOnInit:
this.workflowSvc.loadWorkflow(wfId).subscribe();

// Service:
loadWorkflow(id: string): Observable<IWorkflow> {
  return this.http.get<IWorkflow>(`assets/workflows/${id}.json`).pipe(
    tap(wf => this.registry.set(wf.id, wf)),
    catchError(() => EMPTY),
  );
}
```

**To add a new workflow:** drop a new JSON file into `src/assets/workflows/`,
register nothing in code, and set `workflow_id` on the application records.

---

## 3. UI Metadata (`ui.*` on Stages)

### Problem (V1)
Components contained hardcoded `if (stage.type === 'validation')` checks.

### Solution
Each stage carries optional `ui` flags:

```ts
ui?: {
  showChecklist?: boolean;   // render checklist panel
  showDocuments?: boolean;   // render document upload panel
  showEvaluation?: boolean;  // render evaluation/scoring panel
}
```

### Example from seed

```json
{
  "key": "due_diligence",
  "ui": { "showChecklist": true, "showDocuments": true }
}
```

Components can now drive their panels purely from `currentStage().ui.*` without
any `type`-string comparisons.

---

## 4. Reopen Uses `previous_status`

### Problem (V1)
`reopen` always returned the application to `'applied'`, losing context.

### Solution

`IGrantApplicationData` now has:
```ts
previous_status?: string; // stage before the last transition
```

Every transition stores the current stage as `previous_status` in the save patch.
The reopen action uses the `'previous'` sentinel in its `target` field:

```json
{ "key": "reopen", "label": "Reopen Application", "target": "previous", "variant": "secondary" }
```

`resolveActionTarget` resolves it:

```ts
resolveActionTarget(action: IWorkflowAction, previousStatus?: string): string {
  if (action.target === 'previous') return previousStatus ?? 'applied';
  return action.target;
}
```

**Result:** Reopening an application that was declined mid-screening returns it to
`screening`, not back to `applied`.  
**Fallback:** If `previous_status` is not set (legacy records), falls back to `'applied'`.

---

## 5. Checklist `required` Flag

### Problem (V1)
All checklist items were treated as mandatory — no way to mark optional items.

### Solution

```ts
export interface IChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required?: boolean; // defaults true; only required items gate transitions
}
```

- `required` defaults to `true` (backward compatible — existing items with no flag are
  still enforced)
- Blocking logic:  
  `checklist().some(i => (i.required ?? true) && !i.checked)`
- Required items show an orange `*` marker in the checklist view
- Blocking message shows `requiredCheckedCount / requiredItemCount` (not total count)
- All six default checklist items are explicitly marked `required: true`

---

## 6. Reviewer Attribution

### Problem (V1)
Status history had no record of who performed the transition.

### Solution

```ts
export interface IStatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
  reviewed_by?: string; // reviewer attribution for audit trail
}
```

- The confirm panel now includes a "Reviewed by" name/email input  
- Stored with every history entry  
- Displayed in the history timeline: `by John Smith`

---

## Progress Bar — Terminated State

When an application is declined mid-process, the stepper now shows:

- **Visited stages** (in history) → green completed dot ✓
- **Unvisited stages** (would-have-been) → faded grey dot with grey label text
- **Declined banner** → already present from V1 ✓

```ts
isCompleted(stage): boolean {
  if (this.currentStatus() === 'declined') {
    return this.statusHistory().some(h => h.status === stage.key);
  }
  // normal forward comparison
}

isTerminated(stage): boolean {
  if (this.currentStatus() !== 'declined') return false;
  return !this.isCompleted(stage) && !this.isCurrent(stage);
}
```

---

## Updated Seed Workflow (TypeScript + JSON)

Both `GRANT_WORKFLOW_2026` (TypeScript) and `src/assets/workflows/grant-2026.json`
are in sync. Example stage showing all new fields:

```json
{
  "key": "due_diligence",
  "label": "Due Diligence",
  "color": "orange",
  "type": "validation",
  "requires_checklist": true,
  "ui": { "showChecklist": true, "showDocuments": true },
  "actions": [
    { "key": "pass",    "label": "Pass Due Diligence",  "target": "screening", "variant": "primary" },
    { "key": "decline", "label": "Decline Application", "target": "declined",  "variant": "danger"  }
  ]
}
```

---

## Migration Considerations

| Concern | Impact | Action |
|---|---|---|
| `status` field | No change — already `string` | None |
| `status_history[].status` | No change | None |
| `previous_status` | Not on old records | `resolveActionTarget` falls back to `'applied'` |
| `reviewed_by` on history | Optional | Existing records unaffected |
| `IChecklistItem.required` | Optional, defaults `true` | Existing items still gated |
| `actions` now `IWorkflowAction[]` | Interface breaking change in TS | Only internal — no external API impact |

---

## Build Verification

```
Application bundle generation complete. [51s]
Output location: dist/nodes
✅ No errors, no warnings
```
