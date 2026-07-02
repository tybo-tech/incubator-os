import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GrantFundingChecklist
} from './checklist.models';
import {
  GrantExpenditureAuthorization
} from './expenditure-authorization.models';
import {
  GrantScmVerification
} from './scm-verification.models';
import { ScmVerificationService } from './scm-verification.service';
import { GrantProcessExportService, CompanyInfo } from '../services/grant-process-export.service';
import { ChecklistGenerationService } from '../services/checklist-generation.service';
import { ExpenditureGenerationService } from '../services/expenditure-generation.service';
import { IGrantApplicationData } from '../interfaces/grant-application.interfaces';

@Component({
  selector: 'app-process-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-100">
        <div class="flex items-center">
          <i class="fas fa-file-export text-blue-600 text-xl mr-3"></i>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              Process Exports
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              Export business process documents generated from SCM verification data.
            </p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading process data...</span>
      </div>

      <!-- Export Buttons -->
      <div *ngIf="!isLoading()" class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Business Process Checklist -->
          <div class="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mr-3">
                <i class="fas fa-clipboard-list"></i>
              </div>
              <h3 class="font-semibold text-lg">Business Process Checklist</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              Auto-generated checklist from SCM verification data.
            </p>
            <button
              (click)="exportBusinessProcessChecklist()"
              [disabled]="isExporting()"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center">
              <i class="fas fa-file-pdf mr-2"></i>
              {{ isExporting() && exportType() === 'checklist' ? 'Exporting...' : 'Export PDF' }}
            </button>
          </div>

          <!-- SCM Verification -->
          <div class="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 mr-3">
                <i class="fas fa-tasks"></i>
              </div>
              <h3 class="font-semibold text-lg">SCM Verification</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              Detailed SCM verification process data.
            </p>
            <button
              (click)="exportScmVerification()"
              [disabled]="isExporting()"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center">
              <i class="fas fa-file-pdf mr-2"></i>
              {{ isExporting() && exportType() === 'scm' ? 'Exporting...' : 'Export PDF' }}
            </button>
          </div>

          <!-- Expenditure Authorization -->
          <div class="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 mr-3">
                <i class="fas fa-file-invoice-dollar"></i>
              </div>
              <h3 class="font-semibold text-lg">Expenditure Authorization</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              Auto-generated expenditure authorization from SCM data.
            </p>
            <button
              (click)="exportExpenditureAuthorization()"
              [disabled]="isExporting()"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center">
              <i class="fas fa-file-pdf mr-2"></i>
              {{ isExporting() && exportType() === 'expenditure' ? 'Exporting...' : 'Export PDF' }}
            </button>
          </div>
        </div>

        <!-- Status Message -->
        <div *ngIf="exportStatus()" class="mt-6 p-4 rounded-lg"
             [class]="exportStatus()!.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
          <div class="flex">
            <i class="fas text-lg mt-0.5 mr-3"
               [class]="exportStatus()!.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'"></i>
            <div>
              <h4 class="font-medium"
                  [class]="exportStatus()!.type === 'success' ? 'text-green-800' : 'text-red-800'">
                {{ exportStatus()!.type === 'success' ? 'Success' : 'Error' }}
              </h4>
              <p class="mt-1">{{ exportStatus()!.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProcessExportComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantId!: number;
  @Input() applicantData!: IGrantApplicationData;

  isLoading = signal(true);
  isExporting = signal(false);
  exportType = signal<'checklist' | 'scm' | 'expenditure' | null>(null);
  exportStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  scmVerification = signal<GrantScmVerification | null>(null);

  private scmVerificationService = inject(ScmVerificationService);
  private exportService = inject(GrantProcessExportService);
  private checklistGenerationService = inject(ChecklistGenerationService);
  private expenditureGenerationService = inject(ExpenditureGenerationService);

  ngOnInit(): void {
    this.loadScmVerification();
  }

  loadScmVerification(): void {
    this.isLoading.set(true);
    this.scmVerificationService.loadScmVerification(this.companyId).subscribe({
      next: (data: GrantScmVerification) => {
        this.scmVerification.set(data);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading SCM verification:', error);
        this.isLoading.set(false);
        this.exportStatus.set({
          message: 'Failed to load SCM verification data. Please try again.',
          type: 'error'
        });
      }
    });
  }

  exportBusinessProcessChecklist(): void {
    const scmData = this.scmVerification();
    if (!scmData) {
      this.exportStatus.set({
        message: 'No SCM data available for export.',
        type: 'error'
      });
      return;
    }

    this.isExporting.set(true);
    this.exportType.set('checklist');
    this.exportStatus.set(null);

    try {
      // Generate checklist from SCM data
      const checklist = this.checklistGenerationService.generateChecklistFromScmData(scmData);

      // Get company information
      const companyInfo = this.getCompanyInfo();

      // Export to PDF
      this.exportService.exportBusinessProcessChecklist(checklist, companyInfo);

      this.exportStatus.set({
        message: 'Business Process Checklist exported successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting Business Process Checklist:', error);
      this.exportStatus.set({
        message: 'Failed to export Business Process Checklist. Please try again.',
        type: 'error'
      });
    } finally {
      this.isExporting.set(false);
      this.exportType.set(null);
      // Clear status message after 3 seconds
      setTimeout(() => this.exportStatus.set(null), 3000);
    }
  }

  exportScmVerification(): void {
    const scmData = this.scmVerification();
    if (!scmData) {
      this.exportStatus.set({
        message: 'No SCM data available for export.',
        type: 'error'
      });
      return;
    }

    this.isExporting.set(true);
    this.exportType.set('scm');
    this.exportStatus.set(null);

    try {
      // Get company information
      const companyInfo = this.getCompanyInfo();

      // Export to PDF
      this.exportService.exportScmVerification(scmData, companyInfo);

      this.exportStatus.set({
        message: 'SCM Verification exported successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting SCM Verification:', error);
      this.exportStatus.set({
        message: 'Failed to export SCM Verification. Please try again.',
        type: 'error'
      });
    } finally {
      this.isExporting.set(false);
      this.exportType.set(null);
      // Clear status message after 3 seconds
      setTimeout(() => this.exportStatus.set(null), 3000);
    }
  }

  exportExpenditureAuthorization(): void {
    const scmData = this.scmVerification();
    if (!scmData) {
      this.exportStatus.set({
        message: 'No SCM data available for export.',
        type: 'error'
      });
      return;
    }

    this.isExporting.set(true);
    this.exportType.set('expenditure');
    this.exportStatus.set(null);

    try {
      // Generate expenditure authorization from SCM data
      const expenditureAuthorization = this.expenditureGenerationService.generateExpenditureAuthorizationFromScmData(scmData);

      // Get company information
      const companyInfo = this.getCompanyInfo();

      // Export to PDF
      this.exportService.exportExpenditureAuthorization(expenditureAuthorization, companyInfo);

      this.exportStatus.set({
        message: 'Expenditure Authorization exported successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting Expenditure Authorization:', error);
      this.exportStatus.set({
        message: 'Failed to export Expenditure Authorization. Please try again.',
        type: 'error'
      });
    } finally {
      this.isExporting.set(false);
      this.exportType.set(null);
      // Clear status message after 3 seconds
      setTimeout(() => this.exportStatus.set(null), 3000);
    }
  }

  private getCompanyInfo(): CompanyInfo {
    // Get primary director information
    const primaryDirector = this.applicantData.directors?.[0];
    const directorName = primaryDirector
      ? [primaryDirector.name, primaryDirector.surname].filter(Boolean).join(' ')
      : '';

    // Get contact number (cell phone or phone)
    const contactNumber = primaryDirector
      ? (primaryDirector.cell_phone || primaryDirector.phone || '')
      : '';

    return {
      companyName: this.applicantData.company_name || '',
      directorName: directorName,
      contactNumber: contactNumber,
      registrationNumber: this.applicantData.registration_number || ''
    };
  }
}
