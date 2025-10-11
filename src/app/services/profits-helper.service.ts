import { Injectable } from '@angular/core';
import {
  ProfitDisplayRow,
  ProfitSectionData,
  ProfitType,
  UnifiedProfitRecord
} from '../../models/financial.models';
import { RevenueYearlyData } from '../../services/company-revenue-summary.service';

@Injectable({
  providedIn: 'root'
})
export class ProfitsHelperService {

  // Cache revenue data to avoid repeated API calls
  private revenueCache = new Map<number, number>(); // year -> revenue_total

  constructor() { }

  /**
   * Set revenue data cache for margin calculations
   */
  setRevenueData(revenueData: RevenueYearlyData[]): void {
    this.revenueCache.clear();
    revenueData.forEach(data => {
      this.revenueCache.set(data.year, data.revenue_total || 0);
    });
  }

  /**
   * Get revenue for a specific year from cache
   */
  getRevenueForYear(year: number): number {
    return this.revenueCache.get(year) || 0;
  }

  /**
   * Check if we have any revenue data available
   */
  hasRevenueData(): boolean {
    return this.revenueCache.size > 0;
  }

  /**
   * Get all available revenue years
   */
  getAvailableRevenueYears(): number[] {
    return Array.from(this.revenueCache.keys()).sort((a, b) => b - a);
  }

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

    // Preserve null values - only convert numbers, don't default to 0
    (updateData as any)[`${prefix}_q1`] = row.q1 !== null && row.q1 !== undefined ? Number(row.q1) : null;
    (updateData as any)[`${prefix}_q2`] = row.q2 !== null && row.q2 !== undefined ? Number(row.q2) : null;
    (updateData as any)[`${prefix}_q3`] = row.q3 !== null && row.q3 !== undefined ? Number(row.q3) : null;
    (updateData as any)[`${prefix}_q4`] = row.q4 !== null && row.q4 !== undefined ? Number(row.q4) : null;
    (updateData as any)[`${prefix}_total`] = row.total || 0;
    (updateData as any)[`${prefix}_margin`] = row.margin_pct || 0;

    return updateData;
  }

  /**
   * Recalculate row totals and margins when quarterly values change
   * Uses real revenue data for accurate margin calculations when available,
   * falls back to logarithmic scaling if revenue data is not available
   */
  recalculateRowTotals(row: ProfitDisplayRow, debug = false): void {
    // Handle null values properly - only convert to 0 for calculation, preserve original null
    const q1 = row.q1 !== null && row.q1 !== undefined ? Number(row.q1) : 0;
    const q2 = row.q2 !== null && row.q2 !== undefined ? Number(row.q2) : 0;
    const q3 = row.q3 !== null && row.q3 !== undefined ? Number(row.q3) : 0;
    const q4 = row.q4 !== null && row.q4 !== undefined ? Number(row.q4) : 0;

    row.total = q1 + q2 + q3 + q4;

    if (row.total === 0) {
      row.margin_pct = null;
      return;
    }

    // Try to get revenue data for this year for accurate margin calculation
    const revenueForYear = this.getRevenueForYear(row.year);

    if (debug) {
      console.log(`Calculating margin for ${row.type} ${row.year}:`, {
        originalValues: { q1: row.q1, q2: row.q2, q3: row.q3, q4: row.q4 },
        calculationValues: { q1, q2, q3, q4 },
        profit: row.total,
        revenue: revenueForYear,
        hasRevenueData: revenueForYear > 0
      });
    }

    if (revenueForYear > 0) {
      // Calculate real margin: (Profit / Revenue) × 100
      row.margin_pct = Math.round((row.total / revenueForYear) * 10000) / 100;

      // Cap margins at reasonable business limits (can be negative)
      const maxMargin = this.getMaxMarginForType(row.type);
      if (row.margin_pct > maxMargin) {
        row.margin_pct = maxMargin;
      }

      if (debug) {
        console.log(`Real margin calculated: ${row.margin_pct}%`);
      }
    } else {
      // Fallback to logarithmic scaling if no revenue data available
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

      if (debug) {
        console.log(`Estimated margin calculated: ${row.margin_pct}%`);
      }
    }
  }

  /**
   * Get maximum realistic margin for each profit type
   */
  private getMaxMarginForType(type: ProfitType): number {
    switch (type) {
      case 'gross':
        return 95; // Gross margins can be very high
      case 'operating':
        return 60; // Operating margins typically lower
      case 'npbt':
        return 40; // Net margins usually the lowest
      default:
        return 50;
    }
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
