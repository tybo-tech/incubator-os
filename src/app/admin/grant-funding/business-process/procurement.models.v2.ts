/**
 * @fileoverview
 * Grant Funding Procurement Domain Models
 *
 * This file defines the simplified domain model for the Grant Funding Procurement process.
 * It is designed specifically for:
 * - SCM Verification Process
 * - Expenditure Authorization
 * - Business Process Checklist
 * - PDF generation
 * - Reporting
 *
 * Simplified for grant funding use cases, removing unnecessary enterprise complexity.
 */

// ===========================================================================
// ENUMS
// ===========================================================================

/**
 * Procurement workflow status.
 */
export enum ProcurementStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Approval decision status.
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Approval role in the workflow.
 */
export enum ApprovalRole {
  BENEFICIARY = 'BENEFICIARY',
  BUSINESS_ADVISOR = 'BUSINESS_ADVISOR',
  COORDINATOR = 'COORDINATOR',
  SOUTH32_SPA = 'SOUTH32_SPA',
  MANAGER = 'MANAGER',
}

/**
 * Verification check status.
 */
export enum VerificationStatus {
  NOT_STARTED = 'NOT_STARTED',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

/**
 * Invoice processing status.
 */
export enum InvoiceStatus {
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
}

/**
 * Payment status.
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Document types.
 */
export enum DocumentType {
  QUOTATION = 'QUOTATION',
  INVOICE = 'INVOICE',
  VERIFICATION = 'VERIFICATION',
  APPROVAL = 'APPROVAL',
  PO = 'PO',
  PAYMENT = 'PAYMENT',
  FULFILLMENT = 'FULFILLMENT',
  COMPLIANCE = 'COMPLIANCE',
  OTHER = 'OTHER',
}

/**
 * Grant compliance document types.
 */
export enum ComplianceDocumentType {
  BUSINESS_SUPPORT_ACKNOWLEDGEMENT = 'BUSINESS_SUPPORT_ACKNOWLEDGEMENT',
  ESD_ED_AGREEMENT = 'ESD_ED_AGREEMENT',
  TERMS_AND_CONDITIONS = 'TERMS_AND_CONDITIONS',
  DIRECTOR_IDS = 'DIRECTOR_IDS',
  COMPANY_REGISTRATION = 'COMPANY_REGISTRATION',
  TAX_PIN = 'TAX_PIN',
  BBBEE_CERTIFICATE = 'BBBEE_CERTIFICATE',
}

/**
 * Event types for procurement audit trail.
 */
export enum ProcurementEventType {
  QUOTATION_SUBMITTED = 'QUOTATION_SUBMITTED',
  QUOTATION_SELECTED = 'QUOTATION_SELECTED',
  SUPPLIER_VERIFIED = 'SUPPLIER_VERIFIED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  PO_CREATED = 'PO_CREATED',
  INVOICE_RECEIVED = 'INVOICE_RECEIVED',
  INVOICE_APPROVED = 'INVOICE_APPROVED',
  PAYMENT_MADE = 'PAYMENT_MADE',
  FULFILLMENT_COMPLETED = 'FULFILLMENT_COMPLETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

/**
 * Fulfillment confirmation status.
 */
export enum FulfillmentStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
}

/**
 * Acceptance decision for fulfillment.
 */
export enum AcceptanceDecision {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

// ===========================================================================
// NAMED VALUE OBJECTS
// ===========================================================================

/**
 * Monetary amount with currency.
 */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * Contact information.
 */
export interface ContactDetails {
  email: string;
  phone?: string;
}

/**
 * Physical address.
 */
export interface PhysicalAddress {
  street: string;
  city: string;
  country: string;
  postalCode?: string;
}

/**
 * Document reference.
 */
export interface DocumentReference {
  documentId: string;
  type: DocumentType;
  title?: string;
  location: string;
}

/**
 * Approval signature and timestamp.
 */
export interface Signature {
  signedBy: string;
  timestamp: Date;
  role?: string;
}

/**
 * Reusable beneficiary company details.
 */
export interface BeneficiaryCompany {
  companyName: string;
  registrationNumber: string;
  contactDetails: ContactDetails;
}

/**
 * Verification check result with metadata.
 */
export interface VerificationCheck {
  status: VerificationStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  comments?: string;
}

/**
 * Procurement audit event.
 */
export interface ProcurementEvent {
  id: string;
  type: ProcurementEventType;
  timestamp: Date;
  userId?: string;
  notes?: string;
}

/**
 * Procurement checklist projection.
 * Not stored. Not persisted.
 * Just documented for future developers to understand checklist derivation.
 */
export interface ProcurementChecklistProjection {
  scmVerificationProcess: boolean;
  expenditureAuthorization: boolean;
  purchaseOrder: boolean;
  quotations: boolean;
  taxInvoices: boolean;
  proofOfPayment: boolean;
  bankConfirmation: boolean;
  bbbee: boolean;
  taxPin: boolean;
  acknowledgementOfDelivery: boolean;
}

/**
 * Compliance document for grant compliance.
 */
export interface ComplianceDocument {
  id: string;
  type: ComplianceDocumentType;
  document: DocumentReference;
}

/**
 * Fulfillment confirmation received item.
 */
export interface FulfillmentItem {
  lineNumber: number;
  description: string;
  quantityReceived: number;
  quantityAccepted: number;
}

/**
 * Fulfillment confirmation acceptance decision.
 */
export interface FulfillmentAcceptance {
  decision: AcceptanceDecision;
  signedBy: string;
  signedAt: Date;
}

// ===========================================================================
// ENTITIES
// ===========================================================================

/**
 * Supplier participating in procurement.
 */
export interface Supplier {
  supplierId: string;
  companyName: string;
  registrationNumber: string;
  vatNumber?: string;
  contactDetails: ContactDetails;
}

/**
 * Supplier quotation.
 */
export interface Quotation {
  quotationId: string;
  supplierId: string;
  quotationDate: Date;
  quotationAmount: Money;
  description: string;
  supportingDocuments: DocumentReference[];
}

/**
 * Supplier verification record.
 */
export interface SupplierVerification {
  verificationId: string;
  supplierId: string;
  cipcVerification: VerificationCheck;
  vatVerification: VerificationCheck;
  bbbeeVerification: VerificationCheck;
  taxVerification: VerificationCheck;
  comments?: string;
  overallStatus: VerificationStatus;
  supportingDocuments: DocumentReference[];
}

/**
 * Approval record for a single approver.
 */
export interface ApprovalRecord {
  approvalId: string;
  approverRole: ApprovalRole;
  approver: string;
  status: ApprovalStatus;
  comments?: string;
  signature?: Signature;
}

/**
 * Approval workflow containing multiple approvals.
 */
export interface ApprovalWorkflow {
  workflowId: string;
  approvalRecords: ApprovalRecord[];
}

/**
 * Purchase order issued to supplier.
 * Owns invoices and payments.
 */
export interface PurchaseOrder {
  poNumber: string;
  issueDate: Date;
  selectedQuotationId: string;
  totalAmount: Money;
  description: string;
  supportingDocuments: DocumentReference[];
  invoices: Invoice[];
  payments: Payment[];
}

/**
 * Invoice from supplier.
 */
export interface Invoice {
  invoiceNumber: string;
  invoiceDate: Date;
  amount: Money;
  status: InvoiceStatus;
  supportingDocuments: DocumentReference[];
}

/**
 * Payment to supplier.
 */
export interface Payment {
  paymentReference: string;
  paymentDate: Date;
  amount: Money;
  proofOfPayment: DocumentReference;
  invoiceReferences: string[];
  status: PaymentStatus;
}

/**
 * Fulfillment confirmation.
 */
export interface FulfillmentConfirmation {
  confirmationId: string;
  confirmationDate: Date;
  confirmedBy: string;
  receivedItems: FulfillmentItem[];
  deliveryNotes: DocumentReference[];
  status: FulfillmentStatus;
  acceptanceDecision: FulfillmentAcceptance;
  completionCertificates: DocumentReference[];
}

// ===========================================================================
// AGGREGATE ROOT
// ===========================================================================

/**
 * Grant Funding Procurement aggregate root.
 * Represents a complete procurement lifecycle.
 */
export interface Procurement {
  procurementId: string;
  grantApplicationId?: string;
  beneficiaryCompany: BeneficiaryCompany;
  status: ProcurementStatus;
  suppliers: Supplier[];
  quotations: Quotation[];
  selectedQuotationId?: string;
  selectedSupplierId?: string;
  supplierVerification?: SupplierVerification;
  approvalWorkflow: ApprovalWorkflow;
  purchaseOrder?: PurchaseOrder;
  complianceDocuments: ComplianceDocument[];
  events: ProcurementEvent[];
  createdAt: Date;
  createdById: string;
  lastModifiedAt?: Date;
  tags?: string[];
}

// ===========================================================================
// FACTORY FUNCTIONS
// ===========================================================================

export function createDefaultProcurement(): Procurement {
  return {
    procurementId: '',
    status: ProcurementStatus.DRAFT,
    beneficiaryCompany: {
      companyName: '',
      registrationNumber: '',
      contactDetails: { email: '' },
    },
    suppliers: [],
    quotations: [],
    approvalWorkflow: { workflowId: '', approvalRecords: [] },
    complianceDocuments: [],
    events: [],
    createdAt: new Date(),
    createdById: '',
  };
}

export function createDefaultSupplier(): Supplier {
  return {
    supplierId: '',
    companyName: '',
    registrationNumber: '',
    contactDetails: { email: '' },
  };
}

export function createDefaultQuotation(): Quotation {
  return {
    quotationId: '',
    supplierId: '',
    quotationDate: new Date(),
    quotationAmount: { amount: 0, currency: 'ZAR' },
    description: '',
    supportingDocuments: [],
  };
}

export function createDefaultSupplierVerification(): SupplierVerification {
  return {
    verificationId: '',
    supplierId: '',
    cipcVerification: { status: VerificationStatus.NOT_STARTED },
    vatVerification: { status: VerificationStatus.NOT_STARTED },
    bbbeeVerification: { status: VerificationStatus.NOT_STARTED },
    taxVerification: { status: VerificationStatus.NOT_STARTED },
    overallStatus: VerificationStatus.NOT_STARTED,
    supportingDocuments: [],
  };
}

export function createDefaultApprovalWorkflow(): ApprovalWorkflow {
  return { workflowId: '', approvalRecords: [] };
}

export function createDefaultPurchaseOrder(): PurchaseOrder {
  return {
    poNumber: '',
    issueDate: new Date(),
    selectedQuotationId: '',
    totalAmount: { amount: 0, currency: 'ZAR' },
    description: '',
    supportingDocuments: [],
    invoices: [],
    payments: [],
  };
}

export function createDefaultInvoice(): Invoice {
  return {
    invoiceNumber: '',
    invoiceDate: new Date(),
    amount: { amount: 0, currency: 'ZAR' },
    status: InvoiceStatus.SUBMITTED,
    supportingDocuments: [],
  };
}

export function createDefaultPayment(): Payment {
  return {
    paymentReference: '',
    paymentDate: new Date(),
    amount: { amount: 0, currency: 'ZAR' },
    proofOfPayment: { documentId: '', type: DocumentType.PAYMENT, location: '' },
    invoiceReferences: [],
    status: PaymentStatus.PENDING,
  };
}

export function createDefaultFulfillmentConfirmation(): FulfillmentConfirmation {
  return {
    confirmationId: '',
    confirmationDate: new Date(),
    confirmedBy: '',
    receivedItems: [],
    deliveryNotes: [],
    status: FulfillmentStatus.PENDING,
    acceptanceDecision: { decision: AcceptanceDecision.ACCEPTED, signedBy: '', signedAt: new Date() },
    completionCertificates: [],
  };
}

export function createDefaultComplianceDocument(): ComplianceDocument {
  return {
    id: '',
    type: ComplianceDocumentType.BUSINESS_SUPPORT_ACKNOWLEDGEMENT,
    document: { documentId: '', type: DocumentType.COMPLIANCE, location: '' },
  };
}
