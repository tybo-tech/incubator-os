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
  selector: 'app-tax-registrations',
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
          Add Registration
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
          <h3 class="text-lg font-medium text-gray-900">Tax Registrations</h3>
          <p class="text-sm text-gray-500 mt-1">Manage SARS registration status and filing deadlines</p>
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
                  <i class="fas fa-file-invoice-dollar text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No tax registrations for this company yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Registration" to get started.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Information Panel -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-blue-400"></i>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">SARS Tax Registration Requirements</h3>
            <div class="mt-2 text-sm text-blue-700">
              <ul class="list-disc list-inside space-y-1">
                <li><strong>Income Tax:</strong> All companies must register within 60 days of incorporation</li>
                <li><strong>VAT:</strong> Mandatory if turnover exceeds R1 million annually</li>
                <li><strong>Turnover Tax:</strong> For qualifying small businesses (turnover under R1 million)</li>
                <li><strong>PAYE:</strong> Required when employing staff or paying salaries</li>
              </ul>
            </div>
          </div>
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
export class TaxRegistrationsComponent extends ComplianceBaseComponent {
  override complianceType: 'tax_returns' = 'tax_returns';
  pageTitle = 'Tax Registrations';
  pageDescription =
    'Manage SARS tax registrations and filing obligations. Every business must register for relevant tax types.';

  columnConfig: ComplianceColumnConfig[] = [
    {
      key: 'sub_type',
      label: 'Registration Type',
      type: 'select',
      required: true,
      options: [
        { value: 'Income Tax', label: 'Income Tax', color: 'text-blue-600' },
        { value: 'VAT', label: 'VAT', color: 'text-purple-600' },
        { value: 'Turnover Tax', label: 'Turnover Tax', color: 'text-green-600' },
        { value: 'PAYE', label: 'PAYE', color: 'text-orange-600' }
      ]
    },
    { key: 'date_1', label: 'Registration Date', type: 'date', required: true },
    { key: 'date_2', label: 'Next Filing Due', type: 'date' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Active', label: 'Active', color: 'text-green-600' },
        { value: 'Dormant', label: 'Dormant', color: 'text-yellow-600' },
        { value: 'Expired', label: 'Expired', color: 'text-red-600' }
      ]
    },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about this registration...' },
  ];

  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {
      type: 'tax_returns',
      title: 'Tax Registration',
      sub_type: 'Income Tax',
      date_1: new Date().toISOString().split('T')[0],
      status: 'Active',
      notes: '',
    };
  }

  override getFirstEditableField(): string {
    return 'sub_type';
  }
}
