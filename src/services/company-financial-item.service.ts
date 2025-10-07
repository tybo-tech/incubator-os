import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  addCompanyFinancialItem(data: Partial<CompanyFinancialItem>): Observable<CompanyFinancialItem> {
    console.log('Sending data to API:', data);
    return this.http.post<CompanyFinancialItem>(`${this.apiUrl}/add-company-financial-items.php`, data, this.httpOptions);
  }

  updateCompanyFinancialItem(id: number, data: Partial<CompanyFinancialItem>): Observable<CompanyFinancialItem> {
    const payload = { id, ...data };
    console.log('CompanyFinancialItemService - updateCompanyFinancialItem called with:', { id, data, payload });
    return this.http.post<CompanyFinancialItem>(`${this.apiUrl}/update-company-financial-items.php`, payload, this.httpOptions);
  }

  getCompanyFinancialItemById(id: number): Observable<CompanyFinancialItem> {
    return this.http.post<CompanyFinancialItem>(`${this.apiUrl}/get-company-financial-items.php`, { id }, this.httpOptions);
  }

  /**
   * List financial item records for a company with optional filters
   * @param filters Filtering and sorting options
   */
  listCompanyFinancialItems(filters: ICompanyFinancialItemFilters): Observable<CompanyFinancialItem[]> {
    return this.http.post<CompanyFinancialItem[]>(`${this.apiUrl}/list-company-financial-items.php`, filters, this.httpOptions);
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

  deleteCompanyFinancialItem(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-financial-items.php`, { id });
  }
}