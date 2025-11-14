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
  selector: 'app-bbbee-compliance',
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
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add BBBEE Record
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
      <div
        class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">BBBEE Compliance Records</h3>
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
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right"
                >
                  <button
                    (click)="startEditForm(record)"
                    class="text-green-600 hover:text-green-900 transition-colors mr-3"
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
                  <i
                    class="fas fa-balance-scale text-gray-400 text-3xl mb-4"
                  ></i>
                  <p class="text-gray-500 text-sm">
                    No BBBEE compliance records yet.
                  </p>
                  <p class="text-gray-400 text-xs mt-1">
                    Click "Add BBBEE Record" to get started.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Compliance Form Modal -->
      <div
        *ngIf="showForm"
        class="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            (click)="onFormCancel()"
          ></div>

          <!-- Modal panel -->
          <div class="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
    </div>
  `,
})
export class BBBEEComplianceComponent extends ComplianceBaseComponent {
  override complianceType: 'bbbee_certificate' = 'bbbee_certificate';
  pageTitle = 'BBBEE Compliance Management';
  pageDescription =
    'Track Broad-Based Black Economic Empowerment scorecard status, verification dates, and certificate management.';

  columnConfig: ComplianceColumnConfig[] = [
    { key: 'period', label: 'Assessment Period', type: 'text', required: true, placeholder: 'e.g., FY2024' },
    { key: 'date_1', label: 'Verification Date', type: 'date', required: true },
    { key: 'date_2', label: 'Certificate Issue Date', type: 'date' },
    { key: 'date_3', label: 'Certificate Expiry Date', type: 'date' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Pending', label: 'Pending', color: 'text-yellow-600' },
        { value: 'In Progress', label: 'In Progress', color: 'text-blue-600' },
        { value: 'Verified', label: 'Verified', color: 'text-green-600' },
        { value: 'Expired', label: 'Expired', color: 'text-red-600' },
        { value: 'Not Required', label: 'Not Required', color: 'text-gray-600' }
      ]
    },
    {
      key: 'amount_1',
      label: 'Score',
      type: 'number',
      step: 0.1,
      placeholder: '0.0'
    },
    {
      key: 'text1',
      label: 'Level',
      type: 'select',
      options: [
        { value: 'Level 1', label: 'Level 1', color: 'text-green-600' },
        { value: 'Level 2', label: 'Level 2', color: 'text-green-500' },
        { value: 'Level 3', label: 'Level 3', color: 'text-blue-600' },
        { value: 'Level 4', label: 'Level 4', color: 'text-yellow-600' },
        { value: 'Level 5', label: 'Level 5', color: 'text-orange-600' },
        { value: 'Level 6', label: 'Level 6', color: 'text-red-500' },
        { value: 'Level 7', label: 'Level 7', color: 'text-red-600' },
        { value: 'Level 8', label: 'Level 8', color: 'text-red-700' },
        { value: 'Non-Compliant', label: 'Non-Compliant', color: 'text-red-800' }
      ]
    },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about this BBBEE assessment...' },
  ];

  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {
      type: 'bbbee_certificate',
      title: 'BBBEE Assessment',
      period: `FY${new Date().getFullYear()}`,
      date_1: new Date().toISOString().split('T')[0], // Verification date
      status: 'Pending',
      notes: '',
    };
  }

  override getFirstEditableField(): string {
    return 'period';
  }
}
