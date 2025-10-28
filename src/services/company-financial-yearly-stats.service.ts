import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Company Financial Yearly Stats filters for list operations
 */
export interface ICompanyFinancialYearlyStatsFilters {
  company_id?: number;
  financial_year_id?: number;
  is_revenue?: boolean;
  program_id?: number;
  cohort_id?: number;
  account_id?: number;
  order_by?: 'company_id' | 'financial_year_id' | 'total_amount' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Company Financial Yearly Stats data model
 */
export interface CompanyFinancialYearlyStats {
  id: number;
  tenant_id?: number | null;
  client_id: number;
  program_id?: number | null;
  cohort_id?: number | null;
  company_id: number;
  account_id?: number | null;
  financial_year_id: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
  m7: number;
  m8: number;
  m9: number;
  m10: number;
  m11: number;
  m12: number;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Yearly totals summary interface
 */
export interface YearlyTotalsSummary {
  revenue_total: number;
  expense_total: number;
  revenue_accounts: number;
  expense_accounts: number;
  net_total: number;
}

/**
 * Monthly breakdown interface
 */
export interface MonthlyBreakdown {
  is_revenue: boolean;
  m1_total: number;
  m2_total: number;
  m3_total: number;
  m4_total: number;
  m5_total: number;
  m6_total: number;
  m7_total: number;
  m8_total: number;
  m9_total: number;
  m10_total: number;
  m11_total: number;
  m12_total: number;
}

/**
 * Quarterly revenue interface for live calculations
 */
export interface QuarterlyRevenue {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;
  start_month: number;
  revenue_q1: number;
  revenue_q2: number;
  revenue_q3: number;
  revenue_q4: number;
  revenue_total: number;
  export_q1: number;
  export_q2: number;
  export_q3: number;
  export_q4: number;
  export_total: number;
  export_ratio: number;
  account_breakdown: AccountBreakdown[];
  quarter_details: QuarterDetails;
}

/**
 * Account breakdown interface
 */
export interface AccountBreakdown {
  account_id: number;
  account_name: string;
  account_type: 'domestic_revenue' | 'export_revenue' | 'expense' | 'other';
  monthly_data: {
    m1: number; m2: number; m3: number; m4: number; m5: number; m6: number;
    m7: number; m8: number; m9: number; m10: number; m11: number; m12: number;
  };
  total: number;
}

/**
 * Quarter details interface
 */
export interface QuarterDetails {
  q1_months: string[];
  q2_months: string[];
  q3_months: string[];
  q4_months: string[];
}

/**
 * Yearly revenue summary interface
 */
export interface YearlyRevenueSummary {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;
  revenue_total: number;
  export_total: number;
  export_ratio: number;
  account_breakdown: {
    account_id: number;
    account_name: string;
    account_type: string;
    total: number;
  }[];
}

/**
 * 📊 Company Financial Yearly Stats Service
 * Handles all yearly financial statistics operations including monthly data,
 * revenue/expense tracking, and summary calculations.
 */
@Injectable({ providedIn: 'root' })
export class CompanyFinancialYearlyStatsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-financial-yearly-stats`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Centralized error handling for API calls
   */
  private handleError(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);
      return throwError(() => new Error(`Failed to ${operation.toLowerCase()}: ${error.message || 'Unknown error'}`));
    };
  }

  /**
   * Add new yearly stats record
   */
  addYearlyStats(data: Partial<CompanyFinancialYearlyStats>): Observable<CompanyFinancialYearlyStats> {
    console.log('📊 Adding yearly stats:', data);
    return this.http.post<CompanyFinancialYearlyStats>(`${this.apiUrl}/add-yearly-stats.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Add yearly stats')));
  }

  /**
   * Get yearly stats by ID
   */
  getYearlyStatsById(id: number): Observable<CompanyFinancialYearlyStats> {
    return this.http.get<CompanyFinancialYearlyStats>(`${this.apiUrl}/get-yearly-stats.php?id=${id}`)
      .pipe(catchError(this.handleError('Get yearly stats')));
  }

  /**
   * Update yearly stats record
   */
  updateYearlyStats(id: number, data: Partial<CompanyFinancialYearlyStats>): Observable<CompanyFinancialYearlyStats> {
    const payload = { id, ...data };
    console.log('📊 Updating yearly stats:', { id, data: payload });
    return this.http.post<CompanyFinancialYearlyStats>(`${this.apiUrl}/update-yearly-stats.php`, payload, this.httpOptions)
      .pipe(catchError(this.handleError('Update yearly stats')));
  }

  /**
   * Delete yearly stats record
   */
  deleteYearlyStats(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.get<{ success: boolean; message: string }>(`${this.apiUrl}/delete-yearly-stats.php?id=${id}`)
      .pipe(catchError(this.handleError('Delete yearly stats')));
  }

  /**
   * List yearly stats with optional filters
   */
  listYearlyStats(filters: ICompanyFinancialYearlyStatsFilters = {}): Observable<CompanyFinancialYearlyStats[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.http.get<CompanyFinancialYearlyStats[]>(`${this.apiUrl}/list-yearly-stats.php?${params.toString()}`)
      .pipe(catchError(this.handleError('List yearly stats')));
  }

  /**
   * Get yearly stats by company and financial year
   */
  getByCompanyAndYear(companyId: number, financialYearId: number): Observable<CompanyFinancialYearlyStats[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<CompanyFinancialYearlyStats[]>(`${this.apiUrl}/get-by-company-year.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get stats by company and year')));
  }

  /**
   * Get revenue stats for a company and year
   */
  getRevenueStats(companyId: number, financialYearId: number): Observable<CompanyFinancialYearlyStats[]> {
    return this.listYearlyStats({
      company_id: companyId,
      financial_year_id: financialYearId,
      is_revenue: true
    });
  }

  /**
   * Get expense stats for a company and year
   */
  getExpenseStats(companyId: number, financialYearId: number): Observable<CompanyFinancialYearlyStats[]> {
    return this.listYearlyStats({
      company_id: companyId,
      financial_year_id: financialYearId,
      is_revenue: false
    });
  }

  /**
   * Get yearly totals summary
   */
  getYearlyTotals(companyId: number, financialYearId: number): Observable<YearlyTotalsSummary> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<YearlyTotalsSummary>(`${this.apiUrl}/get-yearly-totals.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get yearly totals')));
  }

  /**
   * Get monthly breakdown for a company and year
   */
  getMonthlyBreakdown(companyId: number, financialYearId: number): Observable<MonthlyBreakdown[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<MonthlyBreakdown[]>(`${this.apiUrl}/get-monthly-breakdown.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get monthly breakdown')));
  }

  /**
   * Get quarterly revenue calculations for a specific company and financial year
   */
  getQuarterlyRevenue(companyId: number, financialYearId: number): Observable<QuarterlyRevenue> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<QuarterlyRevenue>(`${this.apiUrl}/get-quarterly-revenue.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get quarterly revenue')));
  }

  /**
   * Get quarterly revenue calculations for all years of a company
   */
  getQuarterlyRevenueAllYears(companyId: number): Observable<QuarterlyRevenue[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString()
    });

    return this.http.get<QuarterlyRevenue[]>(`${this.apiUrl}/get-quarterly-revenue.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get quarterly revenue for all years')));
  }

  /**
   * Get yearly revenue summary for a company and financial year
   */
  getYearlyRevenue(companyId: number, financialYearId: number): Observable<YearlyRevenueSummary> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<YearlyRevenueSummary>(`${this.apiUrl}/get-yearly-revenue.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get yearly revenue')));
  }

  /**
   * Upsert (insert or update) yearly stats record
   */
  upsertYearlyStats(data: Partial<CompanyFinancialYearlyStats>): Observable<CompanyFinancialYearlyStats> {
    console.log('📊 Upserting yearly stats:', data);
    return this.http.post<CompanyFinancialYearlyStats>(`${this.apiUrl}/upsert-yearly-stats.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Upsert yearly stats')));
  }

  /**
   * Get all stats for a company across all years
   */
  getAllCompanyStats(companyId: number): Observable<CompanyFinancialYearlyStats[]> {
    return this.listYearlyStats({ company_id: companyId });
  }

  /**
   * Get stats for a specific program
   */
  getProgramStats(programId: number): Observable<CompanyFinancialYearlyStats[]> {
    return this.listYearlyStats({ program_id: programId });
  }

  /**
   * Get stats for a specific cohort
   */
  getCohortStats(cohortId: number): Observable<CompanyFinancialYearlyStats[]> {
    return this.listYearlyStats({ cohort_id: cohortId });
  }

  /**
   * Helper method to format currency values
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: Constants.Currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Helper method to get month names
   */
  getMonthNames(): string[] {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }

  /**
   * Helper method to get month abbreviations
   */
  getMonthAbbreviations(): string[] {
    return [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
  }

  /**
   * Convert monthly data to array format
   */
  getMonthlyDataArray(stats: CompanyFinancialYearlyStats): number[] {
    return [
      stats.m1, stats.m2, stats.m3, stats.m4, stats.m5, stats.m6,
      stats.m7, stats.m8, stats.m9, stats.m10, stats.m11, stats.m12
    ];
  }

  /**
   * Calculate quarterly totals from monthly data
   */
  calculateQuarterlyTotals(stats: CompanyFinancialYearlyStats): {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  } {
    return {
      q1: stats.m1 + stats.m2 + stats.m3,
      q2: stats.m4 + stats.m5 + stats.m6,
      q3: stats.m7 + stats.m8 + stats.m9,
      q4: stats.m10 + stats.m11 + stats.m12
    };
  }

  /**
   * Calculate growth rate between two periods
   */
  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Group stats by type (revenue vs expenses)
   * Note: Since is_revenue field is not available in database schema,
   * this method returns empty arrays. Consider using account_id to categorize.
   */
  groupStatsByType(stats: CompanyFinancialYearlyStats[]): {
    revenue: CompanyFinancialYearlyStats[];
    expenses: CompanyFinancialYearlyStats[];
  } {
    return {
      revenue: [], // TODO: Implement account-based categorization
      expenses: [] // TODO: Implement account-based categorization
    };
  }

  /**
   * Calculate financial performance indicators
   */
  calculatePerformanceIndicators(summary: YearlyTotalsSummary): {
    profitMargin: number;
    revenueGrowth?: number;
    expenseRatio: number;
    netProfitability: number;
  } {
    const profitMargin = summary.revenue_total > 0 ?
      (summary.net_total / summary.revenue_total) * 100 : 0;

    const expenseRatio = summary.revenue_total > 0 ?
      (summary.expense_total / summary.revenue_total) * 100 : 0;

    const netProfitability = summary.net_total;

    return {
      profitMargin,
      expenseRatio,
      netProfitability
    };
  }
}
