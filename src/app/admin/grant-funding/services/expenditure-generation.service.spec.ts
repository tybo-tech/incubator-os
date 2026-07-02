import { TestBed } from '@angular/core/testing';
import { ExpenditureGenerationService } from './expenditure-generation.service';
import { GrantScmVerification } from '../business-process/scm-verification.models';

describe('ExpenditureGenerationService', () => {
  let service: ExpenditureGenerationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [ExpenditureGenerationService]
    });
    service = TestBed.inject(ExpenditureGenerationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate empty expenditure authorization when no completed quotations exist', () => {
    const scmData: GrantScmVerification = {
      beneficiary_company_name: 'Test Company',
      director: 'Test Director',
      contact_number: '123-456-7890',
      quotations: {
        items: [
          {
            id: '1',
            supplier_name: 'Test Supplier',
            status: 'pending'
          }
        ],
        verified_by: '',
        signature: ''
      }
    };

    const expenditureAuth = service.generateExpenditureAuthorizationFromScmData(scmData);
    
    expect(expenditureAuth.company_name).toBe('Test Company');
    expect(expenditureAuth.director_name).toBe('Test Director');
    expect(expenditureAuth.contact_number).toBe('123-456-7890');
    expect(expenditureAuth.invoices.length).toBe(0);
  });

  it('should generate expenditure authorization with invoices from completed quotations', () => {
    const scmData: GrantScmVerification = {
      beneficiary_company_name: 'Test Company',
      director: 'Test Director',
      contact_number: '123-456-7890',
      quotations: {
        items: [
          {
            id: '1',
            supplier_name: 'Test Supplier',
            comments: 'Test Item',
            status: 'completed',
            payment_processing: {
              payment_done: true
            }
          }
        ],
        verified_by: 'Test User',
        signature: ''
      }
    };

    const expenditureAuth = service.generateExpenditureAuthorizationFromScmData(scmData);
    
    expect(expenditureAuth.company_name).toBe('Test Company');
    expect(expenditureAuth.director_name).toBe('Test Director');
    expect(expenditureAuth.contact_number).toBe('123-456-7890');
    expect(expenditureAuth.invoices.length).toBe(1);
    expect(expenditureAuth.invoices[0].supplier_name).toBe('Test Supplier');
    expect(expenditureAuth.invoices[0].description).toBe('Test Item');
  });
});