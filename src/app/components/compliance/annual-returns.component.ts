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
          class="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <i class="fas fa-plus mr-2"></i>
          Add Return
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          *ngFor="let card of getSummaryCards()"
          class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200 flex items-center"
        >
          <div class="flex-shrink-0">
            <i [class]="card.icon + ' ' + card.color + ' text-2xl'"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">{{ card.title }}</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ card.value }}</p>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div
        class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900">Annual Returns</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  *ngFor="let col of columnConfig"
                  class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {{ col.label }}
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                *ngFor="let record of records$ | async; trackBy: trackById"
                class="hover:bg-gray-50 transition-colors"
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
                    class="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all mr-2"
                    title="Edit record"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    (click)="deleteRecord(record.id)"
                    class="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete record"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>

              <tr *ngIf="(records$ | async)?.length === 0">
                <td
                  [attr.colspan]="columnConfig.length + 1"
                  class="px-6 py-16 text-center"
                >
                  <div class="flex flex-col items-center justify-center">
                    <div class="bg-gray-100 rounded-full p-6 mb-4">
                      <i class="fas fa-calendar-check text-gray-400 text-4xl"></i>
                    </div>
                    <p class="text-gray-600 text-base font-medium mb-1">
                      No annual returns recorded yet
                    </p>
                    <p class="text-gray-500 text-sm">
                      Click "Add Return" to create your first record
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Compliance Form Modal -->
      <div
        *ngIf="showForm"
        class="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
        (click)="onFormCancel()"
      >
        <!-- Modal panel -->
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
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
export class AnnualReturnsComponent extends ComplianceBaseComponent {
  override complianceType: 'annual_returns' = 'annual_returns';
  pageTitle = 'Annual Returns Management';
  pageDescription =
    'Track CIPC annual return filing status and due dates. Companies must file within 30 business days of their anniversary month.';

  override getFormTitle(): string {
    return 'Annual Return';
  }

  // ✅ Column config using snake_case to match database fields
  columnConfig: ComplianceColumnConfig[] = [
    { key: 'period', label: 'Year Ending', type: 'text', required: true, placeholder: 'e.g., FY2024' },
    { key: 'date_1', label: 'Anniversary Date', type: 'date', required: true },
    { key: 'date_2', label: 'Due Date', type: 'date', required: true },
    { key: 'date_3', label: 'Filing Date', type: 'date' },
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
    { key: 'amount_1', label: 'Fee Paid', type: 'currency', step: 0.01, placeholder: '0.00' },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about this annual return...' },
  ];

  // ✅ Using snake_case field names
  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {
      type: 'annual_returns',
      title: 'Annual Return',
      period: `FY${new Date().getFullYear()}`,
      date_1: new Date().toISOString().split('T')[0], // Anniversary date
      date_2: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due date (30 days from now)
      status: 'Pending'
      // Don't include empty strings for optional fields - they should be null/undefined
    };
  }

  override getFirstEditableField(): string {
    return 'period';
  }
}
