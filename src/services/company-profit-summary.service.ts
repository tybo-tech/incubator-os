import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CompanyProfitSummary,
  ICompanyProfitSummaryFilters,
  ProfitType,
  CompanyProfitRecord,
  ProfitSectionDisplay,
  ProfitDisplayRow,
  ProfitCalculationResult,
  ProfitSaveData,
  ProfitSectionData,
  ApiResponse,
  ValidationResult,
  FormatOptions
} from '../models/financial.models';
import { Constants } from './service';

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
   * Helper method to safely convert values to numbers
   */
  private toNum(value: any): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

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
        type: 'npbt',
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

  // ===== NEW UNIFIED RECORD METHODS =====

  /**
   * Create a new unified profit record for a given year
   */
  createNewProfitRecord(year: number, companyId: number, clientId: number): CompanyProfitRecord {
    return {
      client_id: clientId,
      company_id: companyId,
      year_: year,

      // Initialize all fields to 0
      gross_q1: 0,
      gross_q2: 0,
      gross_q3: 0,
      gross_q4: 0,
      gross_margin: 0,

      operating_q1: 0,
      operating_q2: 0,
      operating_q3: 0,
      operating_q4: 0,
      operating_margin: 0,

      npbt_q1: 0,
      npbt_q2: 0,
      npbt_q3: 0,
      npbt_q4: 0,
      npbt_margin: 0,

      unit: 'USD',
      status_id: 1,
      isNew: true,
      isEditing: true,
      hasChanges: false
    };
  }

  /**
   * Convert unified record to section display data
   */
  recordToSectionDisplays(record: CompanyProfitRecord): ProfitSectionDisplay[] {
    return [
      {
        type: 'gross',
        label: 'Gross Profit',
        q1: record.gross_q1 || 0,
        q2: record.gross_q2 || 0,
        q3: record.gross_q3 || 0,
        q4: record.gross_q4 || 0,
        total: record.gross_total || ((record.gross_q1 || 0) + (record.gross_q2 || 0) + (record.gross_q3 || 0) + (record.gross_q4 || 0)),
        margin: record.gross_margin || 0
      },
      {
        type: 'operating',
        label: 'Operating Profit',
        q1: record.operating_q1 || 0,
        q2: record.operating_q2 || 0,
        q3: record.operating_q3 || 0,
        q4: record.operating_q4 || 0,
        total: record.operating_total || ((record.operating_q1 || 0) + (record.operating_q2 || 0) + (record.operating_q3 || 0) + (record.operating_q4 || 0)),
        margin: record.operating_margin || 0
      },
      {
        type: 'npbt',
        label: 'Net profit before tax',
        q1: record.npbt_q1 || 0,
        q2: record.npbt_q2 || 0,
        q3: record.npbt_q3 || 0,
        q4: record.npbt_q4 || 0,
        total: record.npbt_total || ((record.npbt_q1 || 0) + (record.npbt_q2 || 0) + (record.npbt_q3 || 0) + (record.npbt_q4 || 0)),
        margin: record.npbt_margin || 0
      }
    ];
  }

  /**
   * Update specific section data in a unified record
   */
  updateRecordSection(record: CompanyProfitRecord, section: ProfitSectionDisplay): CompanyProfitRecord {
    const updatedRecord = { ...record };

    switch (section.type) {
      case 'gross':
        updatedRecord.gross_q1 = section.q1;
        updatedRecord.gross_q2 = section.q2;
        updatedRecord.gross_q3 = section.q3;
        updatedRecord.gross_q4 = section.q4;
        updatedRecord.gross_margin = section.margin;
        break;
      case 'operating':
        updatedRecord.operating_q1 = section.q1;
        updatedRecord.operating_q2 = section.q2;
        updatedRecord.operating_q3 = section.q3;
        updatedRecord.operating_q4 = section.q4;
        updatedRecord.operating_margin = section.margin;
        break;
      case 'npbt':
        updatedRecord.npbt_q1 = section.q1;
        updatedRecord.npbt_q2 = section.q2;
        updatedRecord.npbt_q3 = section.q3;
        updatedRecord.npbt_q4 = section.q4;
        updatedRecord.npbt_margin = section.margin;
        break;
    }

    updatedRecord.hasChanges = true;
    return updatedRecord;
  }

  /**
   * Get all profit records for a company
   */
  getCompanyProfitRecords(filters: ICompanyProfitSummaryFilters): Observable<CompanyProfitRecord[]> {
    const url = `${this.apiUrl}/list-company-profit-summary.php?company_id=${filters.company_id}`;

    return this.http.get<any>(url, this.httpOptions).pipe(
      map(response => {
        const data = this.processApiResponse(response);
        // Convert API data to our unified record format
        return data.map(item => this.mapApiDataToRecord(item));
      })
    );
  }

  /**
   * Map API data to unified record format
   */
  private mapApiDataToRecord(item: any): CompanyProfitRecord {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      client_id: item.client_id,
      company_id: item.company_id,
      program_id: item.program_id,
      cohort_id: item.cohort_id,
      year_: item.year_,

      gross_q1: this.toNum(item.gross_q1),
      gross_q2: this.toNum(item.gross_q2),
      gross_q3: this.toNum(item.gross_q3),
      gross_q4: this.toNum(item.gross_q4),
      gross_total: this.toNum(item.gross_total),
      gross_margin: this.toNum(item.gross_margin),

      operating_q1: this.toNum(item.operating_q1),
      operating_q2: this.toNum(item.operating_q2),
      operating_q3: this.toNum(item.operating_q3),
      operating_q4: this.toNum(item.operating_q4),
      operating_total: this.toNum(item.operating_total),
      operating_margin: this.toNum(item.operating_margin),

      npbt_q1: this.toNum(item.npbt_q1),
      npbt_q2: this.toNum(item.npbt_q2),
      npbt_q3: this.toNum(item.npbt_q3),
      npbt_q4: this.toNum(item.npbt_q4),
      npbt_total: this.toNum(item.npbt_total),
      npbt_margin: this.toNum(item.npbt_margin),

      unit: item.unit || 'USD',
      notes: item.notes,
      title: item.title,
      status_id: item.status_id || 1,
      created_by: item.created_by,
      updated_by: item.updated_by,
      created_at: item.created_at,
      updated_at: item.updated_at,

      isEditing: false,
      isNew: false,
      hasChanges: false
    };
  }

  /**
   * Save a unified profit record
   */
  saveProfitRecord(record: CompanyProfitRecord): Observable<any> {
    const endpoint = record.id ? 'update.php' : 'create.php';
    const url = `${this.apiUrl}/${endpoint}`;

    // Prepare data for API
    const saveData = {
      id: record.id,
      client_id: record.client_id,
      company_id: record.company_id,
      program_id: record.program_id,
      cohort_id: record.cohort_id,
      year_: record.year_,

      gross_q1: record.gross_q1,
      gross_q2: record.gross_q2,
      gross_q3: record.gross_q3,
      gross_q4: record.gross_q4,
      gross_margin: record.gross_margin,

      operating_q1: record.operating_q1,
      operating_q2: record.operating_q2,
      operating_q3: record.operating_q3,
      operating_q4: record.operating_q4,
      operating_margin: record.operating_margin,

      npbt_q1: record.npbt_q1,
      npbt_q2: record.npbt_q2,
      npbt_q3: record.npbt_q3,
      npbt_q4: record.npbt_q4,
      npbt_margin: record.npbt_margin,

      unit: record.unit,
      notes: record.notes,
      title: record.title,
      status_id: record.status_id
    };

    return record.id
      ? this.http.put(url, saveData, this.httpOptions)
      : this.http.post(url, saveData, this.httpOptions);
  }

  /**
   * Quick method to create and save a new profit record for a specific year
   */
  createProfitRecordForYear(year: number, companyId: number, clientId: number, programId?: number, cohortId?: number): Observable<any> {
    const newRecord = this.createNewProfitRecord(year, companyId, clientId);
    if (programId) newRecord.program_id = programId;
    if (cohortId) newRecord.cohort_id = cohortId;

    return this.saveProfitRecord(newRecord);
  }

  /**
   * Calculate real-time margin percentage based on revenue
   * Useful for cross-linking with revenue summary data
   */
  calculateMarginWithRevenue(profitTotal: number, revenueTotal: number): number {
    if (!revenueTotal || revenueTotal === 0) return 0;
    return (profitTotal / revenueTotal) * 100;
  }

  /**
   * Update profit margins across all types for a given year when revenue changes
   */
  updateMarginsForYear(record: CompanyProfitRecord, revenueTotal: number): CompanyProfitRecord {
    const updatedRecord = { ...record };

    // Calculate totals for each profit type
    const grossTotal = (record.gross_q1 || 0) + (record.gross_q2 || 0) + (record.gross_q3 || 0) + (record.gross_q4 || 0);
    const operatingTotal = (record.operating_q1 || 0) + (record.operating_q2 || 0) + (record.operating_q3 || 0) + (record.operating_q4 || 0);
    const npbtTotal = (record.npbt_q1 || 0) + (record.npbt_q2 || 0) + (record.npbt_q3 || 0) + (record.npbt_q4 || 0);

    // Update margins
    updatedRecord.gross_margin = this.calculateMarginWithRevenue(grossTotal, revenueTotal);
    updatedRecord.operating_margin = this.calculateMarginWithRevenue(operatingTotal, revenueTotal);
    updatedRecord.npbt_margin = this.calculateMarginWithRevenue(npbtTotal, revenueTotal);

    updatedRecord.hasChanges = true;
    return updatedRecord;
  }

  // ===== END NEW UNIFIED RECORD METHODS =====

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
  validateProfitRow(row: ProfitDisplayRow, existingRows?: ProfitDisplayRow[]): ValidationResult {
    const errors: string[] = [];

    // Year validation
    if (!row.year || row.year < 2000 || row.year > 2030) {
      errors.push('Year must be between 2000 and 2030');
    }

    // Type validation
    if (!row.type || !['gross', 'operating', 'npbt'].includes(row.type)) {
      errors.push('Profit type must be one of: gross, operating, npbt');
    }

    // Duplicate year check
    if (existingRows && this.checkForDuplicateYear(existingRows, row, row.year)) {
      errors.push(`Year ${row.year} already exists for ${row.type} profit`);
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

    // Margin sanity check
    if (row.margin_pct !== null && row.margin_pct > 1000) {
      errors.push('Margin percentage seems unusually high (>1000%). Please verify.');
    }
    if (row.margin_pct !== null && row.margin_pct < -1000) {
      errors.push('Margin percentage seems unusually low (<-1000%). Please verify.');
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
    return this.http.post<CompanyProfitSummary[] | ApiResponse<CompanyProfitSummary>>(`${this.apiUrl}/list-company-profit-summary.php?company_id=${filters.company_id}`, filters, this.httpOptions)
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
   * List profit summary records by type (gross, operating, npbt)
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
