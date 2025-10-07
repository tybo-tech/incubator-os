import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyRevenueSummaryService } from '../../../../../services/company-revenue-summary.service';
import { CompanyRevenueSummary } from '../../../../../models/financial.models';
import { YearModalComponent } from '../../../shared/year-modal/year-modal.component';

interface RevenueDisplayRow {
  id?: number;
  year: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  total: number | null;
  export_q1: number | null;
  export_q2: number | null;
  export_q3: number | null;
  export_q4: number | null;
  export_total: number | null;
  ratio: number | null;
  isEditing?: boolean;
  isNew?: boolean;
}

@Component({
  selector: 'app-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, YearModalComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <i class="fas fa-chart-line text-green-600 text-2xl mr-3"></i>
          <h2 class="text-xl font-bold text-gray-900">Revenue</h2>
        </div>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
          <i class="fas fa-plus mr-2"></i>
          Year
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <!-- Revenue Tables -->
      <div *ngIf="!loading" class="space-y-8">

        <!-- Revenue Section -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q1
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q2
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q3
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q4
                </th>
                <th class="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th class="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let row of revenueRows; let i = index"
                  [class.bg-blue-50]="row.isEditing"
                  [class.bg-green-50]="row.isNew">
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <input
                      *ngIf="row.isEditing || row.isNew"
                      type="number"
                      [(ngModel)]="row.year"
                      [min]="2000"
                      [max]="2030"
                      class="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span *ngIf="!(row.isEditing || row.isNew)" class="text-sm font-medium text-gray-900">{{ row.year }}</span>
                    <span *ngIf="row.isEditing" class="ml-2 text-xs text-blue-600">
                      <i class="fas fa-edit"></i>
                    </span>
                  </div>
                </td>

                <!-- Q1 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.q1"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.q1) }}
                  </span>
                </td>

                <!-- Q2 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.q2"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.q2) }}
                  </span>
                </td>

                <!-- Q3 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.q3"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.q3) }}
                  </span>
                </td>

                <!-- Q4 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.q4"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.q4) }}
                  </span>
                </td>

                <!-- Total -->
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold text-gray-900">
                      {{ formatCurrency(row.total) }}
                    </span>
                    <span class="text-xs text-gray-500 block">USD</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="w-20 px-4 py-4 whitespace-nowrap text-center">
                  <div class="flex justify-center space-x-2">
                    <ng-container *ngIf="row.isEditing || row.isNew">
                      <button
                        (click)="saveRow(row)"
                        class="text-green-600 hover:text-green-900"
                        title="Save">
                        <i class="fas fa-check"></i>
                      </button>
                      <button
                        (click)="cancelEdit(row, i)"
                        class="text-gray-600 hover:text-gray-900"
                        title="Cancel">
                        <i class="fas fa-times"></i>
                      </button>
                    </ng-container>
                    <ng-container *ngIf="!(row.isEditing || row.isNew)">
                      <button
                        (click)="editRow(row)"
                        class="text-blue-600 hover:text-blue-900"
                        title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button
                        (click)="deleteRow(row, i)"
                        class="text-red-600 hover:text-red-900"
                        title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </ng-container>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Export Revenue Section -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Export revenue
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q1
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q2
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q3
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q4
                </th>
                <th class="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th class="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ratio
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let row of revenueRows; let i = index"
                  [class.bg-blue-50]="row.isEditing"
                  [class.bg-green-50]="row.isNew">
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">{{ row.year }}</span>
                  </div>
                </td>

                <!-- Export Q1 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.export_q1"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q1) }}
                  </span>
                </td>

                <!-- Export Q2 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.export_q2"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q2) }}
                  </span>
                </td>

                <!-- Export Q3 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.export_q3"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q3) }}
                  </span>
                </td>

                <!-- Export Q4 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <input
                    *ngIf="row.isEditing || row.isNew"
                    type="number"
                    [(ngModel)]="row.export_q4"
                    (input)="calculateRowTotals(row)"
                    class="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span *ngIf="!(row.isEditing || row.isNew)" class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q4) }}
                  </span>
                </td>

                <!-- Export Total -->
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold text-gray-900">
                      {{ formatCurrency(row.export_total) }}
                    </span>
                    <span class="text-xs text-gray-500 block">USD</span>
                  </div>
                </td>

                <!-- Ratio -->
                <td class="w-20 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold text-blue-600">
                      {{ formatPercentage(row.ratio) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && revenueRows.length === 0" class="text-center py-12">
        <i class="fas fa-chart-line text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Revenue Data</h3>
        <p class="text-gray-600 mb-4">Start by adding your first year of revenue data.</p>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
          <i class="fas fa-plus mr-2"></i>
          Add Year
        </button>
      </div>

      <!-- Year Modal -->
      <app-year-modal
        #yearModal
        [existingYears]="existingYears"
        (yearSelected)="onYearSelected($event)"
        (modalClosed)="onModalClosed()">
      </app-year-modal>

    </div>
  `
})
export class RevenueComponent implements OnInit {
  @ViewChild('yearModal') yearModal!: YearModalComponent;

  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  revenueRows: RevenueDisplayRow[] = [];
  loading = false;
  originalRowData: RevenueDisplayRow | null = null;

  constructor(
    private revenueService: CompanyRevenueSummaryService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get companyId from route params (two levels up: /company/:id/financial/revenue)
    const companyId = this.route.parent?.parent?.snapshot.params['id'];

    // Get query parameters
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);

      // Extract required query parameters
      this.clientId = queryParams?.['clientId'] ? parseInt(queryParams['clientId'], 10) : 0;
      this.programId = queryParams?.['programId'] ? parseInt(queryParams['programId'], 10) : 0;
      this.cohortId = queryParams?.['cohortId'] ? parseInt(queryParams['cohortId'], 10) : 0;

      console.log('Revenue Component - IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });

      this.loadRevenueData();
    }
  }  get existingYears(): number[] {
    return this.revenueRows.map(row => row.year);
  }

  async loadRevenueData() {
    this.loading = true;
    try {
      const data = await this.revenueService.listAllCompanyRevenueSummary(this.companyId).toPromise();
      this.revenueRows = (data || []).map(item => this.mapToDisplayRow(item));
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      this.loading = false;
    }
  }

  mapToDisplayRow(item: CompanyRevenueSummary): RevenueDisplayRow {
    const revenue_total = (item.q1 || 0) + (item.q2 || 0) + (item.q3 || 0) + (item.q4 || 0);
    const export_total = (item.export_q1 || 0) + (item.export_q2 || 0) + (item.export_q3 || 0) + (item.export_q4 || 0);
    const ratio = revenue_total > 0 ? (export_total / revenue_total) * 100 : 0;

    return {
      id: item.id,
      year: item.year_,
      q1: item.q1 ?? null,
      q2: item.q2 ?? null,
      q3: item.q3 ?? null,
      q4: item.q4 ?? null,
      total: revenue_total,
      export_q1: item.export_q1 ?? null,
      export_q2: item.export_q2 ?? null,
      export_q3: item.export_q3 ?? null,
      export_q4: item.export_q4 ?? null,
      export_total: export_total,
      ratio: ratio
    };
  }

  openYearModal() {
    this.yearModal.open();
  }

  onYearSelected(year: number) {
    this.addYearWithValue(year);
  }

  onModalClosed() {
    // Handle modal close if needed
  }

  addYearWithValue(year: number) {
    const newRow: RevenueDisplayRow = {
      year: year,
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      total: 0,
      export_q1: null,
      export_q2: null,
      export_q3: null,
      export_q4: null,
      export_total: 0,
      ratio: 0,
      isNew: true,
      isEditing: true
    };

    // Insert in year order (newest first)
    const insertIndex = this.revenueRows.findIndex(row => row.year < year);
    if (insertIndex === -1) {
      this.revenueRows.push(newRow);
    } else {
      this.revenueRows.splice(insertIndex, 0, newRow);
    }
  }

  editRow(row: RevenueDisplayRow) {
    // Store original data for cancel functionality
    this.originalRowData = { ...row };
    row.isEditing = true;
  }

  async saveRow(row: RevenueDisplayRow) {
    // Check for duplicate years
    const duplicateYear = this.revenueRows.find(r => r !== row && r.year === row.year);
    if (duplicateYear) {
      alert(`Year ${row.year} already exists. Please choose a different year.`);
      return;
    }

    try {
      const data: Partial<CompanyRevenueSummary> = {
        company_id: this.companyId,
        client_id: this.clientId,
        program_id: this.programId,
        cohort_id: this.cohortId,
        year_: row.year,
        q1: row.q1,
        q2: row.q2,
        q3: row.q3,
        q4: row.q4,
        export_q1: row.export_q1,
        export_q2: row.export_q2,
        export_q3: row.export_q3,
        export_q4: row.export_q4,
        total: row.total,
        export_total: row.export_total,
        margin_pct: row.ratio
      };

      console.log('Saving revenue data:', data);

      let savedData: CompanyRevenueSummary;

      if (row.isNew) {
        savedData = await this.revenueService.addCompanyRevenueSummary(data).toPromise() as CompanyRevenueSummary;
      } else {
        savedData = await this.revenueService.updateCompanyRevenueSummary(row.id!, data).toPromise() as CompanyRevenueSummary;
      }

      // Update the row with saved data
      Object.assign(row, this.mapToDisplayRow(savedData));
      row.isEditing = false;
      row.isNew = false;
      this.originalRowData = null;

      // Sort rows by year (newest first)
      this.revenueRows.sort((a, b) => b.year - a.year);

    } catch (error) {
      console.error('Error saving revenue data:', error);
      alert('Error saving data. Please try again.');
    }
  }

  cancelEdit(row: RevenueDisplayRow, index: number) {
    if (row.isNew) {
      // Remove the new row
      this.revenueRows.splice(index, 1);
    } else {
      // Restore original data
      if (this.originalRowData) {
        Object.assign(row, this.originalRowData);
        row.isEditing = false;
        this.originalRowData = null;
      }
    }
  }

  async deleteRow(row: RevenueDisplayRow, index: number) {
    if (confirm(`Are you sure you want to delete the revenue data for ${row.year}?`)) {
      try {
        if (row.id) {
          await this.revenueService.deleteCompanyRevenueSummary(row.id).toPromise();
        }
        this.revenueRows.splice(index, 1);
      } catch (error) {
        console.error('Error deleting revenue data:', error);
        alert('Error deleting data. Please try again.');
      }
    }
  }

  calculateRowTotals(row: RevenueDisplayRow) {
    // Calculate revenue total
    row.total = (row.q1 || 0) + (row.q2 || 0) + (row.q3 || 0) + (row.q4 || 0);

    // Calculate export total
    row.export_total = (row.export_q1 || 0) + (row.export_q2 || 0) + (row.export_q3 || 0) + (row.export_q4 || 0);

    // Calculate ratio (export / revenue * 100)
    row.ratio = row.total && row.total > 0 ? (row.export_total || 0) / row.total * 100 : 0;
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number | null): string {
    if (value === null || value === undefined) return '-%';
    return `${Math.round(value)}%`;
  }
}
