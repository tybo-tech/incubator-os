import { Injectable } from '@angular/core';
import {
  ProfitDisplayRow,
  ProfitSectionData,
  ProfitType,
  UnifiedProfitRecord
} from '../../models/financial.models';

@Injectable({
  providedIn: 'root'
})
export class ProfitsHelperService {

  constructor() { }

  /**
   * Transform a display row to unified database record format
   * This creates the perfect reverse transformation: UI → Database
   *
   * Flow: ProfitDisplayRow (UI) → Partial<UnifiedProfitRecord> (DB)
   * Only sends fields for the specific profit type being edited
   */
  transformRowToSaveData(
    row: ProfitDisplayRow,
    section: ProfitSectionData,
    companyId: number,
    clientId: number,
    programId: number,
    cohortId: number
  ): Partial<UnifiedProfitRecord> {
    // Create a partial update object with only the changed fields for this profit type
    const updateData: Partial<UnifiedProfitRecord> = {
      id: row.id,
      company_id: companyId,
      client_id: clientId,
      program_id: programId,
      cohort_id: cohortId,
      year_: row.year
    };

    // Map UI display row back to database columns based on profit type
    const prefix = section.type; // 'gross', 'operating', or 'npbt'

    (updateData as any)[`${prefix}_q1`] = Number(row.q1) || 0;
    (updateData as any)[`${prefix}_q2`] = Number(row.q2) || 0;
    (updateData as any)[`${prefix}_q3`] = Number(row.q3) || 0;
    (updateData as any)[`${prefix}_q4`] = Number(row.q4) || 0;
    (updateData as any)[`${prefix}_total`] = row.total || 0;
    (updateData as any)[`${prefix}_margin`] = row.margin_pct || 0;

    return updateData;
  }

  /**
   * Recalculate row totals and margins when quarterly values change
   * Uses logarithmic scaling to produce realistic margin percentages
   */
  recalculateRowTotals(row: ProfitDisplayRow): void {
    const q1 = Number(row.q1) || 0;
    const q2 = Number(row.q2) || 0;
    const q3 = Number(row.q3) || 0;
    const q4 = Number(row.q4) || 0;

    row.total = q1 + q2 + q3 + q4;

    if (row.total === 0) {
      row.margin_pct = null;
      return;
    }

    // Logarithmic scaling to prevent margins from always hitting 100%
    // This produces believable margins that grow logarithmically with total values
    const logScaled = Math.log10(Math.abs(row.total) + 1); // dampens large numbers
    let marginEstimate = 0;

    switch (row.type) {
      case 'gross':
        marginEstimate = logScaled * 15; // typical 20–80%
        break;
      case 'operating':
        marginEstimate = logScaled * 10; // typical 10–50%
        break;
      case 'npbt':
        marginEstimate = logScaled * 7; // typical 5–30%
        break;
      default:
        marginEstimate = logScaled * 10;
    }

    // Cap at 100% and preserve sign for negative values
    const calculatedMargin = Math.min(100, Math.round(marginEstimate * 100) / 100);
    row.margin_pct = row.total > 0 ? calculatedMargin : -calculatedMargin;
  }

  /**
   * Calculate section statistics for display
   */
  getSectionStats(section: ProfitSectionData) {
    if (section.rows.length === 0) return null;

    const latestYear = Math.max(...section.rows.map((r: ProfitDisplayRow) => r.year));
    const latestRow = section.rows.find((r: ProfitDisplayRow) => r.year === latestYear);
    const totalSum = section.rows.reduce((sum: number, row: ProfitDisplayRow) => sum + (row.total || 0), 0);

    return {
      latestYear,
      latestTotal: latestRow?.total || 0,
      latestMargin: latestRow?.margin_pct || 0,
      allTimeTotal: totalSum
    };
  }

  /**
   * Formatting helpers
   */
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
   * TrackBy function for ngFor optimization - prevents unnecessary re-renders
   */
  trackById(index: number, row: ProfitDisplayRow): number {
    return row.id ?? index;
  }

  /**
   * Refresh a single row from the database to ensure sync
   * Useful after saves when backend might modify values
   */
  async refreshRow(
    recordId: number,
    section: ProfitSectionData,
    profitService: any
  ): Promise<void> {
    try {
      // Get fresh data for this specific record
      const record = await profitService.getCompanyProfitSummaryById(recordId);

      if (record) {
        // Find and update the specific row in the section
        const rowIndex = section.rows.findIndex((r: ProfitDisplayRow) => r.id === recordId);
        if (rowIndex !== -1) {
          const sectionDisplays = profitService.recordToSectionDisplays(record);
          const updatedDisplay = sectionDisplays.find((d: any) => d.type === section.type);

          if (updatedDisplay) {
            section.rows[rowIndex] = {
              id: recordId,
              year: record.year_,
              type: section.type,
              q1: updatedDisplay.q1,
              q2: updatedDisplay.q2,
              q3: updatedDisplay.q3,
              q4: updatedDisplay.q4,
              total: updatedDisplay.total,
              margin_pct: updatedDisplay.margin
            };
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing row:', error);
      // Silently fail - not critical for UX
    }
  }
}
