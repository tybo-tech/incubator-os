import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

export interface SwotAnalysis {
  id: number;
  company_id: number;
  analysis_date: string | null;
  summary: string | null;
  status: 'draft' | 'completed' | 'archived';
  is_current: number;
  legacy_node_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface SwotItem {
  id: number;
  swot_analysis_id: number;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  description: string;
  impact: string;
  priority: string;
  status: string;
  recommended_response: string | null;
  owner_label: string | null;
  owner_user_id: number | null;
  target_date: string | null;
  date_added: string | null;
  legacy_path: string | null;
}

@Injectable({ providedIn: 'root' })
export class SwotService {
  private http = inject(HttpClient);
  private base = `${Constants.ApiBase}api-nodes/swot-analyses`;
  private itemBase = `${Constants.ApiBase}api-nodes/swot-items`;

  listAnalyses(companyId: number): Observable<SwotAnalysis[]> {
    const params = new HttpParams().set('company_id', String(companyId));
    return this.http.get<SwotAnalysis[]>(`${this.base}/list.php`, { params, withCredentials: true });
  }

  getAnalysis(id: number): Observable<SwotAnalysis> {
    const params = new HttpParams().set('id', String(id));
    return this.http.get<SwotAnalysis>(`${this.base}/get.php`, { params, withCredentials: true });
  }

  listItems(analysisId?: number, companyId?: number, category?: string): Observable<SwotItem[]> {
    let params = new HttpParams();
    if (analysisId) params = params.set('swot_analysis_id', String(analysisId));
    if (companyId) params = params.set('company_id', String(companyId));
    if (category) params = params.set('category', category);
    return this.http.get<SwotItem[]>(`${this.itemBase}/list.php`, { params, withCredentials: true });
  }

  listByCompany(companyId: number): Observable<SwotItem[]> {
    return this.listItems(undefined, companyId);
  }

  setCurrent(analysisId: number): Observable<any> {
    return this.http.post(`${this.base}/set-current.php`, { id: analysisId }, { withCredentials: true });
  }
}
