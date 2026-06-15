This one is quite different from the first checklist.

The **Grant Funding Checklist** was essentially a document completeness check.

This **SCM Verification Process Checklist** is actually a **workflow tracking document** that records the lifecycle of supplier procurement and payment processing.

I'd model this as a multi-step process rather than a flat checklist.

---

# High-Level Domain Model

```text
SCM Verification Process
│
├── Beneficiary Information
│
├── Step 1
│   Collection Of Quotations
│
├── Step 2
│   Supplier Verification
│
├── Step 3
│   Verified Quotations / PO Generation
│
└── Step 4
    Payment Processing
```

---

# Root Interface

```ts
export interface ScmVerificationProcess {
  id: string;

  beneficiaryCompanyName: string;
  director: string;
  contactNumber: string;

  quotations: Step1Quotation[];
  supplierVerifications: Step2SupplierVerification[];
  purchaseOrders: Step3PurchaseOrder[];
  payments: Step4PaymentProcess[];

  createdAt: Date;
  createdBy: string;
}
```

---

# Step 1 – Collection of Quotations

Looking at the form, each row represents a quotation received from a supplier.

```ts
export interface Step1Quotation {
  id: string;

  supplierName: string;

  dateReceived?: Date;

  beneficiarySignature?: string;

  comments?: string;
}
```

### UI

```text
+ Add Quotation

Supplier Name
Date Received
Signature
Comments
```

Stored as a dynamic table.

---

# Step 2 – Online Supplier Verification

This is where SCM verifies supplier legitimacy.

```ts
export enum VerificationStatus {
  APPROVED = 'APPROVED',
  NOT_APPROVED = 'NOT_APPROVED',
}

export interface Step2SupplierVerification {
  id: string;

  supplierName: string;

  cipcRegistrationNumber?: string;

  vatNumber?: string;

  verificationContactDetails?: string;

  status?: VerificationStatus;

  comments?: string;
}
```

---

# Step 3 – Processing Verified Quotations

This step generates the Purchase Order.

Most columns are actually Yes/No validations.

```ts
export interface Step3PurchaseOrder {
  id: string;

  supplierCompanyName: string;

  purchaseOrderGenerated: boolean;

  emailedToSupplierDate?: Date;

  taxInvoiceReceived: boolean;

  bbbeeCertificateReceived: boolean;

  bankConfirmationLetterReceived: boolean;

  taxClearanceCertificateReceived: boolean;

  approved: boolean;

  comments?: string;
}
```

---

# Step 4 – Payment Processing

This is essentially the finance workflow.

```ts
export interface Step4PaymentProcess {
  id: string;

  companyName: string;

  director: string;

  contactNumber: string;

  vatInvoiceReceived: boolean;

  bankConfirmationLetterReceived: boolean;

  paymentAuthorizationFormSigned: boolean;

  paymentRequestDate?: Date;

  paymentDone: boolean;

  proofOfPaymentSentToSupplier: boolean;

  deliveryNoteAndPhotosReceived: boolean;
}
```

---

# Better UI Design

Instead of recreating the spreadsheet exactly, I'd build:

## SCM Verification

### Beneficiary

```text
Company Name
Director
Contact Number
```

---

### Step 1: Quotations

```text
[ Add Supplier ]

┌──────────────┬─────────────┬───────────┐
│ Supplier     │ Date        │ Actions   │
└──────────────┴─────────────┴───────────┘
```

---

### Step 2: Verification

```text
Supplier
CIPC Number
VAT Number
Verification Details
Status
Comments
```

---

### Step 3: Purchase Order Processing

```text
Supplier
PO Generated
Invoice Received
BBBEE Received
Bank Confirmation
Tax Clearance
Approved
```

Use toggles/checks.

---

### Step 4: Payment Processing

```text
Supplier
Payment Authorisation
Payment Done
POP Sent
Delivery Note Received
```

Again use checkboxes.

---

# Database Structure

If you're already building an ESD platform, I'd create:

```text
esd_scm_processes
esd_scm_quotations
esd_scm_supplier_verifications
esd_scm_purchase_orders
esd_scm_payments
```

instead of storing everything in one giant JSON blob.

Reason:

* Easier reporting
* Easier auditing
* Easier approvals
* Easier dashboard metrics

For example later you'll be able to answer:

```text
How many suppliers failed verification?
How many payments are outstanding?
How many POs are awaiting tax clearance?
How many quotations were received per beneficiary?
```

without having to parse JSON columns.

This document is essentially the first place where I'd start thinking in terms of a **workflow engine** rather than a **form capture system**, because each of the four sections represents a distinct business process stage with its own validations and status progression.


Okay, perfect. Right now, I'm not going to be creating new tables or anything like that. I'm going to be using collections, but each can be a collection like that, like the list of quotations, where each table already have the company ID or the parent ID. So that is essentially referring to the applicant. Even the applicant is not as a collection. Let me show you.

{
    "id": 2074,
    "type": "grant_application",
    "company_id": null,
    "data": {
        "status": "stage_1780029748875",
        "directors": [
            {
                "name": "Sibani ",
                "surname": "Nyandeni",
                "id_number": "8806175475086",
                "cell_phone": "0671629419"
            }
        ],
        "workflow_id": "grant-2026",
        "company_name": "ISIBANISAMAYANDENI Trading and Projects",
        "status_history": [
            {
                "status": "applied",
                "timestamp": "2026-04-22T12:26:37.368Z"
            },
            {
                "status": "due_diligence",
                "timestamp": "2026-05-12T10:54:12.549Z",
                "reviewed_by": "Marius Wilken"
            },
            {
                "status": "stage_1777464072202",
                "timestamp": "2026-05-12T10:54:22.264Z",
                "reviewed_by": "Marius Wilken"
            },
            {
                "status": "demo",
                "timestamp": "2026-05-12T11:03:13.949Z",
                "reviewed_by": "Marius Wilken"
            },
            {
                "status": "stage_1777885810811",
                "timestamp": "2026-05-12T11:04:36.181Z",
                "reviewed_by": "Marius Wilken"
            },
            {
                "note": "Bulk stage change",
                "status": "stage_1780029748875",
                "timestamp": "2026-05-29T06:21:22.143Z",
                "reviewed_by": "Admin"
            }
        ],
        "previous_status": "stage_1777885810811",
        "registration_number": "2013\/038587\/07"
    },
    "parent_id": null,
    "created_by": null,
    "updated_by": null,
    "created_at": "2026-04-22 14:26:39",
    "updated_at": "2026-05-29 06:21:22",
    "submitted_by_name": null
}

then 

That's how it adjusts the banking monthly income for the company. This is how it's done using the collection. So what is more important here is the type of a node and the data and the parent ID, which is pointing to the applicant. So we can just keep it standard like this.

[
    {
        "id": 2145,
        "type": "grant_bank_statement",
        "company_id": null,
        "data": {
            "m1": 70,
            "m2": 110465,
            "m3": 90816,
            "m4": 33530,
            "m5": 101126,
            "m6": 35189,
            "m7": 66471,
            "m8": 44913,
            "m9": 50,
            "m10": 31000,
            "m11": 170114,
            "m12": 22048,
            "total_amount": 705792,
            "financial_year_id": 7,
            "financial_year_name": "FY 2025\/2026"
        },
        "parent_id": 2074,
        "created_by": null,
        "updated_by": null,
        "created_at": "2026-04-24 10:21:40",
        "updated_at": "2026-04-24 10:21:40",
        "submitted_by_name": null
    }
]

That changes my recommendation quite a bit.

Looking at your architecture, you're not building a normalized ERP-style database. You're building a **document/collection-based workflow system** where:

```text
Grant Application (parent)
├── Bank Statement
├── Financial Statements
├── SCM Verification
├── Grant Funding Checklist
├── Expenditure Authorization
├── Acknowledgement Of Delivery
└── etc...
```

and everything hangs off:

```ts
parent_id: 2074
```

which is actually very clean for this use case.

## I Would Not Create 4 Collections

Instead of:

```text
scm_quotations
scm_supplier_verifications
scm_purchase_orders
scm_payments
```

I'd keep the entire SCM Verification Process as a single node:

```json
{
  "type": "grant_scm_verification",
  "parent_id": 2074,
  "data": {}
}
```

---

## Suggested Structure

```json
{
  "type": "grant_scm_verification",
  "parent_id": 2074,
  "data": {
    "beneficiary_company_name": "035 Designs and Print",
    "director": "Sibusiso Mahlangu",
    "contact_number": "0840890282",

    "step_1_quotations": [],
    "step_2_supplier_verification": [],
    "step_3_purchase_orders": [],
    "step_4_payments": []
  }
}
```

---

## Step 1

```json
{
  "supplier_name": "ABC Suppliers",
  "date_received": "2026-05-20",
  "beneficiary_signature": true,
  "comments": ""
}
```

Array:

```json
"step_1_quotations": [
  {
    "supplier_name": "ABC Suppliers",
    "date_received": "2026-05-20",
    "beneficiary_signature": true,
    "comments": ""
  }
]
```

---

## Step 2

```json
{
  "supplier_name": "ABC Suppliers",
  "cipc_registration": "2015/123456/07",
  "vat_number": "4123456789",
  "verification_details": "info@abc.co.za",
  "approved": true,
  "comments": ""
}
```

---

## Step 3

```json
{
  "supplier_name": "ABC Suppliers",

  "purchase_order_generated": true,

  "emailed_to_supplier_date": "2026-05-22",

  "tax_invoice_received": true,

  "bbbee_certificate_received": true,

  "bank_confirmation_received": true,

  "tax_clearance_received": true,

  "approved": true,

  "comments": ""
}
```

---

## Step 4

```json
{
  "company_name": "ABC Suppliers",

  "director": "John Smith",

  "contact_number": "0821234567",

  "vat_invoice_received": true,

  "bank_confirmation_received": true,

  "payment_authorisation_signed": true,

  "payment_request_date": "2026-05-24",

  "payment_done": true,

  "proof_of_payment_sent": true,

  "delivery_note_received": true
}
```

---

## TypeScript

I'd model it like this:

```ts
export interface GrantScmVerification {
  beneficiary_company_name: string;
  director: string;
  contact_number: string;

  step_1_quotations: ScmQuotation[];
  step_2_supplier_verifications: ScmSupplierVerification[];
  step_3_purchase_orders: ScmPurchaseOrder[];
  step_4_payments: ScmPayment[];
}
```

The node itself stays generic:

```ts
export interface CollectionItem<T> {
  id: number;
  type: string;
  parent_id: number | null;
  data: T;
}
```

Then:

```ts
type GrantScmVerificationNode =
  CollectionItem<GrantScmVerification>;
```

---

## One Additional Improvement

Because the form is clearly a workflow, I'd also store verification metadata:

```json
{
  "verified_by": "Marius Wilken",
  "verified_date": "2026-05-25",
  "signature": "signature-id"
}
```

for each step.

Example:

```json
{
  "step_1": {
    "items": [...],
    "verified_by": "Marius Wilken",
    "verified_date": "2026-05-25",
    "signature": "sig_123"
  }
}
```

This mirrors the physical document more accurately because every section ends with:

```text
Verified By:
Signature:
```

and you'll almost certainly need that audit trail later.

Given the collection architecture you've shown, I'd keep **one `grant_scm_verification` node per application**, with four arrays inside `data`, rather than splitting the SCM process into separate collections. It aligns better with how the form is completed and reviewed as a single business artifact.
