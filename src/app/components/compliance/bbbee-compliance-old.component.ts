import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ComplianceBaseComponent,
  ComplianceColumnConfig,
} from './compliance-base.component';
import { ComplianceRecord } from '../../../models/ComplianceRecord';

@Component({
  selector: 'app-bbbee-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                  <i
                    class="fas fa-users text-gray-400 text-3xl mb-4"
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

      <!-- Dynamic Form Modal -->
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
            (click)="cancelForm()"
          ></div>

          <!-- Modal panel -->
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <!-- Modal header -->
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">
                  {{ formMode === 'create' ? 'Add New' : 'Edit' }} BBBEE Record
                </h3>
                <button
                  (click)="cancelForm()"
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i class="fas fa-times w-5 h-5"></i>
                </button>
              </div>

              <!-- Dynamic Form Fields -->
              <form (ngSubmit)="saveForm()" class="space-y-4">
                <div class="grid grid-cols-1 gap-4">
                  <div *ngFor="let field of columnConfig" class="space-y-1">
                    <label class="block text-sm font-medium text-gray-700">
                      {{ field.label }}
                      <span *ngIf="isFieldRequired(field)" class="text-red-500">*</span>
                    </label>

                    <!-- Text Input -->
                    <input
                      *ngIf="field.type === 'text'"
                      [value]="getFormFieldValue(field)"
                      (input)="onFieldChange(field, $event)"
                      [placeholder]="getFieldPlaceholder(field)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                    />

                    <!-- Date Input -->
                    <input
                      *ngIf="field.type === 'date'"
                      type="date"
                      [value]="getFormFieldValue(field)"
                      (input)="onFieldChange(field, $event)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                    />

                    <!-- Currency Input -->
                    <input
                      *ngIf="field.type === 'currency'"
                      [type]="getInputType(field)"
                      [step]="getInputStep(field)"
                      [value]="getFormFieldValue(field)"
                      (input)="onFieldChange(field, $event)"
                      [placeholder]="getFieldPlaceholder(field)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                    />

                    <!-- Number Input -->
                    <input
                      *ngIf="field.type === 'number'"
                      [type]="getInputType(field)"
                      [step]="getInputStep(field)"
                      [value]="getFormFieldValue(field)"
                      (input)="onFieldChange(field, $event)"
                      [placeholder]="getFieldPlaceholder(field)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                    />

                    <!-- Select Dropdown -->
                    <select
                      *ngIf="field.type === 'select'"
                      [value]="getFormFieldValue(field)"
                      (change)="onFieldChange(field, $event)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      <option value="">Select {{ field.label }}</option>
                      <option
                        *ngFor="let opt of getFieldOptions(field)"
                        [value]="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>

                    <!-- Textarea -->
                    <textarea
                      *ngIf="field.type === 'textarea'"
                      [value]="getFormFieldValue(field)"
                      (input)="onFieldChange(field, $event)"
                      [placeholder]="getFieldPlaceholder(field)"
                      [rows]="getTextareaRows(field)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                    ></textarea>
                  </div>
                </div>

                <!-- Form Actions -->
                <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    (click)="cancelForm()"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors"
                  >
                    {{ formMode === 'create' ? 'Create' : 'Update' }} BBBEE Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class BBBEEComplianceComponent extends ComplianceBaseComponent {
  override complianceType: 'bbbee_certificate' = 'bbbee_certificate';
  pageTitle = 'BBBEE Compliance Management';
  pageDescription =
    'Track Broad-Based Black Economic Empowerment compliance, scorecards, and transformational initiatives for regulatory reporting.';

  columnConfig: ComplianceColumnConfig[] = [
    { key: 'period', label: 'Financial Year', type: 'text', required: true, placeholder: 'e.g., FY2024' },
    { key: 'date1', label: 'Assessment Date', type: 'date', required: true },
    { key: 'date2', label: 'Expiry Date', type: 'date', required: true },
    { key: 'count1', label: 'Total Employees', type: 'number', required: true, placeholder: '0' },
    { key: 'count2', label: 'Black Employees', type: 'number', required: true, placeholder: '0' },
    { key: 'amount1', label: 'Skills Investment', type: 'currency', step: 0.01, placeholder: '0.00' },
    { key: 'amount2', label: 'Procurement Spend', type: 'currency', step: 0.01, placeholder: '0.00' },
    { key: 'amount3', label: 'Enterprise Development', type: 'currency', step: 0.01, placeholder: '0.00' },
    {
      key: 'status',
      label: 'BBBEE Level',
      type: 'select',
      required: true,
      options: [
        { value: 'Level 1', label: 'Level 1 (>100 points)', color: 'text-green-600' },
        { value: 'Level 2', label: 'Level 2 (95-100 points)', color: 'text-green-500' },
        { value: 'Level 3', label: 'Level 3 (90-95 points)', color: 'text-blue-600' },
        { value: 'Level 4', label: 'Level 4 (85-90 points)', color: 'text-blue-500' },
        { value: 'Level 5', label: 'Level 5 (80-85 points)', color: 'text-yellow-600' },
        { value: 'Level 6', label: 'Level 6 (75-80 points)', color: 'text-yellow-500' },
        { value: 'Level 7', label: 'Level 7 (70-75 points)', color: 'text-orange-600' },
        { value: 'Level 8', label: 'Level 8 (55-70 points)', color: 'text-orange-500' },
        { value: 'Non-Compliant', label: 'Non-Compliant (<55 points)', color: 'text-red-600' },
        { value: 'Pending', label: 'Assessment Pending', color: 'text-gray-600' }
      ]
    },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about BBBEE compliance, initiatives, or challenges...' },
  ];

  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0];
    const endOfYear = new Date(currentYear, 11, 31).toISOString().split('T')[0];

    return {
      type: 'bbbee_certificate',
      title: 'BBBEE Assessment',
      period: `FY${currentYear}`,
      date1: startOfYear, // Assessment date
      date2: endOfYear, // Expiry date
      count1: 0, // Total employees
      count2: 0, // Black employees
      amount1: 0, // Skills investment
      amount2: 0, // Procurement spend
      amount3: 0, // Enterprise development
      status: 'Pending',
      notes: '',
    };
  }

  override getFirstEditableField(): string {
    return 'period';
  }
}
