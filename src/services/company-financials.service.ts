import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
import { Constants } from './service';

@Injectable({ providedIn: 'root' })
export class CompanyFinancialsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-financials`;

  constructor(private http: HttpClient) {}

  addCompanyFinancials(data: Partial<ICompanyFinancials>): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/add-company-financials.php`, data);
  }

  upsertCompanyFinancials(data: Partial<ICompanyFinancials>): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/upsert-company-financials.php`, data);
  }

  updateCompanyFinancials(id: number, data: Partial<ICompanyFinancials>): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/update-company-financials.php`, { id, ...data });
  }

  getCompanyFinancialsById(id: number): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/get-company-financials.php`, { id });
  }

  getCompanyFinancialsByPeriod(company_id: number, period_date: string): Observable<ICompanyFinancials> {
    return this.http.post<ICompanyFinancials>(`${this.apiUrl}/get-company-financials-by-period.php`, { company_id, period_date });
  }

  listCompanyFinancials(filters: any = {}): Observable<ICompanyFinancials[]> {
    return this.http.post<ICompanyFinancials[]>(`${this.apiUrl}/list-company-financials.php`, filters);
  }

  countCompanyFinancials(filters: any = {}): Observable<{ count: number }> {
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
