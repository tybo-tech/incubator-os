import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyProfitSummary } from '../models/financial.models';
import { Constants } from './service';

export interface ICompanyProfitSummaryFilters {
  company_id: number;
  year_?: number;
  type?: 'gross' | 'operating' | 'net' | 'before_tax';
  client_id?: number;
  program_id?: number | null;
  cohort_id?: number | null;
  status_id?: number;
  order_by?: 'year_' | 'total' | 'margin_pct' | 'type' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export type ProfitType = 'gross' | 'operating' | 'net' | 'before_tax';

export interface ProfitDisplayRow {
  id?: number;
  year: number;
  type: ProfitType;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  total: number | null;
  margin_pct: number | null;
  isEditing?: boolean;
  isNew?: boolean;
}

export interface ProfitCalculationResult {
  total: number;
  marginPct: number;
}

export interface ProfitSaveData {
  company_id: number;
  client_id: number;
  program_id: number;
  cohort_id: number;
  year_: number;
  type: ProfitType;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
  margin_pct: number;
}

export interface ProfitSectionData {
  type: ProfitType;
  displayName: string;
  rows: ProfitDisplayRow[];
  icon: string;
  color: string;
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
export class CompanyProfitSummaryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-profit-summary`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Get profit section configurations
   */
  getProfitSections(): ProfitSectionData[] {
    return [
      {
        type: 'gross',
        displayName: 'Gross Profit',
        rows: [],
        icon: 'fas fa-chart-line',
        color: 'green'
      },
      {
        type: 'operating',
        displayName: 'Operating Profit',
        rows: [],
        icon: 'fas fa-cogs',
        color: 'blue'
      },
      {
        type: 'before_tax',
        displayName: 'Net profit before tax',
        rows: [],
        icon: 'fas fa-calculator',
        color: 'purple'
      }
    ];
  }

  /**
   * Calculate profit totals and margin percentage
   */
  calculateProfitTotals(row: ProfitDisplayRow, revenueTotal?: number): ProfitCalculationResult {
    // Calculate total (ensure all values are numbers)
    const q1 = Number(row.q1) || 0;
    const q2 = Number(row.q2) || 0;
    const q3 = Number(row.q3) || 0;
    const q4 = Number(row.q4) || 0;
    const total = q1 + q2 + q3 + q4;

    // Calculate margin percentage (profit / revenue * 100)
    const marginPct = revenueTotal && revenueTotal > 0 ? (total / revenueTotal) * 100 : 0;

    return {
      total,
      marginPct
    };
  }

  /**
   * Update row totals in place
   */
  updateRowTotals(row: ProfitDisplayRow, revenueTotal?: number): void {
    const result = this.calculateProfitTotals(row, revenueTotal);
    row.total = result.total;
    row.margin_pct = result.marginPct;
  }

  /**
   * Create a new profit row with default values
   */
  createNewProfitRow(year: number, type: ProfitType): ProfitDisplayRow {
    return {
      year: year,
      type: type,
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      total: 0,
      margin_pct: 0,
      isNew: true,
      isEditing: true
    };
  }

  /**
   * Map backend data to display row format
   */
  mapToDisplayRow(item: CompanyProfitSummary | any): ProfitDisplayRow {
    const q1 = item.q1 ?? 0;
    const q2 = item.q2 ?? 0;
    const q3 = item.q3 ?? 0;
    const q4 = item.q4 ?? 0;

    const row: ProfitDisplayRow = {
      id: item.id,
      year: item.year_,
      type: item.type || 'gross',
      q1: q1,
      q2: q2,
      q3: q3,
      q4: q4,
      total: 0,
      margin_pct: item.margin_pct ?? 0
    };

    // Calculate totals
    this.updateRowTotals(row);
    return row;
  }

  /**
   * Convert display row to save data format
   */
  mapToSaveData(row: ProfitDisplayRow, companyId: number, clientId: number, programId: number, cohortId: number): ProfitSaveData {
    const calculations = this.calculateProfitTotals(row);

    return {
      company_id: companyId,
      client_id: clientId,
      program_id: programId,
      cohort_id: cohortId,
      year_: row.year,
      type: row.type,
      q1: Number(row.q1) || 0,
      q2: Number(row.q2) || 0,
      q3: Number(row.q3) || 0,
      q4: Number(row.q4) || 0,
      total: calculations.total,
      margin_pct: calculations.marginPct
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
   * Sort profit rows by year (newest first)
   */
  sortRowsByYear(rows: ProfitDisplayRow[]): ProfitDisplayRow[] {
    return rows.sort((a, b) => b.year - a.year);
  }

  /**
   * Group profit rows by type
   */
  groupRowsByType(rows: ProfitDisplayRow[]): Map<ProfitType, ProfitDisplayRow[]> {
    const groups = new Map<ProfitType, ProfitDisplayRow[]>();

    rows.forEach(row => {
      if (!groups.has(row.type)) {
        groups.set(row.type, []);
      }
      groups.get(row.type)!.push(row);
    });

    // Sort each group by year
    groups.forEach((groupRows, type) => {
      groups.set(type, this.sortRowsByYear(groupRows));
    });

    return groups;
  }

  /**
   * Check for duplicate years within a profit type
   */
  checkForDuplicateYear(rows: ProfitDisplayRow[], targetRow: ProfitDisplayRow, year: number): boolean {
    return rows.some(row => row !== targetRow && row.year === year && row.type === targetRow.type);
  }

  /**
   * Validate profit row data
   */
  validateProfitRow(row: ProfitDisplayRow): ValidationResult {
    const errors: string[] = [];

    // Year validation
    if (!row.year || row.year < 2000 || row.year > 2030) {
      errors.push('Year must be between 2000 and 2030');
    }

    // Type validation
    if (!row.type || !['gross', 'operating', 'net', 'before_tax'].includes(row.type)) {
      errors.push('Profit type must be one of: gross, operating, net, before_tax');
    }

    // Profit values validation
    if (row.q1 !== null && (row.q1 < -999999999 || row.q1 > 999999999)) {
      errors.push('Q1 profit must be between -999,999,999 and 999,999,999');
    }
    if (row.q2 !== null && (row.q2 < -999999999 || row.q2 > 999999999)) {
      errors.push('Q2 profit must be between -999,999,999 and 999,999,999');
    }
    if (row.q3 !== null && (row.q3 < -999999999 || row.q3 > 999999999)) {
      errors.push('Q3 profit must be between -999,999,999 and 999,999,999');
    }
    if (row.q4 !== null && (row.q4 < -999999999 || row.q4 > 999999999)) {
      errors.push('Q4 profit must be between -999,999,999 and 999,999,999');
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

  addCompanyProfitSummary(data: ProfitSaveData): Observable<CompanyProfitSummary> {
    console.log('Sending data to API:', data);
    return this.http.post<CompanyProfitSummary>(`${this.apiUrl}/add-company-profit-summary.php`, data, this.httpOptions);
  }

  updateCompanyProfitSummary(id: number, data: ProfitSaveData): Observable<CompanyProfitSummary> {
    const payload = { id, ...data };
    console.log('CompanyProfitSummaryService - updateCompanyProfitSummary called with:', { id, data, payload });
    return this.http.post<CompanyProfitSummary>(`${this.apiUrl}/update-company-profit-summary.php`, payload, this.httpOptions);
  }

  getCompanyProfitSummaryById(id: number): Observable<CompanyProfitSummary> {
    return this.http.post<CompanyProfitSummary>(`${this.apiUrl}/get-company-profit-summary.php`, { id }, this.httpOptions);
  }

  /**
   * List profit summary records for a company with optional filters
   * @param filters Filtering and sorting options
   */
  listCompanyProfitSummary(filters: ICompanyProfitSummaryFilters): Observable<ProfitDisplayRow[]> {
    return this.http.post<CompanyProfitSummary[] | ApiResponse<CompanyProfitSummary>>(`${this.apiUrl}/list-company-profit-summary.php`, filters, this.httpOptions)
      .pipe(
        map(response => {
          const data = this.processApiResponse(response);
          return data.map(item => this.mapToDisplayRow(item));
        })
      );
  }

  /**
   * List all profit summary records for a company, sorted by year descending
   * @param companyId The ID of the company
   */
  listAllCompanyProfitSummary(companyId: number): Observable<ProfitDisplayRow[]> {
    return this.listCompanyProfitSummary({
      company_id: companyId,
      order_by: 'year_',
      order_dir: 'DESC'
    });
  }

  /**
   * List profit summary records for a specific year
   * @param companyId The ID of the company
   * @param year The year to filter by
   */
  listProfitSummaryByYear(companyId: number, year: number): Observable<ProfitDisplayRow[]> {
    return this.listCompanyProfitSummary({
      company_id: companyId,
      year_: year,
      order_by: 'year_',
      order_dir: 'ASC'
    });
  }

  /**
   * List profit summary records by type (gross, operating, net, before_tax)
   * @param companyId The ID of the company
   * @param type The profit type to filter by
   */
  listProfitSummaryByType(companyId: number, type: ProfitType): Observable<ProfitDisplayRow[]> {
    return this.listCompanyProfitSummary({
      company_id: companyId,
      type: type,
      order_by: 'year_',
      order_dir: 'DESC'
    });
  }

  /**
   * Get latest profit summary record for a company
   * @param companyId The ID of the company
   */
  getLatestProfitSummary(companyId: number): Observable<CompanyProfitSummary> {
    return this.http.post<CompanyProfitSummary>(`${this.apiUrl}/get-company-profit-summary.php`, {
      company_id: companyId,
      latest: true
    }, this.httpOptions);
  }

  deleteCompanyProfitSummary(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-profit-summary.php`, { id });
  }
}
