import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TaxRegistrationRecord {
  id: number;
  registrationType: 'Income Tax' | 'VAT' | 'Turnover Tax' | 'PAYE';
  registrationDate: string;
  nextFilingDueDate?: string;
  status: 'Active' | 'Dormant' | 'Expired';
  notes?: string;
}

@Component({
  selector: 'app-tax-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Add Button -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Tax Registrations</h2>
          <p class="mt-1 text-sm text-gray-500">
            Manage SARS tax registrations and filing obligations. Every business must register for relevant tax types.
          </p>
        </div>
        <button
          (click)="addNewRecord()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Registration
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            *ngFor="let filter of registrationFilters"
            (click)="selectedFilter = filter.value"
            [class]="'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ' +
                    (selectedFilter === filter.value ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
            {{ filter.label }}
            <span class="ml-2 px-2 py-1 text-xs rounded-full"
                  [class]="selectedFilter === filter.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'">
              {{ getFilterCount(filter.value) }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-file-invoice-dollar text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Registrations</p>
              <p class="text-lg font-semibold text-gray-900">{{ filteredRegistrations.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Active</p>
              <p class="text-lg font-semibold text-green-600">{{ getActiveCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-clock text-amber-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Due Soon (30 days)</p>
              <p class="text-lg font-semibold text-amber-600">{{ getDueSoonCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Expired</p>
              <p class="text-lg font-semibold text-red-600">{{ getExpiredCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Tax Registrations</h3>
          <p class="text-sm text-gray-500 mt-1">Manage SARS registration status and filing deadlines</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Filing Due</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of filteredRegistrations; trackBy: trackById" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    *ngIf="editingId === record.id; else registrationTypeDisplay"
                    [(ngModel)]="record.registrationType"
                    (blur)="stopEditing()"
                    (change)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option value="Income Tax">Income Tax</option>
                    <option value="VAT">VAT</option>
                    <option value="Turnover Tax">Turnover Tax</option>
                    <option value="PAYE">PAYE</option>
                  </select>
                  <ng-template #registrationTypeDisplay>
                    <span
                      (click)="startEditing(record.id, 'registrationType')"
                      class="inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-blue-100]="record.registrationType === 'Income Tax'"
                      [class.text-blue-800]="record.registrationType === 'Income Tax'"
                      [class.bg-purple-100]="record.registrationType === 'VAT'"
                      [class.text-purple-800]="record.registrationType === 'VAT'"
                      [class.bg-green-100]="record.registrationType === 'Turnover Tax'"
                      [class.text-green-800]="record.registrationType === 'Turnover Tax'"
                      [class.bg-orange-100]="record.registrationType === 'PAYE'"
                      [class.text-orange-800]="record.registrationType === 'PAYE'">
                      {{ record.registrationType }}
                    </span>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else registrationDateDisplay"
                    [(ngModel)]="record.registrationDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #registrationDateDisplay>
                    <div
                      (click)="startEditing(record.id, 'registrationDate')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.registrationDate | date:'mediumDate' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else filingDueDisplay"
                    [(ngModel)]="record.nextFilingDueDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #filingDueDisplay>
                    <div
                      (click)="startEditing(record.id, 'nextFilingDueDate')"
                      class="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                      [class.text-red-600]="isFilingOverdue(record)"
                      [class.text-amber-600]="isFilingDueSoon(record) && !isFilingOverdue(record)"
                      [class.text-gray-900]="!isFilingOverdue(record) && !isFilingDueSoon(record)">
                      {{ record.nextFilingDueDate ? (record.nextFilingDueDate | date:'mediumDate') : '-' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    *ngIf="editingId === record.id; else statusDisplay"
                    [(ngModel)]="record.status"
                    (blur)="stopEditing()"
                    (change)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option value="Active">Active</option>
                    <option value="Dormant">Dormant</option>
                    <option value="Expired">Expired</option>
                  </select>
                  <ng-template #statusDisplay>
                    <span
                      (click)="startEditing(record.id, 'status')"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-green-100]="record.status === 'Active'"
                      [class.text-green-800]="record.status === 'Active'"
                      [class.bg-yellow-100]="record.status === 'Dormant'"
                      [class.text-yellow-800]="record.status === 'Dormant'"
                      [class.bg-red-100]="record.status === 'Expired'"
                      [class.text-red-800]="record.status === 'Expired'">
                      {{ record.status }}
                    </span>
                  </ng-template>
                </td>

                <td class="px-6 py-4">
                  <input
                    *ngIf="editingId === record.id; else notesDisplay"
                    [(ngModel)]="record.notes"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #notesDisplay>
                    <div
                      (click)="startEditing(record.id, 'notes')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded max-w-xs truncate">
                      {{ record.notes || 'Add notes...' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    (click)="deleteRecord(record.id)"
                    class="text-red-600 hover:text-red-900 transition-colors">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <!-- Empty state -->
              <tr *ngIf="filteredRegistrations.length === 0">
                <td colspan="6" class="px-6 py-12 text-center">
                  <i class="fas fa-file-invoice-dollar text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No tax registrations for this filter.</p>
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class TaxRegistrationsComponent implements OnInit {
  taxRegistrations: TaxRegistrationRecord[] = [
    {
      id: 1,
      registrationType: 'Income Tax',
      registrationDate: '2020-04-15',
      nextFilingDueDate: '2024-12-31',
      status: 'Active',
      notes: 'Company tax return due annually'
    },
    {
      id: 2,
      registrationType: 'VAT',
      registrationDate: '2021-02-10',
      nextFilingDueDate: '2024-11-25',
      status: 'Active',
      notes: 'Monthly VAT returns - exceeds R1M threshold'
    },
    {
      id: 3,
      registrationType: 'PAYE',
      registrationDate: '2021-06-01',
      nextFilingDueDate: '2024-11-07',
      status: 'Active',
      notes: 'Monthly PAYE and UIF submissions'
    },
    {
      id: 4,
      registrationType: 'Income Tax',
      registrationDate: '2021-08-08',
      nextFilingDueDate: '2024-12-31',
      status: 'Active',
      notes: 'Close corporation tax return'
    },
    {
      id: 5,
      registrationType: 'Turnover Tax',
      registrationDate: '2021-08-08',
      nextFilingDueDate: '2024-11-30',
      status: 'Active',
      notes: 'Bi-annual turnover tax return'
    },
    {
      id: 6,
      registrationType: 'Income Tax',
      registrationDate: '2019-12-22',
      status: 'Dormant',
      notes: 'Company dormant - no filing obligations'
    },
    {
      id: 7,
      registrationType: 'Income Tax',
      registrationDate: '2022-06-10',
      nextFilingDueDate: '2024-12-31',
      status: 'Active',
      notes: 'First year of operation'
    },
    {
      id: 8,
      registrationType: 'PAYE',
      registrationDate: '2023-01-15',
      nextFilingDueDate: '2024-11-07',
      status: 'Active',
      notes: 'Registered when first employee hired'
    }
  ];

  selectedFilter = 'All';
  editingId: number | null = null;
  nextId = 9;

  registrationFilters = [
    { label: 'All', value: 'All' },
    { label: 'Income Tax', value: 'Income Tax' },
    { label: 'VAT', value: 'VAT' },
    { label: 'Turnover Tax', value: 'Turnover Tax' },
    { label: 'PAYE', value: 'PAYE' }
  ];

  ngOnInit(): void {
    // Auto-update status based on due dates
    this.updateStatuses();
  }

  get filteredRegistrations(): TaxRegistrationRecord[] {
    if (this.selectedFilter === 'All') {
      return this.taxRegistrations;
    }
    return this.taxRegistrations.filter(reg => reg.registrationType === this.selectedFilter);
  }

  getFilterCount(filterValue: string): number {
    if (filterValue === 'All') {
      return this.taxRegistrations.length;
    }
    return this.taxRegistrations.filter(reg => reg.registrationType === filterValue).length;
  }

  trackById(index: number, item: TaxRegistrationRecord): number {
    return item.id;
  }

  startEditing(id: number, field: string): void {
    this.editingId = id;
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('input:focus, select:focus') as HTMLInputElement;
      if (input) {
        input.select();
      }
    });
  }

  stopEditing(): void {
    this.editingId = null;
    this.updateStatuses();
  }

  addNewRecord(): void {
    const newId = this.nextId;
    this.nextId++;

    const newRecord: TaxRegistrationRecord = {
      id: newId,
      registrationType: 'Income Tax',
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      notes: ''
    };

    this.taxRegistrations.unshift(newRecord);
    this.startEditing(newRecord.id, 'registrationType');
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this tax registration record?')) {
      this.taxRegistrations = this.taxRegistrations.filter(record => record.id !== id);
    }
  }

  updateStatuses(): void {
    // This would update statuses based on business logic
    // For now, we keep manual status management
  }

  isFilingOverdue(record: TaxRegistrationRecord): boolean {
    if (!record.nextFilingDueDate || record.status !== 'Active') return false;
    const today = new Date();
    const dueDate = new Date(record.nextFilingDueDate);
    return dueDate < today;
  }

  isFilingDueSoon(record: TaxRegistrationRecord): boolean {
    if (!record.nextFilingDueDate || record.status !== 'Active') return false;
    const today = new Date();
    const dueDate = new Date(record.nextFilingDueDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return dueDate <= thirtyDaysFromNow && dueDate >= today;
  }

  getActiveCount(): number {
    return this.filteredRegistrations.filter(record => record.status === 'Active').length;
  }

  getDueSoonCount(): number {
    return this.filteredRegistrations.filter(record => this.isFilingDueSoon(record)).length;
  }

  getExpiredCount(): number {
    return this.filteredRegistrations.filter(record => record.status === 'Expired').length;
  }
}
