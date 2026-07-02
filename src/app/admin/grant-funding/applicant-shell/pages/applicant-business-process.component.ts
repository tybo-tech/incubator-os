import { Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessExportComponent } from '../../business-process/process-export.component';
import { ScmVerificationProcessComponent } from '../../business-process/scm-verification-process.component';
import { IGrantApplicationData } from '../../interfaces/grant-application.interfaces';

@Component({
  selector: 'app-applicant-business-process',
  standalone: true,
  imports: [CommonModule, ProcessExportComponent, ScmVerificationProcessComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Tabs Header -->
      <div class="border-b border-gray-200">
        <nav class="flex space-x-8 px-5" aria-label="Tabs">
          <button
            (click)="setActiveTab('scm')"
            [class]="tabClass('scm')"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
            SCM Verification
          </button>
          <button
            (click)="setActiveTab('exports')"
            [class]="tabClass('exports')"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
            Process Exports
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-5">
        <!-- SCM Verification Tab -->
        <div *ngIf="activeTab() === 'scm'">
          <app-scm-verification-process
            [companyId]="companyId"
            [applicantId]="applicantId"
            [applicantData]="applicantData">
          </app-scm-verification-process>
        </div>

        <!-- Process Exports Tab -->
        <div *ngIf="activeTab() === 'exports'">
          <app-process-export
            [companyId]="companyId"
            [applicantId]="applicantId"
            [applicantData]="applicantData">
          </app-process-export>
        </div>

        <!-- Documents Tab -->
        <div *ngIf="activeTab() === 'documents'" class="text-center py-8">
          <svg class="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="mt-4 text-sm text-gray-500">Document management for business process will be displayed here.</p>
          <p class="text-xs text-gray-400 mt-1">Upload and manage supporting documents for this business process.</p>
        </div>

        <!-- Notes Tab -->
        <div *ngIf="activeTab() === 'notes'" class="text-center py-8">
          <svg class="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <p class="mt-4 text-sm text-gray-500">Notes and comments for business process will be displayed here.</p>
          <p class="text-xs text-gray-400 mt-1">Add and view notes related to this business process.</p>
        </div>
      </div>
    </div>
  `
})
export class ApplicantBusinessProcessComponent {
  @Input() companyId!: number;
  @Input() applicantId!: number;
  @Input() applicantData!: IGrantApplicationData;

  activeTab = signal<'scm' | 'exports' | 'documents' | 'notes'>('scm');

  setActiveTab(tab: 'scm' | 'exports' | 'documents' | 'notes'): void {
    this.activeTab.set(tab);
  }

  tabClass(tab: 'scm' | 'exports' | 'documents' | 'notes'): string {
    const isActive = this.activeTab() === tab;
    return isActive
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
  }
}
