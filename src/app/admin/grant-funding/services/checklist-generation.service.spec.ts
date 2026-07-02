import { TestBed } from '@angular/core/testing';
import { ChecklistGenerationService } from './checklist-generation.service';
import { GrantScmVerification } from '../business-process/scm-verification.models';
import { GrantFundingChecklist, ChecklistResponse } from '../business-process/checklist.models';

describe('ChecklistGenerationService', () => {
  let service: ChecklistGenerationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [ChecklistGenerationService]
    });
    service = TestBed.inject(ChecklistGenerationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate checklist with NO responses when no quotations exist', () => {
    const scmData: GrantScmVerification = {
      beneficiary_company_name: 'Test Company',
      director: 'Test Director',
      contact_number: '123-456-7890',
      quotations: {
        items: [],
        verified_by: '',
        signature: ''
      }
    };

    const checklist = service.generateChecklistFromScmData(scmData);
    
    expect(checklist.quotations).toBe(ChecklistResponse.NO);
    expect(checklist.scmVerificationProcessChecklist).toBe(ChecklistResponse.NO);
    expect(checklist.purchaseOrder).toBe(ChecklistResponse.NO);
    expect(checklist.taxInvoices).toBe(ChecklistResponse.NO);
    expect(checklist.bbbee).toBe(ChecklistResponse.NO);
    expect(checklist.bankConfirmation).toBe(ChecklistResponse.NO);
    expect(checklist.proofOfPaymentToSupplier).toBe(ChecklistResponse.NO);
  });

  it('should generate checklist with YES responses when quotations exist and are completed', () => {
    const scmData: GrantScmVerification = {
      beneficiary_company_name: 'Test Company',
      director: 'Test Director',
      contact_number: '123-456-7890',
      quotations: {
        items: [
          {
            id: '1',
            supplier_name: 'Test Supplier',
            status: 'completed',
            purchase_order_processing: {
              purchase_order_generated: true,
              tax_invoice_received: true,
              bbbee_certificate_received: true,
              bank_confirmation_received: true
            },
            payment_processing: {
              bank_confirmation_received: true,
              proof_of_payment_sent: true
            }
          }
        ],
        verified_by: 'Test User',
        signature: ''
      }
    };

    const checklist = service.generateChecklistFromScmData(scmData);
    
    expect(checklist.quotations).toBe(ChecklistResponse.YES);
    expect(checklist.scmVerificationProcessChecklist).toBe(ChecklistResponse.YES);
    expect(checklist.purchaseOrder).toBe(ChecklistResponse.YES);
    expect(checklist.taxInvoices).toBe(ChecklistResponse.YES);
    expect(checklist.bbbee).toBe(ChecklistResponse.YES);
    expect(checklist.bankConfirmation).toBe(ChecklistResponse.YES);
    expect(checklist.proofOfPaymentToSupplier).toBe(ChecklistResponse.YES);
  });
});