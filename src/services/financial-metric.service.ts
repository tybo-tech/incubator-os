import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { IFinancialMetric, CreateFinancialMetricDto, UpdateFinancialMetricDto } from '../models/financial-metric.model';

@Injectable({ providedIn: 'root' })
export class FinancialMetricService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/financial-metric`;

  constructor(private http: HttpClient) {}

  add(data: CreateFinancialMetricDto): Observable<IFinancialMetric> {
    return this.http.post<IFinancialMetric>(`${this.apiUrl}/add-financial-metric.php`, data);
  }

  update(data: UpdateFinancialMetricDto): Observable<IFinancialMetric> {
    return this.http.post<IFinancialMetric>(`${this.apiUrl}/update-financial-metric.php`, data);
  }

  getById(id: number): Observable<IFinancialMetric> {
    return this.http.get<IFinancialMetric>(`${this.apiUrl}/get-financial-metric.php?id=${id}`);
  }

  /**
   * List financial metrics.
   * If year provided -> flat array (backward compatible).
   * If no year -> grouped response: { years: { [year:number]: IFinancialMetric[] }, meta: {...} }
   */
  list(company_id: number, options: { year?: number; metric_type_id?: number } = {}): Observable<any> {
    const params = new URLSearchParams({ company_id: String(company_id) });
    if (options.year !== undefined) params.append('year', String(options.year));
    if (options.metric_type_id !== undefined) params.append('metric_type_id', String(options.metric_type_id));
    return this.http.get<any>(`${this.apiUrl}/list-financial-metrics.php?${params}`);
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-financial-metric.php`, { id });
  }
}
