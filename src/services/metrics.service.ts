import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import {
  IMetricGroup, IMetricType, IMetricRecord, MetricsHierarchy,
  CreateMetricGroupDto, UpdateMetricGroupDto,
  CreateMetricTypeDto, UpdateMetricTypeDto,
  CreateMetricRecordDto, UpdateMetricRecordDto
} from '../models/metrics.model';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/metrics`;
  constructor(private http: HttpClient) {}

  // Groups
  addGroup(dto: CreateMetricGroupDto): Observable<IMetricGroup> { return this.http.post<IMetricGroup>(`${this.apiUrl}/add-metric-group.php`, dto); }
  updateGroup(dto: UpdateMetricGroupDto): Observable<IMetricGroup> { return this.http.post<IMetricGroup>(`${this.apiUrl}/update-metric-group.php`, dto); }
  getGroup(id: number): Observable<IMetricGroup> { return this.http.get<IMetricGroup>(`${this.apiUrl}/get-metric-group.php?id=${id}`); }
  listGroups(client_id: number): Observable<IMetricGroup[]> { return this.http.get<IMetricGroup[]>(`${this.apiUrl}/list-metric-groups.php?client_id=${client_id}`); }
  deleteGroup(id: number): Observable<{success:boolean}> { return this.http.post<{success:boolean}>(`${this.apiUrl}/delete-metric-group.php`, { id }); }

  // Types
  addType(dto: CreateMetricTypeDto): Observable<IMetricType> { return this.http.post<IMetricType>(`${this.apiUrl}/add-metric-type.php`, dto); }
  updateType(dto: UpdateMetricTypeDto): Observable<IMetricType> { return this.http.post<IMetricType>(`${this.apiUrl}/update-metric-type.php`, dto); }
  getType(id: number): Observable<IMetricType> { return this.http.get<IMetricType>(`${this.apiUrl}/get-metric-type.php?id=${id}`); }
  listTypes(group_id: number): Observable<IMetricType[]> { return this.http.get<IMetricType[]>(`${this.apiUrl}/list-metric-types.php?group_id=${group_id}`); }
  deleteType(id: number): Observable<{success:boolean}> { return this.http.post<{success:boolean}>(`${this.apiUrl}/delete-metric-type.php`, { id }); }

  // Records
  addRecord(dto: CreateMetricRecordDto): Observable<IMetricRecord> { return this.http.post<IMetricRecord>(`${this.apiUrl}/add-metric-record.php`, dto); }
  updateRecord(dto: UpdateMetricRecordDto): Observable<IMetricRecord> { return this.http.post<IMetricRecord>(`${this.apiUrl}/update-metric-record.php`, dto); }
  getRecord(id: number): Observable<IMetricRecord> { return this.http.get<IMetricRecord>(`${this.apiUrl}/get-metric-record.php?id=${id}`); }
  listRecords(metric_type_id: number, company_id: number, program_id: number, cohort_id: number): Observable<IMetricRecord[]> {
    return this.http.get<IMetricRecord[]>(`${this.apiUrl}/list-metric-records.php?metric_type_id=${metric_type_id}&company_id=${company_id}&program_id=${program_id}&cohort_id=${cohort_id}`);
  }
  deleteRecord(id: number): Observable<{success:boolean}> { return this.http.post<{success:boolean}>(`${this.apiUrl}/delete-metric-record.php`, { id }); }

  // Full hierarchy
  fullMetrics(client_id: number, company_id: number, program_id: number, cohort_id: number): Observable<MetricsHierarchy> {
    return this.http.get<MetricsHierarchy>(`${this.apiUrl}/full-metrics.php?client_id=${client_id}&company_id=${company_id}&program_id=${program_id}&cohort_id=${cohort_id}`);
  }
}
