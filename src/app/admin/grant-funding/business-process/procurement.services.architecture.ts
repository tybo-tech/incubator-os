/**
 * @fileoverview
 * Grant Funding Procurement Service Architecture
 *
 * This document describes the service layer architecture for the Procurement domain.
 * Services are organized by responsibility:
 * - Persistence (Repository)
 * - Workflow Logic (Workflow Service)
 * - Derived Projections (Checklist Service)
 * - Exports (Export Service)
 *
 * Components should only depend on ProcurementService (facade) and never touch:
 * - NodeService
 * - Storage formats
 * - Type definitions
 * - Parent IDs
 */

import {
  ApprovalRecord,
  FulfillmentConfirmation,
  Invoice,
  Payment,
  Procurement,
  ProcurementChecklistProjection,
  ProcurementEvent,
  PurchaseOrder,
  Quotation,
  SupplierVerification,
} from './procurement.models.v2';

// ===========================================================================
// SERVICE ARCHITECTURE OVERVIEW
// ===========================================================================

/**
 * Service Layer Dependencies (bottom to top):
 *
 * NodeService (infrastructure - NOT in this file)
 *    ↓
 * ProcurementRepository (persistence)
 *    ↓
 * ProcurementWorkflowService (business rules)
 *    ↓
 * ProcurementChecklistService (derived data)
 *    ↓
 * ProcurementExportService (PDF generation)
 *    ↓
 * ProcurementService (facade - what components use)
 *    ↓
 * Components (never touch storage/format)
 */

// ===========================================================================
// 1. PROCUREMENT REPOSITORY
// ===========================================================================

/**
 * ProcurementRepository Responsibilities:
 * - Pure persistence layer
 * - Maps Procurement to storage format (Node)
 * - No business logic
 * - No derived calculations
 * - No validation (except type safety)
 *
 * Internal Usage:
 * - Uses NodeService internally
 * - Handles type: 'grant_procurement'
 * - Manages parent_id relationships
 *
 * NEVER used directly by components.
 * Always use ProcurementService facade instead.
 */
export interface ProcurementRepository {
  /**
   * Load procurement by ID.
   */
  loadProcurement(procurementId: string): Promise<Procurement | null>;

  /**
   * Save procurement (create or update).
   */
  saveProcurement(procurement: Procurement): Promise<void>;

  /**
   * Create new procurement with auto-generated ID.
   */
  createProcurement(procurement: Procurement): Promise<string>;

  /**
   * Delete procurement by ID.
   */
  deleteProcurement(procurementId: string): Promise<void>;

  /**
   * Find all procurements for a beneficiary company.
   */
  findProcurementsByBeneficiary(
    beneficiaryCompanyId: string,
  ): Promise<Procurement[]>;
}

/**
 * Repository Dependencies:
 * - NodeService (for storage operations)
 *
 * Repository Input/Output:
 * - Input: Procurement domain model
 * - Output: Procurement domain model
 * - No Node types exposed to consumers
 */

// ===========================================================================
// 2. PROCUREMENT WORKFLOW SERVICE
// ===========================================================================

/**
 * ProcurementWorkflowService Responsibilities:
 * - All business rules and validation
 * - Workflow state transitions
 * - Cross-entity consistency checks
 * - Audit event generation
 * - Approval workflow management
 *
 * This service contains all the "should not" and "must not" logic:
 * - Cannot create PO until supplier verified
 * - Cannot approve without required checkoffs
 * - Cannot pay without invoice
 * - Cannot complete without fulfillment
 */
export interface ProcurementWorkflowService {
  /**
   * Add quotation to procurement.
   * Validates:
   * - Quotation has all required fields
   * - Supplier exists in procurement.suppliers
   */
  addQuotation(procurement: Procurement, quotation: Quotation): Procurement;

  /**
   * Select quotation (mark as chosen).
   * Transitions procurement to SUPPLIER_SELECTION stage.
   */
  selectQuotation(procurement: Procurement, quotationId: string): Procurement;

  /**
   * Verify supplier (SCM verification process).
   * Validates all verification check statuses.
   * Transitions procurement to VERIFICATION stage.
   */
  verifySupplier(
    procurement: Procurement,
    verification: SupplierVerification,
  ): Procurement;

  /**
   * Add approval record to workflow.
   * Validates:
   * - Approver role matches current workflow position
   * - Approval status is valid (PENDING/APPROVED/REJECTED)
   */
  addApproval(
    procurement: Procurement,
    approvalRecord: ApprovalRecord,
  ): Procurement;

  /**
   * Complete approval workflow.
   * Validates all required approvals are complete.
   * Transitions procurement to APPROVAL stage.
   */
  completeApprovals(procurement: Procurement): Procurement;

  /**
   * Create purchase order from selected quotation.
   * Validates:
   * - Quotation is selected
   * - Supplier is verified
   * - Approvals are complete
   * Transitions procurement to PO stage.
   */
  createPurchaseOrder(procurement: Procurement, po: PurchaseOrder): Procurement;

  /**
   * Add invoice to purchase order.
   * Validates:
   * - PO exists
   * - Invoice amount matches PO total or line items
   * - Invoice date is on or after PO issue date
   */
  addInvoice(procurement: Procurement, invoice: Invoice): Procurement;

  /**
   * Approve invoice (validation step before payment).
   */
  approveInvoice(procurement: Procurement, invoiceNumber: string): Procurement;

  /**
   * Record payment to supplier.
   * Validates:
   * - Invoice exists and is approved
   * - Payment amount matches invoice amount
   * - Proof of payment exists
   */
  recordPayment(procurement: Procurement, payment: Payment): Procurement;

  /**
   * Confirm fulfillment.
   * Validates:
   * - PO exists
   * - All invoices paid
   * - Acceptance decision recorded
   * Transitions procurement to COMPLETED stage.
   */
  confirmFulfillment(
    procurement: Procurement,
    confirmation: FulfillmentConfirmation,
  ): Procurement;

  /**
   * Update procurement metadata (last modified).
   */
  updateMetadata(procurement: Procurement, userId: string): Procurement;

  /**
   * Add audit event (internal helper, also called by all public methods).
   */
  addEvent(procurement: Procurement, event: ProcurementEvent): Procurement;
}

/**
 * Workflow Service Dependencies:
 * - None (pure business logic)
 *
 * Workflow Service Input/Output:
 * - Input: Procurement domain model + new entity
 * - Output: Updated Procurement domain model
 * - Throws validation errors if rules violated
 */

// ===========================================================================
// 3. PROCUREMENT CHECKLIST SERVICE
// ===========================================================================

/**
 * ProcurementChecklistService Responsibilities:
 * - Generate ProcurementChecklistProjection from Procurement
 * - Pure-derived data (no storage)
 * - Used by PDF generation and UI checklist display
 *
 * This service asks: "Given this procurement, what checklist items are complete?"
 * It does NOT store the checklist. It derives it on-the-fly.
 */
export interface ProcurementChecklistService {
  /**
   * Generate checklist projection from procurement.
   * Returns boolean flags for each checklist item.
   *
   * Checklist items:
   * - scmVerificationProcess: Supplier verification complete
   * - expenditureAuthorization: All approvals complete
   * - purchaseOrder: PO exists
   * - quotations: At least one quotation exists
   * - taxInvoices: At least one approved invoice exists
   * - proofOfPayment: At least one payment with proof exists
   * - bankConfirmation: Payment status is COMPLETED
   * - bbbee: BBEEE verification passed
   * - taxPin: Tax verification passed
   * - acknowledgementOfDelivery: Fulfillment confirmed
   */
  generateChecklist(procurement: Procurement): ProcurementChecklistProjection;

  /**
   * Get missing checklist items (for reporting).
   */
  getMissingItems(procurement: Procurement): string[];

  /**
   * Get checklist completion percentage.
   */
  getCompletionPercentage(procurement: Procurement): number;
}

/**
 * Checklist Service Dependencies:
 * - None (pure derivation)
 *
 * Checklist Service Input/Output:
 * - Input: Procurement domain model
 * - Output: ProcurementChecklistProjection interface
 */

// ===========================================================================
// 4. PROCUREMENT EXPORT SERVICE
// ===========================================================================

/**
 * ProcurementExportService Responsibilities:
 * - Generate PDF documents for:
 *   - SCM Verification Process
 *   - Expenditure Authorization
 *   - Business Process Checklist
 * - Consumes Procurement only
 * - No knowledge of storage or components
 * - Formatting concerns only
 */
export interface ProcurementExportService {
  /**
   * Generate SCM Verification Process PDF.
   * Includes:
   * - Supplier details
   * - Verification check results
   * - Supporting documents
   */
  generateScmVerificationPdf(procurement: Procurement): Promise<Blob>;

  /**
   * Generate Expenditure Authorization PDF.
   * Includes:
   * - Approval workflow summary
   * - Selected quotation
   * - Total amounts
   */
  generateExpenditureAuthorizationPdf(procurement: Procurement): Promise<Blob>;

  /**
   * Generate Business Process Checklist PDF.
   * Includes:
   * - Checklist status (all items)
   * - Missing items
   * - Completion percentage
   */
  generateChecklistPdf(procurement: Procurement): Promise<Blob>;

  /**
   * Generate complete procurement package (all PDFs zipped).
   */
  generateProcurementPackage(procurement: Procurement): Promise<Blob>;
}

/**
 * Export Service Dependencies:
 * - None (pure formatting, probably uses PDF library)
 *
 * Export Service Input/Output:
 * - Input: Procurement domain model
 * - Output: Blob (PDF or ZIP)
 */

// ===========================================================================
// 5. PROCUREMENT SERVICE (FACADE)
// ===========================================================================

/**
 * ProcurementService (Facade) Responsibilities:
 * - Single entry point for components
 * - Composes repository + services as needed
 * - Hides all infrastructure details
 * - Handles transaction boundaries (if needed)
 *
 * Components should ONLY depend on this interface.
 * This is the ONLY service they know about.
 */
export interface ProcurementService {
  /**
   * Load procurement with all related data.
   * (Uses ProcurementRepository internally)
   */
  load(procurementId: string): Promise<Procurement | null>;

  /**
   * Save procurement.
   * (Uses ProcurementRepository internally)
   */
  save(procurement: Procurement): Promise<void>;

  /**
   * Create new procurement.
   * (Uses ProcurementRepository internally)
   */
  create(): Promise<Procurement>;

  /**
   * Add quotation.
   * (Uses ProcurementWorkflowService internally)
   */
  addQuotation(
    procurement: Procurement,
    quotation: Quotation,
  ): Promise<Procurement>;

  /**
   * Select quotation.
   * (Uses ProcurementWorkflowService internally)
   */
  selectQuotation(
    procurement: Procurement,
    quotationId: string,
  ): Promise<Procurement>;

  /**
   * Verify supplier.
   * (Uses ProcurementWorkflowService internally)
   */
  verifySupplier(
    procurement: Procurement,
    verification: SupplierVerification,
  ): Promise<Procurement>;

  /**
   * Add approval.
   * (Uses ProcurementWorkflowService internally)
   */
  addApproval(
    procurement: Procurement,
    approvalRecord: ApprovalRecord,
  ): Promise<Procurement>;

  /**
   * Complete approvals.
   * (Uses ProcurementWorkflowService internally)
   */
  completeApprovals(procurement: Procurement): Promise<Procurement>;

  /**
   * Create purchase order.
   * (Uses ProcurementWorkflowService internally)
   */
  createPurchaseOrder(
    procurement: Procurement,
    po: PurchaseOrder,
  ): Promise<Procurement>;

  /**
   * Add invoice.
   * (Uses ProcurementWorkflowService internally)
   */
  addInvoice(procurement: Procurement, invoice: Invoice): Promise<Procurement>;

  /**
   * Approve invoice.
   * (Uses ProcurementWorkflowService internally)
   */
  approveInvoice(
    procurement: Procurement,
    invoiceNumber: string,
  ): Promise<Procurement>;

  /**
   * Record payment.
   * (Uses ProcurementWorkflowService internally)
   */
  recordPayment(
    procurement: Procurement,
    payment: Payment,
  ): Promise<Procurement>;

  /**
   * Confirm fulfillment.
   * (Uses ProcurementWorkflowService internally)
   */
  confirmFulfillment(
    procurement: Procurement,
    confirmation: FulfillmentConfirmation,
  ): Promise<Procurement>;

  /**
   * Generate SCM Verification PDF.
   * (Uses ProcurementExportService internally)
   */
  generateScmVerificationPdf(procurement: Procurement): Promise<Blob>;

  /**
   * Generate Expenditure Authorization PDF.
   * (Uses ProcurementExportService internally)
   */
  generateExpenditureAuthorizationPdf(procurement: Procurement): Promise<Blob>;

  /**
   * Generate Checklist PDF.
   * (Uses ProcurementExportService internally)
   */
  generateChecklistPdf(procurement: Procurement): Promise<Blob>;

  /**
   * Get checklist status.
   * (Uses ProcurementChecklistService internally)
   */
  getChecklist(procurement: Procurement): ProcurementChecklistProjection;
}

/**
 * Facade Service Dependencies:
 * - ProcurementRepository
 * - ProcurementWorkflowService
 * - ProcurementChecklistService
 * - ProcurementExportService
 *
 * Facade Service Input/Output:
 * - Input: Procurement domain model + parameters
 * - Output: Promise<Procurement> or Blob or ProcurementChecklistProjection
 */

// ===========================================================================
// SERVICE ARCHITECTURE SUMMARY
// ===========================================================================

/**
 * Component Usage Pattern (NEVER touches storage):
 *
 * // NEVER do this:
 * const procurement = await nodeService.load<Procurement>(...);
 *
 * // ALWAYS do this:
 * const procurement = await procurementService.load(procurementId);
 *
 * procurementService.addQuotation(procurement, newQuotation);
 * procurementService.save(procurement);
 *
 * // PDF generation:
 * const pdf = await procurementService.generateScmVerificationPdf(procurement);
 *
 * // Checklist:
 * const checklist = procurementService.getChecklist(procurement);
 *
 * // Workflow operations:
 * const verified = await procurementService.verifySupplier(procurement, verification);
 * const approved = await procurementService.completeApprovals(procurement);
 * const po = await procurementService.createPurchaseOrder(procurement, poData);
 * const paid = await procurementService.recordPayment(procurement, payment);
 *
 * The component knows:
 * ✅ What data it needs (procurement)
 * ✅ What operations it can perform (add, select, verify, approve, etc.)
 *
 * The component does NOT know:
 * ❌ How data is stored (NodeService)
 * ❌ Storage format details
 * ❌ Parent IDs
 * ❌ Type strings
 * ❌ Validation rules
 * ❌ Derived calculations
 *
 * All of that is encapsulated in the service layer.
 */
