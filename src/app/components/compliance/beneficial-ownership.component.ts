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
  selector: 'app-beneficial-ownership',
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
          Add Declaration
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
          <h3 class="text-lg font-medium text-gray-900">Beneficial Ownership Register</h3>
          <p class="text-sm text-gray-500 mt-1">Track compliance with CIPC Beneficial Ownership requirements</p>
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
                  <i class="fas fa-users text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No beneficial ownership records for this company yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Declaration" to get started.</p>
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
            <h3 class="text-sm font-medium text-blue-800">Beneficial Ownership Requirements</h3>
            <div class="mt-2 text-sm text-blue-700">
              <p class="mb-2">As of 1 July 2024, all companies must maintain a beneficial ownership register and file declarations with CIPC:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Must be filed alongside annual returns</li>
                <li>Discloses individuals who own or control 25% or more of shares or voting rights</li>
                <li>Must be updated within 30 days of any changes</li>
                <li>Failure to comply may result in penalties or deregistration</li>
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
export class BeneficialOwnershipComponent extends ComplianceBaseComponent {
  override complianceType: 'beneficial_ownership' = 'beneficial_ownership';
  pageTitle = 'Beneficial Ownership Declarations';
  pageDescription =
    'As of 1 July 2024, companies must file Beneficial Ownership details alongside annual returns to CIPC.';

  columnConfig: ComplianceColumnConfig[] = [
    {
      key: 'sub_type',
      label: 'Declaration Type',
      type: 'select',
      required: true,
      options: [
        { value: 'Initial Register', label: 'Initial Register', color: 'text-blue-600' },
        { value: 'Annual Update', label: 'Annual Update', color: 'text-green-600' },
        { value: 'Change Notification', label: 'Change Notification', color: 'text-amber-600' }
      ]
    },
    { key: 'date_1', label: 'Due Date', type: 'date', required: true },
    { key: 'date_2', label: 'Submitted Date', type: 'date' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Not Submitted', label: 'Not Submitted', color: 'text-gray-600' },
        { value: 'Submitted', label: 'Submitted', color: 'text-green-600' },
        { value: 'Overdue', label: 'Overdue', color: 'text-red-600' }
      ]
    },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Additional notes about this declaration...' },
  ];

  override getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {
      type: 'beneficial_ownership',
      title: 'Beneficial Ownership Declaration',
      sub_type: 'Initial Register',
      date_1: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'Not Submitted',
      notes: '',
    };
  }

  override getFirstEditableField(): string {
    return 'sub_type';
  }
}
