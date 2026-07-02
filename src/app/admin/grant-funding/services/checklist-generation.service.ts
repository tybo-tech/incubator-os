import { Injectable } from '@angular/core';
import {
  GrantFundingChecklist,
  DEFAULT_GRANT_FUNDING_CHECKLIST,
  ChecklistResponse
} from '../business-process/checklist.models';
import {
  GrantScmVerification
} from '../business-process/scm-verification.models';

@Injectable({
  providedIn: 'root'
})
export class ChecklistGenerationService {
  /**
   * Generate a business process checklist from SCM verification data
   */
  generateChecklistFromScmData(scmData: GrantScmVerification): GrantFundingChecklist {
    const generatedChecklist: GrantFundingChecklist = { ...DEFAULT_GRANT_FUNDING_CHECKLIST };

    // Map SCM data to checklist items
    generatedChecklist.quotations = scmData.quotations.items.length > 0 ? ChecklistResponse.YES : ChecklistResponse.NO;
    
    // Check if all quotations are completed for SCM verification process
    const allQuotationsCompleted = scmData.quotations.items.length > 0 && 
      scmData.quotations.items.every(q => q.status === 'completed');
    generatedChecklist.scmVerificationProcessChecklist = allQuotationsCompleted ? ChecklistResponse.YES : ChecklistResponse.NO;
    
    // Check purchase orders
    const hasPurchaseOrders = scmData.quotations.items.some(q => 
      q.purchase_order_processing?.purchase_order_generated);
    generatedChecklist.purchaseOrder = hasPurchaseOrders ? ChecklistResponse.YES : ChecklistResponse.NO;
    
    // Check tax invoices
    const hasTaxInvoices = scmData.quotations.items.some(q => 
      q.purchase_order_processing?.tax_invoice_received);
    generatedChecklist.taxInvoices = hasTaxInvoices ? ChecklistResponse.YES : ChecklistResponse.NO;
    
    // Check BBBEE certificates
    const hasBbbee = scmData.quotations.items.some(q => 
      q.purchase_order_processing?.bbbee_certificate_received);
    generatedChecklist.bbbee = hasBbbee ? ChecklistResponse.YES : ChecklistResponse.NO;
    
    // Check bank confirmations
    const hasBankConfirmation = scmData.quotations.items.some(q => 
      q.purchase_order_processing?.bank_confirmation_received || 
      q.payment_processing?.bank_confirmation_received);
    generatedChecklist.bankConfirmation = hasBankConfirmation ? ChecklistResponse.YES : ChecklistResponse.NO;
    
    // Check proof of payment
    const hasProofOfPayment = scmData.quotations.items.some(q => 
      q.payment_processing?.proof_of_payment_sent);
    generatedChecklist.proofOfPaymentToSupplier = hasProofOfPayment ? ChecklistResponse.YES : ChecklistResponse.NO;

    return generatedChecklist;
  }
}