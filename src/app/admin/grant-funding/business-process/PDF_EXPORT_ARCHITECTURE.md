# PDF Export — Architecture & How It Works

## Overview

There is **no client-side PDF generation**. All PDFs are produced by a remote PHP server running **DomPDF**. The Angular app builds HTML strings and sends them to `https://docs.tybo.co.za/pdf.php` which returns a PDF blob.

## The Pipeline

```
User clicks "Export PDF"
  │
  ▼
Component (e.g. swot-tab, applicant-overview, presentation-schedule)
  │  calls service method
  ▼
Domain Export Service (e.g. GrantProcessExportService, SwotActionPlanExportService)
  │  builds HTML string (may use DocumentGeneratorService)
  │  may fetch additional data first
  ▼
PdfService (or direct HTTP POST)
  │  sends HTML to https://docs.tybo.co.za/pdf.php
  ▼
PHP Backend (DomPDF)
  │  converts HTML → PDF
  ▼
Returns PDF Blob → browser downloads or opens in new tab
```

## Service Tiers

### 1. Core Transport — `PdfService` (`src/services/pdf/pdf.service.ts`)

The only service that talks to the PDF API. Methods:

| Method | What it does |
|---|---|
| `downloadPdf(html, filename, paperSize, orientation)` | POSTs HTML, triggers browser download |
| `previewPdf(html, paperSize, orientation)` | POSTs HTML, opens PDF in new tab |
| `generatePdfBlob(html, options)` | Returns raw `Observable<Blob>` for custom handling |
| `createHtmlTemplate(content, title, styles)` | Wraps content in a full HTML doc with default CSS |

**Request format (JSON):**
```ts
{ html: string; filename?: string; paper_size?: string; orientation?: string; download?: boolean; }
```

### 2. HTML Builder — `DocumentGeneratorService` (`src/services/pdf/document-generator.service.ts`)

Pure TypeScript — no HTTP calls. Generates DomPDF-optimized HTML with:

- `@page` CSS rules for print margins
- `DejaVu Sans` font (DomPDF-compatible)
- Section system: `header`, `content`, `table`, `priority-summary`, `footer`, `page-break`
- `cleanContentForDomPdf()` — strips unsupported CSS (grid, border-radius, box-shadow, transforms)

Used together with `PdfService`:
```ts
const html = docGen.generateDocument(sections, config);
pdfService.downloadPdf(html, 'report.pdf', 'A4', 'portrait');
```

### 3. Domain Export Services

These build domain-specific HTML and call `PdfService` (or the API directly).

#### Via PdfService (JSON POST)

| Service | Exports |
|---|---|
| `GrantProcessExportService` | Business Process Checklist, Expenditure Authorization, SCM Verification, Suppliers |
| `GrantExportService` | Grant Funding Report, Form Analytics Report |
| `ApplicantExportService` | Interview PDF (applicant profile, bank statements, form answers, scorecard) |
| `PresentationShortlistExportService` | Presentation shortlist with judge voting links |
| `PresentationScheduleComponent` | Presentation schedule |

#### Direct API call (FormData POST)

| Service | Exports |
|---|---|
| `SwotActionPlanExportService` | SWOT Action Plan |
| `GpsTargetsExportService` | GPS Targets |
| `FinancialExportService` | Financial report (bank statements, metrics, charts) |
| `AssessmentExportService` | Assessment questionnaire |

These four bypass `PdfService` entirely and POST `FormData` directly:
```ts
const formData = new FormData();
formData.append('html', htmlContent);
formData.append('filename', 'report.pdf');
formData.append('format', 'A4');
formData.append('orientation', 'portrait');
this.http.post(url, formData, { responseType: 'blob' });
```

### 4. Helper Services

| Service | Delegates to |
|---|---|
| `SwotExportHelperService` | `SwotActionPlanExportService` (fetches data first) |
| `AssessmentExportHelperService` | `AssessmentExportService` (fetches data first) |

## Components That Trigger PDF Export

| Component | What it exports |
|---|---|
| `swot-tab`, `swot.component` | SWOT action plan |
| `gps-targets.component` | GPS targets |
| `assessment.component`, `assessment-tab` | Assessment |
| `executive-report.component` | Executive report (currently disabled) |
| `financial-tab` | Navigates to pdf-export page |
| `presentation-schedule.component` | Presentation schedule |
| `presentation-scoring.component` | Presentation scoring |
| `action-plan-export.component` | SWOT/GPS action plan (uses DocumentGeneratorService) |
| `pdf-generator.component` (demo) | Test component for custom HTML, invoices, reports |
| `financial-report-export.component` (example) | Example financial/compliance/project reports |

## Backend

- **URL:** `https://docs.tybo.co.za/pdf.php`
- **Engine:** DomPDF (PHP)
- **Font:** `DejaVu Sans` (supports Unicode/UTF-8)
- **Paper sizes:** A4 (default), configurable via `paper_size` param
- **Orientation:** portrait (default) or landscape

## Dependencies

| Package | Status |
|---|---|
| `pdfmake` ^0.2.20 | **Installed but unused** — no code references it |
| `html2pdf.js` | **Removed** — type defs remain at `src/types/html2pdf.d.ts` but library is gone |
| `jspdf` | Not present |
| `pdf-lib` | Not present |

## SCM Verification PDF Export (specific to this folder)

The SCM export lives in `GrantProcessExportService.exportScmVerification()`:

1. `ScmVerificationProcessComponent.exportToPdf()` builds a `CompanyInfo` object from `applicantData`
2. Calls `exportService.exportScmVerification(scmData, companyInfo)`
3. `_buildScmVerificationHtml()` generates a landscape HTML table with 4 sections (one per workflow step)
4. Passes HTML to `PdfService.downloadPdf()` with paper `A4`, orientation `landscape`

The PDF includes:
- Beneficiary company info header
- Step 1: Quotations table (supplier, item, value, date, signature, comments)
- Step 2: Online verification table (CIPC, VAT, contact details, approval)
- Step 3: PO processing table (PO, BBBEE, tax clearance, bank confirmation)
- Step 4: Payment processing table (VAT invoice, bank confirmation, payment auth, delivery note)
- Verified By / Signature rows after each section
