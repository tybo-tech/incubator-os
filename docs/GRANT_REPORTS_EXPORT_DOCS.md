# Grant Funding Reports — Export Documentation

**Module:** `admin/grant-funding`
**Workflow ID:** `grant-2026`
**Last updated:** May 2026

---

## Overview

The Grant Funding Reports module provides a dedicated reporting page that aggregates bank statement data across all applicants in a workflow. The page supports client-side filtering and exports the filtered dataset to either Excel (`.xlsx`) or PDF.

---

## Architecture

```
Browser (Angular 19)
  └── GrantFundingReportsComponent       UI + filters + sort
        └── GrantReportsService          HTTP calls to PHP API
        └── GrantExportService           Excel + PDF generation

PHP API (api-incubator-os/)
  └── api-nodes/grant/
        ├── applicants.php               All applicants + aggregated stats
        ├── applicant-financial-summary.php  Per-applicant FY breakdown
        ├── applicant-submissions.php    Form/interview submissions
        └── financial-overview.php      Cross-applicant leaderboard
  └── models/GrantReports.php           All SQL aggregation logic
```

---

## Backend

### Model — `api-incubator-os/models/GrantReports.php`

Central PHP class. Instantiated by each endpoint. Uses PDO with `ERRMODE_EXCEPTION`.

**Node types consumed from the `nodes` table:**

| Type | Description |
|---|---|
| `grant_application` | Top-level applicant node |
| `grant_bank_statement` | Child of application — one per financial year, contains `m1`–`m12` revenue fields |
| `form_submission` | Interview/form answer linked via `company_id` |

#### Method 1 — `getApplicantsCollection()`

```php
getApplicantsCollection(?string $workflowId, ?string $status, ?string $province): array
```

Returns all applicants with aggregated bank-statement statistics. Uses a single LEFT JOIN SQL query across `grant_application` → `grant_bank_statement`. MySQL `JSON_EXTRACT` pulls fields from the `data` JSON column.

**Aggregated fields returned per applicant:**

| Field | Description |
|---|---|
| `grand_total` | Sum of `total_amount` across all FY bank statement nodes |
| `active_months` | Count of months (m1–m12) where value > 0 across all FYs |
| `captured_months` | Count of months where a value was captured (not null) across all FYs |
| `avg_per_active_month` | `grand_total / active_months` |
| `consistency_rate` | `(active_months / captured_months) * 100` |
| `consistency_label` | `Consistent` ≥ 80% · `Moderate` ≥ 50% · `Irregular` < 50% |
| `consistency_note` | Plain-English note matching the label |

#### Method 2 — `getApplicantFinancialSummary(int $applicantId)`

Returns a detailed per-FY breakdown for one applicant. Fetches each `grant_bank_statement` node individually and parses `m1`–`m12` fields. Calculates consistency per FY row as well as overall.

**Response shape:**
```json
{
  "applicant_id": 123,
  "grand_total": 3080000.00,
  "active_months": 12,
  "captured_months": 12,
  "avg_per_active_month": 256666.67,
  "consistency_rate": 100.0,
  "consistency_label": "Consistent",
  "fy_count": 1,
  "fy_rows": [
    {
      "node_id": 456,
      "financial_year_name": "FY2024",
      "months": { "m1": 200000, "m2": 250000, "m3": null, ... },
      "total": 3080000.00,
      "active_months": 12,
      "captured_months": 12,
      "avg_per_active_month": 256666.67,
      "consistency_rate": 100.0,
      "consistency_label": "Consistent"
    }
  ]
}
```

#### Method 3 — `getApplicantFormSubmissions(int $applicantId)`

Returns all `form_submission` nodes linked to the applicant's `company_id`. Joins to the parent `form_template` node to include the template name. Ordered by `created_at DESC`.

#### Method 4 — `getFinancialOverview(?string $workflowId)`

Cross-applicant leaderboard. Internally calls `getApplicantsCollection()`, filters to applicants with at least one captured month, sorts descending by `grand_total`, and assigns ranks.

**Aggregate KPIs returned:**

| Field | Calculation |
|---|---|
| `total_applicants` | All applicants in the workflow |
| `applicants_with_data` | Applicants where `captured_months > 0` |
| `total_pool_value` | Sum of `grand_total` across applicants with data |
| `overall_active_months` | Sum of `active_months` across applicants with data |
| `overall_avg_per_active_month` | `total_pool_value / overall_active_months` |
| `top_avg_per_month` | `max(avg_per_active_month)` across all applicants with data |

---

### Endpoints — `api-incubator-os/api-nodes/grant/`

All endpoints follow the same pattern:
1. Include `../../config/Database.php` and `../../config/headers.php`
2. Instantiate `Database` → `GrantReports`
3. Call the relevant model method
4. Return `json_encode($result)` or a `500` error response

| File | Method | Query Params | Model Method |
|---|---|---|---|
| `applicants.php` | GET | `workflow_id`, `status`, `province` (all optional) | `getApplicantsCollection()` |
| `applicant-financial-summary.php` | GET | `id` (required — applicant node ID) | `getApplicantFinancialSummary()` |
| `applicant-submissions.php` | GET | `applicant_id` (required) | `getApplicantFormSubmissions()` |
| `financial-overview.php` | GET | `workflow_id` (optional) | `getFinancialOverview()` |

**Base URL:** `https://app.rbttacesd.co.za/api/api-nodes/grant/`

---

## Frontend

### Angular Service — `grant-reports.service.ts`

`GrantReportsService` wraps all four endpoints with typed `Observable` return values.

```typescript
getApplicants(filters?)              → Observable<IApplicantSummary[]>
getFinancialSummary(applicantId)     → Observable<IApplicantFinancialSummary>
getFormSubmissions(applicantId)      → Observable<IApplicantSubmissions>
getFinancialOverview(workflowId?)    → Observable<IFinancialOverview>
```

**Key interfaces:**

| Interface | Purpose |
|---|---|
| `IApplicantSummary` | One applicant with aggregated stats |
| `IFinancialOverviewApplicant` | Extends `IApplicantSummary` with `rank: number` |
| `IFinancialOverview` | Full leaderboard response with KPI aggregates |
| `IApplicantFinancialSummary` | Single-applicant detail with `fy_rows[]` |
| `IFyRow` | One financial year row including `months: Record<string, number \| null>` |

---

### Reports Component — `grant-funding-reports.component.ts`

Route: `admin/grant-funding/reports`

Loads `IFinancialOverview` on init via `GrantReportsService.getFinancialOverview('grant-2026')`.

#### Filter State (Angular signals)

| Signal | Type | Description |
|---|---|---|
| `activeStatusFilter` | `signal<string>('')` | Stage key — filters to a single workflow stage |
| `hasTurnoverFilter` | `signal(false)` | Only applicants with `grand_total > 0` |
| `under1MFilter` | `signal(false)` | Only applicants with `0 < grand_total <= 1,000,000` |
| `has12MonthsFilter` | `signal(false)` | Only applicants with `active_months >= 12` |
| `consistencyFilter` | `signal<string>('')` | One of `Consistent`, `Moderate`, `Irregular` |
| `searchQuery` | `string` | Free-text match on `company_name` |
| `sortField` | `'rank' \| 'name' \| 'consistency' \| 'avg'` | Sort column |

All filters are applied in `filteredApplicants` (a `computed()`), which is also the data source for both exports. Clearing all filters resets to the full dataset.

#### `activeFilterLabels` getter

Returns a `string[]` of human-readable labels for the currently active filters, e.g.:

```
["Stage: applied", "R1M & under", "Consistency: Consistent"]
```

This array is passed to `GrantExportService` so both the Excel and PDF exports can display the filters prominently.

---

### Export Service — `grant-export.service.ts`

`GrantExportService` handles both export formats. It receives the **already-filtered** `IFinancialOverview` object from the component, so the export always reflects exactly what is visible on screen.

```typescript
exportExcel(overview: IFinancialOverview, filterLabels: string[]): Promise<void>
exportPdf(overview: IFinancialOverview, filterLabels: string[]): void
```

---

#### Excel Export

Uses **ExcelJS** (lazy-imported to avoid bundle bloat). Generates a `.xlsx` file with two sheets.

**Sheet 1 — Summary**

| Section | Content |
|---|---|
| Title | Workflow name + generated date |
| Filter Block | Amber (filtered) or green (full dataset) block with each active filter as a bullet. Shows count: "Showing X of Y applicants" |
| KPIs | 8-row table: total applicants, applicants with data, total pool value, avg/month, top avg/month, etc. |
| Consistency Distribution | Table with Consistent / Moderate / Irregular counts and percentages, colour-coded rows |

**Sheet 2 — Leaderboard**

| Section | Content |
|---|---|
| Row 1 | Sheet title |
| Row 2 (frozen) | Filter banner — amber if filtered, grey if full dataset |
| Row 3 (frozen) | Column headers with dark navy fill |
| Data rows | One row per applicant; alternating row shading; top-3 rank cells highlighted gold/silver/bronze; currency format `R#,##0.00` |
| Totals row | Light blue footer with pool value + overall avg |

Columns: `Rank · Company Name · Status · Province · Grand Total · Avg/Active Month · Active Months · Captured Months · Consistency % · Consistency Label`

Auto-filter is applied on the header row. Columns 1–10 have fixed widths.

**File name format:** `Grant_Funding_Report_{workflow_id}_{YYYY-MM-DD}.xlsx`

---

#### PDF Export

Sends an HTML string to `PdfService.downloadPdf()`, which posts it to `https://docs.tybo.co.za/pdf.php` and receives a binary PDF blob. Output is A4 landscape.

**Font:** `'Trebuchet MS', Arial, sans-serif` applied via `* { font-family: ... }` in the `<style>` block to ensure consistent rendering across all table and inline elements (PDF renderers do not reliably inherit `font-family` from `body` into table cells).

All layout uses `<table>` elements — no CSS flexbox or grid, which are not supported by the PDF renderer.

**HTML structure:**

| Section | Description |
|---|---|
| Header | Report title + workflow ID + generated date on the left; "Incubator OS / Confidential" on the right; separated by a 3px navy bottom border |
| Filter Banner | **Filtered:** Amber box with triangle SVG icon, "FILTERED REPORT" heading, filter tag pills (one per active filter), and applicant count `X of Y` on the right. **Full dataset:** Small green box with checkmark SVG and count |
| KPI Cards | 4-column table row — Total Applicants (blue), Total Pool Value (green), Avg/Active Month (indigo), Top Avg/Month (purple) |
| Consistency Distribution | 3-column table row — Consistent (green), Moderate (amber), Irregular (red) — each showing count, label, and percentage |
| Leaderboard Table | Dark navy header row. One row per applicant. Columns: `# · Company · Stage · Grand Total · Avg/Month · Active/Cap. · Consistency`. Top-3 ranks have gold/silver/bronze backgrounds. Consistency labels have colour-coded badge backgrounds. Alternating row shading |
| Totals Footer | Light blue row with pool value + overall avg/month |
| Page Footer | Centred — "Generated by Incubator OS · {date} · Confidential" |

**SVG icons used (no emoji, no HTML entities):**
- Filter banner (filtered): warning triangle — `<path d="M12 9v4m0 4h.01M10.29 3.86..."/>`
- Filter banner (full dataset): checkmark — `<path d="M20 6L9 17l-5-5"/>`

**File name format:** `Grant_Funding_Report_{workflow_id}_{YYYY-MM-DD}.pdf`

---

## Data Flow Summary

```
User applies filters on reports page
         │
         ▼
filteredApplicants() computed signal
         │
         ├─── rendered in leaderboard table on screen
         │
         ├─── exportExcel(filteredOverview, activeFilterLabels)
         │         └── ExcelJS → .xlsx download (2 sheets, filter section)
         │
         └─── exportPdf(filteredOverview, activeFilterLabels)
                   └── _buildPdfHtml() → PdfService → PDF download
```

---

## Consistency Scoring Reference

| Label | Condition | Colour |
|---|---|---|
| Consistent | `active / captured >= 80%` | Green (`#d1fae5 / #065f46`) |
| Moderate | `active / captured >= 50%` | Amber (`#fef3c7 / #92400e`) |
| Irregular | `active / captured < 50%` | Red (`#fee2e2 / #991b1b`) |

`active_months` = months with revenue > 0
`captured_months` = months where a value was recorded (including R0)
