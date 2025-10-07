import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// Company Financials interface
export interface ICompanyFinancials {
  id: number;
  company_id: number;
  period_date: string;      // YYYY-MM-DD
  year: number;
  month: number;

  quarter: number;          // 1..4 (generated in DB)
  quarter_label: string;    // e.g. "Q1"

  is_pre_ignition: boolean;

  turnover_monthly_avg: number | null;
  turnover: number | null;
  cost_of_sales: number | null;
  business_expenses: number | null;
  gross_profit: number | null;
  net_profit: number | null;
  gp_margin: number | null;
  np_margin: number | null;
  cash_on_hand: number | null;
  debtors: number | null;
  creditors: number | null;
  inventory_on_hand: number | null;
  working_capital_ratio: number | null;
  net_assets: number | null;

  notes: string | null;

  created_at: string;       // datetime
  updated_at: string;       // datetime
}

export interface ICompanyFinancialsFilters {
  company_id: number;
  year?: number;
  month?: number;
  quarter?: number;
  is_pre_ignition?: boolean;
  from_date?: string;     // YYYY-MM-DD
  to_date?: string;       // YYYY-MM-DD
  order_by?: 'period_date' | 'year' | 'month' | 'created_at' | 'updated_at' |
             'turnover' | 'net_profit' | 'turnover_monthly_avg' | 'gp_margin' | 'np_margin';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}
import { Constants } from './service';

@Injectable({ providedIn: 'root' })
export class CompanyFinancialsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-financials`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  addCompanyFinancials(data: Partial<ICompanyFinancials>): Observable<ICompanyFinancials> {
    console.log('Sending data to API:', data);
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/add-company-financials.php`, data, this.httpOptions);
  }

  upsertCompanyFinancials(data: Partial<ICompanyFinancials>): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/upsert-company-financials.php`, data, this.httpOptions);
  }

  updateCompanyFinancials(id: number, data: Partial<ICompanyFinancials>): Observable<ICompanyFinancials> {
    const payload = { id, ...data };
    console.log('CompanyFinancialsService - updateCompanyFinancials called with:', { id, data, payload });
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/update-company-financials.php`, payload, this.httpOptions);
  }

  getCompanyFinancialsById(id: number): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/get-company-financials.php`, { id }, this.httpOptions);
  }

  getCompanyFinancialsByPeriod(company_id: number, period_date: string): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/get-company-financials-by-period.php`, { company_id, period_date }, this.httpOptions);
  }

  /**
   * List financial records for a company with optional filters
   * @param filters Filtering and sorting options
   */
  listCompanyFinancials(filters: ICompanyFinancialsFilters): Observable<ICompanyFinancials[]> {
    return this.http.post<ICompanyFinancials[]>(`${this.apiUrl}/list-company-financials.php`, filters, this.httpOptions);
  }

  /**
   * List all financial records for a company, sorted by date descending
   * @param companyId The ID of the company
   */
  listAllCompanyFinancials(companyId: number): Observable<ICompanyFinancials[]> {
    return this.listCompanyFinancials({
      company_id: companyId,
      order_by: 'period_date',
      order_dir: 'DESC'
    });
  }

  /**
   * List financial records for a specific year
   * @param companyId The ID of the company
   * @param year The year to filter by
   */
  listFinancialsByYear(companyId: number, year: number): Observable<ICompanyFinancials[]> {
    return this.listCompanyFinancials({
      company_id: companyId,
      year,
      order_by: 'month',
      order_dir: 'ASC'
    });
  }

  /**
   * List financial records for a specific quarter
   * @param companyId The ID of the company
   * @param year The year to filter by
   * @param quarter The quarter (1-4) to filter by
   */
  listFinancialsByQuarter(companyId: number, year: number, quarter: number): Observable<ICompanyFinancials[]> {
    return this.listCompanyFinancials({
      company_id: companyId,
      year,
      quarter,
      order_by: 'month',
      order_dir: 'ASC'
    });
  }

  /**
   * List financial records for a date range
   * @param companyId The ID of the company
   * @param fromDate Start date (YYYY-MM-DD)
   * @param toDate End date (YYYY-MM-DD)
   */
  listFinancialsByDateRange(companyId: number, fromDate: string, toDate: string): Observable<ICompanyFinancials[]> {
    return this.listCompanyFinancials({
      company_id: companyId,
      from_date: fromDate,
      to_date: toDate,
      order_by: 'period_date',
      order_dir: 'ASC'
    });
  }

  countCompanyFinancials(filters: Partial<ICompanyFinancialsFilters>): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.apiUrl}/count-company-financials.php`, filters);
  }

  latestCompanyFinancials(company_id: number): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/latest-company-financials.php`, { company_id });
  }

  deleteCompanyFinancials(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-financials.php`, { id });
  }

  deleteCompanyFinancialsByPeriod(company_id: number, period_date: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-financials-by-period.php`, { company_id, period_date });
  }
}
