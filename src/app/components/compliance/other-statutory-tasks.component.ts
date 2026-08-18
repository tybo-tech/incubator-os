import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ComplianceBaseComponent,
  ComplianceColumnConfig,
} from './compliance-base.component';
import { ComplianceFormComponent } from './compliance-form.component';
import { ComplianceRecord } from '../../../models/ComplianceRecord';

@Component({
  selector: 'app-other-statutory-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, ComplianceFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">{{ pageTitle }}</h2>
          <p class="mt-1 text-sm text-gray-500">{{ pageDescription }}</p>
        </div>
        <button
          (click)="startNewForm()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Task
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          *ngFor="let card of getSummaryCards()"
          class="bg-white rounded-lg shadow p-4 border border-gray-200 flex items-center"
        >
          <i [class]="card.icon + ' ' + card.color + ' text-xl'"></i>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">{{ card.title }}</p>
            <p class="text-lg font-semibold text-gray-900">{{ card.value }}</p>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Statutory Tasks</h3>
          <p class="text-sm text-gray-500 mt-1">Track compliance activities beyond standard CIPC and SARS requirements</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  *ngFor="let col of columnConfig"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {{ col.label }}
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                *ngFor="let record of records$ | async; trackBy: trackById"
                class="hover:bg-gray-50"
              >
                <td
                  *ngFor="let col of columnConfig"
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  (click)="startEditing(record.id, col.key)"
                >
                  {{ getFieldValue(record, col) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                  <button
                    (click)="startEditForm(record)"
                    class="text-blue-600 hover:text-blue-900 transition-colors mr-3"
                    title="Edit record"
                  >
                    <i class="fas fa-edit w-4 h-4"></i>
                  </button>
                  <button
                    (click)="deleteRecord(record.id)"
                    class="text-red-600 hover:text-red-900 transition-colors"
                    title="Delete record"
                  >
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <tr *ngIf="(records$ | async)?.length === 0">
                <td
                  [attr.colspan]="columnConfig.length + 1"
                  class="px-6 py-12 text-center"
                >
                  <i class="fas fa-balance-scale text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No statutory tasks for this company yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Task" to get started.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Common Statutory Tasks Templates -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-900">Common Statutory Tasks</h3>
          <p class="text-xs text-gray-500">Click to add as a new task</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            *ngFor="let template of commonTasks"
            (click)="addTaskFromTemplate(template)"
            class="text-left p-3 bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div class="flex items-start">
              <i [class]="template.icon + ' text-blue-500 mt-1 mr-2'"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ template.name }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ template.description }}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Compliance Form Modal -->
      <div
        *ngIf="showForm"
        class="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal panel -->
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <app-compliance-form
            [config]="getFormConfig()"
            [initialData]="formData"
            [loading]="loading"
            (formSubmit)="onFormSubmit($event)"
            (formCancel)="onFormCancel()"
          ></app-compliance-form>
        </div>
      </div>
    </div>
  `,
})
export class OtherStatutoryTasksComponent extends ComplianceBaseComponent {
  override complianceType: 'other' = 'other';
  pageTitle = 'Other Statutory Tasks';
  pageDescription =
    'Track additional compliance activities such as B-BBEE certification, sectoral licenses, and industry-specific regulations.';

  columnConfig: ComplianceColumnConfig[] = [
    { key: 'title', label: 'Task Name', type: 'text', required: true, placeholder: 'e.g., B-BBEE Certification Application' },
    { key: 'responsible_person', label: 'Responsible Person', type: 'text', placeholder: 'e.g., Compliance Officer' },
    { key: 'date_1', label: 'Due Date', type: 'date', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Planned', label: 'Planned', color: 'text-gray-600' },
        { value: 'In Progress', label: 'In Progress', color: 'text-blue-600' },
        { value: 'Completed', label: 'Completed', color: 'text-green-600' }
      ]
    },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about this task...' },
  ];

  commonTasks = [
    {
      name: 'B-BBEE Certification',
      description: 'Annual B-BBEE certificate application or renewal',
      icon: 'fas fa-certificate',
      template: {
        title: 'B-BBEE Certification Application',
        responsible_person: 'Compliance Officer',
        status: 'Planned',
        notes: 'Required for public sector tenders and corporate compliance'
      }
    },
    {
      name: 'Professional Indemnity Insurance',
      description: 'Renewal of professional indemnity insurance',
      icon: 'fas fa-shield-alt',
      template: {
        title: 'Professional Indemnity Insurance Renewal',
        responsible_person: 'Operations Manager',
        status: 'Planned',
        notes: 'Essential for professional services and client protection'
      }
    },
    {
      name: 'POPIA Compliance',
      description: 'Protection of Personal Information Act compliance review',
      icon: 'fas fa-user-shield',
      template: {
        title: 'POPIA Compliance Assessment',
        responsible_person: 'IT Manager',
        status: 'Planned',
        notes: 'Annual review of data protection policies and procedures'
      }
    },
    {
      name: 'OHS Audit',
      description: 'Occupational Health & Safety compliance audit',
      icon: 'fas fa-hard-hat',
      template: {
        title: 'Occupational Health & Safety Audit',
        responsible_person: 'Safety Officer',
        status: 'Planned',
        notes: 'Annual workplace safety compliance assessment'
      }
    },
    {
      name: 'Industry License Renewal',
      description: 'Sector-specific license or permit renewal',
      icon: 'fas fa-file-contract',
      template: {
        title: 'Industry License Renewal',
        responsible_person: 'Compliance Officer',
        status: 'Planned',
        notes: 'Sector-specific licensing requirements'
      }
    },
    {
      name: 'Employment Equity Report',
      description: 'Annual Employment Equity report submission',
      icon: 'fas fa-users',
      template: {
        title: 'Employment Equity Report Submission',
        responsible_person: 'HR Manager',
        status: 'Planned',
        notes: 'Required for companies with 50+ employees'
      }
    }
  ];

  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {
      type: 'other',
      title: 'New Statutory Task',
      responsible_person: 'Assign Person',
      date_1: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'Planned',
      notes: '',
    };
  }

  override getFirstEditableField(): string {
    return 'title';
  }

  addTaskFromTemplate(template: any): void {
    const record: Partial<ComplianceRecord> = {
      company_id: this.companyId,
      client_id: this.clientId,
      program_id: this.programId,
      cohort_id: this.cohortId,
      financial_year_id: 1,
      type: 'other',
      ...template.template,
      date_1: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };

    this.complianceService.addComplianceRecord(record).subscribe({
      next: (created) => {
        const currentRecords = this.records$.getValue();
        this.records$.next([created, ...currentRecords]);
      },
      error: (err) => {
        console.error('Error adding statutory task from template:', err);
      }
    });
  }
}
