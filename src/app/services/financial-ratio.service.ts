import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FinancialRatio } from '../../models/ratios.models';


@Injectable({ providedIn: 'root' })
export class FinancialRatioService {
  private baseUrl = '/api-incubator-os/api-nodes/ratios';

  constructor(private http: HttpClient) {}

  listByCompanyAndYear(companyId: number, year: number): Observable<FinancialRatio[]> {
    return this.http.get<FinancialRatio[]>(`${this.baseUrl}/list-company-ratios.php?company_id=${companyId}&year=${year}`);
  }

  getRatio(id: number): Observable<FinancialRatio> {
    return this.http.get<FinancialRatio>(`${this.baseUrl}/get-ratio.php?id=${id}`);
  }

  updateRatio(id: number, data: Partial<FinancialRatio>): Observable<FinancialRatio> {
    return this.http.post<FinancialRatio>(`${this.baseUrl}/update-ratio.php`, { id, ...data });
  }
}
