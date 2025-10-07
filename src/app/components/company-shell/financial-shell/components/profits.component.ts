import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyProfitSummaryService, ProfitDisplayRow, ProfitSectionData, ProfitType } from '../../../../../services/company-profit-summary.service';
import { CompanyProfitSummary } from '../../../../../models/financial.models';
import { YearModalComponent } from '../../../shared/year-modal/year-modal.component';

@Component({
  selector: 'app-profits',
  standalone: true,
  imports: [CommonModule, FormsModule, YearModalComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <i class="fas fa-coins text-yellow-600 text-2xl mr-3"></i>
          <h2 class="text-xl font-bold text-gray-900">Profits</h2>
        </div>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
          <i class="fas fa-plus mr-2"></i>
          Year
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>

      <!-- Profit Sections -->
      <div *ngIf="!loading" class="space-y-8">

        <!-- Loop through each profit section -->
        <div *ngFor="let section of profitSections" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ section.displayName }}
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
                <th class="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margin
                </th>
                <th class="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let row of section.rows; let i = index"
                  [class.bg-blue-50]="row.isEditing"
                  [class.bg-green-50]="row.isNew">

                <!-- Year Column -->
                <td class="w-40 px-4 py-4 whitespace-nowrap">
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
                    <span class="text-sm font-semibold"
                          [class.text-green-600]="(row.total ?? 0) > 0"
                          [class.text-red-600]="(row.total ?? 0) < 0"
                          [class.text-gray-900]="(row.total ?? 0) === 0">
                      {{ formatCurrency(row.total) }}
                    </span>
                    <span class="text-xs text-gray-500 block">USD</span>
                  </div>
                </td>

                <!-- Margin -->
                <td class="w-24 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold"
                          [class.text-green-600]="(row.margin_pct ?? 0) > 0"
                          [class.text-red-600]="(row.margin_pct ?? 0) < 0"
                          [class.text-blue-600]="(row.margin_pct ?? 0) === 0">
                      {{ formatPercentage(row.margin_pct) }}
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="w-20 px-4 py-4 whitespace-nowrap text-center">
                  <div class="flex justify-center space-x-2">
                    <ng-container *ngIf="row.isEditing || row.isNew">
                      <button
                        (click)="saveRow(row, section.type)"
                        class="text-green-600 hover:text-green-900"
                        title="Save">
                        <i class="fas fa-check"></i>
                      </button>
                      <button
                        (click)="cancelEdit(row, section, i)"
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
                        (click)="deleteRow(row, section, i)"
                        class="text-red-600 hover:text-red-900"
                        title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </ng-container>
                  </div>
                </td>
              </tr>

              <!-- Empty state for each section -->
              <tr *ngIf="section.rows.length === 0">
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                  <i class="fas fa-chart-line text-2xl mb-2"></i>
                  <p class="text-sm">No {{ section.displayName.toLowerCase() }} data available</p>
                  <button
                    (click)="addYearToSection(section.type)"
                    class="mt-2 text-sm text-blue-600 hover:text-blue-800">
                    Add year for {{ section.displayName.toLowerCase() }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- Empty State (when no data at all) -->
      <div *ngIf="!loading && allSectionsEmpty" class="text-center py-12">
        <i class="fas fa-coins text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Profit Data</h3>
        <p class="text-gray-600 mb-4">Start by adding your first year of profit data.</p>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
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
export class ProfitsComponent implements OnInit {
  @ViewChild('yearModal') yearModal!: YearModalComponent;

  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  profitSections: ProfitSectionData[] = [];
  loading = false;
  originalRowData: ProfitDisplayRow | null = null;

  constructor(
    private profitService: CompanyProfitSummaryService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get companyId from route params (two levels up: /company/:id/financial/profits)
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    // Get query parameters
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);

      // Extract required query parameters
      this.clientId = queryParams?.['clientId'] ? parseInt(queryParams['clientId'], 10) : 0;
      this.programId = queryParams?.['programId'] ? parseInt(queryParams['programId'], 10) : 0;
      this.cohortId = queryParams?.['cohortId'] ? parseInt(queryParams['cohortId'], 10) : 0;

      console.log('Profits Component - IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });

      this.initializeProfitSections();
      this.loadProfitData();
    }
  }

  get existingYears(): number[] {
    const years = new Set<number>();
    this.profitSections.forEach(section => {
      section.rows.forEach(row => years.add(row.year));
    });
    return Array.from(years);
  }

  get allSectionsEmpty(): boolean {
    return this.profitSections.every(section => section.rows.length === 0);
  }

  initializeProfitSections(): void {
    this.profitSections = this.profitService.getProfitSections();
  }

  async loadProfitData(): Promise<void> {
    this.loading = true;
    try {
      const profitRows = await this.profitService.listAllCompanyProfitSummary(this.companyId).toPromise();

      if (profitRows) {
        // Group rows by type using service method
        const groupedRows = this.profitService.groupRowsByType(profitRows);

        // Assign rows to their respective sections
        this.profitSections.forEach(section => {
          section.rows = groupedRows.get(section.type) || [];
        });
      }
    } catch (error) {
      console.error('Error loading profit data:', error);
      this.profitSections.forEach(section => {
        section.rows = [];
      });
    } finally {
      this.loading = false;
    }
  }

  openYearModal(): void {
    this.yearModal.open();
  }

  onYearSelected(year: number): void {
    console.log('Year selected:', year);

    // Auto-populate all three profit sections for the selected year
    this.profitSections.forEach(section => {
      // Check if this year already exists in this section
      const existingRow = section.rows.find(row => row.year === year);
      if (!existingRow) {
        this.addYearWithValue(year, section.type, section);
      }
    });
  }

  onModalClosed(): void {
    console.log('Modal closed');
  }

  addYearToSection(type: ProfitType): void {
    const section = this.profitSections.find(s => s.type === type);
    if (section) {
      // For demo, add current year. In real app, you'd prompt for year
      const currentYear = new Date().getFullYear();
      this.addYearWithValue(currentYear, type, section);
    }
  }

  addYearWithValue(year: number, type: ProfitType, section: ProfitSectionData): void {
    const newRow = this.profitService.createNewProfitRow(year, type);

    // Insert in year order (newest first) using service method
    const insertIndex = section.rows.findIndex(row => row.year < year);
    if (insertIndex === -1) {
      section.rows.push(newRow);
    } else {
      section.rows.splice(insertIndex, 0, newRow);
    }
  }

  editRow(row: ProfitDisplayRow): void {
    // Store original data for cancel functionality
    this.originalRowData = { ...row };
    row.isEditing = true;
  }

  async saveRow(row: ProfitDisplayRow, sectionType: ProfitType): Promise<void> {
    // Find the section this row belongs to
    const section = this.profitSections.find(s => s.type === sectionType);
    if (!section) {
      alert('Invalid section type');
      return;
    }

    // Validate the row using service method
    const validation = this.profitService.validateProfitRow(row);
    if (!validation.isValid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    // Check for duplicate years using service method
    if (this.profitService.checkForDuplicateYear(section.rows, row, row.year)) {
      alert(`Year ${row.year} already exists for ${section.displayName}. Please choose a different year.`);
      return;
    }

    try {
      const saveData = this.profitService.mapToSaveData(row, this.companyId, this.clientId, this.programId, this.cohortId);

      console.log('Saving profit data:', saveData);
      console.log('Row totals before saving:', {
        total: row.total,
        margin_pct: row.margin_pct
      });

      let savedData: CompanyProfitSummary;

      if (row.isNew) {
        savedData = await this.profitService.addCompanyProfitSummary(saveData).toPromise() as CompanyProfitSummary;
      } else {
        savedData = await this.profitService.updateCompanyProfitSummary(row.id!, saveData).toPromise() as CompanyProfitSummary;
      }

      // Update the row with saved data using service method
      Object.assign(row, this.profitService.mapToDisplayRow(savedData));
      row.isEditing = false;
      row.isNew = false;
      this.originalRowData = null;

      // Sort rows using service method
      section.rows = this.profitService.sortRowsByYear(section.rows);

    } catch (error) {
      console.error('Error saving profit data:', error);
      alert('Error saving data. Please try again.');
    }
  }

  cancelEdit(row: ProfitDisplayRow, section: ProfitSectionData, index: number): void {
    if (row.isNew) {
      // Remove the new row
      section.rows.splice(index, 1);
    } else {
      // Restore original data
      if (this.originalRowData) {
        Object.assign(row, this.originalRowData);
        row.isEditing = false;
        this.originalRowData = null;
      }
    }
  }

  async deleteRow(row: ProfitDisplayRow, section: ProfitSectionData, index: number): Promise<void> {
    if (confirm(`Are you sure you want to delete the ${section.displayName.toLowerCase()} data for ${row.year}?`)) {
      try {
        if (row.id) {
          await this.profitService.deleteCompanyProfitSummary(row.id).toPromise();
        }
        section.rows.splice(index, 1);
      } catch (error) {
        console.error('Error deleting profit data:', error);
        alert('Error deleting data. Please try again.');
      }
    }
  }

  calculateRowTotals(row: ProfitDisplayRow): void {
    // Use service method for calculations
    // TODO: Get revenue total for margin calculation
    this.profitService.updateRowTotals(row);
  }

  formatCurrency(value: number | null): string {
    return this.profitService.formatCurrency(value);
  }

  formatPercentage(value: number | null): string {
    return this.profitService.formatPercentage(value);
  }
}
