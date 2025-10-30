import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AnnualReturnRecord {
  id: number;
  yearEnding: string;  // Financial year ending date
  anniversaryDate: string;  // Incorporation date
  dueDate: string;
  filingDate?: string;
  status: 'Pending' | 'Filed' | 'Overdue';
  feePaid?: number;
  notes?: string;
}

@Component({
  selector: 'app-annual-returns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Add Button -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Annual Returns Management</h2>
          <p class="mt-1 text-sm text-gray-500">
            Track CIPC annual return filing status and due dates. Companies must file within 30 business days of their anniversary month.
          </p>
        </div>
        <button
          (click)="addNewRecord()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Return
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-calendar-check text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Returns</p>
              <p class="text-lg font-semibold text-gray-900">{{ annualReturns.length }}</p>
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
              <p class="text-sm font-medium text-gray-500">Filed</p>
              <p class="text-lg font-semibold text-green-600">{{ getFiledCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Annual Returns</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Ending</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anniversary Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filing Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Paid</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of annualReturns; trackBy: trackById" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else yearEndingDisplay"
                    [(ngModel)]="record.yearEnding"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    #yearInput>
                  <ng-template #yearEndingDisplay>
                    <div
                      (click)="startEditing(record.id, 'yearEnding')"
                      class="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.yearEnding | date:'mediumDate' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else anniversaryDisplay"
                    [(ngModel)]="record.anniversaryDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #anniversaryDisplay>
                    <div
                      (click)="startEditing(record.id, 'anniversaryDate')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.anniversaryDate | date:'mediumDate' }}
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
                    *ngIf="editingId === record.id; else filingDateDisplay"
                    [(ngModel)]="record.filingDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #filingDateDisplay>
                    <div
                      (click)="startEditing(record.id, 'filingDate')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.filingDate ? (record.filingDate | date:'mediumDate') : '-' }}
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
                    <option value="Pending">Pending</option>
                    <option value="Filed">Filed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                  <ng-template #statusDisplay>
                    <span
                      (click)="startEditing(record.id, 'status')"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-green-100]="record.status === 'Filed'"
                      [class.text-green-800]="record.status === 'Filed'"
                      [class.bg-yellow-100]="record.status === 'Pending'"
                      [class.text-yellow-800]="record.status === 'Pending'"
                      [class.bg-red-100]="record.status === 'Overdue'"
                      [class.text-red-800]="record.status === 'Overdue'">
                      {{ record.status }}
                    </span>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else feeDisplay"
                    [(ngModel)]="record.feePaid"
                    type="number"
                    min="0"
                    step="0.01"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #feeDisplay>
                    <div
                      (click)="startEditing(record.id, 'feePaid')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.feePaid ? ('R' + record.feePaid.toFixed(2)) : '-' }}
                    </div>
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
              <tr *ngIf="annualReturns.length === 0">
                <td colspan="8" class="px-6 py-12 text-center">
                  <i class="fas fa-calendar-check text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No annual returns recorded yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Return" to get started.</p>
                </td>
              </tr>
            </tbody>
          </table>
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
export class AnnualReturnsComponent implements OnInit {
  annualReturns: AnnualReturnRecord[] = [
    {
      id: 1,
      yearEnding: '2024-02-29',
      anniversaryDate: '2020-03-15',
      dueDate: '2024-04-30',
      filingDate: '2024-04-25',
      status: 'Filed',
      feePaid: 175.00,
      notes: 'Filed on time with audited financial statements'
    },
    {
      id: 2,
      yearEnding: '2024-06-30',
      anniversaryDate: '2021-07-08',
      dueDate: '2024-08-15',
      status: 'Pending',
      notes: 'Awaiting financial statements from accountant'
    },
    {
      id: 3,
      yearEnding: '2023-12-31',
      anniversaryDate: '2019-11-22',
      dueDate: '2024-01-15',
      status: 'Overdue',
      notes: 'URGENT: Company at risk of deregistration'
    },
    {
      id: 4,
      yearEnding: '2024-05-31',
      anniversaryDate: '2022-05-10',
      dueDate: '2024-06-20',
      filingDate: '2024-06-18',
      status: 'Filed',
      feePaid: 175.00,
      notes: 'Filed with exempt status'
    },
    {
      id: 5,
      yearEnding: '2024-09-30',
      anniversaryDate: '2023-09-03',
      dueDate: '2024-10-15',
      status: 'Pending',
      notes: 'First annual return - due soon'
    }
  ];

  editingId: number | null = null;
  nextId = 6;

  ngOnInit(): void {
    // Auto-update status based on due dates
    this.updateStatuses();
  }

  trackById(index: number, item: AnnualReturnRecord): number {
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

    const newRecord: AnnualReturnRecord = {
      id: newId,
      yearEnding: new Date().toISOString().split('T')[0],
      anniversaryDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'Pending',
      notes: ''
    };

    this.annualReturns.unshift(newRecord);
    this.startEditing(newRecord.id, 'yearEnding');
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this annual return record?')) {
      this.annualReturns = this.annualReturns.filter(record => record.id !== id);
    }
  }

  updateStatuses(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.annualReturns.forEach(record => {
      const dueDate = new Date(record.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (record.status !== 'Filed') {
        if (dueDate < today) {
          record.status = 'Overdue';
        } else {
          record.status = 'Pending';
        }
      }
    });
  }

  isOverdue(record: AnnualReturnRecord): boolean {
    if (record.status === 'Filed') return false;
    const today = new Date();
    const dueDate = new Date(record.dueDate);
    return dueDate < today;
  }

  isDueSoon(record: AnnualReturnRecord): boolean {
    if (record.status === 'Filed') return false;
    const today = new Date();
    const dueDate = new Date(record.dueDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return dueDate <= thirtyDaysFromNow && dueDate >= today;
  }

  getOverdueCount(): number {
    return this.annualReturns.filter(record => this.isOverdue(record)).length;
  }

  getDueSoonCount(): number {
    return this.annualReturns.filter(record => this.isDueSoon(record)).length;
  }

  getFiledCount(): number {
    return this.annualReturns.filter(record => record.status === 'Filed').length;
  }
}
