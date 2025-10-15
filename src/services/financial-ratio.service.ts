import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Financial ratio filters for list operations
 */
export interface IFinancialRatioFilters {
  group_name?: 'Profitability Ratios' | 'Liquidity Ratios' | 'Solvency Ratios';
  year_?: number;
  status_id?: number;
  order_by?: 'group_name' | 'title' | 'ratio_value' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Financial ratio data model
 */
export interface FinancialRatio {
  id: number;
  tenant_id?: number | null;
  client_id: number;
  company_id: number;
  program_id?: number | null;
  cohort_id?: number | null;
  year_: number;
  group_name: string;
  title: string;
  variable1_name: string;
  variable1_value: number;
  variable2_name: string;
  variable2_value: number;
  ratio_value: number;
  min_target?: number | null;
  ideal_target?: number | null;
  notes?: string | null;
  status_id: number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * 📊 Financial Ratio Service
 * Handles all ratio-related operations including listing, updating targets,
 * and managing ratio metadata.
 */
@Injectable({ providedIn: 'root' })
export class FinancialRatioService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/ratios`;

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
   * Get ratio by ID
   */
  getRatioById(id: number): Observable<FinancialRatio> {
    return this.http.get<FinancialRatio>(`${this.apiUrl}/get-ratio.php?id=${id}`)
      .pipe(catchError(this.handleError('Get ratio')));
  }

  /**
   * List ratios for a company and year
   */
  listCompanyRatios(companyId: number, year: number, filters: Partial<IFinancialRatioFilters> = {}): Observable<FinancialRatio[]> {
    const params = new URLSearchParams({
      company_id: companyId.toString(),
      year: year.toString(),
      ...filters as any
    });

    return this.http.get<FinancialRatio[]>(`${this.apiUrl}/list-company-ratios.php?${params.toString()}`)
      .pipe(catchError(this.handleError('List company ratios')));
  }

  /**
   * List all ratios for a company across all years
   */
  listAllCompanyRatios(companyId: number): Observable<FinancialRatio[]> {
    return this.http.get<FinancialRatio[]>(`${this.apiUrl}/list-company-ratios.php?company_id=${companyId}`)
      .pipe(catchError(this.handleError('List all company ratios')));
  }

  /**
   * List ratios by group (Profitability, Liquidity, etc.)
   */
  listRatiosByGroup(
    companyId: number,
    year: number,
    group: 'Profitability Ratios' | 'Liquidity Ratios' | 'Solvency Ratios'
  ): Observable<FinancialRatio[]> {
    return this.listCompanyRatios(companyId, year, { group_name: group });
  }

  /**
   * Update ratio targets and notes
   */
  updateRatio(id: number, data: Partial<FinancialRatio>): Observable<FinancialRatio> {
    const payload = {
      id,
      min_target: data.min_target,
      ideal_target: data.ideal_target,
      notes: data.notes,
      status_id: data.status_id
    };

    console.log('🎯 Updating ratio:', { id, data: payload });
    return this.http.post<FinancialRatio>(`${this.apiUrl}/update-ratio.php`, payload, this.httpOptions)
      .pipe(catchError(this.handleError('Update ratio')));
  }

  /**
   * Update only ratio targets (min and ideal)
   */
  updateRatioTargets(id: number, minTarget?: number, idealTarget?: number): Observable<FinancialRatio> {
    return this.updateRatio(id, { 
      min_target: minTarget, 
      ideal_target: idealTarget 
    });
  }

  /**
   * Update ratio notes
   */
  updateRatioNotes(id: number, notes: string): Observable<FinancialRatio> {
    return this.updateRatio(id, { notes });
  }

  /**
   * Toggle ratio status (active/inactive)
   */
  toggleRatioStatus(id: number, isActive: boolean): Observable<FinancialRatio> {
    return this.updateRatio(id, { status_id: isActive ? 1 : 0 });
  }

  /**
   * Helper method to get health status of a ratio
   */
  getRatioHealth(ratio: FinancialRatio): 'excellent' | 'good' | 'warning' | 'critical' {
    if (!ratio.min_target && !ratio.ideal_target) return 'warning';
    const value = ratio.ratio_value;

    if (value >= (ratio.ideal_target ?? 0)) {
      return 'excellent';
    } else if (value >= (ratio.min_target ?? 0)) {
      return 'good';
    } else if (value >= ((ratio.min_target ?? 0) * 0.8)) {
      return 'warning';
    }
    return 'critical';
  }

  /**
   * Helper method to get color for ratio health status
   */
  getRatioHealthColor(health: 'excellent' | 'good' | 'warning' | 'critical'): string {
    switch (health) {
      case 'excellent': return 'text-emerald-600';
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  /**
   * Get background color class for ratio health
   */
  getRatioHealthBackground(health: 'excellent' | 'good' | 'warning' | 'critical'): string {
    switch (health) {
      case 'excellent': return 'bg-emerald-50 border-emerald-200';
      case 'good': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'critical': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  /**
   * Helper method to format ratio value as percentage
   */
  formatRatioValue(value: number | null): string {
    if (value === null) return 'N/A';
    return `${value.toFixed(1)}%`;
  }

  /**
   * Get descriptive status for a ratio
   */
  getRatioStatus(ratio: FinancialRatio): string {
    const health = this.getRatioHealth(ratio);
    const value = this.formatRatioValue(ratio.ratio_value);

    switch (health) {
      case 'excellent':
        return `Strong performance at ${value}`;
      case 'good':
        return `Good performance at ${value}`;
      case 'warning':
        return `Needs improvement at ${value}`;
      case 'critical':
        return `Requires attention at ${value}`;
      default:
        return `Current value: ${value}`;
    }
  }

  /**
   * Group ratios by category
   */
  groupRatiosByCategory(ratios: FinancialRatio[]): Record<string, FinancialRatio[]> {
    return ratios.reduce((groups, ratio) => {
      const group = ratio.group_name;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(ratio);
      return groups;
    }, {} as Record<string, FinancialRatio[]>);
  }

  /**
   * Calculate summary statistics for ratios
   */
  calculateRatioSummary(ratios: FinancialRatio[]): {
    total: number;
    excellent: number;
    good: number;
    warning: number;
    critical: number;
    averageRatio: number;
  } {
    const summary = {
      total: ratios.length,
      excellent: 0,
      good: 0,
      warning: 0,
      critical: 0,
      averageRatio: 0
    };

    if (ratios.length === 0) return summary;

    let totalRatio = 0;
    ratios.forEach(ratio => {
      const health = this.getRatioHealth(ratio);
      summary[health]++;
      totalRatio += ratio.ratio_value || 0;
    });

    summary.averageRatio = totalRatio / ratios.length;
    return summary;
  }
}
