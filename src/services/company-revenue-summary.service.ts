import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyRevenueSummary } from '../models/financial.models';
import { Constants } from './service';

export interface ICompanyRevenueSummaryFilters {
  company_id: number;
  year_?: number;
  client_id?: number;
  program_id?: number | null;
  cohort_id?: number | null;
  status_id?: number;
  order_by?: 'year_' | 'total' | 'margin_pct' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyRevenueSummaryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-revenue-summary`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  addCompanyRevenueSummary(data: Partial<CompanyRevenueSummary>): Observable<CompanyRevenueSummary> {
    console.log('Sending data to API:', data);
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/add-company-revenue-summary.php`, data, this.httpOptions);
  }

  updateCompanyRevenueSummary(id: number, data: Partial<CompanyRevenueSummary>): Observable<CompanyRevenueSummary> {
    const payload = { id, ...data };
    console.log('CompanyRevenueSummaryService - updateCompanyRevenueSummary called with:', { id, data, payload });
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/update-company-revenue-summary.php`, payload, this.httpOptions);
  }

  getCompanyRevenueSummaryById(id: number): Observable<CompanyRevenueSummary> {
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/get-company-revenue-summary.php`, { id }, this.httpOptions);
  }

  /**
   * List revenue summary records for a company with optional filters
   * @param filters Filtering and sorting options
   */
  listCompanyRevenueSummary(filters: ICompanyRevenueSummaryFilters): Observable<CompanyRevenueSummary[]> {
    return this.http.post<CompanyRevenueSummary[]>(`${this.apiUrl}/list-company-revenue-summary.php?company_id=${filters.company_id}`, filters, this.httpOptions);
  }

  /**
   * List all revenue summary records for a company, sorted by year descending
   * @param companyId The ID of the company
   */
  listAllCompanyRevenueSummary(companyId: number): Observable<CompanyRevenueSummary[]> {
    return this.listCompanyRevenueSummary({
      company_id: companyId,
      order_by: 'year_',
      order_dir: 'DESC'
    });
  }

  /**
   * List revenue summary records for a specific year
   * @param companyId The ID of the company
   * @param year The year to filter by
   */
  listRevenueSummaryByYear(companyId: number, year: number): Observable<CompanyRevenueSummary[]> {
    return this.listCompanyRevenueSummary({
      company_id: companyId,
      year_: year,
      order_by: 'year_',
      order_dir: 'ASC'
    });
  }

  /**
   * Get latest revenue summary record for a company
   * @param companyId The ID of the company
   */
  getLatestRevenueSummary(companyId: number): Observable<CompanyRevenueSummary> {
    return this.http.post<CompanyRevenueSummary>(`${this.apiUrl}/get-company-revenue-summary.php`, {
      company_id: companyId,
      latest: true
    }, this.httpOptions);
  }

  deleteCompanyRevenueSummary(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-revenue-summary.php`, { id });
  }
}
