# Turnover Actual Auto-Sync — Implementation Notes

**Date:** March 10, 2026  
**Feature:** Automatic synchronisation of `companies.turnover_actual` from captured revenue data

---

## Overview

When a coach or advisor captures monthly revenue figures for a company across one or more financial years, the system now automatically calculates the **combined total of all annual revenue** and writes it back to the `companies` table as `turnover_actual` (and `turnover_estimated`).

This means the company profile always reflects the most up-to-date, ground-truthed revenue figure derived directly from the granular monthly data entered in the Revenue Capture screen — no manual entry required.

---

## Database Architecture

### Tables Involved

#### `company_financial_yearly_stats`
Stores the granular monthly revenue rows. One row per account per financial year per company.

| Column | Type | Description |
|---|---|---|
| `id` | int | Primary key — used as the record ID for updates |
| `company_id` | int | FK to `companies.id` |
| `financial_year_id` | int | FK to `financial_years.id` |
| `account_id` | int / null | FK to `company_accounts.id` (null for blank rows) |
| `m1`–`m12` | decimal | Monthly values (month index depends on FY start month) |
| `total_amount` | decimal | Sum of m1–m12, calculated by the client before saving |

#### `companies`
The main company profile table. Two columns are updated by this feature:

| Column | Type | Description |
|---|---|---|
| `turnover_actual` | decimal(14,2) | Actual turnover derived from captured revenue data |
| `turnover_estimated` | decimal(14,2) | Also set to the same value as `turnover_actual` |

---

## How the Node/PHP Backend Is Used

The project uses a **PHP API layer** (located in `api-incubator-os/api-nodes/`) that the Angular frontend communicates with over HTTP. This is referred to throughout the codebase as the "node" layer — each subfolder under `api-nodes/` is a self-contained endpoint group.

### Endpoint: Save/Update Monthly Revenue Row

```
POST /api-nodes/company-financial-yearly-stats/update-yearly-stats.php
```

**Called when:** a user edits any monthly value in an existing revenue row.  
**Payload:**
```json
{
  "id": 42,
  "company_id": 7,
  "financial_year_id": 3,
  "account_id": 11,
  "m1": 15000, "m2": 18000, ..., "m12": 22000,
  "total_amount": 215000
}
```
**Response:** the updated `company_financial_yearly_stats` record.

### Endpoint: Create Empty Revenue Row

```
POST /api-nodes/company-financial-yearly-stats/add-yearly-stats.php
```

**Called when:** the user clicks "Add Row" in the Revenue Capture screen.  
A blank DB record is created immediately so every UI row always has a backing DB ID — this prevents data loss on rapid input.  
**Returns:** the new record including its `id`, which the Angular component stores in local state.

### Endpoint: Delete Revenue Row

```
GET /api-nodes/company-financial-yearly-stats/delete-yearly-stats.php?id=42
```

**Called when:** the user removes a revenue row.

### Endpoint: Update Company Turnover

```
POST /api-nodes/company/update-company.php
```

**Called automatically after every successful save/delete** (see Angular flow below).  
**Payload:**
```json
{
  "id": 7,
  "turnover_actual": 430000,
  "turnover_estimated": 430000
}
```

---

## Angular Implementation

### Files Changed

| File | Change |
|---|---|
| `company-revenue-capture.component.ts` | Added `CompanyService` injection + new `syncTurnoverActual()` method + wired up 3 call sites |

### Key Additions in `company-revenue-capture.component.ts`

#### 1. Import & Inject `CompanyService`

```typescript
import { CompanyService } from '../../../../../services/company.service';

// inside the class:
private companyService = inject(CompanyService);
```

#### 2. `syncTurnoverActual()` — the core method

```typescript
private syncTurnoverActual(): void {
  const companyId = this.companyId();
  if (!companyId) return;

  const total = this.totalRevenue();   // computed signal — sums all year groups
  this.companyService
    .updateCompany(companyId, {
      turnover_actual: total,
      turnover_estimated: total,
    })
    .subscribe({
      next: () => console.log('✅ turnover_actual synced:', total),
      error: (err) => console.error('❌ Failed to sync turnover_actual:', err),
    });
}
```

`totalRevenue` is a pre-existing `computed` signal in the same component:

```typescript
readonly totalRevenue = computed(() =>
  this.years().reduce(
    (total, year) => total + this.helperService.calculateYearTotal(year),
    0
  )
);
```

`calculateYearTotal` simply sums `account.total` for every row in a year group. Each `account.total` is the sum of `m1`–`m12` already computed client-side.

#### 3. Call Sites — When syncTurnoverActual Is Triggered

| Trigger | Location |
|---|---|
| Revenue row **updated** | `updateYearlyStats()` success callback |
| Revenue row **inserted** (after getting DB id) | `saveAccountData()` success callback |
| Revenue row **deleted** | `deleteAccountData()` success callback — fires *after* the row is removed from local state, so `totalRevenue()` is already correct |

---

## Data Flow Diagram

```
User edits a monthly cell
        │
        ▼
Debounced (300ms) accountSaveSubject
        │
        ▼
saveAccountToDatabase()
        │
        ├─ action = 'update'
        │       └─ POST update-yearly-stats.php
        │               └─ success → syncTurnoverActual()
        │
        └─ action = 'insert'
                └─ POST add-yearly-stats.php  (via helperService)
                        └─ success → syncTurnoverActual()

User deletes a row
        │
        ▼
deleteAccountRecord()
        │
        ├─ GET delete-yearly-stats.php
        │       └─ success → remove row from local state
        │               └─ syncTurnoverActual()
        │
        ▼
POST update-company.php  ← turnover_actual = sum of all years
```

---

## Why Both `turnover_actual` and `turnover_estimated`?

The `companies` table has separate columns for estimated and actual turnover. Since the captured revenue is real, verified data, both fields are set to the same calculated total. This ensures:
- Reports that read `turnover_estimated` get the current figure
- Reports that read `turnover_actual` also get the current figure
- No stale estimate sits alongside a new actual value

---

## Notes & Considerations

- **Silent sync** — `syncTurnoverActual()` does not show a toast to the user. The per-row save already shows a success toast; a second toast for the company update would be noisy.
- **No blocking** — the sync is fire-and-forget from the user's perspective. A failure is logged to the console but does not roll back the row save.
- **Multi-year totals** — the sum spans *all loaded financial years*, not just the one being edited. This means `turnover_actual` reflects the company's total recorded revenue across all years in the system.
- **deleteYear (UI only)** — removing an entire financial year from the view (`deleteYear()`) currently only removes it from the Angular state; it does not delete DB records. Therefore `syncTurnoverActual()` is not called there — re-loading the data would restore the year.
