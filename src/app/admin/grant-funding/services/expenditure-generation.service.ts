import { Injectable } from '@angular/core';
import {
  GrantExpenditureAuthorization,
  DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION,
  ExpenditureInvoice
} from '../business-process/expenditure-authorization.models';
import {
  GrantScmVerification,
  ScmQuotation
} from '../business-process/scm-verification.models';

@Injectable({
  providedIn: 'root'
})
export class ExpenditureGenerationService {
  /**
   * Generate an expenditure authorization from SCM verification data
   */
  generateExpenditureAuthorizationFromScmData(
    scmData: GrantScmVerification
  ): GrantExpenditureAuthorization {
    const generatedAuthorization: GrantExpenditureAuthorization = {
      ...DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION,
      company_name: scmData.beneficiary_company_name,
      director_name: scmData.director,
      contact_number: scmData.contact_number,
      // Initialize with empty invoices array
      invoices: []
    };

    // Map completed quotations with payment processing to invoices
    const invoices: ExpenditureInvoice[] = scmData.quotations.items
      .filter(quotation => 
        quotation.status === 'completed' && 
        quotation.payment_processing
      )
      .map((quotation, index) => {
        // Calculate amounts - for now using default values as SCM doesn't store detailed amounts
        // In a real implementation, these would come from the payment processing data
        const amountExclVat = 0; // Would need to be calculated from quotation data
        const vatAmount = 0; // Would need to be calculated from quotation data
        
        return {
          id: `inv_${Date.now()}_${index}`,
          invoice_number: quotation.id || `INV-${index + 1}`,
          description: quotation.comments || `Payment for ${quotation.supplier_name}`,
          supplier_name: quotation.supplier_name,
          amount_excl_vat: amountExclVat,
          vat_amount: vatAmount,
          total_amount: amountExclVat + vatAmount,
          preferred_supplier: false // Would need logic to determine this from SCM data
        };
      });

    generatedAuthorization.invoices = invoices;

    return generatedAuthorization;
  }
}