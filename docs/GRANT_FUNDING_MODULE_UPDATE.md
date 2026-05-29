# Grant Funding Module — Recent Updates

**Date:** April 2026  
**Scope:** `src/app/admin/grant-funding/`

---

## 1. Bank Statements Redesign

**File:** `applicant-shell/pages/applicant-bank-statements.component.ts`

Changed the bank statement capture from a per-month approach to a per-financial-year approach, matching the actual database schema.

### Key changes
- One row per **financial year** (e.g. FY 2024/2025) instead of one row per month.
- Each row holds **12 month columns** `m1`–`m12` mapped as **March → February** (SA financial year).
- "Add Financial Year" dropdown only shows years not yet captured.
- Per-row **Save** and **Delete** buttons; grand total footer row.
- Table scrolls horizontally — FY name column is sticky on the left.

### Interface
```ts
interface IGrantBankStatementData {
  financial_year_id: number;
  financial_year_name: string;   // "FY 2024/2025"
  m1–m12: number;                // Mar–Feb
  total_amount: number;
  notes?: string;
}

const FY_MONTH_COLUMNS = [
  { key: 'm1', label: 'Mar' }, ..., { key: 'm12', label: 'Feb' }
];

const FINANCIAL_YEARS = [
  { id: 2, name: 'FY 2020/2021', ... },
  // ... through FY 2032/2033 (id: 14)
];
```

---

## 2. Director Info Enhancement

**File:** `applicant-shell/pages/applicant-overview.component.ts`  
**Interface:** `interfaces/grant-application.interfaces.ts`

### Extended `IDirector` interface
Added three new sections to the director record:

| Section | Fields |
|---|---|
| **Contact** | `cell_phone`, `alt_cell_phone`, `phone`, `alt_phone`, `email` |
| **Next of Kin** | `kin_name`, `kin_relationship` (dropdown), `kin_phone` |
| **Address** | `address_line1`, `address_line2`, `suburb`, `city`, `district`, `province` |

### NOK relationship options
```ts
const NOK_RELATIONSHIP_OPTIONS = [
  'Spouse / Partner', 'Parent', 'Sibling', 'Child', 'Friend', 'Colleague', 'Other'
];
```

### Inline edit per director
- Each director card now has a pencil **Edit** button.
- Clicking it expands an inline edit form directly beneath the card — no modal, no page navigation.
- The form is divided into four labelled sections (Basic Info, Contact Details, Next of Kin, Director Address), each separated by a divider.
- Changes are saved to the node via `GrantApplicationService.updateApplication()`.
- Cancel restores the previous state without saving.
- The **Add Director** form also has the same four-section layout.

---

## 3. SA ID Number Validation

**File:** `applicant-shell/pages/applicant-overview.component.ts`

### SA ID structure (13 digits)
```
YYMMDD SSSS C A Z
```

| Segment | Digits | Meaning |
|---|---|---|
| `YYMMDD` | 1–6 | Date of birth |
| `SSSS` | 7–10 | Gender: `0000–4999` = Female, `5000–9999` = Male |
| `C` | 11 | Citizenship: `0` = SA citizen, `1` = permanent resident |
| `A` | 12 | Old race field (ignored) |
| `Z` | 13 | Luhn check digit |

### Validation rules
1. Must be exactly **13 digits**.
2. Month must be `01–12`; day must form a **real calendar date**.
3. Date of birth cannot be in the **future**.
4. Citizenship digit must be `0` or `1`.
5. Passes the **Luhn algorithm** checksum.

### Auto-fill behaviour
When a valid 13-digit ID is entered:
- **Date of birth** is automatically populated (handles 1900s vs 2000s correctly).
- **Gender** (Male / Female) is automatically selected from digit group 7–10.
- Both fields remain manually editable afterwards.

### UX indicators
- Input border turns **green** on valid, **red** on error.
- Inline error message shown below the field (e.g. `"ID contains an invalid date"`, `"ID number failed checksum validation"`).
- Success message: `"Valid SA ID — date of birth and gender auto-filled"`.
- Works on both the **Add Director** form and the per-director **inline edit** form.

---

## 4. Application Checklist & Status Workflow

**New file:** `applicant-shell/pages/applicant-checklist.component.ts`  
**Injected in:** `applicant-overview.component.ts` (top of the page)

### Status lifecycle

```
draft  →  applied  →  interview  →  approved
                ↘ declined ↙
```

| Status | Colour | Actions available |
|---|---|---|
| `draft` | Grey | Activate Application → |
| `applied` | Blue | Decline · Move to Interview → |
| `interview` | Purple | Decline · Mark as Approved → |
| `approved` | Green | Reopen Application |
| `declined` | Red | Reopen Application |

Every transition goes through a **confirm panel** with an optional note field. All changes are persisted with a timestamp in `status_history`.

### Status history
- Full history is stored in `status_history: IStatusHistoryEntry[]` on the application record.
- History timeline is shown/hidden by clicking "History (n)" in the status card.
- Entries display in **reverse chronological order** with date/time and any recorded note.

### Checklist items
Default items (editable per-application):
- Certified copy of ID for all directors
- CIPC registration documents
- 12 months bank statements
- Proof of address (not older than 3 months)
- SARS tax clearance certificate
- B-BBEE certificate

**Editing the defaults:** Modify `DEFAULT_CHECKLIST_ITEMS` in `interfaces/grant-application.interfaces.ts` to change the defaults for all future applications.

**Per-application editing:** Click "Edit Items" to rename, delete, or add checklist items for a specific application.

Each item can be checked/unchecked (toggles between **Received** and **Pending**) and saves immediately.

### New interface additions
```ts
interface IStatusHistoryEntry {
  status: ApplicationStatus;
  timestamp: string;   // ISO 8601
  note?: string;
}

interface IChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

// IGrantApplicationData gains:
status_history?: IStatusHistoryEntry[];
checklist?: IChecklistItem[];
```

### Service change
New applications now default to `status: 'applied'` (was `'draft'`) with an initial history entry recording the creation timestamp.

---

## Files Changed Summary

| File | Change type |
|---|---|
| `interfaces/grant-application.interfaces.ts` | Extended `IDirector`; added `ApplicationStatus`, `IStatusHistoryEntry`, `IChecklistItem`, `DEFAULT_CHECKLIST_ITEMS`, `NOK_RELATIONSHIP_OPTIONS`, `FINANCIAL_YEARS`, `FY_MONTH_COLUMNS` |
| `applicant-shell/pages/applicant-overview.component.ts` | Director inline edit; SA ID validation; injected checklist component |
| `applicant-shell/pages/applicant-checklist.component.ts` | **New** — status card, history timeline, checklist, transition buttons |
| `applicant-shell/pages/applicant-bank-statements.component.ts` | **Rewritten** — per-FY m1–m12 table |
| `services/grant-application.service.ts` | Default status `'applied'`; initial history entry on create |
