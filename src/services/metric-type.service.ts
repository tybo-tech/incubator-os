import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { IMetricType, CreateMetricTypeDto, UpdateMetricTypeDto } from '../models/metric-type.model';

@Injectable({ providedIn: 'root' })
export class MetricTypeService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/metric-type`;

  constructor(private http: HttpClient) {}

  add(data: CreateMetricTypeDto): Observable<IMetricType> {
    return this.http.post<IMetricType>(`${this.apiUrl}/add-metric-type.php`, data);
  }

  update(data: UpdateMetricTypeDto): Observable<IMetricType> {
    return this.http.post<IMetricType>(`${this.apiUrl}/update-metric-type.php`, data);
  }

  getById(id: number): Observable<IMetricType> {
    return this.http.get<IMetricType>(`${this.apiUrl}/get-metric-type.php?id=${id}`);
  }

  getByCode(code: string): Observable<IMetricType> {
    return this.http.get<IMetricType>(`${this.apiUrl}/get-metric-type.php?code=${encodeURIComponent(code)}`);
  }

  list(): Observable<IMetricType[]> {
    return this.http.get<IMetricType[]>(`${this.apiUrl}/list-metric-types.php`);
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/delete-metric-type.php`, { id });
  }
}
