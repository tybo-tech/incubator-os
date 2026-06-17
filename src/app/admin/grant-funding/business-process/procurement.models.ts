/**
 * @fileoverview
 * Procurement Domain Models
 *
 * This file defines the complete domain model for the Grant Funding Procurement process.
 * It implements a process-centric architecture where the Procurement aggregate root
 * represents the complete acquisition lifecycle.
 *
 * Key Design Principles:
 * - Strong typing throughout
 * - Enum-based status values
 * - Composition over duplication
 * - Business concept modeling (not document sections)
 * - Auditability and extensibility
 */

// ===========================================================================
// ENUMS
// ===========================================================================

/**
 * Current status of the entire procurement process.
 * Represents the stage in the lifecycle.
 */
export enum ProcurementStatus {
  NEED_IDENTIFIED = 'NEED_IDENTIFIED',
  QUOTATION_COLLECTION = 'QUOTATION_COLLECTION',
  SUPPLIER_SELECTION = 'SUPPLIER_SELECTION',
  SUPPLIER_VERIFICATION = 'SUPPLIER_VERIFICATION',
  APPROVAL_WORKFLOW = 'APPROVAL_WORKFLOW',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  INVOICE_PROCESSING = 'INVOICE_PROCESSING',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  FULFILLMENT_CONFIRMATION = 'FULFILLMENT_CONFIRMATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Status of an approval record within the workflow.
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Status of supplier verification checks.
 */
export enum VerificationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  EXEMPT = 'EXEMPT',
}

/**
 * Status of an invoice within the procurement lifecycle.
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  RECEIVED = 'RECEIVED',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
  REJECTED = 'REJECTED',
}

/**
 * Status of a payment transaction.
 */
export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

/**
 * Types of documents that can be referenced or attached.
 */
export enum DocumentType {
  QUOTATION = 'QUOTATION',
  INVOICE = 'INVOICE',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  COMPLETION_CERTIFICATE = 'COMPLETION_CERTIFICATE',
  SERVICE_CONFIRMATION = 'SERVICE_CONFIRMATION',
  PHOTO = 'PHOTO',
  TECHNICAL_SPECS = 'TECHNICAL_SPECS',
  SUPPLIER_REGISTRATION = 'SUPPLIER_REGISTRATION',
  CIPC_CERTIFICATE = 'CIPC_CERTIFICATE',
  VAT_CERTIFICATE = 'VAT_CERTIFICATE',
  BBBEE_CERTIFICATE = 'BBBEE_CERTIFICATE',
  TAX_CLEARANCE = 'TAX_CLEARANCE',
  PO_ATTACHMENT = 'PO_ATTACHMENT',
  PROOF_OF_PAYMENT = 'PROOF_OF_PAYMENT',
  OTHER = 'OTHER',
}

/**
 * Types of procurement lifecycle events for auditing.
 */
export enum ProcurementEventType {
  QUOTATION_SUBMITTED = 'QUOTATION_SUBMITTED',
  QUOTATION_SELECTED = 'QUOTATION_SELECTED',
  SUPPLIER_VERIFIED = 'SUPPLIER_VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  APPROVAL_SUBMITTED = 'APPROVAL_SUBMITTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  PO_CREATED = 'PO_CREATED',
  INVOICE_RECEIVED = 'INVOICE_RECEIVED',
  INVOICE_PROCESSED = 'INVOICE_PROCESSED',
  PAYMENT_RELEASED = 'PAYMENT_RELEASED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  FULFILLMENT_CONFIRMED = 'FULFILLMENT_CONFIRMED',
  FULFILLMENT_REJECTED = 'FULFILLMENT_REJECTED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DOCUMENT_ADDED = 'DOCUMENT_ADDED',
  DOCUMENT_REMOVED = 'DOCUMENT_REMOVED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  WARNED = 'WARNED',
  ERROR = 'ERROR',
}

// ===========================================================================
// VALUE OBJECTS
// ===========================================================================

/**
 * Represents a monetary amount with currency.
 * Used for quotations, invoices, payments, and commitments.
 */
export interface Money {
  /**
   * The amount in the smallest currency unit (e.g., cents for ZAR, USD).
   * Stored as bigint to avoid floating-point precision issues.
   */
  amountMinorUnits: bigint;

  /**
   * ISO 4217 currency code (e.g., 'ZAR', 'USD', 'EUR').
   */
  currency: string;

  /**
   * Exchange rate to base currency (if applicable).
   * Defaults to 1.0 for domestic currency.
   */
  exchangeRate?: number;

  /**
   * Origin of the exchange rate (e.g., 'SARB', 'BANK_RATE', 'FIXED').
   */
  exchangeRateSource?: string;

  /**
   * Date of exchange rate (important for historical accuracy).
   */
  exchangeRateDate?: Date;
}

/**
 * Contact information for individuals or companies.
 * Reusable across suppliers, approvers, and beneficiaries.
 */
export interface ContactDetails {
  /**
   * Primary email address.
   */
  email: string;

  /**
   * Phone number (include country code).
   */
  phone?: string;

  /**
   * Physical address.
   */
  address?: PhysicalAddress;

  /**
   * Website URL.
   */
  website?: string;

  /**
   * Alternative contact method.
   */
  alternateContact?: string;
}

/**
 * Physical address structure.
 */
export interface PhysicalAddress {
  /**
   * Street address (line 1).
   */
  street: string;

  /**
   * Suburb or district.
   */
  suburb?: string;

  /**
   * City or town.
   */
  city: string;

  /**
   * Postal code.
   */
  postalCode?: string;

  /**
   * Province or state.
   */
  province?: string;

  /**
   * Country code (ISO 3166-1 alpha-2).
   */
  country: string;
}

/**
 * Digital or physical signature with metadata.
 * Used for approvals and authorizations.
 */
export interface Signature {
  /**
   * Who signed (name or ID).
   */
  signedBy: string;

  /**
   * Role or title of the signer.
   */
  role?: string;

  /**
   * Timestamp of signature.
   */
  timestamp: Date;

  /**
   * Signature type (digital, wet-ink, electronic).
   */
  type?: 'digital' | 'wet_ink' | 'electronic';

  /**
   * IP address or device info where signature was captured.
   */
  signatureSource?: string;

  /**
   * Hash or identifier for digital signatures.
   */
  signatureHash?: string;
}

/**
 * Audit information for verification processes.
 * Captures who verified, when, and what was verified.
 */
export interface VerificationAudit {
  /**
   * Who performed the verification.
   */
  verifiedBy: string;

  /**
   * when the verification occurred.
   */
  verifiedAt: Date;

  /**
   * Method or system used for verification.
   */
  verificationMethod?: string;

  /**
   * Reference to the verification source (e.g., CIPC case number).
   */
  referenceNumber?: string;

  /**
   * Additional notes or findings.
   */
  notes?: string;
}

/**
 * Reference to an external or internal document.
 * Enables linking without duplicating document contents.
 */
export interface DocumentReference {
  /**
   * Unique identifier for the document.
   */
  documentId: string;

  /**
   * Human-readable document number or reference.
   */
  documentNumber?: string;

  /**
   * Type of document.
   */
  type: DocumentType;

  /**
   * Description or title of the document.
   */
  title?: string;

  /**
   * Storage location or URL.
   */
  location: string;

  /**
   * File version or hash for integrity.
   */
  version?: string;
}

/**
 * Start and end date range.
 * Used for contracts, validity periods, and date-bound conditions.
 */
export interface DateRange {
  /**
   * Start date (inclusive).
   */
  startDate: Date;

  /**
   * End date (inclusive).
   */
  endDate: Date;

  /**
   * Optional description of the period.
   */
  description?: string;
}

// ===========================================================================
// ENTITIES
// ===========================================================================

/**
 * Represents a supplier participating in the procurement process.
 * Contains all identifying and registration information.
 */
export interface Supplier {
  /**
   * Unique supplier identifier.
   */
  supplierId: string;

  /**
   * Registered company name.
   */
  companyName: string;

  /**
   * Company registration number (e.g., CIPC number).
   */
  registrationNumber: string;

  /**
   * VAT registration number.
   */
  vatNumber?: string;

  /**
   * BBBEE (Broad-Based Black Economic Empowerment) status and level.
   */
  bbbeeStatus?: {
    level: number;
    certificateNumber?: string;
    expiryDate?: Date;
  };

  /**
   * Contact details for the supplier.
   */
  contactDetails: ContactDetails;

  /**
   * Additional registration details.
   */
  registrationDetails?: {
    industryCode?: string;
    businessType?: string;
    incorporationDate?: Date;
  };

  /**
   * Status of the supplier (active, pending, debarred).
   */
  supplierStatus?: 'active' | 'pending' | 'debarred' | 'suspended';
}

/**
 * Represents a quotation submitted by a supplier.
 * One procurement can have multiple quotations.
 */
export interface Quotation {
  /**
   * Unique quotation identifier.
   */
  quotationId: string;

  /**
   * Reference number from the supplier.
   */
  supplierReference: string;

  /**
   * Date the quotation was issued.
   */
  quotationDate: Date;

  /**
   * Validity period of the quotation.
   */
  validityPeriod: DateRange;

  /**
   * Total amount quoted (excl. VAT if applicable).
   */
  quotationAmount: Money;

  /**
   * Currency of the quotation.
   */
  currency: string;

  /**
   * Description of goods or services quoted.
   */
  description: string;

  /**
   * Supporting documents for the quotation.
   */
  supportingDocuments: DocumentReference[];

  /**
   * Selection status for this quotation.
   */
  selectionStatus: 'submitted' | 'selected' | 'rejected' | 'withdrawn';

  /**
   * Score or evaluation if part of a scoring process.
   */
  evaluationScore?: number;

  /**
   * Technical compliance notes.
   */
  technicalCompliance?: {
    meetsRequirements: boolean;
    deviations?: string[];
  };

  /**
   * Delivery timeline or schedule.
   */
  deliverySchedule?: {
    leadTimeDays: number;
    deliveryMethod?: string;
    installationRequired?: boolean;
  };
}

/**
 * Represents due diligence performed on a selected supplier.
 * Captures compliance verification checks.
 */
export interface SupplierVerification {
  /**
   * Unique verification record identifier.
   */
  verificationId: string;

  /**
   * CIPC (Companies and Intellectual Property Commission) verification result.
   */
  cipcVerification: {
    status: VerificationStatus;
    audit: VerificationAudit;
  };

  /**
   * VAT (Value Added Tax) registration verification.
   */
  vatVerification: {
    status: VerificationStatus;
    audit: VerificationAudit;
  };

  /**
   * BBBEE (Broad-Based Black Economic Empowerment) verification.
   */
  bbbeeVerification: {
    status: VerificationStatus;
    audit: VerificationAudit;
  };

  /**
   * Tax clearance verification.
   */
  taxVerification: {
    status: VerificationStatus;
    audit: VerificationAudit;
  };

  /**
   * General comments or observations.
   */
  comments?: string;

  /**
   * Overall verification status.
   */
  overallStatus: VerificationStatus;

  /**
   * Documents submitted during verification.
   */
  supportingDocuments: DocumentReference[];

  /**
   * When verification was completed.
   */
  completedAt?: Date;

  /**
   * Who conducted the verification.
   */
  verifiedBy?: string;
}

/**
 * Represents a single approval decision in the workflow.
 * One procurement can require multiple approvals.
 */
export interface ApprovalRecord {
  /**
   * Unique approval record identifier.
   */
  approvalId: string;

  /**
   * Sequence or order of this approval in the chain.
   */
  approvalSequence: number;

  /**
   * Role or position requesting approval (e.g., 'Finance Manager', 'Project Lead').
   */
  approverRole: string;

  /**
   * Specific approver (user ID or name).
   */
  approver: string;

  /**
   * Current status of this approval request.
   */
  status: ApprovalStatus;

  /**
   * Comments provided by the approver.
   */
  comments?: string;

  /**
   * Signature of the approver.
   */
  signature?: Signature;

  /**
   * Timestamp of approval action.
   */
  timestamp?: Date;

  /**
   * Estimated timeline for approval.
   */
  estimatedTimeline?: {
    requestedBy: Date;
    targetBy: Date;
    actualBy?: Date;
  };

  /**
   * Escalation information (who escalated, when, why).
   */
  escalation?: {
    escalatedBy: string;
    escalatedAt: Date;
    reason: string;
    targetApprover?: string;
  };
}

/**
 * Represents the complete approval chain for a procurement.
 * Contains multiple approval records that must be satisfied.
 */
export interface ApprovalWorkflow {
  /**
   * Unique workflow identifier.
   */
  workflowId: string;

  /**
   * Collection of approval records in order.
   */
  approvalRecords: ApprovalRecord[];

  /**
   * Workflow type (sequential, parallel, auto-approved).
   */
  workflowType: 'sequential' | 'parallel' | 'auto_approved';

  /**
   * Minimum number of approvals required.
   */
  minimumApprovals: number;

  /**
   * whether rejections halt the workflow.
   */
  rejectHaltsWorkflow: boolean;

  /**
   * Escalation rules if approvals are delayed.
   */
  escalationRules?: {
    delayThresholdDays: number;
    autoEscalateTo: string;
  };

  /**
   * Current status of the workflow.
   */
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Represents the official purchase order issued to a supplier.
 * This is the binding commitment from the buyer.
 */
export interface PurchaseOrder {
  /**
   * Unique Purchase Order number (internal or external).
   */
  poNumber: string;

  /**
   * Date the PO was issued.
   */
  issueDate: Date;

  /**
   * Reference to the selected quotation.
   */
  selectedQuotation: {
    quotationId: string;
    supplierReference: string;
  };

  /**
   * Total committed amount (sum of all line items).
   */
  totalAmount: Money;

  /**
   * Description of goods or services being procured.
   */
  description: string;

  /**
   * Delivery terms and conditions.
   */
  deliveryTerms: {
    deliveryAddress: PhysicalAddress;
    expectedDeliveryDate: Date;
    inspectionRequired: boolean;
    acceptanceCriteria: string[];
  };

  /**
   * Payment terms and conditions.
   */
  paymentTerms: {
    paymentMethod: string;
    paymentSchedule: string;
    invoiceDelayDays: number;
    discountTerms?: {
      discountPercent: number;
      daysToPay: number;
    };
  };

  /**
   * Supporting documents attached to the PO.
   */
  supportingDocuments: DocumentReference[];

  /**
   * Contract reference if applicable.
   */
  contractReference?: string;

  /**
   * Purchase order status.
   */
  poStatus: 'draft' | 'issued' | 'acknowledged' | 'amended' | 'cancelled';

  /**
   * Date the supplier acknowledged the PO.
   */
  acknowledgedAt?: Date;

  /**
   * Who issued the PO (user ID or name).
   */
  issuedBy: string;
}

/**
 * Represents an invoice received from a supplier.
 * Multiple invoices can be associated with one purchase order.
 */
export interface Invoice {
  /**
   * Unique invoice number from supplier.
   */
  invoiceNumber: string;

  /**
   * Date the invoice was issued by the supplier.
   */
  invoiceDate: Date;

  /**
   * Total amount on the invoice.
   */
  amount: Money;

  /**
   * Current status of processing.
   */
  status: InvoiceStatus;

  /**
   * Reference to the associated purchase order.
   */
  poReference: string;

  /**
   * Line items in the invoice.
   */
  lineItems?: {
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: Money;
    totalAmount: Money;
  }[];

  /**
   * Supporting documents (copy of invoice, delivery note, etc.).
   */
  supportingDocuments: DocumentReference[];

  /**
   * VAT breakdown if applicable.
   */
  taxDetails?: {
    vatAmount: Money;
    vatRate: number;
    vatRegistrationNumber: string;
  };

  /**
   * Net amount (excluding tax).
   */
  netAmount: Money;

  /**
   * When the invoice was received by the system.
   */
  receivedAt?: Date;

  /**
   * When the invoice was validated.
   */
  validatedAt?: Date;

  /**
   * Who approved the invoice.
   */
  approvedBy?: string;

  /**
   * Approval timestamp.
   */
  approvedAt?: Date;

  /**
   * Any disputes or discrepancies noted.
   */
  disputes?: {
    disputeId: string;
    raisedBy: string;
    raisedAt: Date;
    description: string;
    resolvedAt?: Date;
    resolution?: string;
  }[];

  /**
   * Payment status for this invoice.
   */
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid';
}

/**
 * Represents a payment transaction made to a supplier.
 * Multiple payments can be made against a single procurement.
 */
export interface Payment {
  /**
   * Unique payment reference (internal or bank reference).
   */
  paymentReference: string;

  /**
   * Date the payment was made.
   */
  paymentDate: Date;

  /**
   * Amount paid.
   */
  amount: Money;

  /**
   * Proof of payment (bank statement, payment confirmation, etc.).
   */
  proofOfPayment: DocumentReference;

  /**
   * Target invoice(s) for this payment.
   */
  invoiceReferences: string[];

  /**
   * Current status of the payment.
   */
  status: PaymentStatus;

  /**
   * Payment method (EFT, cheque, credit card).
   */
  paymentMethod: string;

  /**
   * Bank account details used (sender).
   */
  fromAccount?: {
    bankName: string;
    accountNumber: string;
    branchCode: string;
  };

  /**
   * Bank account details (receiver).
   */
  toAccount?: {
    bankName: string;
    accountNumber: string;
    branchCode: string;
    accountName: string;
  };

  /**
   * Transaction reference from the bank.
   */
  bankTransactionReference?: string;

  /**
   * Payment instruction reference.
   */
  paymentInstructionId?: string;

  /**
   * Any reversal or cancellation info.
   */
  reversal?: {
    reversalReference?: string;
    reversalDate?: Date;
    reversalReason?: string;
  };
}

/**
 * Represents confirmation that goods or services were delivered as expected.
 * Supports multiple types of fulfillment evidence.
 */
export interface FulfillmentConfirmation {
  /**
   * Unique confirmation identifier.
   */
  confirmationId: string;

  /**
   * Date confirmation was recorded.
   */
  confirmationDate: Date;

  /**
   * Who confirmed fulfillment.
   */
  confirmedBy: string;

  /**
   * Type of goods or services received.
   */
  receivedItems: {
    lineNumber: number;
    description: string;
    quantityReceived: number;
    quantityAccepted: number;
    notes?: string;
  }[];

  /**
   * Delivery notes or receipts.
   */
  deliveryNotes: DocumentReference[];

  /**
   * Inspection or quality check results.
   */
  inspectionResults?: {
    passed: boolean;
    criteria: string[];
   检验Date: Date;
    inspectedBy: string;
    issues?: {
      issueId: string;
      description: string;
      severity: 'minor' | 'major' | 'critical';
      resolved: boolean;
    }[];
  };

  /**
   * Completion certificates (if applicable).
   */
  completionCertificates: DocumentReference[];

  /**
   * Service confirmations or usage reports.
   */
  serviceConfirmations: DocumentReference[];

  /**
   * Photos or visual evidence.
   */
  visualEvidence: DocumentReference[];

  /**
   * Overall fulfillment status.
   */
  status: 'pending' | 'partially_fulfilled' | 'fulfilled' | 'rejected';

  /**
   * Acceptance decision.
   */
  acceptanceDecision: {
    decision: 'accepted' | 'rejected' | 'conditional';
    comments?: string;
    signedBy: string;
    signedAt: Date;
  };

  /**
   * Closeout requirements remaining.
   */
  remainingCloseoutRequirements?: string[];

  /**
   * Warranty or support period start date.
   */
  warrantyStartDate?: Date;

  /**
   * Warranty or support period end date.
   */
  warrantyEndDate?: Date;
}

/**
 * Represents an audit event in the procurement lifecycle.
 * Used for tracking, reporting, and workflow automation.
 */
export interface ProcurementEvent {
  /**
   * Unique event identifier.
   */
  eventId: string;

  /**
   * Type of event (from ProcurementEventType).
   */
  eventType: ProcurementEventType;

  /**
   * When the event occurred.
   */
  timestamp: Date;

  /**
   * User or system that triggered the event.
   */
  triggeredBy: string;

  /**
   * Description of what happened.
   */
  description: string;

  /**
   * Affected entity ID (e.g., quotationId, approvalId).
   */
  affectedEntityId?: string;

  /**
   * Entity type if applicable.
   */
  affectedEntityType?: string;

  /**
   * Previous state (for change events).
   */
  previousState?: string;

  /**
   * New state (for change events).
   */
  newState?: string;

  /**
   * Metadata or additional context.
   */
  metadata?: {
    [key: string]: any;
  };

  /**
   * Associated document reference (if any).
   */
  documentReference?: DocumentReference;
}

// ===========================================================================
// AGGREGATE ROOT
// ===========================================================================

/**
 * The Procurement aggregate root represents a complete acquisition lifecycle.
 * It contains all entities and value objects that define the procurement process
 * from identification through to fulfillment.
 *
 * The procurement is the single source of truth. Forms and views are derived
 * from this model, not the source of record.
 */
export interface Procurement {
  /**
   * Unique procurement identifier.
   */
  procurementId: string;

  /**
   * Reference to the linked grant application (if applicable).
   */
  grantApplicationId?: string;

  /**
   * Beneficiary company details (who is receiving the grant funding).
   */
  beneficiaryCompany: {
    companyName: string;
    registrationNumber: string;
    contactDetails: ContactDetails;
  };

  /**
   * Procurement status (current stage in lifecycle).
   */
  status: ProcurementStatus;

  /**
   * Collection of quotations received.
   */
  quotations: Quotation[];

  /**
   * ID of the selected quotation (if any).
   * Only one quotation can be selected.
   */
  selectedQuotationId?: string;

  /**
   * Supplier verification result (if supplier has been verified).
   */
  supplierVerification?: SupplierVerification;

  /**
   * Approval workflow configuration and status.
   */
  approvalWorkflow: ApprovalWorkflow;

  /**
   * Purchase order issued (if procurement has reached PO stage).
   */
  purchaseOrder?: PurchaseOrder;

  /**
   * Collection of invoices received and processed.
   */
  invoices: Invoice[];

  /**
   * Collection of payments made.
   */
  payments: Payment[];

  /**
   * Fulfillment confirmation record (if completed).
   */
  fulfillmentConfirmation?: FulfillmentConfirmation;

  /**
   * Audit events for this procurement.
   * Maintains complete history of changes and actions.
   */
  auditEvents: ProcurementEvent[];

  /**
   * Additional procurement metadata.
   */
  metadata?: {
    createdById: string;
    createdAt: Date;
    lastModifiedById?: string;
    lastModifiedAt?: Date;
    version: number;
  };

  /**
   * Custom tags or categories for filtering and reporting.
   */
  tags?: string[];

  /**
   * Comments or notes added by users.
   */
  comments?: {
    commentId: string;
    addedBy: string;
    addedAt: Date;
    text: string;
    isPrivate: boolean;
  }[];
}

// ===========================================================================
// DERIVED PROPERTIES (DOCUMENTATION ONLY)
// ===========================================================================

/**
 * Derived property: Current status of the procurement based on its state.
 *
 * Logic (not implemented in model):
 * - No quotations: 'NEED_IDENTIFIED'
 * - Quotations in collection: 'QUOTATION_COLLECTION'
 * - Quotation selected but no verification: 'SUPPLIER_SELECTION'
 * - Verification in progress: 'SUPPLIER_VERIFICATION'
 * - Verification passed but no approvals: 'APPROVAL_WORKFLOW'
 * - Approvals complete but no PO: 'PURCHASE_ORDER'
 * - PO issued but no invoices: 'INVOICE_PROCESSING'
 * - Invoices pending payment: 'PAYMENT_PROCESSING'
 * - Invoices paid but fulfillment pending: 'FULFILLMENT_CONFIRMATION'
 * - All complete: 'COMPLETED'
 * - Cancelled: 'CANCELLED'
 */
export type ProcurementStatusDerived = ProcurementStatus;

/**
 * Derived property: Total amount invoiced across all invoices.
 *
 * Logic (not implemented in model):
 * - Sum of all invoice amounts (from {@link Invoice.amount})
 * - Filter by invoice status: 'APPROVED', 'PAID', or all
 * - Convert to base currency using exchange rates if needed
 *
 * @see Invoice.amount
 * @see Invoice.status
 */
export type TotalInvoiced = Money;

/**
 * Derived property: Total amount paid across all payments.
 *
 * Logic (not implemented in model):
 * - Sum of all payment amounts (from {@link Payment.amount})
 * - Filter by payment status: 'COMPLETED' or all
 * - Convert to base currency using exchange rates if needed
 *
 * @see Payment.amount
 * @see Payment.status
 */
export type TotalPaid = Money;

/**
 * Derived property: Outstanding balance (invoiced - paid).
 *
 * Logic (not implemented in model):
 * - Total invoiced - Total paid
 * - Account for currency differences
 * - Include pending payments and invoices
 *
 * @see TotalInvoiced
 * @see TotalPaid
 */
export type OutstandingBalance = Money;

/**
 * Derived property: Checklist completion status.
 *
 * Logic (not implemented in model):
 * - Enumerate required checklist items per procurement type
 * - Check which items have associated records (e.g., verification, PO, invoices)
 * - Calculate percentage complete
 * - Identify missing items
 */
export type ChecklistStatus = {
  totalItems: number;
  completedItems: number;
  missingItems: string[];
  percentageComplete: number;
};

/**
 * Derived property: Overall compliance status.
 *
 * Logic (not implemented in model):
 * - CIPC verification passed? {@link SupplierVerification.cipcVerification}
 * - VAT verification passed? {@link SupplierVerification.vatVerification}
 * - BBBEE verification passed? {@link SupplierVerification.bbbeeVerification}
 * - Tax verification passed? {@link SupplierVerification.taxVerification}
 * - Approvals complete? {@link ApprovalWorkflow}
 * - Invoices match PO? {@link Invoice.poReference} vs {@link PurchaseOrder}
 * - Payment amounts match? {@link Payment.amount} vs {@link Invoice.amount}
 * - Fulfillment confirmed? {@link FulfillmentConfirmation}
 * - All required documents present? {@link DocumentReference}
 *
 * @see SupplierVerification
 * @see ApprovalWorkflow
 * @see PurchaseOrder
 * @see Invoice
 * @see Payment
 * @see FulfillmentConfirmation
 */
export type ComplianceStatus = {
  isCompliant: boolean;
  compliantModules: string[];
  nonCompliantModules: string[];
  warnings: string[];
  criticalIssues: string[];
};

// ===========================================================================
// FACTORY FUNCTIONS
// ===========================================================================

/**
 * Creates a new procurement with default values.
 * Used for initializing new procurement instances.
 *
 * @returns Default procurement instance
 */
export function createDefaultProcurement(): Procurement {
  return {
    procurementId: '',
    grantApplicationId: undefined,
    beneficiaryCompany: {
      companyName: '',
      registrationNumber: '',
      contactDetails: createDefaultContactDetails(),
    },
    status: ProcurementStatus.NEED_IDENTIFIED,
    quotations: [],
    approvalWorkflow: createDefaultApprovalWorkflow(),
    invoices: [],
    payments: [],
    auditEvents: [],
    metadata: {
      createdById: '',
      createdAt: new Date(),
      version: 1,
    },
    tags: [],
    comments: [],
  };
}

/**
 * Creates a default supplier instance.
 * Used when adding new suppliers to a procurement.
 *
 * @returns Default supplier instance
 */
export function createDefaultSupplier(): Supplier {
  return {
    supplierId: '',
    companyName: '',
    registrationNumber: '',
    contactDetails: createDefaultContactDetails(),
    bbbeeStatus: {
      level: 0,
    },
  };
}

/**
 * Creates a default quotation instance.
 * Used when adding new quotations to a procurement.
 *
 * @returns Default quotation instance
 */
export function createDefaultQuotation(): Quotation {
  return {
    quotationId: '',
    supplierReference: '',
    quotationDate: new Date(),
    validityPeriod: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    quotationAmount: {
      amountMinorUnits: 0n,
      currency: 'ZAR',
    },
    currency: 'ZAR',
    description: '',
    supportingDocuments: [],
    selectionStatus: 'submitted',
  };
}

/**
 * Creates a default supplier verification instance.
 * Used when initiating verification checks on a supplier.
 *
 * @returns Default supplier verification instance
 */
export function createDefaultSupplierVerification(): SupplierVerification {
  return {
    verificationId: '',
    cipcVerification: {
      status: VerificationStatus.NOT_STARTED,
      audit: createDefaultVerificationAudit(),
    },
    vatVerification: {
      status: VerificationStatus.NOT_STARTED,
      audit: createDefaultVerificationAudit(),
    },
    bbbeeVerification: {
      status: VerificationStatus.NOT_STARTED,
      audit: createDefaultVerificationAudit(),
    },
    taxVerification: {
      status: VerificationStatus.NOT_STARTED,
      audit: createDefaultVerificationAudit(),
    },
    overallStatus: VerificationStatus.NOT_STARTED,
    supportingDocuments: [],
  };
}

/**
 * Creates a default approval workflow instance.
 * Used when initializing the approval process.
 *
 * @returns Default approval workflow instance
 */
export function createDefaultApprovalWorkflow(): ApprovalWorkflow {
  return {
    workflowId: '',
    approvalRecords: [],
    workflowType: 'sequential',
    minimumApprovals: 1,
    rejectHaltsWorkflow: true,
    status: 'pending',
  };
}

/**
 * Creates a default purchase order instance.
 * Used when creating a purchase order after approvals.
 *
 * @returns Default purchase order instance
 */
export function createDefaultPurchaseOrder(): PurchaseOrder {
  return {
    poNumber: '',
    issueDate: new Date(),
    selectedQuotation: {
      quotationId: '',
      supplierReference: '',
    },
    totalAmount: {
      amountMinorUnits: 0n,
      currency: 'ZAR',
    },
    description: '',
    deliveryTerms: {
      deliveryAddress: createDefaultPhysicalAddress(),
      expectedDeliveryDate: new Date(),
      inspectionRequired: true,
      acceptanceCriteria: [],
    },
    paymentTerms: {
      paymentMethod: '',
      paymentSchedule: '',
      invoiceDelayDays: 0,
    },
    supportingDocuments: [],
    poStatus: 'draft',
    issuedBy: '',
  };
}

/**
 * Creates a default invoice instance.
 * Used when processing supplier invoices.
 *
 * @returns Default invoice instance
 */
export function createDefaultInvoice(): Invoice {
  return {
    invoiceNumber: '',
    invoiceDate: new Date(),
    amount: {
      amountMinorUnits: 0n,
      currency: 'ZAR',
    },
    status: InvoiceStatus.DRAFT,
    poReference: '',
    lineItems: [],
    supportingDocuments: [],
    netAmount: {
      amountMinorUnits: 0n,
      currency: 'ZAR',
    },
    paymentStatus: 'unpaid',
  };
}

/**
 * Creates a default payment instance.
 * Used when recording payments to suppliers.
 *
 * @returns Default payment instance
 */
export function createDefaultPayment(): Payment {
  return {
    paymentReference: '',
    paymentDate: new Date(),
    amount: {
      amountMinorUnits: 0n,
      currency: 'ZAR',
    },
    proofOfPayment: createDefaultDocumentReference(),
    invoiceReferences: [],
    status: PaymentStatus.INITIATED,
    paymentMethod: '',
  };
}

/**
 * Creates a default fulfillment confirmation instance.
 * Used when confirming delivery and acceptance.
 *
 * @returns Default fulfillment confirmation instance
 */
export function createDefaultFulfillmentConfirmation(): FulfillmentConfirmation {
  return {
    confirmationId: '',
    confirmationDate: new Date(),
    confirmedBy: '',
    receivedItems: [],
    deliveryNotes: [],
    status: 'pending',
    acceptanceDecision: {
      decision: 'accepted',
      signedBy: '',
      signedAt: new Date(),
    },
    completionCertificates: [],
    serviceConfirmations: [],
    visualEvidence: [],
  };
}

// ===========================================================================
// VALUE OBJECT FACTORIES
// ===========================================================================

/**
 * Creates default contact details.
 *
 * @returns Default contact details instance
 */
export function createDefaultContactDetails(): ContactDetails {
  return {
    email: '',
  };
}

/**
 * Creates default physical address.
 *
 * @returns Default physical address instance
 */
export function createDefaultPhysicalAddress(): PhysicalAddress {
  return {
    street: '',
    city: '',
    country: 'ZA',
  };
}

/**
 * Creates default verification audit record.
 *
 * @returns Default verification audit instance
 */
export function createDefaultVerificationAudit(): VerificationAudit {
  return {
    verifiedBy: '',
    verifiedAt: new Date(),
  };
}

/**
 * Creates default signature record.
 *
 * @returns Default signature instance
 */
export function createDefaultSignature(): Signature {
  return {
    signedBy: '',
    timestamp: new Date(),
  };
}

/**
 * Creates default document reference.
 *
 * @returns Default document reference instance
 */
export function createDefaultDocumentReference(): DocumentReference {
  return {
    documentId: '',
    type: DocumentType.OTHER,
    location: '',
  };
}

/**
 * Creates default date range (30 days from now).
 *
 * @returns Default date range instance
 */
export function createDefaultDateRange(): DateRange {
  return {
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}
