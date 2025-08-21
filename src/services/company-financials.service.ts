import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Company Financials interface
export interface ICompanyFinancials {
  id: number;
  company_id: number;
  period_date: string;
  year: number;
  month: number;
  quarter: number;
  turnover: string | null;
  cost_of_sales: string | null;
  business_expenses: string | null;
  gross_profit: string | null;
  net_profit: string | null;
  cash_in_hand: string | null;
  debtors_outstanding: string | null;
  creditors_outstanding: string | null;
  inventory_value: string | null;
  working_capital_ratio: string | null;
  net_assets: string | null;
  created_at: string;
  updated_at: string;
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
