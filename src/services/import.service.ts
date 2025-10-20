import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Import statistics interface
 */
export interface ImportStats {
  gps_nodes_count?: number;
  gps_action_items_count?: number;
  swot_nodes_count?: number;
  swot_action_items_count?: number;
  companies_with_gps?: CompanyStats[];
  companies_with_swot?: CompanyStats[];
  category_breakdown?: CategoryStats[];
  timestamp: string;
}

/**
 * Company statistics interface
 */
export interface CompanyStats {
  company_id: number;
  target_count?: number;
  item_count?: number;
}

/**
 * Category statistics interface
 */
export interface CategoryStats {
  category: string;
  count: number;
  completed: number;
  avg_progress: number;
}

/**
 * Import result interface
 */
export interface ImportResult {
  message: string;
  import_summary: ImportSummary;
  final_stats?: ImportStats;
  timestamp: string;
}

/**
 * Import summary interface
 */
export interface ImportSummary {
  total_nodes: number;
  total_targets_imported?: number;
  total_items_imported?: number;
  companies_processed: number[];
  categories_summary: { [key: string]: number };
  errors: ImportError[];
}

/**
 * Import error interface
 */
export interface ImportError {
  node_id: number;
  company_id: number;
  error: string;
}

/**
 * Import preview interface
 */
export interface ImportPreview {
  total_nodes: number;
  preview_nodes: PreviewNode[];
  timestamp: string;
}

/**
 * Preview node interface
 */
export interface PreviewNode {
  node_id: number;
  company_id: number;
  targets_count?: number;
  items_count?: number;
  sample_targets?: any[];
  sample_items?: any[];
}

/**
 * Count result interface
 */
export interface CountResult {
  gps_nodes?: number;
  gps_action_items?: number;
  swot_nodes?: number;
  swot_action_items?: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  private gpsApiUrl = `${Constants.ApiBase}/api-nodes/gps`;
  private swotApiUrl = `${Constants.ApiBase}/api-nodes/swot`; // For future SWOT implementation

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /* =========================================================================
     GPS IMPORT OPERATIONS
     ========================================================================= */

  /**
   * Count GPS data
   */
  countGpsData(): Observable<CountResult> {
    console.log('🎯 Counting GPS data');
    return this.http.get<CountResult>(`${this.gpsApiUrl}/test-gps-import.php?action=count`)
      .pipe(catchError(this.handleError('Count GPS data')));
  }

  /**
   * Get GPS import statistics
   */
  getGpsStats(): Observable<ImportStats> {
    console.log('📊 Getting GPS statistics');
    return this.http.get<ImportStats>(`${this.gpsApiUrl}/test-gps-import.php?action=stats`)
      .pipe(catchError(this.handleError('Get GPS statistics')));
  }

  /**
   * Preview GPS import data
   */
  previewGpsImport(): Observable<ImportPreview> {
    console.log('👀 Previewing GPS import data');
    return this.http.get<ImportPreview>(`${this.gpsApiUrl}/test-gps-import.php?action=preview`)
      .pipe(catchError(this.handleError('Preview GPS import')));
  }

  /**
   * Get GPS sample data
   */
  getGpsSampleData(): Observable<any> {
    console.log('📋 Getting GPS sample data');
    return this.http.get<any>(`${this.gpsApiUrl}/test-gps-import.php?action=sample-data`)
      .pipe(catchError(this.handleError('Get GPS sample data')));
  }

  /**
   * Clear GPS action items
   */
  clearGpsActionItems(): Observable<any> {
    console.log('🗑️ Clearing GPS action items');
    return this.http.get<any>(`${this.gpsApiUrl}/test-gps-import.php?action=clear`)
      .pipe(catchError(this.handleError('Clear GPS action items')));
  }

  /**
   * Import GPS data to action items
   */
  importGpsData(): Observable<ImportResult> {
    console.log('⬇️ Importing GPS data');
    return this.http.get<ImportResult>(`${this.gpsApiUrl}/test-gps-import.php?action=import`)
      .pipe(catchError(this.handleError('Import GPS data')));
  }

  /**
   * Get GPS data for specific company
   */
  getGpsDataByCompany(companyId: number): Observable<any> {
    console.log('🏢 Getting GPS data for company:', companyId);
    return this.http.get<any>(`${this.gpsApiUrl}/get-gps-data.php?company_id=${companyId}`)
      .pipe(catchError(this.handleError('Get GPS data by company')));
  }

  /**
   * Verify GPS action items
   */
  verifyGpsActionItems(companyId?: number): Observable<any> {
    console.log('✅ Verifying GPS action items', companyId ? `for company ${companyId}` : '');
    const url = companyId
      ? `${this.gpsApiUrl}/verify-action-items.php?company_id=${companyId}`
      : `${this.gpsApiUrl}/verify-action-items.php`;

    return this.http.get<any>(url)
      .pipe(catchError(this.handleError('Verify GPS action items')));
  }

  /* =========================================================================
     SWOT IMPORT OPERATIONS (Future Implementation)
     ========================================================================= */

  /**
   * Count SWOT data
   */
  countSwotData(): Observable<CountResult> {
    console.log('🔄 Counting SWOT data');
    return this.http.get<CountResult>(`${this.swotApiUrl}/test-swot-import.php?action=count`)
      .pipe(catchError(this.handleError('Count SWOT data')));
  }

  /**
   * Get SWOT import statistics
   */
  getSwotStats(): Observable<ImportStats> {
    console.log('📊 Getting SWOT statistics');
    return this.http.get<ImportStats>(`${this.swotApiUrl}/test-swot-import.php?action=stats`)
      .pipe(catchError(this.handleError('Get SWOT statistics')));
  }

  /**
   * Preview SWOT import data
   */
  previewSwotImport(): Observable<ImportPreview> {
    console.log('👀 Previewing SWOT import data');
    return this.http.get<ImportPreview>(`${this.swotApiUrl}/test-swot-import.php?action=preview`)
      .pipe(catchError(this.handleError('Preview SWOT import')));
  }

  /**
   * Get SWOT sample data
   */
  getSwotSampleData(): Observable<any> {
    console.log('📄 Getting SWOT sample data');
    return this.http.get(`${this.swotApiUrl}/test-swot-import.php?action=sample-data`)
      .pipe(catchError(this.handleError('Get SWOT sample data')));
  }

  /**
   * Clear SWOT action items
   */
  clearSwotData(): Observable<any> {
    console.log('🧹 Clearing SWOT action items');
    return this.http.get(`${this.swotApiUrl}/test-swot-import.php?action=clear`)
      .pipe(catchError(this.handleError('Clear SWOT data')));
  }

  /**
   * Import SWOT data (traditional action_items approach)
   */
  importSwotData(): Observable<ImportResult> {
    console.log('⬇️ Importing SWOT data');
    return this.http.get<ImportResult>(`${this.swotApiUrl}/test-swot-import.php?action=import`)
      .pipe(catchError(this.handleError('Import SWOT data')));
  }

  /**
   * Import SWOT data to UI node (UI-aligned approach)
   * This matches the component behavior by updating the first existing SWOT node
   */
  importSwotToUINode(companyId: number): Observable<any> {
    console.log('🎯 Importing SWOT data to UI node for company:', companyId);
    return this.http.get<any>(`${this.swotApiUrl}/import-to-ui-node.php?company_id=${companyId}`)
      .pipe(catchError(this.handleError('Import SWOT to UI node')));
  }

  /**
   * Verify SWOT import
   */
  verifySwotImport(companyId?: number): Observable<any> {
    console.log(`✅ Verifying SWOT import${companyId ? ` for company ${companyId}` : ''}`);
    const url = companyId
      ? `${this.swotApiUrl}/verify-swot-action-items.php?company_id=${companyId}`
      : `${this.swotApiUrl}/verify-swot-action-items.php`;
    return this.http.get(url)
      .pipe(catchError(this.handleError('Verify SWOT import')));
  }

  /**
   * Import SWOT data (backwards compatibility - placeholder)
   */
  importSwotDataLegacy(): Observable<ImportResult> {
    console.log('⬇️ Importing SWOT data (legacy placeholder)');
    return new Observable(observer => {
      observer.next({
        message: 'SWOT import not yet implemented',
        import_summary: {
          total_nodes: 0,
          total_items_imported: 0,
          companies_processed: [],
          categories_summary: {},
          errors: []
        },
        timestamp: new Date().toISOString()
      });
      observer.complete();
    });
  }

  /* =========================================================================
     GENERAL IMPORT OPERATIONS
     ========================================================================= */

  /**
   * Get all import statistics
   */
  getAllImportStats(): Observable<ImportStats> {
    console.log('📈 Getting all import statistics');
    return new Observable(observer => {
      // Combine GPS and SWOT stats
      const gpsStats$ = this.getGpsStats();
      const swotStats$ = this.getSwotStats();

      gpsStats$.subscribe({
        next: (gpsData) => {
          swotStats$.subscribe({
            next: (swotData) => {
              const combined: ImportStats = {
                gps_nodes_count: gpsData.gps_nodes_count,
                gps_action_items_count: gpsData.gps_action_items_count,
                swot_nodes_count: swotData.swot_nodes_count,
                swot_action_items_count: swotData.swot_action_items_count,
                companies_with_gps: gpsData.companies_with_gps,
                companies_with_swot: swotData.companies_with_swot,
                category_breakdown: [
                  ...(gpsData.category_breakdown || []),
                  ...(swotData.category_breakdown || [])
                ],
                timestamp: new Date().toISOString()
              };
              observer.next(combined);
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Get companies with any import data
   */
  getCompaniesWithData(): Observable<{ gps: CompanyStats[], swot: CompanyStats[] }> {
    console.log('🏢 Getting companies with import data');
    return new Observable(observer => {
      this.getAllImportStats().subscribe({
        next: (stats) => {
          observer.next({
            gps: stats.companies_with_gps || [],
            swot: stats.companies_with_swot || []
          });
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /* =========================================================================
     UTILITY METHODS
     ========================================================================= */

  /**
   * Format import statistics for display
   */
  formatImportSummary(summary: ImportSummary): string {
    const parts = [
      `${summary.total_nodes} nodes processed`,
      `${summary.total_targets_imported || summary.total_items_imported || 0} items imported`,
      `${summary.companies_processed.length} companies affected`
    ];

    if (summary.errors.length > 0) {
      parts.push(`${summary.errors.length} errors encountered`);
    }

    return parts.join(', ');
  }

  /**
   * Calculate completion percentage
   */
  calculateCompletionRate(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  /**
   * Get import status badge
   */
  getImportStatusBadge(stats: ImportStats): { text: string, class: string } {
    const gpsItems = stats.gps_action_items_count || 0;
    const swotItems = stats.swot_action_items_count || 0;
    const totalItems = gpsItems + swotItems;

    if (totalItems === 0) {
      return { text: 'No Data', class: 'badge-secondary' };
    } else if (totalItems < 10) {
      return { text: 'Minimal Data', class: 'badge-warning' };
    } else {
      return { text: 'Data Available', class: 'badge-success' };
    }
  }

  /**
   * Validate import operation
   */
  validateImportOperation(type: 'gps' | 'swot'): Observable<{ canImport: boolean, message: string }> {
    console.log(`🔍 Validating ${type.toUpperCase()} import operation`);

    return new Observable(observer => {
      if (type === 'gps') {
        this.countGpsData().subscribe({
          next: (count) => {
            const hasNodes = (count.gps_nodes || 0) > 0;
            observer.next({
              canImport: hasNodes,
              message: hasNodes
                ? `Ready to import ${count.gps_nodes} GPS nodes`
                : 'No GPS nodes found to import'
            });
            observer.complete();
          },
          error: (error) => {
            observer.next({
              canImport: false,
              message: `Validation failed: ${error.message}`
            });
            observer.complete();
          }
        });
      } else {
        // SWOT validation placeholder
        observer.next({
          canImport: false,
          message: 'SWOT import not yet implemented'
        });
        observer.complete();
      }
    });
  }

  /* =========================================================================
     ERROR HANDLING
     ========================================================================= */

  /**
   * Handle HTTP operation errors
   */
  private handleError(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`💥 ${operation} failed:`, error);

      let errorMessage = 'An unexpected error occurred';

      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return throwError(() => new Error(`${operation}: ${errorMessage}`));
    };
  }
}
