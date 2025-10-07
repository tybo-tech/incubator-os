import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class CompanyProfitSummaryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-profit-summary`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  addCompanyProfitSummary(data: Partial<CompanyProfitSummary>): Observable<CompanyProfitSummary> {
    console.log('Sending data to API:', data);
    return this.http.post<CompanyProfitSummary>(`${this.apiUrl}/add-company-profit-summary.php`, data, this.httpOptions);
  }

  updateCompanyProfitSummary(id: number, data: Partial<CompanyProfitSummary>): Observable<CompanyProfitSummary> {
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
  listCompanyProfitSummary(filters: ICompanyProfitSummaryFilters): Observable<CompanyProfitSummary[]> {
    return this.http.post<CompanyProfitSummary[]>(`${this.apiUrl}/list-company-profit-summary.php`, filters, this.httpOptions);
  }

  /**
   * List all profit summary records for a company, sorted by year descending
   * @param companyId The ID of the company
   */
  listAllCompanyProfitSummary(companyId: number): Observable<CompanyProfitSummary[]> {
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
  listProfitSummaryByYear(companyId: number, year: number): Observable<CompanyProfitSummary[]> {
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
  listProfitSummaryByType(companyId: number, type: 'gross' | 'operating' | 'net' | 'before_tax'): Observable<CompanyProfitSummary[]> {
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