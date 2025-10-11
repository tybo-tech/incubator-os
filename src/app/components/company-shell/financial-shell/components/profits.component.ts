import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
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
  ProfitSaveData,
  UnifiedProfitRecord
} from '../../../../../models/financial.models';
import { CompanyProfitSummaryService } from '../../../../../services/company-profit-summary.service';
import { CompanyRevenueSummaryService } from '../../../../../services/company-revenue-summary.service';
import { ToastService } from '../../../../services/toast.service';
import { ProfitsHelperService } from '../../../../services/profits-helper.service';
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
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 mr-2">
          <i class="fas fa-plus mr-2"></i>
          Year
        </button>

        <!-- Save button (only show when there are pending changes) -->
        <button
          *ngIf="hasPendingChanges"
          (click)="saveAllChanges()"
          [disabled]="saving"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
          <i *ngIf="!saving" class="fas fa-save mr-2"></i>
          <div *ngIf="saving" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          {{ saving ? 'Saving...' : 'Save Changes' }}
          <span *ngIf="!saving" class="ml-2 bg-green-800 text-green-100 text-xs px-2 py-1 rounded-full">
            {{ pendingChangesCount }}
          </span>
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
                <span *ngIf="profitsHelper.hasRevenueData()"
                      class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                      title="Margins calculated using actual revenue data for available years">
                  ✓ Real Margins
                </span>
                <span *ngIf="!profitsHelper.hasRevenueData()"
                      class="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full"
                      title="Margins estimated (no revenue data available)">
                  ~ Estimated
                </span>
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
              <tr *ngFor="let row of section.rows; trackBy: profitsHelper.trackById" class="hover:bg-gray-50 transition-colors">
                <!-- Editable Year -->
                <td class="px-4 py-4 text-sm font-medium text-gray-900">
                  <input
                    type="number"
                    [(ngModel)]="row.year"
                    (change)="onFieldChange(row, 'year', section)"
                    [ngClass]="{
                      'border-green-400 bg-green-50 transition-all duration-500': row.justSaved,
                      'border-orange-300 bg-orange-50': row.isPendingSave,
                      'border-yellow-300 bg-yellow-50': saving,
                      'border-gray-300': !row.justSaved && !row.isPendingSave && !saving
                    }"
                    class="w-20 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center"
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
                    [ngClass]="{
                      'border-green-400 bg-green-50 transition-all duration-500': row.justSaved,
                      'border-orange-300 bg-orange-50': row.isPendingSave,
                      'border-yellow-300 bg-yellow-50': saving,
                      'border-gray-300': !row.justSaved && !row.isPendingSave && !saving
                    }"
                    class="w-24 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center"
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
                    [ngClass]="{
                      'border-green-400 bg-green-50 transition-all duration-500': row.justSaved,
                      'border-yellow-300 bg-yellow-50': saving,
                      'border-gray-300': !row.justSaved && !saving
                    }"
                    class="w-24 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center"
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
                    [ngClass]="{
                      'border-green-400 bg-green-50 transition-all duration-500': row.justSaved,
                      'border-yellow-300 bg-yellow-50': saving,
                      'border-gray-300': !row.justSaved && !saving
                    }"
                    class="w-24 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center"
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
                    [ngClass]="{
                      'border-green-400 bg-green-50 transition-all duration-500': row.justSaved,
                      'border-yellow-300 bg-yellow-50': saving,
                      'border-gray-300': !row.justSaved && !saving
                    }"
                    class="w-24 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center"
                    [disabled]="saving"
                    placeholder="0"
                    step="1">
                </td>

                <!-- Calculated Total (readonly) -->
                <td class="px-4 py-4 text-sm text-center font-semibold text-gray-900">
                  {{ profitsHelper.formatCurrencyWithUnit(row.total) }}
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
                  {{ profitsHelper.formatPercentage(row.margin_pct) }}
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
export class ProfitsComponent implements OnInit, OnDestroy {
  @ViewChild('yearModal') yearModal!: YearModalComponent;

  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  profitSections: ProfitSectionData[] = [];
  loading = false;
  saving = false; // For batch save operation
  private saveCount = 0; // Track save operations
  private readonly isDebugMode = false; // Set to true for development debugging

  constructor(
    private profitService: CompanyProfitSummaryService,
    private revenueService: CompanyRevenueSummaryService,
    private route: ActivatedRoute,
    private toastService: ToastService,
    public profitsHelper: ProfitsHelperService
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

      if (this.isDebugMode) {
        console.log('Profit Summary IDs:', {
          companyId: this.companyId,
          clientId: this.clientId,
          programId: this.programId,
          cohortId: this.cohortId
        });
      }

      this.initializeSections();
      this.loadProfitData();
    }
  }

  ngOnDestroy(): void {
    // Clear any pending changes when component is destroyed
    this.profitsHelper.clearPendingChanges();
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

  async loadProfitData(): Promise<void> {
    this.loading = true;
    try {
      // Load both profit records and revenue data for accurate margin calculations
      const [records, revenueData] = await Promise.all([
        firstValueFrom(this.profitService.getCompanyProfitRecords({ company_id: this.companyId })),
        firstValueFrom(this.revenueService.getCompanyRevenueYearlyTrend(this.companyId))
      ]);

      // Set revenue data in the helper service for margin calculations
      if (revenueData && Array.isArray(revenueData)) {
        this.profitsHelper.setRevenueData(revenueData);

        if (this.isDebugMode) {
          console.log('Loaded revenue data for margin calculations:', {
            rawData: revenueData,
            revenueByYear: revenueData.reduce((acc, item) => {
              acc[item.year] = item.revenue_total;
              return acc;
            }, {} as Record<number, number>)
          });
        }
      }

      if (records && Array.isArray(records)) {
        // Initialize fresh sections
        this.profitSections = this.profitService.getProfitSections();

        // Transform each unified record into 3 section displays (gross, operating, npbt)
        records.forEach(record => {
          const sectionDisplays = this.profitService.recordToSectionDisplays(record);

          if (this.isDebugMode) {
            console.log(`Transforming record for year ${record.year_}:`, {
              record: record,
              sectionDisplays: sectionDisplays
            });
          }

          sectionDisplays.forEach(display => {
            const targetSection = this.profitSections.find(s => s.type === display.type);
            if (targetSection) {
              const row: ProfitDisplayRow = {
                id: record.id,
                year: record.year_,
                type: display.type,
                q1: display.q1,
                q2: display.q2,
                q3: display.q3,
                q4: display.q4,
                total: display.total,
                margin_pct: display.margin
              };

              if (this.isDebugMode) {
                console.log(`Creating row for ${display.type} ${record.year_}:`, {
                  original: display,
                  row: row
                });
              }

              // Only recalculate margins if we have revenue data AND the margin is null/zero
              // Otherwise preserve the existing data from database
              if (this.profitsHelper.hasRevenueData() && (row.margin_pct === null || row.margin_pct === 0)) {
                this.profitsHelper.recalculateRowTotals(row, this.isDebugMode);
              }

              targetSection.rows.push(row);
            }
          });
        });

        // Sort rows by year (newest first) in each section
        this.profitSections.forEach(section => {
          section.rows.sort((a, b) => b.year - a.year);
        });

        if (this.isDebugMode) {
          console.log('Loaded profit data with revenue-based margins:', {
            recordCount: records.length,
            revenueYears: revenueData?.length || 0,
            revenueAvailable: this.profitsHelper.getAvailableRevenueYears(),
            sectionsPopulated: this.profitSections.map(s => ({
              type: s.type,
              rowCount: s.rows.length,
              sampleMargins: s.rows.slice(0, 2).map(r => ({
                year: r.year,
                margin: r.margin_pct,
                hasRevenue: this.profitsHelper.getRevenueForYear(r.year) > 0
              }))
            }))
          });
        }
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
   * Handle field changes from inline editing - now uses manual save
   */
  onFieldChange(row: ProfitDisplayRow, field: string, section: ProfitSectionData): void {
    if (this.isDebugMode) {
      console.log('Field changed:', {
        field,
        value: (row as any)[field],
        year: row.year,
        section: section.type,
        rowData: row
      });
    }

    // Recalculate totals when quarterly values change
    if (['q1', 'q2', 'q3', 'q4'].includes(field)) {
      this.profitsHelper.recalculateRowTotals(row, this.isDebugMode);
    }

    // Mark row as changed for manual save
    this.profitsHelper.markRowAsChanged(row, section);
  }

  /**
   * Manual save all pending changes
   */
  async saveAllChanges(): Promise<void> {
    if (!this.profitsHelper.hasPendingChanges()) {
      this.toastService.info('No changes to save');
      return;
    }

    this.saving = true;

    try {
      const changedRecords = this.profitsHelper.getChangedRecords();
      const updateRecords: Partial<UnifiedProfitRecord>[] = [];

      // Transform each changed row to save format
      for (const { key, row } of changedRecords) {
        const [id, type] = key.split('_');
        const section = this.profitSections.find(s => s.type === type);

        if (section) {
          const saveData = this.profitsHelper.transformRowToSaveData(
            row,
            section,
            this.companyId,
            this.clientId,
            this.programId,
            this.cohortId
          );
          updateRecords.push(saveData);
        }
      }

      if (this.isDebugMode) {
        console.log('Batch saving records:', {
          changeCount: changedRecords.length,
          updateRecords
        });
      }

      // Perform batch update
      const result = await firstValueFrom(this.profitService.batchUpdateCompanyProfitSummary(updateRecords));

      if (result.success) {
        // Clear pending changes and visual indicators
        this.profitSections.forEach(section => {
          section.rows.forEach(row => {
            row.isPendingSave = false;
            row.justSaved = true;
            setTimeout(() => row.justSaved = false, 600);
          });
        });

        this.profitsHelper.clearPendingChanges();

        this.toastService.success(`Successfully saved ${result.updated_count} records`);

        // Optionally reload data to ensure consistency
        if (this.isDebugMode) {
          await this.loadProfitData();
        }
      } else {
        throw new Error(result.error || 'Batch update failed');
      }

    } catch (error) {
      console.error('Error saving changes:', error);
      this.toastService.error('Failed to save changes. Please try again.');
    } finally {
      this.saving = false;
    }
  }

  /**
   * Check if there are pending changes
   */
  get hasPendingChanges(): boolean {
    return this.profitsHelper.hasPendingChanges();
  }

  /**
   * Get the count of pending changes for display
   */
  get pendingChangesCount(): number {
    return this.profitsHelper.getPendingChangesCount();
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

  /**
   * Calculate section statistics for display
   */
  getSectionStats(section: ProfitSectionData) {
    return this.profitsHelper.getSectionStats(section);
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
