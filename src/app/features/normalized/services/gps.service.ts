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
  swot_description?: string | null;
  swot_category?: string | null;
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
  owner_label?: string | null;
  owner_user_id?: number | null;
}

export interface GpsUpdate {
  id: number;
  gps_target_id: number;
  progress_percentage: number;
  status: string;
  note: string | null;
  recorded_at: string;
  recorded_by?: number | null;
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

  getTarget(id: number): Observable<GpsTarget> {
    const params = new HttpParams().set('id', String(id));
    return this.http.get<GpsTarget>(`${this.base}/get.php`, { params, withCredentials: true });
  }

  createTarget(data: Partial<GpsTarget> & { company_id: number }): Observable<GpsTarget> {
    return this.http.post<GpsTarget>(`${this.base}/create.php`, data, { withCredentials: true });
  }

  updateTarget(id: number, data: Partial<GpsTarget>): Observable<GpsTarget> {
    return this.http.post<GpsTarget>(`${this.base}/update.php`, { id, ...data }, { withCredentials: true });
  }

  deleteTarget(id: number): Observable<any> {
    return this.http.post<any>(`${this.base}/delete.php`, { id }, { withCredentials: true });
  }

  link(targetId: number, swotItemId: number): Observable<any> {
    return this.http.post(`${this.sourceBase}/link.php`, { gps_target_id: targetId, swot_item_id: swotItemId }, { withCredentials: true });
  }

  unlink(linkId: number): Observable<any> {
    return this.http.post(`${this.sourceBase}/unlink.php`, { id: linkId }, { withCredentials: true });
  }

  unlinkByTargetAndSwot(targetId: number, swotItemId: number): Observable<any> {
    return this.http.post(`${this.sourceBase}/unlink.php`, { gps_target_id: targetId, swot_item_id: swotItemId }, { withCredentials: true });
  }

  tasks(targetId: number): Observable<GpsTask[]> {
    const params = new HttpParams().set('gps_target_id', String(targetId));
    return this.http.get<GpsTask[]>(`${this.taskBase}/list.php`, { params, withCredentials: true });
  }

  createTask(data: Partial<GpsTask> & { gps_target_id: number; title: string }): Observable<GpsTask> {
    return this.http.post<GpsTask>(`${this.taskBase}/create.php`, data, { withCredentials: true });
  }

  updateTask(id: number, data: Partial<GpsTask>): Observable<GpsTask> {
    return this.http.post<GpsTask>(`${this.taskBase}/update.php`, { id, ...data }, { withCredentials: true });
  }

  deleteTask(id: number): Observable<any> {
    return this.http.post<any>(`${this.taskBase}/delete.php`, { id }, { withCredentials: true });
  }

  reorderTasks(gpsTargetId: number, orderedIds: number[]): Observable<GpsTask[]> {
    return this.http.post<GpsTask[]>(`${this.taskBase}/reorder.php`, { gps_target_id: gpsTargetId, ordered_ids: orderedIds }, { withCredentials: true });
  }

  updates(targetId: number): Observable<GpsUpdate[]> {
    const params = new HttpParams().set('gps_target_id', String(targetId));
    return this.http.get<GpsUpdate[]>(`${this.updateBase}/history.php`, { params, withCredentials: true });
  }

  addUpdate(data: { gps_target_id: number; progress_percentage: number; status: string; note?: string | null }): Observable<GpsUpdate> {
    return this.http.post<GpsUpdate>(`${this.updateBase}/add.php`, data, { withCredentials: true });
  }
}
