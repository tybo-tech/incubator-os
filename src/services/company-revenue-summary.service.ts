import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyRevenueSummary } from '../models/financial.models';
import { Constants } from './service';

export interface RevenueYearlyData {
  year: number;
  revenue_total: number;
  [key: string]: any;
}

export interface ICompanyRevenueSummaryFilters {
  company_id: number;
  year_?: number;
  client_id?: number;
  program_id?: number | null;
  cohort_id?: number | null;
  status_id?: number;
  order_by?: 'year_' | 'total' | 'margin_pct' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface RevenueDisplayRow {
  id?: number;
  year: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  total: number | null;
  export_q1: number | null;
  export_q2: number | null;
  export_q3: number | null;
  export_q4: number | null;
  export_total: number | null;
  ratio: number | null;
  isEditing?: boolean;
  isNew?: boolean;
}

export interface RevenueCalculationResult {
  revenueTotal: number;
  exportTotal: number;
  exportRatio: number;
}

export interface RevenueSaveData {
  company_id: number;
  client_id: number;
  program_id: number;
  cohort_id: number;
  year_: number;
  revenue_q1: number;
  revenue_q2: number;
  revenue_q3: number;
  revenue_q4: number;
  export_q1: number;
  export_q2: number;
  export_q3: number;
  export_q4: number;
  revenue_total: number;
  export_total: number;
}

export interface ApiResponse<T = any> {
  data?: T[];
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormatOptions {
  showCurrency?: boolean;
  showPercentage?: boolean;
  decimalPlaces?: number;
  locale?: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyRevenueSummaryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-revenue-summary`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Calculate revenue totals and export ratio for a row
   */
  calculateRowTotals(row: RevenueDisplayRow): RevenueCalculationResult {
    // Calculate revenue total (ensure all values are numbers)
    const q1 = Number(row.q1) || 0;
    const q2 = Number(row.q2) || 0;
    const q3 = Number(row.q3) || 0;
    const q4 = Number(row.q4) || 0;
    const revenueTotal = q1 + q2 + q3 + q4;

    // Calculate export total (ensure all values are numbers)
    const export_q1 = Number(row.export_q1) || 0;
    const export_q2 = Number(row.export_q2) || 0;
    const export_q3 = Number(row.export_q3) || 0;
    const export_q4 = Number(row.export_q4) || 0;
    const exportTotal = export_q1 + export_q2 + export_q3 + export_q4;

    // Calculate ratio (export / revenue * 100)
    const exportRatio = revenueTotal > 0 ? (exportTotal / revenueTotal) * 100 : 0;

    return {
      revenueTotal,
      exportTotal,
      exportRatio
    };
  }

  /**
   * Update row totals in place
   */
  updateRowTotals(row: RevenueDisplayRow): void {
    const result = this.calculateRowTotals(row);
    row.total = result.revenueTotal;
    row.export_total = result.exportTotal;
    row.ratio = result.exportRatio;
  }

  /**
   * Create a new revenue row with default values
   */
  createNewRevenueRow(year: number): RevenueDisplayRow {
    return {
      year: year,
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      total: 0,
      export_q1: null,
      export_q2: null,
      export_q3: null,
      export_q4: null,
      export_total: 0,
      ratio: 0,
      isNew: true,
      isEditing: true
    };
  }

  /**
   * Map backend data to display row format
   */
  mapToDisplayRow(item: CompanyRevenueSummary | any): RevenueDisplayRow {
    // Handle both old and new field names for compatibility
    const q1 = item.revenue_q1 ?? item.q1 ?? 0;
    const q2 = item.revenue_q2 ?? item.q2 ?? 0;
    const q3 = item.revenue_q3 ?? item.q3 ?? 0;
    const q4 = item.revenue_q4 ?? item.q4 ?? 0;

    const row: RevenueDisplayRow = {
      id: item.id,
      year: item.year_,
      q1: q1,
      q2: q2,
      q3: q3,
      q4: q4,
      total: 0,
      export_q1: item.export_q1 ?? null,
      export_q2: item.export_q2 ?? null,
      export_q3: item.export_q3 ?? null,
      export_q4: item.export_q4 ?? null,
      export_total: 0,
      ratio: 0
    };

    // Calculate totals
    this.updateRowTotals(row);
    return row;
  }

  /**
   * Convert display row to save data format
   */
  mapToSaveData(row: RevenueDisplayRow, companyId: number, clientId: number, programId: number, cohortId: number): RevenueSaveData {
    const calculations = this.calculateRowTotals(row);

    return {
      company_id: companyId,
      client_id: clientId,
      program_id: programId,
      cohort_id: cohortId,
      year_: row.year,
      revenue_q1: Number(row.q1) || 0,
      revenue_q2: Number(row.q2) || 0,
      revenue_q3: Number(row.q3) || 0,
      revenue_q4: Number(row.q4) || 0,
      export_q1: Number(row.export_q1) || 0,
      export_q2: Number(row.export_q2) || 0,
      export_q3: Number(row.export_q3) || 0,
      export_q4: Number(row.export_q4) || 0,
      revenue_total: calculations.revenueTotal,
      export_total: calculations.exportTotal
      // Note: export_ratio omitted - let backend calculate to avoid DB constraints
    };
  }

  /**
   * Process API response and handle different response formats
   */
  processApiResponse<T>(response: T | ApiResponse<T> | T[]): T[] {
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
      return (response as ApiResponse<T>).data || [];
    } else if (response && typeof response === 'object') {
      // If response is an object, try to find an array property
      const possibleArrays = Object.values(response).filter(val => Array.isArray(val));
      return possibleArrays.length > 0 ? possibleArrays[0] as T[] : [];
    } else {
      return [];
    }
  }

  /**
   * Sort revenue rows by year (newest first)
   */
  sortRowsByYear(rows: RevenueDisplayRow[]): RevenueDisplayRow[] {
    return rows.sort((a, b) => b.year - a.year);
  }

  /**
   * Check for duplicate years in the rows array
   */
  checkForDuplicateYear(rows: RevenueDisplayRow[], targetRow: RevenueDisplayRow, year: number): boolean {
    return rows.some(row => row !== targetRow && row.year === year);
  }

  /**
   * Validate revenue row data
   */
  validateRevenueRow(row: RevenueDisplayRow): ValidationResult {
    const errors: string[] = [];

    // Year validation
    if (!row.year || row.year < 2000 || row.year > 2030) {
      errors.push('Year must be between 2000 and 2030');
    }

    // Revenue values validation
    if (row.q1 !== null && (row.q1 < 0 || row.q1 > 999999999)) {
      errors.push('Q1 revenue must be between 0 and 999,999,999');
    }
    if (row.q2 !== null && (row.q2 < 0 || row.q2 > 999999999)) {
      errors.push('Q2 revenue must be between 0 and 999,999,999');
    }
    if (row.q3 !== null && (row.q3 < 0 || row.q3 > 999999999)) {
      errors.push('Q3 revenue must be between 0 and 999,999,999');
    }
    if (row.q4 !== null && (row.q4 < 0 || row.q4 > 999999999)) {
      errors.push('Q4 revenue must be between 0 and 999,999,999');
    }

    // Export values validation
    if (row.export_q1 !== null && (row.export_q1 < 0 || row.export_q1 > 999999999)) {
      errors.push('Q1 export revenue must be between 0 and 999,999,999');
    }
    if (row.export_q2 !== null && (row.export_q2 < 0 || row.export_q2 > 999999999)) {
      errors.push('Q2 export revenue must be between 0 and 999,999,999');
    }
    if (row.export_q3 !== null && (row.export_q3 < 0 || row.export_q3 > 999999999)) {
      errors.push('Q3 export revenue must be between 0 and 999,999,999');
    }
    if (row.export_q4 !== null && (row.export_q4 < 0 || row.export_q4 > 999999999)) {
      errors.push('Q4 export revenue must be between 0 and 999,999,999');
    }

    // Logical validation: export should not exceed revenue
    const calculations = this.calculateRowTotals(row);
    if (calculations.exportTotal > calculations.revenueTotal && calculations.revenueTotal > 0) {
      errors.push('Export revenue cannot exceed total revenue');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format currency value with consistent formatting
   */
  formatCurrency(value: number | null, options: FormatOptions = {}): string {
    if (value === null || value === undefined) return '-';

    const {
      decimalPlaces = 0,
      locale = 'en-US'
    } = options;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: Constants.Currency,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value);
  }

  /**
   * Format percentage value with consistent formatting
   */
  formatPercentage(value: number | null, options: FormatOptions = {}): string {
    if (value === null || value === undefined) return '-%';

    const {
      decimalPlaces = 0
    } = options;

    return `${value.toFixed(decimalPlaces)}%`;
  }

  addCompanyRevenueSummary(data: RevenueSaveData): Observable<CompanyRevenueSummary> {
    console.log('Sending data to API:', data);
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/add-company-revenue-summary.php`, data, this.httpOptions);
  }

  updateCompanyRevenueSummary(id: number, data: RevenueSaveData): Observable<CompanyRevenueSummary> {
    const payload = { id, ...data };
    console.log('CompanyRevenueSummaryService - updateCompanyRevenueSummary called with:', { id, data, payload });
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/update-company-revenue-summary.php`, payload, this.httpOptions);
  }

  getCompanyRevenueSummaryById(id: number): Observable<CompanyRevenueSummary> {
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/get-company-revenue-summary.php`, { id }, this.httpOptions);
  }

  /**
   * List revenue summary records for a company with optional filters
   * @param filters Filtering and sorting options
   */
  listCompanyRevenueSummary(filters: ICompanyRevenueSummaryFilters): Observable<RevenueDisplayRow[]> {
    return this.http.post<CompanyRevenueSummary[] | ApiResponse<CompanyRevenueSummary>>(`${this.apiUrl}/list-company-revenue-summary.php?company_id=${filters.company_id}`, filters, this.httpOptions)
      .pipe(
        map(response => {
          const data = this.processApiResponse(response);
          return data.map(item => this.mapToDisplayRow(item));
        })
      );
  }

  /**
   * List all revenue summary records for a company, sorted by year descending
   * @param companyId The ID of the company
   */
  listAllCompanyRevenueSummary(companyId: number): Observable<RevenueDisplayRow[]> {
    return this.listCompanyRevenueSummary({
      company_id: companyId,
      order_by: 'year_',
      order_dir: 'DESC'
    });
  }

  /**
   * List revenue summary records for a specific year
   * @param companyId The ID of the company
   * @param year The year to filter by
   */
  listRevenueSummaryByYear(companyId: number, year: number): Observable<RevenueDisplayRow[]> {
    return this.listCompanyRevenueSummary({
      company_id: companyId,
      year_: year,
      order_by: 'year_',
      order_dir: 'ASC'
    });
  }

  /**
   * Get latest revenue summary record for a company
   * @param companyId The ID of the company
   */
  getLatestRevenueSummary(companyId: number): Observable<CompanyRevenueSummary> {
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/get-company-revenue-summary.php`, {
      company_id: companyId,
      latest: true
    }, this.httpOptions);
  }

  deleteCompanyRevenueSummary(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-revenue-summary.php`, { id });
  }

  /**
   * Get yearly revenue trend for margin calculations in profits component
   * @param companyId The ID of the company
   */
  getCompanyRevenueYearlyTrend(companyId: number): Observable<RevenueYearlyData[]> {
    return this.http.get<RevenueYearlyData[]>(`${this.apiUrl}/get-company-revenue-yearly-trend.php?company_id=${companyId}`)
      .pipe(
        map(response => {
          // Handle different response formats
          const data = this.processApiResponse(response);
          return data.map((item: any) => ({
            year: parseInt(item.year_ || item.year, 10),
            revenue_total: parseFloat(item.revenue_total || item.total || '0'),
            export_total: parseFloat(item.export_total || '0'),
            export_ratio: parseFloat(item.export_ratio || '0'),
            ...item
          }));
        })
      );
  }
}
