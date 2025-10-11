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
  templateUrl: './profits.component.html'
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
