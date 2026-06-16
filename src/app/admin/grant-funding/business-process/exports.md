Perfect. For this PDF export prompt, I would not describe the visual appearance of the original form. Instead, I would describe the **FPDF rendering structure**, because Copilot/Claude needs to know exactly how to construct it using `Cell()`, `MultiCell()`, borders, widths, and row heights.

---

# Prompt 1 — Grant Funding Checklist PDF

## Objective

Generate a professional A4 portrait PDF for the South32 Grant Funding Checklist using FPDF.

## Layout Rules

* Use A4 Portrait.
* Use only FPDF table structures.
* No flex layouts.
* No CSS concepts.
* No icons.
* No background images.
* No decorative elements.
* No complex positioning.
* Everything must be achievable using:

  * Cell()
  * MultiCell()
  * SetXY()
  * Ln()
  * Rect()
  * SetFont()
  * SetFillColor()

---

## Page Structure

### Header

Create a single-row table.

| Left Section                  | Right Section |
| ----------------------------- | ------------- |
| Empty space reserved for logo | South32 Logo  |

Logo area should be reserved even if no image exists yet.

Height: approximately 25mm.

---

### Document Title

Full width centered table row.

```text
Grant Funding Check List – 035 Designs and Print
```

Style:

* Bold
* Center aligned
* Light grey fill
* Border on all sides

Height: 10mm

---

### Checklist Table

Create a 4-column table.

#### Column Widths

| Column        | Width |
| ------------- | ----- |
| Document List | 130mm |
| Yes           | 15mm  |
| No            | 15mm  |
| N/A           | 15mm  |

---

### Table Header

Row 1

```text
Document List
Provided?
```

Provided should span 3 columns.

---

### Table Header Row 2

```text
Yes
No
N/A
```

---

### Checklist Items

One row per item:

```text
SCM Verification Process Checklist
Expenditure Authorization Form
Business Support Acknowledgement Letter
ESD ED Agreement
Terms and Conditions for Disbursement of ESD Grant Funding
Acknowledgement of Delivery
Purchase order: number of transactions
Quotation/s
Tax Invoice/s
Proof of Payment to supplier
Bank confirmation
BBBEE
Tax Pin
Beneficiary ID Copy (All company directors)
Company Registration document
```

---

### Checkbox Rendering

Do not use icons.

Render checkboxes as:

```text
[ ]
```

using bordered cells.

Each checkbox column should contain an empty centered square.

---

### Footer

Bottom left:

```text
Version 01.2025
```

Font size 8.

---

## PDF Characteristics

* Clean compliance document.
* Black and white.
* Suitable for printing.
* All borders visible.
* Consistent row heights.
* Table may span multiple pages if needed.

---

# Expected Result

The final PDF should resemble an official procurement/compliance checklist and prioritize readability over visual styling.

---

This is the exact level of instruction I would give Claude/Copilot for the first PDF. It maps almost one-to-one into FPDF table code and avoids any layout techniques that FPDF struggles with. 

_______

# Prompt 2 — SCM Verification Process Checklist PDF

## Objective

Generate a professional A4 Landscape PDF for the South32 ESD Internal Grant SCM Verification Process Checklist using FPDF.

This document is highly tabular and should be rendered using structured tables only. The layout must closely follow the original paper form while remaining clean and printable.

---

## Layout Rules

* Use A4 Landscape orientation.
* Use only FPDF table-based rendering.
* No flex layouts.
* No grid systems.
* No icons.
* No decorative graphics.
* No absolute positioning except where required for table alignment.
* Use:

  * Cell()
  * MultiCell()
  * SetXY()
  * Ln()
  * Rect()
  * SetFont()
  * SetFillColor()

---

## Header Section

### Top Row

Create a single full-width row.

| Left                                                  | Right                    |
| ----------------------------------------------------- | ------------------------ |
| ESD INTERNAL GRANT SCM VERIFICATION PROCESS CHECKLIST | South32 Logo Placeholder |

The logo area should be reserved but not required.

Height: 12mm

Style:

* Bold
* Small uppercase text
* Bottom border

---

## Beneficiary Information Row

Immediately below header create a 4-column information table.

| Label                       | Value          | Label    | Value         |
| --------------------------- | -------------- | -------- | ------------- |
| Name of Beneficiary Company | Company Name   | Director | Director Name |
| Contact No                  | Contact Number |          |               |

Suggested widths:

```text
40mm | 65mm | 25mm | 55mm | 25mm | 45mm
```

Height: 8mm

All cells bordered.

---

# SECTION 1

## Process Step 1 – Collection of Quotations

Section header:

```text
Process – Step 1 – (Collection of Quotations)
```

Grey background.

Bold.

Full width.

---

### Table Columns

| No | Quotation Received / Supplier | Date Received | Beneficiary Signature | Comments / Next Steps |
| -- | ----------------------------- | ------------- | --------------------- | --------------------- |

Suggested widths:

```text
10mm
80mm
25mm
55mm
70mm
```

Create four empty data rows.

---

### Verification Footer

After rows create:

| Verified By | Signature |
| ----------- | --------- |

Widths:

```text
120mm
120mm
```

Height: 8mm

---

# SECTION 2

## Process Step 2 – Online Verification of Suppliers

Grey header row.

Full width.

---

### Table Columns

| No | Name of Supplier | CIPC Registration | Confirmation VAT No | Verification Contact Details / Email Address | Approved | Not Approved | Comments / Next Steps |
| -- | ---------------- | ----------------- | ------------------- | -------------------------------------------- | -------- | ------------ | --------------------- |

Suggested widths:

```text
10
45
20
25
40
20
20
60
```

---

### Approval Columns

Do not use icons.

Approved and Not Approved should be empty bordered cells.

Users will manually mark them later.

---

### Data Rows

Create four empty rows.

---

### Verification Footer

Same structure:

| Verified By | Signature |

---

# SECTION 3

## Process Step 3 – Processing of Verified Quotations (Generate PO)

Grey section header.

---

### Table Columns

| No | Supplier Company Name | Generate Purchase Order | Emailed to Supplier Date | Tax Invoice Received | BBBEE Certificate | Bank Confirmation Letter | Tax Clearance Certificate | Approved (Yes/No) | Comments / Next Steps |
| -- | --------------------- | ----------------------- | ------------------------ | -------------------- | ----------------- | ------------------------ | ------------------------- | ----------------- | --------------------- |

Suggested widths:

```text
10
40
20
22
18
18
25
25
18
44
```

---

### Boolean Columns

The following should render as empty bordered cells:

```text
Generate Purchase Order
Tax Invoice Received
BBBEE Certificate
Bank Confirmation Letter
Tax Clearance Certificate
Approved (Yes/No)
```

---

### Data Rows

Create four empty rows.

---

### Verification Footer

Same structure:

| Verified By | Signature |

---

# SECTION 4

## Process Step 4 – Processing of Payment Authorization / Payment

Grey section header.

---

### Table Columns

| No | Company Name | Director | Contact No | VAT Invoice Received | Bank Confirmation Letter | Payment Authorization Form Signed | Payment Request Date | Payment Done | Proof of Payment Sent to Supplier | Delivery Note and Photos Received |
| -- | ------------ | -------- | ---------- | -------------------- | ------------------------ | --------------------------------- | -------------------- | ------------ | --------------------------------- | --------------------------------- |

Suggested widths:

```text
10
35
25
20
20
22
28
20
18
30
35
```

---

### Boolean Columns

Render as empty bordered cells.

No icons.

No ticks.

No checkmarks.

---

### Data Rows

Create four empty rows.

---

### Final Verification Footer

| Verified By | Signature |

Full width.

---

# Styling Rules

### Headers

* Bold
* Font size 8–10
* Light grey fill
* Center aligned

### Data Cells

* Font size 7–8
* White background
* Full borders

### Row Heights

```text
Header rows: 8mm
Data rows: 7mm
Verification rows: 8mm
```

---

# PDF Characteristics

The resulting PDF should feel like:

* An internal audit form
* Procurement compliance document
* Easy to print and complete manually
* Structured entirely using bordered tables
* Suitable for conversion back into a physical signed document

This form should occupy nearly the full width of an A4 Landscape page and maintain consistent column alignment across all four process sections. 
___

# Prompt 3 — Expenditure Authorization Form PDF

## Objective

Generate a professional A4 Landscape PDF for the South32 ESD Centre Grant Funding Process Sheet – Expenditure Authorization Form using FPDF.

This document is primarily a financial authorization and approval form. The layout should be constructed entirely using bordered tables and standard FPDF methods.

---

## Layout Rules

* Use A4 Landscape orientation.
* Use only:

  * Cell()
  * MultiCell()
  * SetXY()
  * Ln()
  * Rect()
  * SetFont()
  * SetFillColor()
* No flex layouts.
* No CSS concepts.
* No icons.
* No decorative graphics.
* No complex positioning.
* No background images.
* No advanced drawing libraries.

The final output must be printable and suitable for physical signatures.

---

# Header Section

## Title Block

Centered at top of page.

### Line 1

```text
South32 ESD Centre Grant Funding Process Sheet
```

Bold.

Font size 12.

---

### Line 2

```text
Expenditure Authorization Form
```

Regular weight.

Font size 11.

---

## Process Tracking Table

Position in top-right corner.

Create a small bordered table.

### Columns

| Process Owner | Checked (✓ / ✗) |
| ------------- | --------------- |

### Rows

```text
Step 1 | NB
Step 2 | CB
Step 3 | LN
Step 4 | Beneficiary Signature
```

Suggested widths:

```text
40mm
30mm
```

All cells bordered.

Leave Checked column blank.

---

# Company Information Section

Immediately below header.

Create a two-row information table.

### Row 1

| Name of Company | Company Name | Contact No | Contact Number |

### Row 2

| Name of Director | Director Name | Company Reg No | Registration Number |

Suggested widths:

```text
35
90
35
55
```

All cells bordered.

Height: 8mm.

---

# Invoice Authorization Table

This is the primary section of the document.

Create a full-width table.

---

## Columns

| Invoice Number | Description of Goods/Services | Supplier Name | Amount Excl VAT | VAT Amount | Total Amount Including VAT | Preferred Supplier Yes/No |

Suggested widths:

```text
50
70
43
28
25
25
23
```

---

## Header Style

* Bold
* Light grey fill
* Vertically aligned
* Borders on all sides

---

## Data Rows

Create 7–8 blank rows.

Each row should allow entry of:

```text
Invoice Number
Description
Supplier
Amount Excl VAT
VAT Amount
Total Amount Including VAT
Preferred Supplier
```

Row height:

```text
10mm
```

---

# Authorization Notice

Full-width bordered row below invoice table.

Text:

```text
Please sign the payment authorization form so that payments can be processed.
```

Left aligned.

Height: 10mm.

---

# Beneficiary Declaration

Create a full-width bordered section.

Text template:

```text
I __________________ acknowledge that the supplier information provided is correct, as the director of __________________ I hereby authorize payment.
```

Use MultiCell so long company names wrap correctly.

Height approximately:

```text
15mm
```

---

# Beneficiary Authorization Table

Create a three-column table.

## Row 1

| Beneficiary | Signature | Date |

## Row 2

| Authorized By: Business Advisor 1 | Signature | Date |

Default advisor text:

```text
Authorized By: Business Advisor 1 – Marius Wilken
```

Suggested widths:

```text
95
70
60
```

---

# Approval Section

Create three equal-width approval blocks.

## Column 1

```text
ESD Centre Coordinator
(optional)
```

---

## Column 2

```text
South32 SPA
```

---

## Column 3

```text
ESD Centre Manager
```

---

Each block should contain:

### Row 1

Approver Name

### Row 2

```text
Signature:
```

with empty space for signing.

Suggested height:

```text
20mm
```

Use bordered cells.

---

# Payment Release Section

Final authorization table.

### Columns

| Payment Released By | Signature | Payment Release Date |

Default releaser:

```text
Krian Naidoo
```

Suggested widths:

```text
95
70
60
```

All cells bordered.

Height: 10mm.

---

# Styling Rules

## Fonts

### Title

```text
Arial Bold 12
```

### Section Headers

```text
Arial Bold 9
```

### Table Headers

```text
Arial Bold 8
```

### Data Cells

```text
Arial Regular 8
```

---

## Colors

Use only:

```text
Black text
Light grey table headers
White data cells
```

---

## Borders

Every field must be enclosed with visible borders.

No floating content.

No borderless sections.

---

# PDF Characteristics

The resulting PDF should resemble:

* A financial authorization document.
* A procurement payment approval form.
* A document intended for manual completion and signatures.
* An official South32 grant funding record.

The design should prioritize structured tables, consistent alignment, and reliable FPDF rendering over visual styling. 
 
