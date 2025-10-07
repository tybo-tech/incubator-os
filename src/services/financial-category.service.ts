import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FinancialCategory } from '../models/financial.models';
import { Constants } from './service';

export interface IFinancialCategoryFilters {
  item_type?: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity';
  name?: string;
  is_active?: boolean;
  order_by?: 'name' | 'item_type' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class FinancialCategoryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/financial-categories`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  addFinancialCategory(data: Partial<FinancialCategory>): Observable<FinancialCategory> {
    console.log('Sending data to API:', data);
    return this.http.post<FinancialCategory>(`${this.apiUrl}/add-financial-categories.php`, data, this.httpOptions);
  }

  updateFinancialCategory(id: number, data: Partial<FinancialCategory>): Observable<FinancialCategory> {
    const payload = { id, ...data };
    console.log('FinancialCategoryService - updateFinancialCategory called with:', { id, data, payload });
    return this.http.post<FinancialCategory>(`${this.apiUrl}/update-financial-categories.php`, payload, this.httpOptions);
  }

  getFinancialCategoryById(id: number): Observable<FinancialCategory> {
    return this.http.post<FinancialCategory>(`${this.apiUrl}/get-financial-categories.php`, { id }, this.httpOptions);
  }

  /**
   * List financial categories with optional filters
   * @param filters Filtering and sorting options
   */
  listFinancialCategories(filters: IFinancialCategoryFilters = {}): Observable<FinancialCategory[]> {
    return this.http.post<FinancialCategory[]>(`${this.apiUrl}/list-financial-categories.php`, filters, this.httpOptions);
  }

  /**
   * List all financial categories, sorted by name
   */
  listAllFinancialCategories(): Observable<FinancialCategory[]> {
    return this.listFinancialCategories({
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * List active financial categories
   */
  listActiveFinancialCategories(): Observable<FinancialCategory[]> {
    return this.listFinancialCategories({
      is_active: true,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * List financial categories by item type
   * @param itemType The item type to filter by
   */
  listCategoriesByType(itemType: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity'): Observable<FinancialCategory[]> {
    return this.listFinancialCategories({
      item_type: itemType,
      is_active: true,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  /**
   * Get cost categories (direct and operational costs)
   */
  listCostCategories(): Observable<FinancialCategory[]> {
    return this.http.post<FinancialCategory[]>(`${this.apiUrl}/list-financial-categories.php`, {
      item_type_in: ['direct_cost', 'operational_cost'],
      is_active: true,
      order_by: 'name',
      order_dir: 'ASC'
    }, this.httpOptions);
  }

  /**
   * Get balance sheet categories (assets, liabilities, equity)
   */
  listBalanceSheetCategories(): Observable<FinancialCategory[]> {
    return this.http.post<FinancialCategory[]>(`${this.apiUrl}/list-financial-categories.php`, {
      item_type_in: ['asset', 'liability', 'equity'],
      is_active: true,
      order_by: 'name',
      order_dir: 'ASC'
    }, this.httpOptions);
  }

  /**
   * Search categories by name
   * @param searchTerm The search term to filter category names
   */
  searchCategoriesByName(searchTerm: string): Observable<FinancialCategory[]> {
    return this.listFinancialCategories({
      name: searchTerm,
      is_active: true,
      order_by: 'name',
      order_dir: 'ASC'
    });
  }

  deleteFinancialCategory(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-financial-categories.php`, { id });
  }

  /**
   * Toggle category active status
   * @param id The category ID
   * @param isActive The new active status
   */
  toggleCategoryStatus(id: number, isActive: boolean): Observable<FinancialCategory> {
    return this.updateFinancialCategory(id, { is_active: isActive });
  }
}