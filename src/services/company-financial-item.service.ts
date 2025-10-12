import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CompanyFinancialItem } from '../models/financial.models';
import { Constants } from './service';

export interface ICompanyFinancialItemFilters {
  company_id: number;
  year_?: number;
  item_type?: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity';
  category_id?: number | null;
  name?: string;
  client_id?: number;
  program_id?: number | null;
  cohort_id?: number | null;
  status_id?: number;
  order_by?: 'year_' | 'name' | 'amount' | 'item_type' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyFinancialItemService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-financial-items`;

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

  addCompanyFinancialItem(data: Partial<CompanyFinancialItem>): Observable<CompanyFinancialItem> {
    console.log('Sending data to API:', data);
    return this.http.post<CompanyFinancialItem>(`${this.apiUrl}/add-company-financial-item.php`, data, this.httpOptions)
      .pipe(
        tap(res => console.log('API response:', res)),
        catchError(this.handleError('Add financial item'))
      );
  }

  updateCompanyFinancialItem(id: number, data: Partial<CompanyFinancialItem>): Observable<CompanyFinancialItem> {
    const payload = { id, ...data };
    console.log('CompanyFinancialItemService - updateCompanyFinancialItem called with:', { id, data, payload });
    return this.http.post<CompanyFinancialItem>(`${this.apiUrl}/update-company-financial-item.php`, payload, this.httpOptions)
      .pipe(
        tap(res => console.log('Update API response:', res)),
        catchError(this.handleError('Update financial item'))
      );
  }

  /**
   * 💾 Bulk update multiple financial items at once
   * @param items Array of financial items to update
   */
  bulkUpdateFinancialItems(items: Partial<CompanyFinancialItem>[]): Observable<any> {
    const payload = { items };
    console.log('CompanyFinancialItemService - bulkUpdateFinancialItems called with:', payload);
    return this.http.post<any>(`${this.apiUrl}/update-bulk-company-financial-items.php`, payload, this.httpOptions)
      .pipe(
        tap(res => console.log('Bulk update API response:', res)),
        catchError(this.handleError('Bulk update financial items'))
      );
  }

  /**
   * 🆕 Bulk create multiple financial items at once
   * @param items Array of financial items to create
   */
  bulkCreateFinancialItems(items: Partial<CompanyFinancialItem>[]): Observable<any> {
    const payload = { items };
    console.log('CompanyFinancialItemService - bulkCreateFinancialItems called with:', payload);
    return this.http.post<any>(`${this.apiUrl}/add-bulk-company-financial-items.php`, payload, this.httpOptions)
      .pipe(
        tap(res => console.log('Bulk create API response:', res)),
        catchError(this.handleError('Bulk create financial items'))
      );
  }

  getCompanyFinancialItemById(id: number): Observable<CompanyFinancialItem> {
    const url = `${this.apiUrl}/get-company-financial-item.php?id=${id}`;
    console.log('CompanyFinancialItemService - getCompanyFinancialItemById GET request:', url);
    return this.http.get<CompanyFinancialItem>(url)
      .pipe(
        tap(res => console.log('Get financial item response:', res)),
        catchError(this.handleError('Get financial item'))
      );
  }

  /**
   * List financial item records for a company with optional filters
   * @param filters Filtering and sorting options
   */
  listCompanyFinancialItems(filters: ICompanyFinancialItemFilters): Observable<CompanyFinancialItem[]> {
    // Build query parameters for GET request
    const params = new URLSearchParams();

    // company_id is required
    params.append('company_id', filters.company_id.toString());

    // Add optional filters
    if (filters.item_type) params.append('type', filters.item_type);
    if (filters.year_) params.append('year', filters.year_.toString());

    const url = `${this.apiUrl}/list-company-financial-items.php?${params.toString()}`;
    console.log('CompanyFinancialItemService - listCompanyFinancialItems GET request:', url);

    return this.http.get<CompanyFinancialItem[]>(url)
      .pipe(
        tap(res => console.log('List financial items response:', res)),
        catchError(this.handleError('List financial items'))
      );
  }

  /**
   * List all financial item records for a company, sorted by name
   * @param companyId The ID of the company
   */
  listAllCompanyFinancialItems(companyId: number): Observable<CompanyFinancialItem[]> {
    return this.listCompanyFinancialItems({
      company_id: companyId,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * List financial items for a specific year
   * @param companyId The ID of the company
   * @param year The year to filter by
   */
  listFinancialItemsByYear(companyId: number, year: number): Observable<CompanyFinancialItem[]> {
    return this.listCompanyFinancialItems({
      company_id: companyId,
      year_: year,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * List financial items by type (direct_cost, operational_cost, asset, liability, equity)
   * @param companyId The ID of the company
   * @param itemType The item type to filter by
   */
  listFinancialItemsByType(companyId: number, itemType: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity'): Observable<CompanyFinancialItem[]> {
    return this.listCompanyFinancialItems({
      company_id: companyId,
      item_type: itemType,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * List financial items by category
   * @param companyId The ID of the company
   * @param categoryId The category ID to filter by
   */
  listFinancialItemsByCategory(companyId: number, categoryId: number): Observable<CompanyFinancialItem[]> {
    return this.listCompanyFinancialItems({
      company_id: companyId,
      category_id: categoryId,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * Get financial items by year and type
   * @param companyId The ID of the company
   * @param year The year to filter by
   * @param itemType The item type to filter by
   */
  listFinancialItemsByYearAndType(companyId: number, year: number, itemType: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity'): Observable<CompanyFinancialItem[]> {
    return this.listCompanyFinancialItems({
      company_id: companyId,
      year_: year,
      item_type: itemType,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * Get totals by type for a company and year
   * @param companyId The ID of the company
   * @param year The year to get totals for
   */
  getTotalsByType(companyId: number, year: number): Observable<any> {
    const url = `${this.apiUrl}/get-totals-by-type.php?company_id=${companyId}&year=${year}`;
    console.log('CompanyFinancialItemService - getTotalsByType GET request:', url);
    return this.http.get<any>(url)
      .pipe(
        tap(res => console.log('Get totals by type response:', res)),
        catchError(this.handleError('Get totals by type'))
      );
  }

  deleteCompanyFinancialItem(id: number): Observable<{ success: boolean }> {
    const url = `${this.apiUrl}/delete-company-financial-item.php?id=${id}`;
    console.log('CompanyFinancialItemService - deleteCompanyFinancialItem GET request:', url);
    return this.http.get<{ success: boolean }>(url)
      .pipe(
        tap(res => console.log('Delete financial item response:', res)),
        catchError(this.handleError('Delete financial item'))
      );
  }

  /**
   * Refresh profit summary after cost changes to ensure UI stays in sync
   * This pairs with the automatic profit recalculation in the backend
   * @param companyId The ID of the company
   * @param year The year to refresh
   */
  refreshCompanyYearSummary(companyId: number, year: number): Observable<any> {
    return this.http.get(`${Constants.ApiBase}/api-nodes/company-profit-summary/get-company-profit-summary.php?company_id=${companyId}&year_=${year}`)
      .pipe(catchError(this.handleError('Refresh company year summary')));
  }
}
