import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Company Costing Yearly Stats filters for list operations
 */
export interface ICompanyCostingYearlyStatsFilters {
  company_id?: number;
  financial_year_id?: number;
  cost_type?: 'direct' | 'operational';
  category_id?: number;
  subcategory_id?: number;
  client_id?: number;
  program_id?: number;
  cohort_id?: number;
}

/**
 * Company Costing Yearly Stats data model
 */
export interface CompanyCostingYearlyStats {
  id: number;
  tenant_id?: number | null;
  client_id: number;
  program_id?: number | null;
  cohort_id?: number | null;
  company_id: number;
  financial_year_id: number;
  cost_type: 'direct' | 'operational';
  category_id?: number | null;
  subcategory_id?: number | null;
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
 * Monthly data interface for bulk updates
 */
export interface MonthlyData {
  m1?: number;
  m2?: number;
  m3?: number;
  m4?: number;
  m5?: number;
  m6?: number;
  m7?: number;
  m8?: number;
  m9?: number;
  m10?: number;
  m11?: number;
  m12?: number;
}

/**
 * Update Monthly Values request interface
 */
export interface UpdateMonthlyValuesRequest {
  id: number;
  monthly_data: MonthlyData;
}

/**
 * Costing Summary interface
 */
export interface CostingSummary {
  [costType: string]: {
    cost_type: string;
    record_count: number;
    total_cost: number;
    monthly_totals: MonthlyData;
  };
}

/**
 * Costing Comparison interface
 */
export interface CostingComparison {
  financial_year_id: number;
  costs: {
    [costType: string]: number;
  };
}

/**
 * Copy Costing request interface
 */
export interface CopyCostingRequest {
  company_id: number;
  from_year_id: number;
  to_year_id: number;
}

/**
 * Copy Costing response interface
 */
export interface CopyCostingResponse {
  success: boolean;
  message: string;
  copied_records: number;
  records: CompanyCostingYearlyStats[];
}

/**
 * Quarterly costing breakdown interface
 */
export interface QuarterlyCostingBreakdown {
  cost_type: string;
  q1_total: number;
  q2_total: number;
  q3_total: number;
  q4_total: number;
  yearly_total: number;
}

/**
 * Quarterly costs response interface
 */
export interface QuarterlyCosts {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;
  start_month: number;
  direct_q1: number;
  direct_q2: number;
  direct_q3: number;
  direct_q4: number;
  direct_total: number;
  operational_q1: number;
  operational_q2: number;
  operational_q3: number;
  operational_q4: number;
  operational_total: number;
  total_costs_q1: number;
  total_costs_q2: number;
  total_costs_q3: number;
  total_costs_q4: number;
  total_costs: number;
  category_breakdown: CategoryCostBreakdown[];
  quarter_details: {
    q1_months: string[];
    q2_months: string[];
    q3_months: string[];
    q4_months: string[];
  };
}

/**
 * Category cost breakdown interface
 */
export interface CategoryCostBreakdown {
  category_id: number | null;
  category_name: string;
  cost_type: string;
  monthly_data: MonthlyData;
  total: number;
}

/**
 * Quarterly costs by category interface
 */
export interface QuarterlyCostsByCategory {
  financial_year_id: number;
  financial_year_name: string;
  categories: CategoryQuarterlyCosts[];
}

/**
 * Category quarterly costs interface
 */
export interface CategoryQuarterlyCosts {
  category_id: number | null;
  category_name: string;
  cost_type: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

/**
 * 📊 Company Costing Yearly Stats Service
 * Handles all yearly costing statistics operations including monthly data,
 * cost type tracking, category-based costing, and summary calculations.
 */
@Injectable({ providedIn: 'root' })
export class CompanyCostingYearlyStatsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-costing-yearly-stats`;

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
   * Add new costing stats record
   */
  addCostingStats(data: Partial<CompanyCostingYearlyStats>): Observable<CompanyCostingYearlyStats> {
    console.log('💰 Adding costing stats:', data);
    return this.http.post<CompanyCostingYearlyStats>(`${this.apiUrl}/add-company-costing-yearly-stats.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Add costing stats')));
  }

  /**
   * Get costing stats by ID
   */
  getCostingStatsById(id: number): Observable<CompanyCostingYearlyStats> {
    return this.http.get<CompanyCostingYearlyStats>(`${this.apiUrl}/get-company-costing-yearly-stats.php?id=${id}`)
      .pipe(catchError(this.handleError('Get costing stats')));
  }

  /**
   * Update costing stats record
   */
  updateCostingStats(id: number, data: Partial<CompanyCostingYearlyStats>): Observable<CompanyCostingYearlyStats> {
    const payload = { id, ...data };
    console.log('💰 Updating costing stats:', { id, data: payload });
    return this.http.post<CompanyCostingYearlyStats>(`${this.apiUrl}/update-company-costing-yearly-stats.php`, payload, this.httpOptions)
      .pipe(catchError(this.handleError('Update costing stats')));
  }

  /**
   * Delete costing stats record
   */
  deleteCostingStats(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.get<{ success: boolean; message: string }>(`${this.apiUrl}/delete-company-costing-yearly-stats.php?id=${id}`)
      .pipe(catchError(this.handleError('Delete costing stats')));
  }

  /**
   * List costing stats with optional filters
   */
  listCostingStats(filters: ICompanyCostingYearlyStatsFilters = {}): Observable<CompanyCostingYearlyStats[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.http.get<CompanyCostingYearlyStats[]>(`${this.apiUrl}/list-company-costing-yearly-stats.php?${params.toString()}`)
      .pipe(catchError(this.handleError('List costing stats')));
  }

  /**
   * Get costing stats by company and financial year
   */
  getCostingByYear(companyId: number, financialYearId: number, costType?: 'direct' | 'operational'): Observable<CompanyCostingYearlyStats[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });
    
    if (costType) {
      params.append('cost_type', costType);
    }

    return this.http.get<CompanyCostingYearlyStats[]>(`${this.apiUrl}/get-company-costing-by-year.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get costing by year')));
  }

  /**
   * Get costing stats by category for a company and year
   */
  getCostingByCategory(companyId: number, financialYearId: number, categoryId: number): Observable<CompanyCostingYearlyStats[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString(),
      category_id: categoryId.toString()
    });

    return this.http.get<CompanyCostingYearlyStats[]>(`${this.apiUrl}/get-company-costing-by-category.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get costing by category')));
  }

  /**
   * Get costing summary for a company and year
   */
  getCostingSummary(companyId: number, financialYearId: number): Observable<CostingSummary> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<CostingSummary>(`${this.apiUrl}/get-company-costing-summary.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get costing summary')));
  }

  /**
   * Update monthly values for a costing record
   */
  updateMonthlyValues(request: UpdateMonthlyValuesRequest): Observable<CompanyCostingYearlyStats> {
    console.log('💰 Updating monthly values:', request);
    return this.http.post<CompanyCostingYearlyStats>(`${this.apiUrl}/update-monthly-values.php`, request, this.httpOptions)
      .pipe(catchError(this.handleError('Update monthly values')));
  }

  /**
   * Upsert (insert or update) costing stats record
   */
  upsertCostingStats(data: Partial<CompanyCostingYearlyStats>): Observable<CompanyCostingYearlyStats> {
    console.log('💰 Upserting costing stats:', data);
    return this.http.post<CompanyCostingYearlyStats>(`${this.apiUrl}/upsert-company-costing.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Upsert costing stats')));
  }

  /**
   * Get costing comparison between multiple years
   */
  getCostingComparison(companyId: number, financialYearIds: number[]): Observable<CostingComparison[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_ids: financialYearIds.join(',')
    });

    return this.http.get<CostingComparison[]>(`${this.apiUrl}/get-company-costing-comparison.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get costing comparison')));
  }

  /**
   * Copy costing data from one year to another
   */
  copyCostingToNewYear(request: CopyCostingRequest): Observable<CopyCostingResponse> {
    console.log('💰 Copying costing to new year:', request);
    return this.http.post<CopyCostingResponse>(`${this.apiUrl}/copy-costing-to-new-year.php`, request, this.httpOptions)
      .pipe(catchError(this.handleError('Copy costing to new year')));
  }

  /**
   * Delete all costing records for a company and year
   */
  deleteCostingByYear(companyId: number, financialYearId: number): Observable<{ success: boolean; message: string; deleted_count: number }> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      financial_year_id: financialYearId.toString()
    });

    return this.http.get<{ success: boolean; message: string; deleted_count: number }>(`${this.apiUrl}/delete-company-costing-by-year.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Delete costing by year')));
  }

  /**
   * Get direct costing stats for a company and year
   */
  getDirectCostingStats(companyId: number, financialYearId: number): Observable<CompanyCostingYearlyStats[]> {
    return this.listCostingStats({
      company_id: companyId,
      financial_year_id: financialYearId,
      cost_type: 'direct'
    });
  }

  /**
   * Get operational costing stats for a company and year
   */
  getOperationalCostingStats(companyId: number, financialYearId: number): Observable<CompanyCostingYearlyStats[]> {
    return this.listCostingStats({
      company_id: companyId,
      financial_year_id: financialYearId,
      cost_type: 'operational'
    });
  }

  /**
   * Get all costing stats for a company across all years
   */
  getAllCompanyCostingStats(companyId: number): Observable<CompanyCostingYearlyStats[]> {
    return this.listCostingStats({ company_id: companyId });
  }

  /**
   * Get costing stats for a specific program
   */
  getProgramCostingStats(programId: number): Observable<CompanyCostingYearlyStats[]> {
    return this.listCostingStats({ program_id: programId });
  }

  /**
   * Get costing stats for a specific cohort
   */
  getCohortCostingStats(cohortId: number): Observable<CompanyCostingYearlyStats[]> {
    return this.listCostingStats({ cohort_id: cohortId });
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
  getMonthlyDataArray(stats: CompanyCostingYearlyStats): number[] {
    return [
      stats.m1, stats.m2, stats.m3, stats.m4, stats.m5, stats.m6,
      stats.m7, stats.m8, stats.m9, stats.m10, stats.m11, stats.m12
    ];
  }

  /**
   * Convert array to monthly data object
   */
  arrayToMonthlyData(monthlyArray: number[]): MonthlyData {
    if (monthlyArray.length !== 12) {
      throw new Error('Monthly array must contain exactly 12 values');
    }

    return {
      m1: monthlyArray[0],
      m2: monthlyArray[1],
      m3: monthlyArray[2],
      m4: monthlyArray[3],
      m5: monthlyArray[4],
      m6: monthlyArray[5],
      m7: monthlyArray[6],
      m8: monthlyArray[7],
      m9: monthlyArray[8],
      m10: monthlyArray[9],
      m11: monthlyArray[10],
      m12: monthlyArray[11]
    };
  }

  /**
   * Calculate quarterly totals from monthly data
   */
  calculateQuarterlyTotals(stats: CompanyCostingYearlyStats): QuarterlyCostingBreakdown {
    return {
      cost_type: stats.cost_type,
      q1_total: stats.m1 + stats.m2 + stats.m3,
      q2_total: stats.m4 + stats.m5 + stats.m6,
      q3_total: stats.m7 + stats.m8 + stats.m9,
      q4_total: stats.m10 + stats.m11 + stats.m12,
      yearly_total: stats.total_amount
    };
  }

  /**
   * Calculate quarterly totals for multiple records
   */
  calculateMultipleQuarterlyTotals(statsArray: CompanyCostingYearlyStats[]): QuarterlyCostingBreakdown[] {
    return statsArray.map(stats => this.calculateQuarterlyTotals(stats));
  }

  /**
   * Calculate growth rate between two periods
   */
  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Group costing stats by cost type
   */
  groupStatsByCostType(stats: CompanyCostingYearlyStats[]): {
    direct: CompanyCostingYearlyStats[];
    operational: CompanyCostingYearlyStats[];
  } {
    return {
      direct: stats.filter(s => s.cost_type === 'direct'),
      operational: stats.filter(s => s.cost_type === 'operational')
    };
  }

  /**
   * Group costing stats by category
   */
  groupStatsByCategory(stats: CompanyCostingYearlyStats[]): Map<number | null, CompanyCostingYearlyStats[]> {
    const grouped = new Map<number | null, CompanyCostingYearlyStats[]>();
    
    for (const stat of stats) {
      const categoryId = stat.category_id ?? null;
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(stat);
    }
    
    return grouped;
  }

  /**
   * Calculate total costing by type
   */
  calculateTotalByType(stats: CompanyCostingYearlyStats[]): { direct: number; operational: number; total: number } {
    const grouped = this.groupStatsByCostType(stats);
    
    const directTotal = grouped.direct.reduce((sum, stat) => sum + stat.total_amount, 0);
    const operationalTotal = grouped.operational.reduce((sum, stat) => sum + stat.total_amount, 0);
    
    return {
      direct: directTotal,
      operational: operationalTotal,
      total: directTotal + operationalTotal
    };
  }

  /**
   * Calculate monthly totals across all records
   */
  calculateMonthlyTotals(stats: CompanyCostingYearlyStats[]): MonthlyData {
    return stats.reduce((totals, stat) => ({
      m1: (totals.m1 || 0) + stat.m1,
      m2: (totals.m2 || 0) + stat.m2,
      m3: (totals.m3 || 0) + stat.m3,
      m4: (totals.m4 || 0) + stat.m4,
      m5: (totals.m5 || 0) + stat.m5,
      m6: (totals.m6 || 0) + stat.m6,
      m7: (totals.m7 || 0) + stat.m7,
      m8: (totals.m8 || 0) + stat.m8,
      m9: (totals.m9 || 0) + stat.m9,
      m10: (totals.m10 || 0) + stat.m10,
      m11: (totals.m11 || 0) + stat.m11,
      m12: (totals.m12 || 0) + stat.m12
    }), {} as MonthlyData);
  }

  /**
   * Find highest costing category
   */
  findHighestCostingCategory(stats: CompanyCostingYearlyStats[]): { categoryId: number | null; total: number } | null {
    if (stats.length === 0) return null;
    
    const categoryTotals = new Map<number | null, number>();
    
    for (const stat of stats) {
      const categoryId = stat.category_id ?? null;
      categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + stat.total_amount);
    }
    
    let highest: { categoryId: number | null; total: number } | null = null;
    
    for (const [categoryId, total] of categoryTotals) {
      if (!highest || total > highest.total) {
        highest = { categoryId, total };
      }
    }
    
    return highest;
  }

  /**
   * Calculate costing performance indicators
   */
  calculatePerformanceIndicators(stats: CompanyCostingYearlyStats[]): {
    totalCosts: number;
    directCostRatio: number;
    operationalCostRatio: number;
    averageMonthlyCost: number;
    categoryCount: number;
    recordCount: number;
  } {
    if (stats.length === 0) {
      return {
        totalCosts: 0,
        directCostRatio: 0,
        operationalCostRatio: 0,
        averageMonthlyCost: 0,
        categoryCount: 0,
        recordCount: 0
      };
    }

    const totals = this.calculateTotalByType(stats);
    const uniqueCategories = new Set(stats.map(s => s.category_id).filter(id => id !== null));
    const monthlyTotals = this.calculateMonthlyTotals(stats);
    const monthlyValues = Object.values(monthlyTotals).filter(val => val !== undefined) as number[];
    const averageMonthlyCost = monthlyValues.reduce((sum, val) => sum + val, 0) / 12;

    return {
      totalCosts: totals.total,
      directCostRatio: totals.total > 0 ? (totals.direct / totals.total) * 100 : 0,
      operationalCostRatio: totals.total > 0 ? (totals.operational / totals.total) * 100 : 0,
      averageMonthlyCost,
      categoryCount: uniqueCategories.size,
      recordCount: stats.length
    };
  }

  /**
   * Validate monthly data completeness
   */
  validateMonthlyDataCompleteness(data: MonthlyData): { isComplete: boolean; missingMonths: string[] } {
    const months = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];
    const missingMonths: string[] = [];
    
    for (const month of months) {
      const value = (data as any)[month];
      if (value === undefined || value === null) {
        missingMonths.push(month);
      }
    }
    
    return {
      isComplete: missingMonths.length === 0,
      missingMonths
    };
  }

  /**
   * Create empty monthly data object
   */
  createEmptyMonthlyData(): MonthlyData {
    return {
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
      m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
    };
  }

  /* =========================================================================
     QUARTERLY COST CALCULATIONS
     ========================================================================= */

  /**
   * Get quarterly costs for a specific company and financial year
   * Returns comprehensive quarterly breakdown of direct and operational costs
   */
  getQuarterlyCosts(companyId: number, financialYearId: number): Observable<QuarterlyCosts> {
    const url = `${this.apiUrl}/get-quarterly-costs.php?company_id=${companyId}&financial_year_id=${financialYearId}`;
    return this.http.get<QuarterlyCosts>(url, this.httpOptions)
      .pipe(catchError(this.handleError('getQuarterlyCosts')));
  }

  /**
   * Get quarterly costs for all financial years of a company
   */
  getQuarterlyCostsAllYears(companyId: number): Observable<QuarterlyCosts[]> {
    const url = `${this.apiUrl}/get-quarterly-costs.php?company_id=${companyId}`;
    return this.http.get<QuarterlyCosts[]>(url, this.httpOptions)
      .pipe(catchError(this.handleError('getQuarterlyCostsAllYears')));
  }

  /**
   * Get quarterly costs broken down by category
   * Useful for detailed category-level analysis and charting
   */
  getQuarterlyCostsByCategory(companyId: number, financialYearId: number): Observable<QuarterlyCostsByCategory> {
    const url = `${this.apiUrl}/get-quarterly-costs.php?company_id=${companyId}&financial_year_id=${financialYearId}&by_category=true`;
    return this.http.get<QuarterlyCostsByCategory>(url, this.httpOptions)
      .pipe(catchError(this.handleError('getQuarterlyCostsByCategory')));
  }
}
