import { Injectable } from '@angular/core';
import { CompanyCostingYearlyStats } from '../../../../../services/company-costing-yearly-stats.service';
import { FinancialYear } from '../../../../../services/financial-year.service';

/**
 * Cost Line interface for UI display
 */
export interface CostLine {
  id: number;
  costingStatsId?: number;
  type: 'direct' | 'operational';
  category: string;
  categoryId?: number | null;
  monthly: number[];
  total: number;
  notes?: string;
  isSaving?: boolean;
}

export type CostType = 'direct' | 'operational';

/**
 * Cost Totals interface
 */
export interface CostTotals {
  direct: number;
  operational: number;
}

/**
 * Service for cost structure utilities and calculations
 */
@Injectable({
  providedIn: 'root'
})
export class CostStructureUtilsService {

  private autoIdCounter = 1;

  /**
   * Create a new cost line for UI
   */
  createCostLine(type: CostType, category: string, monthly?: number[]): CostLine {
    const monthlyValues = monthly ?? Array.from({ length: 12 }, () => 0);
    return {
      id: this.autoIdCounter++,
      type,
      category,
      monthly: monthlyValues.slice(0, 12),
      total: this.calculateTotal(monthlyValues),
    };
  }

  /**
   * Convert database stats to UI cost line
   */
  convertStatsToRow(stat: CompanyCostingYearlyStats, categoryName: string): CostLine {
    return {
      id: this.autoIdCounter++,
      costingStatsId: stat.id,
      type: stat.cost_type,
      category: categoryName,
      categoryId: stat.category_id,
      monthly: [
        stat.m1, stat.m2, stat.m3, stat.m4, stat.m5, stat.m6,
        stat.m7, stat.m8, stat.m9, stat.m10, stat.m11, stat.m12
      ],
      total: stat.total_amount,
      notes: stat.notes || undefined
    };
  }

  /**
   * Convert UI cost line to database format
   */
  convertRowToStats(
    row: CostLine,
    companyId: number,
    financialYearId: number
  ): Partial<CompanyCostingYearlyStats> {
    return {
      company_id: companyId,
      financial_year_id: financialYearId,
      cost_type: row.type,
      category_id: row.categoryId,
      m1: row.monthly[0] || 0,
      m2: row.monthly[1] || 0,
      m3: row.monthly[2] || 0,
      m4: row.monthly[3] || 0,
      m5: row.monthly[4] || 0,
      m6: row.monthly[5] || 0,
      m7: row.monthly[6] || 0,
      m8: row.monthly[7] || 0,
      m9: row.monthly[8] || 0,
      m10: row.monthly[9] || 0,
      m11: row.monthly[10] || 0,
      m12: row.monthly[11] || 0,
      notes: row.notes
    };
  }

  /**
   * Calculate total from monthly values
   */
  calculateTotal(monthly: number[]): number {
    return monthly.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }

  /**
   * Sanitize monthly values (ensure they're valid positive numbers)
   */
  sanitizeMonthlyValues(monthly: number[]): number[] {
    return monthly.map(value => {
      const num = Number(value);
      return isFinite(num) && num >= 0 ? num : 0;
    });
  }

  /**
   * Calculate section totals for each cost type
   */
  calculateSectionTotals(rows: Record<CostType, CostLine[]>): CostTotals {
    return {
      direct: this.calculateSectionTotal(rows.direct),
      operational: this.calculateSectionTotal(rows.operational)
    };
  }

  /**
   * Calculate total for a specific section
   */
  private calculateSectionTotal(rows: CostLine[]): number {
    return rows.reduce((total, row) => total + row.total, 0);
  }

  /**
   * Calculate month total for a specific cost type and month index
   */
  calculateSectionMonthTotal(rows: CostLine[], monthIndex: number): number {
    return rows.reduce((total, row) => total + (row.monthly?.[monthIndex] || 0), 0);
  }

  /**
   * Update cost line totals after changes
   */
  updateCostLineTotal(row: CostLine): CostLine {
    row.monthly = this.sanitizeMonthlyValues(row.monthly);
    row.total = this.calculateTotal(row.monthly);
    return row;
  }

  /**
   * Generate short month names from financial year
   */
  generateMonthNames(financialYear: FinancialYear): string[] {
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const shortMonthMap: { [key: string]: string } = {
      'January': 'Jan', 'February': 'Feb', 'March': 'Mar',
      'April': 'Apr', 'May': 'May', 'June': 'Jun',
      'July': 'Jul', 'August': 'Aug', 'September': 'Sep',
      'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
    };

    const result: string[] = [];
    let currentMonth = financialYear.start_month;
    let currentYear = financialYear.fy_start_year;

    while (true) {
      const monthName = fullMonthNames[currentMonth - 1];
      result.push(shortMonthMap[monthName] || monthName.substring(0, 3));

      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }

      // Break if we've reached the end
      if (currentYear > financialYear.fy_end_year ||
          (currentYear === financialYear.fy_end_year && currentMonth > financialYear.end_month)) {
        break;
      }
    }

    return result;
  }

  /**
   * Calculate net profit
   */
  calculateNetProfit(revenue: number, totals: CostTotals): number {
    return revenue - totals.direct - totals.operational;
  }

  /**
   * Validate cost line data
   */
  validateCostLine(row: CostLine): string[] {
    const errors: string[] = [];

    if (!row.category || row.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (!row.type || !['direct', 'operational'].includes(row.type)) {
      errors.push('Valid cost type is required');
    }

    if (!row.monthly || row.monthly.length !== 12) {
      errors.push('12 monthly values are required');
    }

    // Check for invalid values
    if (row.monthly) {
      const invalidValues = row.monthly.filter(val => isNaN(Number(val)) || Number(val) < 0);
      if (invalidValues.length > 0) {
        errors.push('All monthly values must be valid positive numbers');
      }
    }

    return errors;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Reset auto ID counter (useful for testing)
   */
  resetAutoIdCounter(): void {
    this.autoIdCounter = 1;
  }
}
