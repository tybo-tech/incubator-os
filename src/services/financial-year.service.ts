import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Financial Year data model interface
 */
export interface FinancialYear {
  id: number;
  name: string;
  start_month: number;
  end_month: number;
  fy_start_year: number;
  fy_end_year: number;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Financial Year filters interface
 */
export interface FinancialYearFilters {
  is_active?: boolean;
  year?: number;
  start_year?: number;
  end_year?: number;
  limit?: number;
  offset?: number;
}

/**
 * Financial Year summary interface
 */
export interface FinancialYearSummary {
  total_years: number;
  active_years: number;
  earliest_year: number;
  latest_year: number;
}

/**
 * Month in financial year interface
 */
export interface FinancialYearMonth {
  month: number;
  year: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialYearService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/financial-years`;

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
   * Get all financial years
   */
  getAllFinancialYears(): Observable<FinancialYear[]> {
    console.log('📅 Getting all financial years');
    return this.http.get<FinancialYear[]>(`${this.apiUrl}/list-financial-years.php`)
      .pipe(catchError(this.handleError('Get all financial years')));
  }

  /**
   * Get financial year by ID
   */
  getFinancialYearById(id: number): Observable<FinancialYear> {
    console.log('📅 Getting financial year by ID:', id);
    return this.http.get<FinancialYear>(`${this.apiUrl}/get-financial-year.php?id=${id}`)
      .pipe(catchError(this.handleError('Get financial year by ID')));
  }

  /**
   * Add new financial year
   */
  addFinancialYear(data: Partial<FinancialYear>): Observable<FinancialYear> {
    console.log('📅 Adding financial year:', data);
    return this.http.post<FinancialYear>(`${this.apiUrl}/add-financial-year.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Add financial year')));
  }

  /**
   * Update financial year
   */
  updateFinancialYear(id: number, data: Partial<FinancialYear>): Observable<FinancialYear> {
    console.log('📅 Updating financial year:', id, data);
    return this.http.put<FinancialYear>(`${this.apiUrl}/update-financial-year.php?id=${id}`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Update financial year')));
  }

  /**
   * Delete financial year
   */
  deleteFinancialYear(id: number): Observable<any> {
    console.log('📅 Deleting financial year:', id);
    return this.http.delete(`${this.apiUrl}/delete-financial-year.php?id=${id}`)
      .pipe(catchError(this.handleError('Delete financial year')));
  }

  /* =========================================================================
     SPECIALIZED OPERATIONS
     ========================================================================= */

  /**
   * Get active financial years only
   */
  getActiveFinancialYears(): Observable<FinancialYear[]> {
    console.log('📅 Getting active financial years');
    return this.http.get<FinancialYear[]>(`${this.apiUrl}/get-active-years.php`)
      .pipe(catchError(this.handleError('Get active financial years')));
  }

  /**
   * Set a financial year as active
   */
  setActiveFinancialYear(id: number): Observable<FinancialYear> {
    console.log('📅 Setting financial year as active:', id);
    return this.http.post<FinancialYear>(`${this.apiUrl}/set-active-year.php?id=${id}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError('Set active financial year')));
  }

  /**
   * Get financial year summary statistics
   */
  getFinancialYearSummary(): Observable<FinancialYearSummary> {
    console.log('📅 Getting financial year summary');
    return this.http.get<FinancialYearSummary>(`${this.apiUrl}/get-summary.php`)
      .pipe(catchError(this.handleError('Get financial year summary')));
  }

  /* =========================================================================
     HELPER METHODS
     ========================================================================= */

  /**
   * Get financial years for dropdown/select options
   */
  getFinancialYearOptions(): Observable<{ value: number; label: string; isActive: boolean }[]> {
    return new Observable(observer => {
      this.getAllFinancialYears().subscribe({
        next: (years) => {
          const options = years.map(year => ({
            value: year.id,
            label: year.name,
            isActive: year.is_active,
            startYear: year.fy_start_year,
            endYear: year.fy_end_year
          }));
          observer.next(options);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Get current active financial year
   */
  getCurrentActiveYear(): Observable<FinancialYear | null> {
    return new Observable(observer => {
      this.getActiveFinancialYears().subscribe({
        next: (activeYears) => {
          // Return the first active year or null if none found
          observer.next(activeYears.length > 0 ? activeYears[0] : null);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Generate financial year name
   */
  generateFinancialYearName(startYear: number, endYear: number): string {
    return `FY ${startYear}/${endYear.toString().slice(-2)}`;
  }

  /**
   * Get month names for a financial year
   */
  getMonthNamesForYear(financialYear: FinancialYear): string[] {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const result: string[] = [];
    let currentMonth = financialYear.start_month;
    let currentYear = financialYear.fy_start_year;

    while (true) {
      const monthName = months[currentMonth - 1];
      result.push(`${monthName} ${currentYear}`);

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
   * Check if a date falls within a financial year
   */
  isDateInFinancialYear(date: Date, financialYear: FinancialYear): boolean {
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const year = date.getFullYear();

    // Handle year transitions
    if (financialYear.start_month <= financialYear.end_month) {
      // Financial year doesn't cross calendar year boundary
      return year === financialYear.fy_start_year && 
             month >= financialYear.start_month && 
             month <= financialYear.end_month;
    } else {
      // Financial year crosses calendar year boundary (e.g., March to February)
      return (year === financialYear.fy_start_year && month >= financialYear.start_month) ||
             (year === financialYear.fy_end_year && month <= financialYear.end_month);
    }
  }

  /**
   * Get financial year quarter for a given month
   */
  getQuarterForMonth(month: number, financialYear: FinancialYear): number {
    let adjustedMonth = month;
    
    // Adjust month relative to financial year start
    if (month < financialYear.start_month) {
      adjustedMonth = month + 12;
    }
    
    const monthsFromStart = adjustedMonth - financialYear.start_month;
    return Math.floor(monthsFromStart / 3) + 1;
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
   * Validate financial year data
   */
  validateFinancialYear(data: Partial<FinancialYear>): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Financial year name is required');
    }

    if (!data.start_month || data.start_month < 1 || data.start_month > 12) {
      errors.push('Valid start month (1-12) is required');
    }

    if (!data.end_month || data.end_month < 1 || data.end_month > 12) {
      errors.push('Valid end month (1-12) is required');
    }

    if (!data.fy_start_year || data.fy_start_year < 2000 || data.fy_start_year > 2100) {
      errors.push('Valid start year (2000-2100) is required');
    }

    if (!data.fy_end_year || data.fy_end_year < 2000 || data.fy_end_year > 2100) {
      errors.push('Valid end year (2000-2100) is required');
    }

    if (data.fy_start_year && data.fy_end_year && data.fy_end_year < data.fy_start_year) {
      errors.push('End year must be greater than or equal to start year');
    }

    return errors;
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