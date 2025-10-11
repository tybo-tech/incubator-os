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
  CompanyProfitRecord
} from '../../../../../models/financial.models';
import { CompanyProfitSummaryService } from '../../../../../services/company-profit-summary.service';
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
          <h2 class="text-xl font-bold text-gray-900">Profit Summary</h2>
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
              <tr *ngFor="let row of section.rows" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-4 text-sm font-medium text-gray-900">{{ row.year }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q1) }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q2) }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q3) }}</td>
                <td class="px-4 py-4 text-sm text-center">{{ formatCurrency(row.q4) }}</td>
                <td class="px-4 py-4 text-sm text-center font-semibold text-gray-900">
                  {{ formatCurrencyWithUnit(row.total) }}
                </td>
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

  constructor(
    private profitService: CompanyProfitSummaryService,
    private route: ActivatedRoute
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

      console.log(`Profit record created for year ${year}`);
    } catch (error) {
      console.error('Error creating profit record:', error);
    }
  }

  onModalClosed(): void {
    console.log('Modal Closed');
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
      console.log(`Deleted profit record for year ${year}`);
    } catch (error) {
      console.error('Error deleting record:', error);
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
}
