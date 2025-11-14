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
  selector: 'app-annual-returns',
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
          Add Return
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
          <h3 class="text-lg font-medium text-gray-900">Annual Returns</h3>
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
                    class="fas fa-calendar-check text-gray-400 text-3xl mb-4"
                  ></i>
                  <p class="text-gray-500 text-sm">
                    No annual returns recorded yet.
                  </p>
                  <p class="text-gray-400 text-xs mt-1">
                    Click "Add Return" to get started.
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
                  {{ formMode === 'create' ? 'Add New' : 'Edit' }} Annual Return
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
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />

                    <!-- Date Input -->
                    <input
                      *ngIf="field.type === 'date'"
                      type="date"
                      [value]="getFormFieldValue(field)"
                      (input)="onFieldChange(field, $event)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />

                    <!-- Select Dropdown -->
                    <select
                      *ngIf="field.type === 'select'"
                      [value]="getFormFieldValue(field)"
                      (change)="onFieldChange(field, $event)"
                      [required]="isFieldRequired(field)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    ></textarea>
                  </div>
                </div>

                <!-- Form Actions -->
                <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    (click)="onFormCancel()"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {{ formMode === 'create' ? 'Create' : 'Update' }} Annual Return
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div> -->
  `,
})
export class AnnualReturnsComponent extends ComplianceBaseComponent {
  override complianceType: 'annual_returns' = 'annual_returns'; // Correct API type
  pageTitle = 'Annual Returns Management';
  pageDescription =
    'Track CIPC annual return filing status and due dates. Companies must file within 30 business days of their anniversary month.';

  columnConfig: ComplianceColumnConfig[] = [
    { key: 'period', label: 'Year Ending', type: 'text', required: true, placeholder: 'e.g., FY2024' },
    { key: 'date1', label: 'Anniversary Date', type: 'date', required: true },
    { key: 'date2', label: 'Due Date', type: 'date', required: true },
    { key: 'date3', label: 'Filing Date', type: 'date' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Pending', label: 'Pending', color: 'text-yellow-600' },
        { value: 'In Progress', label: 'In Progress', color: 'text-blue-600' },
        { value: 'Filed', label: 'Filed', color: 'text-green-600' },
        { value: 'Overdue', label: 'Overdue', color: 'text-red-600' },
        { value: 'Not Required', label: 'Not Required', color: 'text-gray-600' }
      ]
    },
    { key: 'amount1', label: 'Fee Paid', type: 'currency', step: 0.01, placeholder: '0.00' },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about this annual return...' },
  ];

  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {
      type: 'annual_returns',
      title: 'Annual Return',
      period: `FY${new Date().getFullYear()}`,
      date1: new Date().toISOString().split('T')[0], // Anniversary date
      date2: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due date
      status: 'Pending',
      notes: '',
    };
  }

  override getFirstEditableField(): string {
    return 'period';
  }
}
