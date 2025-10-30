import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BbbeeRecord {
  id: number;
  companyId: number;
  measurementPeriod: string;          // e.g., FY2025 or Jan–Dec 2025
  totalEmployees: number;             // total staff count
  blackEmployees: number;             // number of black employees
  managementBlackCount?: number;      // optional: black employees in management
  ownershipBlackPercentage?: number;  // optional future field if equity is known
  skillsDevelopmentSpend: number;     // total ZAR spent on training black employees
  preferentialProcurementSpend: number; // ZAR spent with black-owned suppliers
  status: 'Not Measured' | 'In Progress' | 'Measured';
  bbbeeLevel?: string;                // e.g., Level 1–8
  certificateExpiryDate?: string;     // if applicable
  notes?: string;
}

@Component({
  selector: 'app-bbbee-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Add Button -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">B-BBEE Compliance Tracking</h2>
          <p class="mt-1 text-sm text-gray-500">
            Track Broad-Based Black Economic Empowerment compliance through employment metrics, skills development, and procurement spend.
          </p>
        </div>
        <button
          (click)="addNewRecord()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Period
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-chart-line text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Periods</p>
              <p class="text-lg font-semibold text-gray-900">{{ bbbeeRecords.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-users text-green-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Current Employment %</p>
              <p class="text-lg font-semibold text-green-600">{{ getCurrentEmploymentPercentage() }}%</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-certificate text-purple-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Current Level</p>
              <p class="text-lg font-semibold text-purple-600">{{ getCurrentBBBEELevel() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-clock text-amber-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Pending</p>
              <p class="text-lg font-semibold text-amber-600">{{ getPendingCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">B-BBEE Measurement Periods</h3>
          <p class="text-sm text-gray-500 mt-1">Track employment transformation and compliance over time</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employment</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Management</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills Dev (R)</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procurement (R)</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of bbbeeRecords; trackBy: trackById" class="hover:bg-gray-50">

                <!-- Measurement Period -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else periodDisplay"
                    [(ngModel)]="record.measurementPeriod"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #periodDisplay>
                    <div
                      (click)="startEditing(record.id, 'measurementPeriod')"
                      class="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.measurementPeriod }}
                    </div>
                  </ng-template>
                </td>

                <!-- Employment Metrics -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div *ngIf="editingId === record.id; else employmentDisplay" class="space-y-1">
                    <input
                      [(ngModel)]="record.blackEmployees"
                      type="number"
                      placeholder="Black employees"
                      (blur)="stopEditing()"
                      (keyup.enter)="stopEditing()"
                      class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs">
                    <input
                      [(ngModel)]="record.totalEmployees"
                      type="number"
                      placeholder="Total employees"
                      (blur)="stopEditing()"
                      (keyup.enter)="stopEditing()"
                      class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs">
                  </div>
                  <ng-template #employmentDisplay>
                    <div
                      (click)="startEditing(record.id, 'employment')"
                      class="cursor-pointer hover:bg-gray-100 p-1 rounded">
                      <div class="text-sm font-medium text-gray-900">
                        {{ record.blackEmployees }}/{{ record.totalEmployees }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ getEmploymentPercentage(record) }}% Black
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          class="h-1.5 rounded-full"
                          [class.bg-green-600]="getEmploymentPercentage(record) >= 50"
                          [class.bg-amber-600]="getEmploymentPercentage(record) >= 25 && getEmploymentPercentage(record) < 50"
                          [class.bg-red-600]="getEmploymentPercentage(record) < 25"
                          [style.width.%]="getEmploymentPercentage(record)">
                        </div>
                      </div>
                    </div>
                  </ng-template>
                </td>

                <!-- Management -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else managementDisplay"
                    [(ngModel)]="record.managementBlackCount"
                    type="number"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #managementDisplay>
                    <div
                      (click)="startEditing(record.id, 'managementBlackCount')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ record.managementBlackCount || 0 }}
                    </div>
                  </ng-template>
                </td>

                <!-- Skills Development -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else skillsDisplay"
                    [(ngModel)]="record.skillsDevelopmentSpend"
                    type="number"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #skillsDisplay>
                    <div
                      (click)="startEditing(record.id, 'skillsDevelopmentSpend')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ formatCurrency(record.skillsDevelopmentSpend) }}
                    </div>
                  </ng-template>
                </td>

                <!-- Procurement -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else procurementDisplay"
                    [(ngModel)]="record.preferentialProcurementSpend"
                    type="number"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #procurementDisplay>
                    <div
                      (click)="startEditing(record.id, 'preferentialProcurementSpend')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ formatCurrency(record.preferentialProcurementSpend) }}
                    </div>
                  </ng-template>
                </td>

                <!-- B-BBEE Level -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === record.id; else levelDisplay"
                    [(ngModel)]="record.bbbeeLevel"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #levelDisplay>
                    <span
                      (click)="startEditing(record.id, 'bbbeeLevel')"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-green-100]="isGoodLevel(record.bbbeeLevel)"
                      [class.text-green-800]="isGoodLevel(record.bbbeeLevel)"
                      [class.bg-amber-100]="isAverageLevel(record.bbbeeLevel)"
                      [class.text-amber-800]="isAverageLevel(record.bbbeeLevel)"
                      [class.bg-red-100]="isPoorLevel(record.bbbeeLevel)"
                      [class.text-red-800]="isPoorLevel(record.bbbeeLevel)"
                      [class.bg-gray-100]="!record.bbbeeLevel"
                      [class.text-gray-800]="!record.bbbeeLevel">
                      {{ record.bbbeeLevel || 'Not Set' }}
                    </span>
                  </ng-template>
                </td>

                <!-- Status -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    *ngIf="editingId === record.id; else statusDisplay"
                    [(ngModel)]="record.status"
                    (blur)="stopEditing()"
                    (change)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option value="Not Measured">Not Measured</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Measured">Measured</option>
                  </select>
                  <ng-template #statusDisplay>
                    <span
                      (click)="startEditing(record.id, 'status')"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-green-100]="record.status === 'Measured'"
                      [class.text-green-800]="record.status === 'Measured'"
                      [class.bg-amber-100]="record.status === 'In Progress'"
                      [class.text-amber-800]="record.status === 'In Progress'"
                      [class.bg-gray-100]="record.status === 'Not Measured'"
                      [class.text-gray-800]="record.status === 'Not Measured'">
                      {{ record.status }}
                    </span>
                  </ng-template>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    (click)="deleteRecord(record.id)"
                    class="text-red-600 hover:text-red-900 transition-colors">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <!-- Empty state -->
              <tr *ngIf="bbbeeRecords.length === 0">
                <td colspan="8" class="px-6 py-12 text-center">
                  <i class="fas fa-chart-line text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No B-BBEE measurement periods recorded for this company yet.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Period" to start tracking transformation progress.</p>
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
            <h3 class="text-sm font-medium text-blue-800">B-BBEE Compliance Guide</h3>
            <div class="mt-2 text-sm text-blue-700">
              <p class="mb-2">Track your company's Broad-Based Black Economic Empowerment compliance:</p>
              <ul class="list-disc list-inside space-y-1">
                <li><strong>Employment Equity:</strong> Focus on meaningful representation of black employees</li>
                <li><strong>Skills Development:</strong> Invest in training and development of black employees</li>
                <li><strong>Preferential Procurement:</strong> Support black-owned suppliers and service providers</li>
                <li><strong>Management Control:</strong> Ensure black representation in decision-making positions</li>
              </ul>
              <p class="mt-2 text-xs text-blue-600">
                <strong>Tip:</strong> Small businesses often start with Level 7-8 and improve over time through consistent employment and development practices.
              </p>
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
export class BbbeeComplianceComponent implements OnInit {
  bbbeeRecords: BbbeeRecord[] = [
    {
      id: 1,
      companyId: 59,
      measurementPeriod: 'FY 2024',
      totalEmployees: 8,
      blackEmployees: 3,
      managementBlackCount: 1,
      skillsDevelopmentSpend: 15000,
      preferentialProcurementSpend: 45000,
      status: 'Measured',
      bbbeeLevel: 'Level 6',
      notes: 'First formal measurement - room for improvement in procurement'
    },
    {
      id: 2,
      companyId: 59,
      measurementPeriod: 'FY 2025',
      totalEmployees: 12,
      blackEmployees: 6,
      managementBlackCount: 2,
      skillsDevelopmentSpend: 25000,
      preferentialProcurementSpend: 78000,
      status: 'In Progress',
      bbbeeLevel: 'Level 4',
      notes: 'Significant improvement in employment equity and skills development'
    },
    {
      id: 3,
      companyId: 59,
      measurementPeriod: 'Q1 2026',
      totalEmployees: 15,
      blackEmployees: 8,
      managementBlackCount: 3,
      skillsDevelopmentSpend: 0,
      preferentialProcurementSpend: 0,
      status: 'Not Measured',
      notes: 'Planning period - targeting Level 3'
    }
  ];

  editingId: number | null = null;
  nextId = 4;

  ngOnInit(): void {
    // Component initialization
  }

  trackById(index: number, item: BbbeeRecord): number {
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
  }

  addNewRecord(): void {
    const currentYear = new Date().getFullYear();
    const newId = this.nextId;
    this.nextId++;

    const newRecord: BbbeeRecord = {
      id: newId,
      companyId: 59, // This would come from route params in real implementation
      measurementPeriod: `FY ${currentYear}`,
      totalEmployees: 1,
      blackEmployees: 0,
      skillsDevelopmentSpend: 0,
      preferentialProcurementSpend: 0,
      status: 'Not Measured',
      notes: ''
    };

    this.bbbeeRecords.unshift(newRecord);
    this.startEditing(newRecord.id, 'measurementPeriod');
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this B-BBEE record?')) {
      this.bbbeeRecords = this.bbbeeRecords.filter(record => record.id !== id);
    }
  }

  getEmploymentPercentage(record: BbbeeRecord): number {
    if (record.totalEmployees === 0) return 0;
    return Math.round((record.blackEmployees / record.totalEmployees) * 100);
  }

  getCurrentEmploymentPercentage(): number {
    if (this.bbbeeRecords.length === 0) return 0;
    const latest = this.bbbeeRecords[0];
    return this.getEmploymentPercentage(latest);
  }

  getCurrentBBBEELevel(): string {
    if (this.bbbeeRecords.length === 0) return 'Not Set';
    return this.bbbeeRecords[0].bbbeeLevel || 'Not Set';
  }

  getPendingCount(): number {
    return this.bbbeeRecords.filter(record => record.status !== 'Measured').length;
  }

  isGoodLevel(level?: string): boolean {
    if (!level) return false;
    const levelNum = parseInt(level.replace(/\D/g, ''));
    return levelNum >= 1 && levelNum <= 3;
  }

  isAverageLevel(level?: string): boolean {
    if (!level) return false;
    const levelNum = parseInt(level.replace(/\D/g, ''));
    return levelNum >= 4 && levelNum <= 6;
  }

  isPoorLevel(level?: string): boolean {
    if (!level) return false;
    const levelNum = parseInt(level.replace(/\D/g, ''));
    return levelNum >= 7 && levelNum <= 8;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
