# SCM Verification Process — Architecture

## Data Model

A single `grant_scm_verification` node (stored via `NodeService`, type `grant_scm_verification`) holds all quotations. Each quotation tracks one supplier/item through a 4-step workflow.

### GrantScmVerification (root)

```ts
interface GrantScmVerification {
  beneficiary_company_name: string;
  director: string;
  contact_number: string;
  quotations: ScmVerificationStep<ScmQuotation>;
}
```

### ScmQuotation (one per supplier/item)

```ts
interface ScmQuotation {
  id: string;                          // auto-generated: q_{timestamp}
  supplier_name: string;
  date_received?: string;              // YYYY-MM-DD
  item_purchased?: string;             // description of goods/services
  purchase_value?: number;             // ZAR amount
  beneficiary_signature?: string;      // signature image URL
  comments?: string;
  status?: 'pending' | 'in-progress' | 'completed';

  // Step 2 — populated when user clicks Next from Step 1
  online_verification?: ScmOnlineVerification;

  // Step 3 — populated when user clicks Next from Step 2
  purchase_order_processing?: ScmPurchaseOrderProcessing;

  // Step 4 — populated when user clicks Next from Step 3
  payment_processing?: ScmPaymentProcessing;
}
```

### Step sub-objects

```ts
interface ScmOnlineVerification {
  cipc_registration?: string;
  cipc_verified?: boolean;
  vat_number?: string;
  vat_verified?: boolean;
  contact_details: {
    phone?: string; email?: string; address?: string; verified?: boolean;
  };
  approved?: boolean;
  comments?: string;
  verified_by?: string;
  signature?: string;  // image URL
}

interface ScmPurchaseOrderProcessing {
  purchase_order_generated?: boolean;
  emailed_to_supplier_date?: string;
  tax_invoice_received?: boolean;
  bbbee_certificate_received?: boolean;
  bank_confirmation_received?: boolean;
  tax_clearance_received?: boolean;
  approved?: boolean;
  comments?: string;
  verified_by?: string;
  signature?: string;
}

interface ScmPaymentProcessing {
  vat_invoice_received?: boolean;
  bank_confirmation_received?: boolean;
  payment_authorisation_signed?: boolean;
  payment_request_date?: string;
  payment_done?: boolean;
  proof_of_payment_sent?: boolean;
  delivery_note_received?: boolean;
  comments?: string;
  verified_by?: string;
  signature?: string;
}
```

## Step Progression Logic

Step is **not stored** — it is derived from which sub-objects exist on the quotation:

| Step | Condition | Label |
|---|---|---|
| 1 | `online_verification` is `undefined` | Collection of Quotations |
| 2 | `online_verification` exists, `purchase_order_processing` is `undefined` | Online Verification of Suppliers |
| 3 | `purchase_order_processing` exists, `payment_processing` is `undefined` | Processing Verified Quotations (Generate PO) |
| 4 | `payment_processing` exists, `status !== 'completed'` | Processing Payment Authorization/Payment |
| Done | `status === 'completed'` | Completed |

When the user clicks **Next** in the modal, the parent component (`ScmVerificationProcessComponent.processNextStep()`) calls the service to initialize the next step's sub-object, then advances the step counter.

## Component Tree

```
ApplicantOverviewComponent
  └─ ApplicantBusinessProcessComponent  (tabbed: SCM / Exports)
       └─ ScmVerificationProcessComponent  [companyId, applicantId, applicantData]
            ├─ ScmVerificationHeaderComponent       — "Add Quotation" button
            ├─ ScmVerificationStatusTableComponent   — lists all quotations
            │    Columns: Supplier | Item | Value (R) | Current Step | Status | Actions
            └─ ScmVerificationModalComponent         — 4-step wizard per quotation
                 Summary bar: Item · Value · Supplier  (visible on all steps)
                 Step 1: supplier_name, date_received, item_purchased, purchase_value, signature
                 Step 2: CIPC, VAT, contact details, approval
                 Step 3: PO, BBBEE, tax clearance, bank confirmation
                 Step 4: VAT invoice, bank confirmation, payment auth, delivery note
```

## Services

| Service | Role |
|---|---|
| `ScmVerificationService` | Load/save via `NodeService`, add/remove quotations, initialize step data, determine current step, sync suppliers |
| `ScmVerificationStateService` | Angular signals for loading, saving, modal state, step navigation |
| `SupplierService` | Separate `supplier_collection` node — synced on save via `syncSuppliers()` |
| `GrantProcessExportService` | PDF export of the full SCM verification (all 4 sections) |

## Data Flow

1. **Load** — `getNodes('grant_scm_verification', companyId)` → returns existing node or default empty state
2. **Add Quotation** — `addQuotation()` pushes a new `ScmQuotation` with today's date, empty fields, status `'pending'`
3. **Edit in Modal** — user fills fields per step; `[(ngModel)]` binds directly to the quotation object in the signal
4. **Next** — `processNextStep()` initializes the next step's sub-object (e.g. `online_verification: { ... }`) and saves
5. **Save** — `saveScmVerification()` does a load-then-save pattern: checks for existing node → `updateNode` or `addNode`
6. **Supplier Sync** — after save, `syncSuppliers()` extracts supplier info from all quotations and upserts into the `supplier_collection` node
7. **Export** — `exportScmVerification()` builds an HTML table with all 4 sections and passes it to `PdfService.downloadPdf()`

## Persistence

- Node type: `grant_scm_verification`
- Parent ID: `companyId`
- Backend: generic `node/` CRUD endpoints — no custom PHP needed
- The entire `GrantScmVerification` object is stored as JSON in the `data` column
- Adding fields to the interface is backward-compatible; old nodes simply have `undefined` for new fields
