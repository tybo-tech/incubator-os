import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';

@Injectable({ providedIn: 'root' })
export class CompanyFinancialsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-financials`;

  constructor(private http: HttpClient) {}

  addCompanyFinancials(data: any): Observable<INode<any>> {
    return this.http.post<INode<any>>(`${this.apiUrl}/add-company-financials.php`, data);
  }

  upsertCompanyFinancials(data: any): Observable<INode<any>> {
    return this.http.post<INode<any>>(`${this.apiUrl}/upsert-company-financials.php`, data);
  }

  updateCompanyFinancials(id: number, data: any): Observable<INode<any>> {
    return this.http.post<INode<any>>(`${this.apiUrl}/update-company-financials.php`, { id, ...data });
  }

  getCompanyFinancialsById(id: number): Observable<INode<any>> {
    return this.http.post<INode<any>>(`${this.apiUrl}/get-company-financials.php`, { id });
  }

  getCompanyFinancialsByPeriod(company_id: number, period_date: string): Observable<INode<any>> {
    return this.http.post<INode<any>>(`${this.apiUrl}/get-company-financials-by-period.php`, { company_id, period_date });
  }

  listCompanyFinancials(filters: any = {}): Observable<INode<any>[]> {
    return this.http.post<INode<any>[]>(`${this.apiUrl}/list-company-financials.php`, filters);
  }

  countCompanyFinancials(filters: any = {}): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.apiUrl}/count-company-financials.php`, filters);
  }

  latestCompanyFinancials(company_id: number): Observable<INode<any>> {
    return this.http.post<INode<any>>(`${this.apiUrl}/latest-company-financials.php`, { company_id });
  }

  deleteCompanyFinancials(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-financials.php`, { id });
  }

  deleteCompanyFinancialsByPeriod(company_id: number, period_date: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-company-financials-by-period.php`, { company_id, period_date });
  }
}
