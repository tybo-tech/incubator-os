import { Component, Input, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';
import { UploadService } from '../../../../services/UploadService';
import {
  ScmQuotation,
  GrantScmVerification,
  DEFAULT_GRANT_SCM_VERIFICATION,
} from './scm-verification.models';
import {
  GrantProcessExportService,
  CompanyInfo,
} from '../services/grant-process-export.service';
import { IGrantApplicationData } from '../interfaces/grant-application.interfaces';
import { SupplierService } from './supplier.service';
import { ScmVerificationService } from './scm-verification.service';
import { ScmVerificationStateService } from './scm-verification-state.service';

// Child components
import { ScmVerificationHeaderComponent } from './scm-verification-header.component';
import { ScmVerificationStatusTableComponent } from './scm-verification-status-table.component';
import { ScmVerificationModalComponent } from './scm-verification-modal.component';

@Component({
  selector: 'app-scm-verification-process',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SignaturePadLibComponent,
    ScmVerificationHeaderComponent,
    ScmVerificationStatusTableComponent,
    ScmVerificationModalComponent
  ],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header Component -->
      <app-scm-verification-header
        (onAddQuotation)="addQuotation()">
      </app-scm-verification-header>

      <!-- Loading -->
      <div *ngIf="stateService.isLoading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading SCM verification data...</span>
      </div>

      <!-- Content -->
      <div *ngIf="!stateService.isLoading()" class="p-6">
        <!-- Workflow Overview - Compact -->
        <div class="border rounded-lg p-3 mb-6 bg-gray-50">
          <div class="grid grid-cols-4 gap-2">
            <div class="text-center p-2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mx-auto mb-1">
                1
              </div>
              <p class="text-xs text-gray-600">Collection</p>
              <p class="text-xs font-semibold">{{ getStep1Count() }}</p>
            </div>
            <div class="text-center p-2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 text-xs font-semibold mx-auto mb-1">
                2
              </div>
              <p class="text-xs text-gray-600">Verification</p>
              <p class="text-xs font-semibold">{{ getStep2Count() }}</p>
            </div>
            <div class="text-center p-2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mx-auto mb-1">
                3
              </div>
              <p class="text-xs text-gray-600">Processing</p>
              <p class="text-xs font-semibold">{{ getStep3Count() }}</p>
            </div>
            <div class="text-center p-2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-semibold mx-auto mb-1">
                4
              </div>
              <p class="text-xs text-gray-600">Payment</p>
              <p class="text-xs font-semibold">{{ getStep4Count() }}</p>
            </div>
          </div>
        </div>

        <!-- Status Table Component -->
        <app-scm-verification-status-table
          [scmVerification]="stateService.scmVerification()"
          (onProcessQuotation)="openQuotationModal($event)"
          (onRemoveQuotation)="removeQuotation($event)">
        </app-scm-verification-status-table>

        <!-- Save Button -->
        <div class="flex justify-end space-x-2">
          <button
            (click)="exportToPdf()"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <i class="fas fa-file-pdf mr-1"></i>
            Export
          </button>
          <button
            (click)="saveScmVerification()"
            [disabled]="stateService.isSaving()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center">
            <i class="fas fa-save mr-1"></i>
            {{ stateService.isSaving() ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <!-- Status Message -->
        <div *ngIf="stateService.saveStatus()" class="mt-4 p-3 rounded-lg text-sm"
             [class]="stateService.saveStatus()!.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
          <div class="flex">
            <i class="fas text-base mt-0.5 mr-2"
               [class]="stateService.saveStatus()!.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'"></i>
            <div>
              <p>{{ stateService.saveStatus()!.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Component -->
    <app-scm-verification-modal
      [show]="stateService.showModal()"
      [scmVerification]="stateService.scmVerification()"
      [currentQuotationIndex]="stateService.currentQuotationIndex()"
      [currentStep]="stateService.currentStep()"
      (onClose)="closeQuotationModal()"
      (onSaveAndClose)="saveAndCloseQuotation()"
      (onNext)="processNextStep()"
      (onPrevious)="processPreviousStep()"
      (onComplete)="markQuotationAsComplete()">
    </app-scm-verification-modal>
  `
})
export class ScmVerificationProcessComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantId!: number;
  @Input() applicantData!: IGrantApplicationData;

  constructor(
    @Inject(NodeService) private nodeService: NodeService,
    @Inject(UploadService) private uploadService: UploadService,
    @Inject(GrantProcessExportService) private exportService: GrantProcessExportService,
    @Inject(SupplierService) private supplierService: SupplierService,
    @Inject(ScmVerificationService) private scmVerificationService: ScmVerificationService,
    @Inject(ScmVerificationStateService) public stateService: ScmVerificationStateService
  ) {}

  ngOnInit(): void {
    this.loadScmVerification();
    // Pre-populate company information
    this.prepopulateCompanyInfo();
  }

  // Statistics methods
  getStep1Count(): number {
    const quotations = this.stateService.scmVerification().quotations.items;
    return quotations.filter(q => this.scmVerificationService.getQuotationStep(q) === 1).length;
  }

  getStep2Count(): number {
    const quotations = this.stateService.scmVerification().quotations.items;
    return quotations.filter(q => this.scmVerificationService.getQuotationStep(q) === 2).length;
  }

  getStep3Count(): number {
    const quotations = this.stateService.scmVerification().quotations.items;
    return quotations.filter(q => this.scmVerificationService.getQuotationStep(q) === 3).length;
  }

  getStep4Count(): number {
    const quotations = this.stateService.scmVerification().quotations.items;
    return quotations.filter(q => this.scmVerificationService.getQuotationStep(q) === 4).length;
  }

  getCompletedCount(): number {
    const quotations = this.stateService.scmVerification().quotations.items;
    return quotations.filter(q => q.status === 'completed').length;
  }

  loadScmVerification(): void {
    this.stateService.setLoading(true);
    this.scmVerificationService.loadScmVerification(this.companyId).subscribe({
      next: (data) => {
        this.stateService.updateScmVerification(data);
        this.stateService.setLoading(false);
      },
      error: () => {
        this.stateService.setLoading(false);
      }
    });
  }

  saveScmVerification(): void {
    this.stateService.setSaving(true);
    this.stateService.setSaveStatus(null);

    this.scmVerificationService.saveScmVerification(
      this.companyId,
      this.stateService.scmVerification()
    ).subscribe({
      next: (response: any) => {
        this.stateService.updateScmVerificationNode(response);
        // Sync suppliers after saving SCM verification
        this.scmVerificationService.syncSuppliers(
          this.companyId,
          this.stateService.scmVerification()
        ).subscribe({
          next: () => {
            this.stateService.setSaving(false);
            this.stateService.setSaveStatus({
              message: 'SCM Verification and suppliers saved successfully!',
              type: 'success'
            });
            // Clear status message after 3 seconds
            setTimeout(() => this.stateService.setSaveStatus(null), 3000);
          },
          error: (error: any) => {
            this.stateService.setSaving(false);
            this.stateService.setSaveStatus({
              message: 'SCM Verification saved but failed to sync suppliers.',
              type: 'error'
            });
            console.error('Error syncing suppliers:', error);
          }
        });
      },
      error: (error: any) => {
        this.stateService.setSaving(false);
        this.stateService.setSaveStatus({
          message: 'Failed to save SCM Verification. Please try again.',
          type: 'error'
        });
        console.error('Error saving SCM Verification:', error);
      }
    });
  }

  addQuotation(): void {
    const updatedData = this.scmVerificationService.addQuotation(
      this.stateService.scmVerification()
    );
    this.stateService.updateScmVerification(updatedData);
    
    // Get the index of the newly added quotation (it will be the last one)
    const newIndex = updatedData.quotations.items.length - 1;
    
    // Open the modal immediately for the new quotation
    this.openQuotationModal(newIndex);
  }

  removeQuotation(index: number): void {
    const updatedData = this.scmVerificationService.removeQuotation(
      this.stateService.scmVerification(),
      index
    );
    this.stateService.updateScmVerification(updatedData);
  }

  prepopulateCompanyInfo(): void {
    // Get primary director information
    const primaryDirector = this.applicantData.directors?.[0];
    const directorName = primaryDirector
      ? [primaryDirector.name, primaryDirector.surname].filter(Boolean).join(' ')
      : '';

    // Get contact number (cell phone or phone)
    const contactNumber = primaryDirector
      ? (primaryDirector.cell_phone || primaryDirector.phone || '')
      : '';

    // Update the SCM verification data with company information
    this.stateService.updateScmVerification({
      ...this.stateService.scmVerification(),
      beneficiary_company_name: this.applicantData.company_name || '',
      director: directorName,
      contact_number: contactNumber
    });
  }

  openQuotationModal(index: number): void {
    const quotation = this.stateService.scmVerification().quotations.items[index];
    const step = this.scmVerificationService.getQuotationStep(quotation);

    this.stateService.openModal(index, step);
  }

  closeQuotationModal(): void {
    this.stateService.closeModal();
  }

  processNextStep(): void {
    const index = this.stateService.currentQuotationIndex();
    if (index === null) return;

    const step = this.stateService.currentStep();
    let updatedData = this.stateService.scmVerification();

    switch (step) {
      case 1:
        // Initialize online verification when moving from step 1 to step 2
        updatedData = this.scmVerificationService.initializeOnlineVerification(updatedData, index);
        break;
      case 2:
        // Initialize purchase order processing when moving from step 2 to step 3
        updatedData = this.scmVerificationService.initializePurchaseOrderProcessing(updatedData, index);
        break;
      case 3:
        // Initialize payment processing when moving from step 3 to step 4
        updatedData = this.scmVerificationService.initializePaymentProcessing(updatedData, index);
        break;
      case 4:
        // Payment processing is the final step
        break;
    }

    // Update the state with the modified data
    this.stateService.updateScmVerification(updatedData);

    // Move to next step
    if (step < 4) {
      this.stateService.nextStep();
    }

    // Save the updated data
    this.saveScmVerification();
  }

  processPreviousStep(): void {
    // Move to previous step without reloading data
    this.stateService.previousStep();
  }

  saveAndCloseQuotation(): void {
    // Save the current SCM verification data
    this.saveScmVerification();
    // Close the modal
    this.closeQuotationModal();
  }

  markQuotationAsComplete(): void {
    const index = this.stateService.currentQuotationIndex();
    if (index === null) return;

    // Update the quotation status to complete
    const updatedData = { ...this.stateService.scmVerification() };
    const quotations = [...updatedData.quotations.items];

    // Mark the quotation as complete
    if (quotations[index]) {
      quotations[index] = {
        ...quotations[index],
        status: 'completed'
      };
    }

    updatedData.quotations.items = quotations;
    this.stateService.updateScmVerification(updatedData);

    // Save and close
    this.saveAndCloseQuotation();
  }

  exportToPdf(): void {
    // Get primary director information
    const primaryDirector = this.applicantData.directors?.[0];
    const directorName = primaryDirector
      ? [primaryDirector.name, primaryDirector.surname].filter(Boolean).join(' ')
      : '';

    // Get contact number (cell phone or phone)
    const contactNumber = primaryDirector
      ? (primaryDirector.cell_phone || primaryDirector.phone || '')
      : '';

    const companyInfo: CompanyInfo = {
      companyName: this.applicantData.company_name || '',
      directorName: directorName,
      contactNumber: contactNumber,
      registrationNumber: this.applicantData.registration_number || ''
    };

    this.exportService.exportScmVerification(
      this.stateService.scmVerification(),
      companyInfo
    );
  }
}
