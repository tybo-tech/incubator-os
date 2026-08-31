import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

export interface GpsTarget {
  id: number;
  company_id: number;
  category: 'strategy_general' | 'finance' | 'sales_marketing' | 'personal_development';
  title: string;
  description: string;
  priority: string;
  impact: string | null;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed' | 'cancelled';
  owner_label: string | null;
  due_date: string | null;
  progress_mode: 'manual' | 'tasks' | 'metric';
  manual_progress_percentage: number;
  success_evidence_required: string | null;
  legacy_node_id: number | null;
  legacy_path: string | null;
}

export interface GpsTargetSource {
  id: number;
  gps_target_id: number;
  source_type: string;
  swot_item_id: number | null;
  notes: string | null;
}

export interface GpsTask {
  id: number;
  gps_target_id: number;
  title: string;
  description: string | null;
  status: string;
  sort_order: number;
  due_date: string | null;
  completed_at: string | null;
}

export interface GpsUpdate {
  id: number;
  gps_target_id: number;
  progress_percentage: number;
  status: string;
  note: string | null;
  recorded_at: string;
}

export interface DashboardCounts {
  total: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  overdue: number;
  at_risk: number;
  due_this_month: number;
}

@Injectable({ providedIn: 'root' })
export class GpsService {
  private http = inject(HttpClient);
  private base = `${Constants.ApiBase}api-nodes/gps-targets`;
  private sourceBase = `${Constants.ApiBase}api-nodes/gps-target-sources`;
  private taskBase = `${Constants.ApiBase}api-nodes/gps-target-tasks`;
  private updateBase = `${Constants.ApiBase}api-nodes/gps-target-updates`;

  listTargets(companyId: number): Observable<GpsTarget[]> {
    const params = new HttpParams().set('company_id', String(companyId));
    return this.http.get<GpsTarget[]>(`${this.base}/list.php`, { params, withCredentials: true });
  }

  grouped(companyId: number): Observable<Record<string, GpsTarget[]>> {
    const params = new HttpParams().set('company_id', String(companyId));
    return this.http.get<Record<string, GpsTarget[]>>(`${this.base}/grouped.php`, { params, withCredentials: true });
  }

  dashboardCounts(companyId: number): Observable<any> {
    const params = new HttpParams().set('company_id', String(companyId));
    return this.http.get<any>(`${this.base}/dashboard-counts.php`, { params, withCredentials: true });
  }

  listBySwotItem(swotItemId: number): Observable<GpsTarget[]> {
    const params = new HttpParams().set('swot_item_id', String(swotItemId));
    return this.http.get<GpsTarget[]>(`${this.sourceBase}/list-by-swot-item.php`, { params, withCredentials: true });
  }

  listByTarget(targetId: number): Observable<GpsTargetSource[]> {
    const params = new HttpParams().set('gps_target_id', String(targetId));
    return this.http.get<GpsTargetSource[]>(`${this.sourceBase}/list-by-target.php`, { params, withCredentials: true });
  }

  link(targetId: number, swotItemId: number): Observable<any> {
    return this.http.post(`${this.sourceBase}/link.php`, { gps_target_id: targetId, swot_item_id: swotItemId }, { withCredentials: true });
  }

  unlink(linkId: number): Observable<any> {
    return this.http.post(`${this.sourceBase}/unlink.php`, { id: linkId }, { withCredentials: true });
  }

  tasks(targetId: number): Observable<GpsTask[]> {
    const params = new HttpParams().set('gps_target_id', String(targetId));
    return this.http.get<GpsTask[]>(`${this.taskBase}/list.php`, { params, withCredentials: true });
  }

  updates(targetId: number): Observable<GpsUpdate[]> {
    const params = new HttpParams().set('gps_target_id', String(targetId));
    return this.http.get<GpsUpdate[]>(`${this.updateBase}/history.php`, { params, withCredentials: true });
  }
}
