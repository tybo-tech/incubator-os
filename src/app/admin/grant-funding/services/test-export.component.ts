import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrantProcessExportService } from './grant-process-export.service';
import { GrantFundingChecklist, ChecklistResponse } from '../business-process/checklist.models';
import { GrantExpenditureAuthorization } from '../business-process/expenditure-authorization.models';
import { GrantScmVerification } from '../business-process/scm-verification.models';

@Component({
  selector: 'app-test-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">Test PDF Export</h2>
      <div class="space-x-2">
        <button 
          (click)="testChecklistExport()" 
          class="px-4 py-2 bg-blue-500 text-white rounded">
          Test Checklist Export
        </button>
        <button 
          (click)="testExpenditureExport()" 
          class="px-4 py-2 bg-green-500 text-white rounded">
          Test Expenditure Export
        </button>
        <button 
          (click)="testScmExport()" 
          class="px-4 py-2 bg-purple-500 text-white rounded">
          Test SCM Export
        </button>
      </div>
    </div>
  `
})
export class TestExportComponent {
  constructor(private exportService: GrantProcessExportService) {}

  testChecklistExport(): void {
    const testData: GrantFundingChecklist = {
      scmVerificationProcessChecklist: ChecklistResponse.YES,
      expenditureAuthorizationForm: ChecklistResponse.NO,
      businessSupportAcknowledgementLetter: ChecklistResponse.NA,
      esdEdAgreement: null,
      termsAndConditionsForDisbursement: null,
      acknowledgementOfDelivery: null,
      purchaseOrder: null,
      quotations: null,
      taxInvoices: null,
      proofOfPaymentToSupplier: null,
      bankConfirmation: null,
      bbbee: null,
      taxPin: null,
      beneficiaryIdCopies: null,
      companyRegistrationDocument: null,
    };

    const companyInfo = {
      companyName: 'Test Company',
      directorName: 'Test Director',
      contactNumber: '123-456-7890',
      registrationNumber: 'REG123456'
    };

    this.exportService.exportBusinessProcessChecklist(testData, companyInfo);
  }

  testExpenditureExport(): void {
    const testData: GrantExpenditureAuthorization = {
      company_name: 'Test Company',
      director_name: 'Test Director',
      contact_number: '123-456-7890',
      registration_number: 'REG123456',
      invoices: [
        {
          id: '1',
          invoice_number: 'INV-001',
          description: 'Test Item',
          supplier_name: 'Test Supplier',
          amount_excl_vat: 1000,
          vat_amount: 150,
          total_amount: 1150,
          preferred_supplier: true
        }
      ],
      beneficiary_authorization: {
        name: 'Test Director',
        signature: '',
        date: '2023-01-01'
      },
      business_advisor_authorization: {
        name: 'Marius Wilken',
        signature: '',
        date: '2023-01-01'
      },
      coordinator_authorization: {
        name: 'Test Coordinator',
        signature: '',
        date: '2023-01-01'
      },
      south32_spa_authorization: {
        name: 'Test SPA',
        signature: '',
        date: '2023-01-01'
      },
      manager_authorization: {
        name: 'Test Manager',
        signature: '',
        date: '2023-01-01'
      },
      payment_release: {
        released_by: 'Krian Naidoo',
        signature: '',
        release_date: '2023-01-01'
      }
    };

    const companyInfo = {
      companyName: testData.company_name,
      directorName: testData.director_name,
      contactNumber: testData.contact_number,
      registrationNumber: testData.registration_number
    };

    this.exportService.exportExpenditureAuthorization(testData, companyInfo);
  }

  testScmExport(): void {
    const testData: GrantScmVerification = {
      beneficiary_company_name: 'Test Company',
      director: 'Test Director',
      contact_number: '123-456-7890',
      quotations: {
        items: [],
        verified_by: 'Test Verifier',
        signature: ''
      }
    };

    const companyInfo = {
      companyName: testData.beneficiary_company_name,
      directorName: testData.director,
      contactNumber: testData.contact_number,
      registrationNumber: 'REG123456'
    };

    this.exportService.exportScmVerification(testData, companyInfo);
  }
}