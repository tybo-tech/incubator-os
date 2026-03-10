Your approach is good: **keep the latest status in `companies` for quick filtering**, but store the **history in `nodes`** so you can track renewals, interventions, and documents over time.

Conceptually:

```
companies (current snapshot)
        ↑
        │ updated when latest compliance changes
        │
nodes (history)
        └─ type: company_compliance
```

This gives you:

* fast filtering (e.g. "companies with expired tax clearance")
* full timeline of compliance activity.

Below is a **clean structure for the compliance node**, followed by **Angular interfaces**.

---

# 1. Compliance Node Record (Mock Structure)

Each compliance update is **one node record**.

Example timeline entries:

* BBBEE certificate issued
* tax clearance fixed
* tax expired
* new BBBEE uploaded
* CIPC status updated

Example record:

```json
{
  "id": 3101,
  "type": "company_compliance",
  "company_id": 5,
  "data": {
    "compliance_type": "tax_clearance",
    "status": "valid",
    "previous_status": "expired",
    "action": "renewed",
    "issue_date": "2026-02-01",
    "expiry_date": "2027-01-31",
    "notes": "Advisor assisted with SARS eFiling submission",
    "documents": [
      {
        "type": "tax_certificate",
        "file_name": "tax_clearance_2026.pdf",
        "uploaded_at": "2026-02-01T11:20:00Z"
      }
    ],
    "updated_by_role": "business_advisor",
    "updated_by_name": "Marius Wilken",
    "timeline_date": "2026-02-01T11:15:00Z",
    "is_current": true
  },
  "created_at": "2026-02-01 11:15:00",
  "updated_at": "2026-02-01 11:15:00"
}
```

---

# 2. Compliance Types

These correspond directly to the compliance items in your companies table.

```ts
export type ComplianceType =
  | "bbbee_certificate"
  | "tax_clearance"
  | "cipc_registration"
  | "vat_registration"
  | "ownership_declaration"
```

---

# 3. Compliance Status Values

```ts
export type ComplianceStatus =
  | "valid"
  | "expired"
  | "pending"
  | "submitted"
  | "rejected"
  | "not_available"
```

---

# 4. Compliance Actions (Timeline Events)

This describes **what happened** in that timeline entry.

```ts
export type ComplianceAction =
  | "issued"
  | "renewed"
  | "expired"
  | "updated"
  | "submitted"
  | "verified"
  | "rejected"
```

---

# 5. Angular Interfaces

## Root Node

```ts
export interface CompanyComplianceNode {
  id: number
  type: "company_compliance"
  company_id: number
  data: CompanyComplianceData
  parent_id?: number | null
  created_by?: number | null
  updated_by?: number | null
  created_at: string
  updated_at: string
}
```

---

# Compliance Data

```ts
export interface CompanyComplianceData {
  compliance_type: ComplianceType
  status: ComplianceStatus
  previous_status?: ComplianceStatus | null
  action: ComplianceAction
  issue_date?: string | null
  expiry_date?: string | null
  notes?: string
  documents: ComplianceDocument[]
  updated_by_role?: string
  updated_by_name?: string
  timeline_date: string
  is_current: boolean
}
```

---

# Compliance Documents

```ts
export interface ComplianceDocument {
  type: string
  file_name: string
  uploaded_at: string
}
```

---

# 6. Timeline UI Structure

In the Angular UI you can display a **timeline grouped by compliance type**.

Example view:

```
Compliance

BBBEE Certificate
-----------------
2026 Feb 10  Renewed
2025 Feb 12  Issued
2024 Feb 11  Expired

Tax Clearance
--------------
2026 Feb 01  Renewed
2025 Dec 02  Expired
2025 Mar 10  Verified
```

---

# 7. Updating the Main Companies Table

Whenever a **new compliance node is marked `is_current = true`**, update the company snapshot.

Example logic:

```
if compliance_type == "tax_clearance":
    companies.tax_valid_status = status
    companies.tax_pin_expiry_date = expiry_date
```

Example:

```
tax_valid_status = "Valid"
tax_pin_expiry_date = "2027-01-31"
```

This keeps the **companies table always reflecting the latest state**.

---

# 8. Recommended Query for Compliance Timeline

Fetch all compliance records for a company:

```sql
SELECT *
FROM nodes
WHERE company_id = 5
AND type = 'company_compliance'
ORDER BY created_at DESC;
```

---

# 9. Angular UI Tabs (Recommended)

Inside the **Company Profile Page**:

```
Company
├── Overview
├── Funding Requests
├── Compliance
│      ├── BBBEE
│      ├── Tax
│      ├── CIPC
│      └── VAT
└── Documents
```

Each compliance item shows:

```
Current Status
Expiry Date
Last Updated
Timeline
Upload Document
```

---

# 10. Example Timeline Sequence

Example history for tax clearance:

```
2024-02-01   issued
2025-02-01   expired
2025-03-01   renewed
2026-02-01   renewed
```

Each entry = **one node record**.

---

# 11. Why This Model Works Well

Advantages:

* works perfectly with your **existing `nodes` architecture**
* keeps **complete audit history**
* supports **document uploads**
* allows **timeline UI**
* easy to add new compliance types later
* supports **advisor interventions**

---

