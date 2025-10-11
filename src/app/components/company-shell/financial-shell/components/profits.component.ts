import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  CompanyProfitSummary,
  ProfitDisplayRow,
  ProfitSectionData,
  ProfitType,
  CompanyProfitRecord,
  ProfitSaveData
} from '../../../../../models/financial.models';
import { CompanyProfitSummaryService } from '../../../../../services/company-profit-summary.service';
import { ToastService } from '../../../../services/toast.service';
import { YearModalComponent } from '../../../shared/year-modal/year-modal.component';

@Component({
  selector: 'app-profits',
  standalone: true,
  imports: [CommonModule, FormsModule, YearModalComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-4">
          <div class="flex items-center">
            <i class="fas fa-coins text-yellow-600 text-2xl mr-3"></i>
            <h2 class="text-xl font-bold text-gray-900">Profit Summary</h2>
          </div>
          <!-- Save indicator -->
          <div *ngIf="saving" class="flex items-center text-yellow-600">
            <div class="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full mr-2"></div>
            <span class="text-sm font-medium">Saving...</span>
          </div>
        </div>
        <button
          (click)="openYearModal()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
          <i class="fas fa-plus mr-2"></i>
          Year
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center items-center py-10">
        <div class="animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
      </div>

      <!-- Tables -->
      <div *ngIf="!loading && profitSections.length > 0" class="space-y-10">

        <div *ngFor="let section of profitSections" class="overflow-x-auto">
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
              <div class="flex items-center">
                <i [ngClass]="{
                  'fa-chart-line text-green-600': section.type === 'gross',
                  'fa-cogs text-blue-600': section.type === 'operating',
                  'fa-calculator text-purple-600': section.type === 'npbt'
                }" class="fas mr-3 text-xl"></i>
                {{ section.displayName }}
              </div>
              <span class="text-sm text-gray-500 font-normal">
                {{ section.rows.length }} {{ section.rows.length === 1 ? 'year' : 'years' }}
              </span>
            </h3>
          </div>

          <table class="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q1</th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q2</th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q3</th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Q4</th>
                <th class="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th class="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                <th class="w-16 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody class="bg-white divide-y divide-gray-200">
              <!-- Empty state for individual sections -->
              <tr *ngIf="section.rows.length === 0">
                <td colspan="8" class="px-4 py-8 text-center text-gray-400 italic">
                  <i class="fas fa-chart-bar text-2xl mb-2 block text-gray-300"></i>
                  No {{ section.displayName.toLowerCase() }} data available.
                </td>
              </tr>

              <!-- Data rows with inline editing -->
              <tr *ngFor="let row of section.rows; trackBy: trackById" class="hover:bg-gray-50 transition-colors">
                <!-- Editable Year -->
                <td class="px-4 py-4 text-sm font-medium text-gray-900">
                  <input
                    type="number"
                    [(ngModel)]="row.year"
                    (change)="onFieldChange(row, 'year', section)"
                    [class]="'w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center ' + (saving ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300')"
                    [disabled]="saving"
                    min="2000"
                    max="2099"
                    step="1">
                </td>

                <!-- Editable Q1 -->
                <td class="px-4 py-4 text-sm text-center">
                  <input
                    type="number"
                    [(ngModel)]="row.q1"
                    (change)="onFieldChange(row, 'q1', section)"
                    [class]="'w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center ' + (saving ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300')"
                    [disabled]="saving"
                    placeholder="0"
                    step="1">
                </td>

                <!-- Editable Q2 -->
                <td class="px-4 py-4 text-sm text-center">
                  <input
                    type="number"
                    [(ngModel)]="row.q2"
                    (change)="onFieldChange(row, 'q2', section)"
                    [class]="'w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center ' + (saving ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300')"
                    [disabled]="saving"
                    placeholder="0"
                    step="1">
                </td>

                <!-- Editable Q3 -->
                <td class="px-4 py-4 text-sm text-center">
                  <input
                    type="number"
                    [(ngModel)]="row.q3"
                    (change)="onFieldChange(row, 'q3', section)"
                    [class]="'w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center ' + (saving ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300')"
                    [disabled]="saving"
                    placeholder="0"
                    step="1">
                </td>

                <!-- Editable Q4 -->
                <td class="px-4 py-4 text-sm text-center">
                  <input
                    type="number"
                    [(ngModel)]="row.q4"
                    (change)="onFieldChange(row, 'q4', section)"
                    [class]="'w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center ' + (saving ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300')"
                    [disabled]="saving"
                    placeholder="0"
                    step="1">
                </td>

                <!-- Calculated Total (readonly) -->
                <td class="px-4 py-4 text-sm text-center font-semibold text-gray-900">
                  {{ formatCurrencyWithUnit(row.total) }}
                </td>

                <!-- Calculated Margin (readonly with colors) -->
                <td class="px-4 py-4 text-sm text-center font-semibold"
                    [ngClass]="{
                      'text-green-600': row.margin_pct !== null && row.margin_pct >= 50,
                      'text-yellow-600': row.margin_pct !== null && row.margin_pct >= 30 && row.margin_pct < 50,
                      'text-red-500': row.margin_pct !== null && row.margin_pct < 30 && row.margin_pct >= 0,
                      'text-red-600': row.margin_pct !== null && row.margin_pct < 0,
                      'text-gray-400': row.margin_pct === null || row.margin_pct === 0
                    }">
                  {{ formatPercentage(row.margin_pct) }}
                </td>

                <!-- Actions -->
                <td class="px-4 py-4 text-sm text-center">
                  <button
                    (click)="deleteYearRecord(row.id, row.year)"
                    class="text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete {{ row.year }} data">
                    <i class="fas fa-trash text-sm"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- Empty -->
      <div *ngIf="!loading && allSectionsEmpty" class="text-center py-12">
        <i class="fas fa-chart-pie text-gray-400 text-4xl mb-3"></i>
        <h3 class="text-lg font-medium text-gray-900">No Profit Data</h3>
        <p class="text-gray-600 mb-4">Start by adding your first year's profit data.</p>
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
  saving = false; // Prevent double-saves during blur events
  private saveCount = 0; // Track save operations

  constructor(
    private profitService: CompanyProfitSummaryService,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Extract IDs
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);
      this.clientId = queryParams?.['clientId'] ? parseInt(queryParams['clientId'], 10) : 0;
      this.programId = queryParams?.['programId'] ? parseInt(queryParams['programId'], 10) : 0;
      this.cohortId = queryParams?.['cohortId'] ? parseInt(queryParams['cohortId'], 10) : 0;

      console.log('Profit Summary IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });

      this.initializeSections();
      this.loadProfitData();
    }
  }

  initializeSections(): void {
    // Initialize with empty sections - will be populated in loadProfitData()
    this.profitSections = this.profitService.getProfitSections();
  }

  get existingYears(): number[] {
    const years = new Set<number>();
    this.profitSections.forEach(section => section.rows.forEach(row => years.add(row.year)));
    return Array.from(years);
  }

  get allSectionsEmpty(): boolean {
    return this.profitSections.every(section => section.rows.length === 0);
  }

  /**
   * TrackBy function for ngFor optimization - prevents unnecessary re-renders
   */
  trackById(index: number, row: ProfitDisplayRow): number {
    return row.id ?? index;
  }

  async loadProfitData(): Promise<void> {
    this.loading = true;
    try {
      // Use the unified record service method instead of the display row method
      const records = await firstValueFrom(this.profitService.getCompanyProfitRecords({ company_id: this.companyId }));

      if (records && Array.isArray(records)) {
        // Initialize fresh sections
        this.profitSections = this.profitService.getProfitSections();

        // Transform each unified record into 3 section displays (gross, operating, npbt)
        records.forEach(record => {
          const sectionDisplays = this.profitService.recordToSectionDisplays(record);

          console.log(`Transforming record for year ${record.year_}:`, {
            record: record,
            sectionDisplays: sectionDisplays
          });

          sectionDisplays.forEach(display => {
            const targetSection = this.profitSections.find(s => s.type === display.type);
            if (targetSection) {
              targetSection.rows.push({
                id: record.id,
                year: record.year_,
                type: display.type,
                q1: display.q1,
                q2: display.q2,
                q3: display.q3,
                q4: display.q4,
                total: display.total,
                margin_pct: display.margin
              });
            }
          });
        });

        // Sort rows by year (newest first) in each section
        this.profitSections.forEach(section => {
          section.rows.sort((a, b) => b.year - a.year);
        });

        console.log('Loaded profit data:', {
          recordCount: records.length,
          sectionsPopulated: this.profitSections.map(s => ({ type: s.type, rowCount: s.rows.length }))
        });
      }
    } catch (error) {
      console.error('Error loading profit data:', error);
      this.toastService.error('Failed to load profit data. Please refresh the page.');
    } finally {
      this.loading = false;
    }
  }  /** Groups rows by gross/operating/npbt - DEPRECATED: Now using unified record approach */
  groupRowsByType(rows: ProfitDisplayRow[]): Map<ProfitType, ProfitDisplayRow[]> {
    // This method is no longer used since we're transforming unified records
    // directly in loadProfitData() using recordToSectionDisplays()
    const grouped = new Map<ProfitType, ProfitDisplayRow[]>();
    const profitTypes: ProfitType[] = ['gross', 'operating', 'npbt'];

    for (const type of profitTypes) {
      const typeRows = rows.filter(row => row.type === type);
      grouped.set(type, typeRows);
    }
    return grouped;
  }

  openYearModal(): void {
    this.yearModal.open();
  }

  async onYearSelected(year: number): Promise<void> {
    try {
      console.log('Creating profit record for year:', year);

      // Use the new unified service method
      await firstValueFrom(this.profitService.createProfitRecordForYear(
        year,
        this.companyId,
        this.clientId,
        this.programId,
        this.cohortId
      ));

      // Reload data to show the new record
      await this.loadProfitData();
      this.toastService.success(`Profit record for ${year} created successfully`);

      console.log(`Profit record created for year ${year}`);
    } catch (error) {
      console.error('Error creating profit record:', error);
      this.toastService.error(`Failed to create profit record for ${year}`);
    }
  }

  onModalClosed(): void {
    console.log('Modal Closed');
  }

  /**
   * Handle field changes from inline editing with save protection
   */
  async onFieldChange(row: ProfitDisplayRow, field: string, section: ProfitSectionData): Promise<void> {
    // Prevent concurrent saves
    if (this.saving) return;
    this.saving = true;

    try {
      this.saveCount++;
      const currentSaveId = this.saveCount;

      console.log('Field changed:', {
        field,
        value: (row as any)[field],
        year: row.year,
        section: section.type,
        saveId: currentSaveId,
        rowData: row
      });

      // Recalculate totals when quarterly values change
      if (['q1', 'q2', 'q3', 'q4'].includes(field)) {
        this.recalculateRowTotals(row);
      }

      // Save the updated record to the database
      await this.saveUpdatedRow(row, section);

      // Only show success toast for the most recent save to prevent spam
      if (currentSaveId === this.saveCount) {
        this.toastService.success(`Updated ${section.displayName} ${field.toUpperCase()} for ${row.year}`);
      }

    } catch (error) {
      console.error('Error updating field:', error);
      this.toastService.error(`Failed to update ${section.displayName} data`);

      // Optionally reload data on error to ensure consistency
      try {
        await this.loadProfitData();
      } catch (reloadError) {
        console.error('Error reloading data after save failure:', reloadError);
      }
    } finally {
      this.saving = false;
    }
  }

  /**
   * Save the updated row to the database
   */
  private async saveUpdatedRow(row: ProfitDisplayRow, section: ProfitSectionData): Promise<void> {
    if (!row.id) {
      console.error('Cannot save row: missing ID');
      return;
    }

    // Transform the display row to the ProfitSaveData format expected by the service
    const saveData = this.transformRowToSaveData(row, section);

    try {
      await firstValueFrom(this.profitService.updateCompanyProfitSummary(row.id, saveData));
      console.log('Record saved successfully:', saveData);
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
    }
  }

  /**
   * Transform a display row to ProfitSaveData format for the service
   */
  private transformRowToSaveData(row: ProfitDisplayRow, section: ProfitSectionData): ProfitSaveData {
    return {
      company_id: this.companyId,
      client_id: this.clientId,
      program_id: this.programId,
      cohort_id: this.cohortId,
      year_: row.year,
      type: section.type,
      q1: Number(row.q1) || 0,
      q2: Number(row.q2) || 0,
      q3: Number(row.q3) || 0,
      q4: Number(row.q4) || 0,
      total: row.total || 0,
      margin_pct: row.margin_pct || 0
    };
  }

  /**
   * Recalculate row totals and margins when quarterly values change
   */
  private recalculateRowTotals(row: ProfitDisplayRow): void {
    const q1 = Number(row.q1) || 0;
    const q2 = Number(row.q2) || 0;
    const q3 = Number(row.q3) || 0;
    const q4 = Number(row.q4) || 0;

    row.total = q1 + q2 + q3 + q4;

    // Auto-calculate margin percentage as a simple placeholder
    // In a real scenario, this would calculate based on revenue data
    if (row.total && row.total !== 0) {
      // Simple margin calculation - can be enhanced with actual business logic
      // For now, calculate a basic margin based on the profit type
      switch (row.type) {
        case 'gross':
          row.margin_pct = row.total > 0 ? Math.round((row.total * 0.25) * 100) / 100 : 0;
          break;
        case 'operating':
          row.margin_pct = row.total > 0 ? Math.round((row.total * 0.15) * 100) / 100 : 0;
          break;
        case 'npbt':
          row.margin_pct = row.total > 0 ? Math.round((row.total * 0.10) * 100) / 100 : 0;
          break;
        default:
          row.margin_pct = 0;
      }
    } else {
      row.margin_pct = null;
    }
  }

  /**
   * Delete a profit record for a specific year
   */
  async deleteYearRecord(recordId: number | undefined, year: number): Promise<void> {
    if (!recordId) {
      console.error('Cannot delete record: missing ID');
      return;
    }

    if (!confirm(`Delete profit data for ${year}?`)) return;

    try {
      await firstValueFrom(this.profitService.deleteCompanyProfitSummary(recordId));
      await this.loadProfitData();
      this.toastService.success(`Profit data for ${year} deleted successfully`);
      console.log(`Deleted profit record for year ${year}`);
    } catch (error) {
      console.error('Error deleting record:', error);
      this.toastService.error(`Failed to delete profit data for ${year}`);
    }
  }

  /**
   * Quick method to add a profit record with validation
   */
  async addProfitRecordForYear(year: number): Promise<boolean> {
    try {
      // Check if year already exists
      const existingYear = this.profitSections.some(section =>
        section.rows.some(row => row.year === year)
      );

      if (existingYear) {
        console.warn(`Year ${year} already exists`);
        this.toastService.warning(`Profit data for ${year} already exists`);
        return false;
      }

      await firstValueFrom(this.profitService.createProfitRecordForYear(
        year,
        this.companyId,
        this.clientId,
        this.programId,
        this.cohortId
      ));

      await this.loadProfitData();
      return true;
    } catch (error) {
      console.error('Error adding profit record:', error);
      this.toastService.error(`Failed to add profit record for ${year}`);
      return false;
    }
  }

  /** Formatting helpers */
  formatCurrency(value: number | null): string {
    if (value == null || isNaN(value)) return '-';

    // Format with thousands separators using space (European style)
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value).replace(/,/g, ' ');
  }

  formatPercentage(value: number | null): string {
    if (value == null || isNaN(value)) return '-%';
    return `${Math.round(value)}%`;
  }

  /**
   * Enhanced currency formatting for totals (with USD suffix)
   */
  formatCurrencyWithUnit(value: number | null): string {
    if (value == null || isNaN(value)) return '- USD';
    const formatted = this.formatCurrency(value);
    return `${formatted} USD`;
  }

  /**
   * Calculate section statistics for display
   */
  getSectionStats(section: ProfitSectionData) {
    if (section.rows.length === 0) return null;

    const latestYear = Math.max(...section.rows.map(r => r.year));
    const latestRow = section.rows.find(r => r.year === latestYear);
    const totalSum = section.rows.reduce((sum, row) => sum + (row.total || 0), 0);

    return {
      latestYear,
      latestTotal: latestRow?.total || 0,
      latestMargin: latestRow?.margin_pct || 0,
      allTimeTotal: totalSum
    };
  }

  // =========================================================================
  // FUTURE: INLINE EDITING METHODS (Ready for Phase 2)
  // =========================================================================

  /**
   * Future method for inline editing - ready for Phase 2 implementation
   * This would be called when user edits a cell and blurs the input
   */
  async onRowUpdate(row: ProfitDisplayRow): Promise<void> {
    try {
      // TODO: Implement updateProfitRow in service
      // await firstValueFrom(this.profitService.updateProfitRow(row));
      this.toastService.success(`Updated ${row.type} profit for ${row.year}`);
      console.log(`Updated profit row for ${row.year} (${row.type})`);
    } catch (error) {
      console.error('Error updating profit row:', error);
      this.toastService.error(`Failed to update ${row.type} profit for ${row.year}`);
    }
  }

  /**
   * Future method to toggle a row into edit mode
   */
  toggleRowEdit(row: ProfitDisplayRow): void {
    row.isEditing = !row.isEditing;
  }
}
