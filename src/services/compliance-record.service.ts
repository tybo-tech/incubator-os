import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';
import { ComplianceRecord } from '../models/ComplianceRecord';

/**
 * Compliance Record filters interface
 * ✅ MATCHES API QUERY PARAMETERS - Uses snake_case
 */
export interface ComplianceRecordFilters {
  tenant_id?: number;
  client_id?: number;
  program_id?: number;
  cohort_id?: number;
  company_id?: number;
  financial_year_id?: number;
  type?: 'annual_returns' | 'tax_returns' | 'bbbee_certificate' | 'cipc_registration' | 'vat_registration' | 'paye_registration' | 'uif_registration' | 'workmen_compensation' | 'other';
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Compliance Record statistics interface
 */
export interface ComplianceRecordStatistics {
  total_records: number;
  by_type: {
    annual_return: number;
    beneficial_ownership: number;
    tax_registration: number;
    bbbee_compliance: number;
    statutory_task: number;
  };
  by_status: Record<string, number>;
  average_progress: number;
  completion_rate: number;
  recent_activity: number;
}

/**
 * Bulk operation result interface
 */
export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: number;
  results: Array<{
    success: boolean;
    id?: number;
    error?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ComplianceRecordService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/compliance-records`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /* =========================================================================
     CORE CRUD OPERATIONS
     ========================================================================= */

  /**
   * Get all compliance records with optional filters
   * ✅ NO CONVERSION - Passes snake_case directly to API
   */
  getAllComplianceRecords(filters?: ComplianceRecordFilters): Observable<ComplianceRecord[]> {
    console.log('📋 Getting all compliance records with filters:', filters);

    let url = `${this.apiUrl}/get-compliance-records.php`;
    if (filters) {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ComplianceRecordFilters] !== undefined) {
          params.append(key, String(filters[key as keyof ComplianceRecordFilters]));
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<{ success: boolean; data: ComplianceRecord[] }>(url)
      .pipe(
        catchError(this.handleError('Get all compliance records')),
        this.extractData()
      );
  }

  /**
   * Get compliance record by ID
   */
  getComplianceRecordById(id: number): Observable<ComplianceRecord> {
    console.log('📋 Getting compliance record by ID:', id);
    return this.http.get<{ success: boolean; data: ComplianceRecord }>(`${this.apiUrl}/get-compliance-record.php?id=${id}`)
      .pipe(
        catchError(this.handleError('Get compliance record by ID')),
        this.extractSingleData()
      );
  }

  /**
   * Add new compliance record
   * ✅ NO CONVERSION - Passes object directly to API
   */
  addComplianceRecord(data: Partial<ComplianceRecord>): Observable<ComplianceRecord> {
    console.log('📋 Adding compliance record:', data);

    return this.http.post<{ success: boolean; data: ComplianceRecord }>(`${this.apiUrl}/add-compliance-record.php`, data, this.httpOptions)
      .pipe(
        catchError(this.handleError('Add compliance record')),
        this.extractSingleData()
      );
  }

  /**
   * Update compliance record
   * ✅ NO CONVERSION - Passes object directly to API
   * ✅ Using POST to match PHP backend (reads from php://input)
   */
  updateComplianceRecord(id: number, data: Partial<ComplianceRecord>): Observable<ComplianceRecord> {
    console.log('\n🌐 ========== SERVICE API CALL ==========');
    console.log('🌐 [SERVICE] Method: POST');
    console.log('🌐 [SERVICE] URL:', `${this.apiUrl}/update-compliance-record.php?id=${id}`);
    console.log('🌐 [SERVICE] Payload (data param):', data);
    console.log('🌐 [SERVICE] Payload JSON:', JSON.stringify(data, null, 2));
    console.log('🌐 [SERVICE] Headers:', this.httpOptions.headers);
    console.log('🌐 ========== SENDING REQUEST... ==========\n');

    return this.http.post<{ success: boolean; data: ComplianceRecord }>(`${this.apiUrl}/update-compliance-record.php?id=${id}`, data, this.httpOptions)
      .pipe(
        catchError(this.handleError('Update compliance record')),
        this.extractSingleData()
      );
  }

  /**
   * Delete compliance record
   */
  deleteComplianceRecord(id: number): Observable<any> {
    console.log('📋 Deleting compliance record:', id);
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/delete-compliance-record.php?id=${id}`)
      .pipe(catchError(this.handleError('Delete compliance record')));
  }

  /* =========================================================================
     SPECIALIZED OPERATIONS
     ========================================================================= */

  /**
   * Get compliance records by company
   */
  getComplianceRecordsByCompany(companyId: number, filters?: ComplianceRecordFilters): Observable<ComplianceRecord[]> {
    console.log('📋 Getting compliance records by company:', companyId);
    return this.http.get<{ success: boolean; data: ComplianceRecord[] }>(`${this.apiUrl}/get-company-compliance.php?company_id=${companyId}`)
      .pipe(
        catchError(this.handleError('Get compliance records by company')),
        this.extractData()
      );
  }

  /**
   * Get compliance records by type
   */
  getComplianceRecordsByType(type: string, filters?: ComplianceRecordFilters): Observable<ComplianceRecord[]> {
    console.log('📋 Getting compliance records by type:', type);
    const typeFilters = { ...filters, type: type as any };
    return this.getAllComplianceRecords(typeFilters);
  }

  /**
   * Get compliance records by status
   */
  getComplianceRecordsByStatus(status: string, filters?: ComplianceRecordFilters): Observable<ComplianceRecord[]> {
    console.log('📋 Getting compliance records by status:', status);
    const statusFilters = { ...filters, status };
    return this.getAllComplianceRecords(statusFilters);
  }

  /**
   * Get compliance statistics
   * ✅ Using snake_case filter properties
   */
  getComplianceStatistics(filters?: Partial<ComplianceRecordFilters>): Observable<ComplianceRecordStatistics> {
    console.log('📋 Getting compliance statistics');

    let url = `${this.apiUrl}/compliance-summary.php`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', String(filters.company_id));
      if (filters.type) params.append('type', filters.type);
      if (filters.financial_year_id) params.append('financial_year_id', String(filters.financial_year_id));
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<{ success: boolean; data: ComplianceRecordStatistics }>(url)
      .pipe(
        catchError(this.handleError('Get compliance statistics')),
        this.extractStatisticsData()
      );
  }

  /* =========================================================================
     BULK OPERATIONS
     ========================================================================= */

  /**
   * Bulk create compliance records
   * ✅ NO CONVERSION - Passes objects directly to API
   */
  bulkCreateComplianceRecords(records: Partial<ComplianceRecord>[]): Observable<BulkOperationResult> {
    console.log('📋 Bulk creating compliance records:', records.length);

    return this.http.post<BulkOperationResult>(`${this.apiUrl}/bulk-operations.php`, {
      operation: 'create',
      records: records
    }, this.httpOptions)
      .pipe(catchError(this.handleError('Bulk create compliance records')));
  }

  /**
   * Bulk update compliance records
   * ✅ NO CONVERSION - Passes objects directly to API
   */
  bulkUpdateComplianceRecords(updates: Array<{ id: number; data: Partial<ComplianceRecord> }>): Observable<BulkOperationResult> {
    console.log('📋 Bulk updating compliance records:', updates.length);

    return this.http.post<BulkOperationResult>(`${this.apiUrl}/bulk-operations.php`, {
      operation: 'update',
      records: updates
    }, this.httpOptions)
      .pipe(catchError(this.handleError('Bulk update compliance records')));
  }

  /**
   * Bulk delete compliance records
   */
  bulkDeleteComplianceRecords(ids: number[]): Observable<BulkOperationResult> {
    console.log('📋 Bulk deleting compliance records:', ids);
    return this.http.post<BulkOperationResult>(`${this.apiUrl}/bulk-operations.php`, {
      operation: 'delete',
      ids: ids
    }, this.httpOptions)
      .pipe(catchError(this.handleError('Bulk delete compliance records')));
  }

  /* =========================================================================
     HELPER METHODS
     ========================================================================= */

  /**
   * Get compliance record options for dropdown/select
   */
  getComplianceRecordOptions(filters?: ComplianceRecordFilters): Observable<{ value: number; label: string; type: string; status: string }[]> {
    return new Observable(observer => {
      this.getAllComplianceRecords(filters).subscribe({
        next: (records) => {
          const options = records.map(record => ({
            value: record.id,
            label: record.title || `${record.type} - ${record.period || 'No Period'}`,
            type: record.type,
            status: record.status,
            progress: record.progress || 0
          }));
          observer.next(options);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Get compliance type options
   */
  getComplianceTypeOptions(): { value: string; label: string; color: string }[] {
    return [
      { value: 'annual_return', label: 'Annual Return', color: '#3B82F6' },
      { value: 'beneficial_ownership', label: 'Beneficial Ownership', color: '#10B981' },
      { value: 'tax_registration', label: 'Tax Registration', color: '#F59E0B' },
      { value: 'bbbee_compliance', label: 'BBBEE Compliance', color: '#8B5CF6' },
      { value: 'statutory_task', label: 'Statutory Task', color: '#EF4444' }
    ];
  }

  /**
   * Get status options for dropdown
   */
  getStatusOptions(): { value: string; label: string; color: string }[] {
    return [
      { value: 'pending', label: 'Pending', color: '#6B7280' },
      { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
      { value: 'completed', label: 'Completed', color: '#10B981' },
      { value: 'overdue', label: 'Overdue', color: '#EF4444' },
      { value: 'cancelled', label: 'Cancelled', color: '#9CA3AF' }
    ];
  }

  /**
   * Calculate completion percentage for a list of compliance records
   */
  calculateCompletionPercentage(records: ComplianceRecord[]): number {
    if (records.length === 0) return 0;
    const completedRecords = records.filter(record => record.status === 'completed').length;
    return Math.round((completedRecords / records.length) * 100);
  }

  /**
   * Group compliance records by type
   */
  groupByType(records: ComplianceRecord[]): { [type: string]: ComplianceRecord[] } {
    return records.reduce((groups, record) => {
      const type = record.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(record);
      return groups;
    }, {} as { [type: string]: ComplianceRecord[] });
  }

  /**
   * Group compliance records by status
   */
  groupByStatus(records: ComplianceRecord[]): { [status: string]: ComplianceRecord[] } {
    return records.reduce((groups, record) => {
      const status = record.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(record);
      return groups;
    }, {} as { [status: string]: ComplianceRecord[] });
  }

  /**
   * Filter records by financial year
   */
  getRecordsByFinancialYear(financialYearId: number, filters?: ComplianceRecordFilters): Observable<ComplianceRecord[]> {
    console.log('📋 Getting compliance records by financial year:', financialYearId);
    const yearFilters = { ...filters, financialYearId };
    return this.getAllComplianceRecords(yearFilters);
  }

  /* =========================================================================
     UTILITY METHODS
     ========================================================================= */

  /**
   * Extract data array from API response wrapper
   * ✅ NO CONVERSION - Returns data as-is (snake_case)
   */
  private extractData() {
    return (source: Observable<{ success: boolean; data: ComplianceRecord[] }>) =>
      new Observable<ComplianceRecord[]>(observer => {
        source.subscribe({
          next: response => {
            if (response.success && response.data) {
              observer.next(response.data);
            } else {
              observer.next([]);
            }
            observer.complete();
          },
          error: error => observer.error(error)
        });
      });
  }

  /**
   * Extract single data object from API response wrapper
   * ✅ NO CONVERSION - Returns data as-is (snake_case)
   */
  private extractSingleData() {
    return (source: Observable<{ success: boolean; data: ComplianceRecord }>) =>
      new Observable<ComplianceRecord>(observer => {
        source.subscribe({
          next: response => {
            if (response.success && response.data) {
              observer.next(response.data);
            } else {
              throw new Error('No data returned');
            }
            observer.complete();
          },
          error: error => observer.error(error)
        });
      });
  }

  /**
   * Extract statistics data from API response wrapper
   */
  private extractStatisticsData() {
    return (source: Observable<{ success: boolean; data: ComplianceRecordStatistics }>) =>
      new Observable<ComplianceRecordStatistics>(observer => {
        source.subscribe({
          next: response => {
            if (response.success && response.data) {
              observer.next(response.data);
            } else {
              throw new Error('No statistics data returned');
            }
            observer.complete();
          },
          error: error => observer.error(error)
        });
      });
  }

  /* =========================================================================
     ERROR HANDLING
     ========================================================================= */

  /**
   * Handle HTTP operation that failed
   */
  private handleError(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`📋 ComplianceRecordService: ${operation} failed:`, error);

      let errorMessage = 'An error occurred';
      if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return throwError(() => new Error(`${operation}: ${errorMessage}`));
    };
  }
}
