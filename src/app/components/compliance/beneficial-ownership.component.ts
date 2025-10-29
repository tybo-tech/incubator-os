import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BeneficialOwnershipRecord {
  id: number;
  entityName: string;
  registerSubmittedDate?: string;
  dueDate: string;
  status: 'Not Submitted' | 'Submitted' | 'Overdue';
  notes?: string;
}

@Component({
  selector: 'app-beneficial-ownership',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Add Button -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Beneficial Ownership Declarations</h2>
          <p class="mt-1 text-sm text-gray-500">
            As of 1 July 2024, companies must file Beneficial Ownership details alongside annual returns to CIPC.
          </p>
        </div>
        <button
          (click)="addNewRecord()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Declaration
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-users text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Entities</p>
              <p class="text-lg font-semibold text-gray-900">{{ beneficialOwnershipRecords.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Overdue</p>
              <p class="text-lg font-semibold text-red-600">{{ getOverdueCount() }}</p>
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
              <i class="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Submitted</p>
              <p class="text-lg font-semibold text-green-600">{{ getSubmittedCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Beneficial Ownership Register</h3>
          <p class="text-sm text-gray-500 mt-1">Track compliance with CIPC Beneficial Ownership requirements</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of beneficialOwnershipRecords; trackBy: trackById" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else entityNameDisplay"
                    [(ngModel)]="record.entityName"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #entityNameDisplay>
                    <div
                      (click)="startEditing(record.id, 'entityName')"
                      class="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.entityName }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else dueDateDisplay"
                    [(ngModel)]="record.dueDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #dueDateDisplay>
                    <div
                      (click)="startEditing(record.id, 'dueDate')"
                      class="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                      [class.text-red-600]="isOverdue(record)"
                      [class.text-amber-600]="isDueSoon(record) && !isOverdue(record)"
                      [class.text-gray-900]="!isOverdue(record) && !isDueSoon(record)">
                      {{ record.dueDate | date:'mediumDate' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else submittedDateDisplay"
                    [(ngModel)]="record.registerSubmittedDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #submittedDateDisplay>
                    <div
                      (click)="startEditing(record.id, 'registerSubmittedDate')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.registerSubmittedDate ? (record.registerSubmittedDate | date:'mediumDate') : '-' }}
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
                    <option value="Not Submitted">Not Submitted</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                  <ng-template #statusDisplay>
                    <span
                      (click)="startEditing(record.id, 'status')"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-green-100]="record.status === 'Submitted'"
                      [class.text-green-800]="record.status === 'Submitted'"
                      [class.bg-gray-100]="record.status === 'Not Submitted'"
                      [class.text-gray-800]="record.status === 'Not Submitted'"
                      [class.bg-red-100]="record.status === 'Overdue'"
                      [class.text-red-800]="record.status === 'Overdue'">
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
              <tr *ngIf="beneficialOwnershipRecords.length === 0">
                <td colspan="6" class="px-6 py-12 text-center">
                  <i class="fas fa-users text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No beneficial ownership records yet.</p>
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class BeneficialOwnershipComponent implements OnInit {
  beneficialOwnershipRecords: BeneficialOwnershipRecord[] = [
    {
      id: 1,
      entityName: 'TechStart Solutions (Pty) Ltd',
      dueDate: '2024-04-30',
      registerSubmittedDate: '2024-04-25',
      status: 'Submitted',
      notes: 'Submitted with annual return - all beneficial owners disclosed'
    },
    {
      id: 2,
      entityName: 'Innovation Hub CC',
      dueDate: '2024-08-15',
      status: 'Not Submitted',
      notes: 'Awaiting member information for beneficial ownership register'
    },
    {
      id: 3,
      entityName: 'Green Energy Ventures (Pty) Ltd',
      dueDate: '2024-01-15',
      status: 'Overdue',
      notes: 'URGENT: Beneficial ownership register overdue - risk of penalties'
    },
    {
      id: 4,
      entityName: 'Digital Marketing Agency (Pty) Ltd',
      dueDate: '2024-06-20',
      registerSubmittedDate: '2024-06-18',
      status: 'Submitted',
      notes: 'Initial beneficial ownership register filed'
    },
    {
      id: 5,
      entityName: 'Consulting Excellence CC',
      dueDate: '2024-10-15',
      status: 'Not Submitted',
      notes: 'First beneficial ownership register due with annual return'
    }
  ];

  editingId: number | null = null;
  nextId = 6;

  ngOnInit(): void {
    // Auto-update status based on due dates
    this.updateStatuses();
  }

  trackById(index: number, item: BeneficialOwnershipRecord): number {
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
    const newRecord: BeneficialOwnershipRecord = {
      id: this.nextId++,
      entityName: 'New Entity',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'Not Submitted',
      notes: ''
    };

    this.beneficialOwnershipRecords.unshift(newRecord);
    this.startEditing(newRecord.id, 'entityName');
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this beneficial ownership record?')) {
      this.beneficialOwnershipRecords = this.beneficialOwnershipRecords.filter(record => record.id !== id);
    }
  }

  updateStatuses(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.beneficialOwnershipRecords.forEach(record => {
      const dueDate = new Date(record.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (record.status !== 'Submitted') {
        if (dueDate < today) {
          record.status = 'Overdue';
        } else {
          record.status = 'Not Submitted';
        }
      }
    });
  }

  isOverdue(record: BeneficialOwnershipRecord): boolean {
    if (record.status === 'Submitted') return false;
    const today = new Date();
    const dueDate = new Date(record.dueDate);
    return dueDate < today;
  }

  isDueSoon(record: BeneficialOwnershipRecord): boolean {
    if (record.status === 'Submitted') return false;
    const today = new Date();
    const dueDate = new Date(record.dueDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return dueDate <= thirtyDaysFromNow && dueDate >= today;
  }

  getOverdueCount(): number {
    return this.beneficialOwnershipRecords.filter(record => this.isOverdue(record)).length;
  }

  getDueSoonCount(): number {
    return this.beneficialOwnershipRecords.filter(record => this.isDueSoon(record)).length;
  }

  getSubmittedCount(): number {
    return this.beneficialOwnershipRecords.filter(record => record.status === 'Submitted').length;
  }
}
