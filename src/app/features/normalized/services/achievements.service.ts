import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

export type AchievementKind = 'result' | 'achievement' | 'decision';
export type VerificationStatus = 'unverified' | 'verified' | 'rejected' | 'revoked';
export type EvidenceSourceType = 'metric_snapshot' | 'financial_stat' | 'note' | 'url' | 'file';

export interface AchievementEvidence {
  id: number;
  achievement_id: number;
  source_type: EvidenceSourceType;
  label: string | null;
  reference: string | null;
  snapshot_json: string | null;
  snapshot?: any;
  created_by: number | null;
  created_at: string;
}

export interface Achievement {
  id: number;
  company_id: number;
  gps_target_id: number | null;
  category: string | null;
  kind: AchievementKind;
  title: string;
  description: string | null;
  achieved_on: string | null;
  baseline_value: number | null;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  direction: string | null;
  evidence_summary: string | null;
  recorded_by: number | null;
  recorded_at: string;
  verified_by: number | null;
  verified_at: string | null;
  verification_status: VerificationStatus;
  supersedes_id: number | null;
  revoked_reason: string | null;
  revoked_by: number | null;
  revoked_at: string | null;
  evidence?: AchievementEvidence[];
  evidence_count?: number;
}

export interface AwaitingReview {
  gps_target_id: number;
  measurement: any;
}

export interface AchievementCounts {
  total: number;
  by_status: Record<string, number>;
  decisions: number;
}

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private http = inject(HttpClient);
  private base = `${Constants.ApiBase}api-nodes/achievements`;
  private evidenceBase = `${Constants.ApiBase}api-nodes/achievement-evidence`;

  list(companyId: number, filters: Record<string, string> = {}): Observable<Achievement[]> {
    let params = new HttpParams().set('company_id', String(companyId));
    for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<Achievement[]>(`${this.base}/list.php`, { params, withCredentials: true });
  }

  get(id: number): Observable<Achievement> {
    const params = new HttpParams().set('id', String(id));
    return this.http.get<Achievement>(`${this.base}/get.php`, { params, withCredentials: true });
  }

  create(data: Partial<Achievement> & { company_id: number; title: string }): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.base}/create.php`, data, { withCredentials: true });
  }

  update(id: number, data: Partial<Achievement>): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.base}/update.php`, { id, ...data }, { withCredentials: true });
  }

  remove(id: number): Observable<any> {
    return this.http.post<any>(`${this.base}/delete.php`, { id }, { withCredentials: true });
  }

  verify(id: number): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.base}/verify.php`, { id }, { withCredentials: true });
  }

  reject(id: number): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.base}/reject.php`, { id }, { withCredentials: true });
  }

  revoke(id: number, reason: string): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.base}/revoke.php`, { id, reason }, { withCredentials: true });
  }

  supersede(id: number, overrides: Partial<Achievement> = {}): Observable<Achievement> {
    return this.http.post<Achievement>(`${this.base}/supersede.php`, { id, ...overrides }, { withCredentials: true });
  }

  counts(companyId: number): Observable<AchievementCounts> {
    const params = new HttpParams().set('company_id', String(companyId));
    return this.http.get<AchievementCounts>(`${this.base}/counts.php`, { params, withCredentials: true });
  }

  awaitingReview(companyId: number): Observable<AwaitingReview[]> {
    const params = new HttpParams().set('company_id', String(companyId));
    return this.http.get<AwaitingReview[]>(`${this.base}/awaiting-review.php`, { params, withCredentials: true });
  }

  evidence(achievementId: number): Observable<AchievementEvidence[]> {
    const params = new HttpParams().set('achievement_id', String(achievementId));
    return this.http.get<AchievementEvidence[]>(`${this.evidenceBase}/list.php`, { params, withCredentials: true });
  }

  addEvidence(data: { achievement_id: number; source_type: EvidenceSourceType; label?: string; reference?: string }): Observable<AchievementEvidence> {
    return this.http.post<AchievementEvidence>(`${this.evidenceBase}/create.php`, data, { withCredentials: true });
  }

  deleteEvidence(id: number): Observable<any> {
    return this.http.post<any>(`${this.evidenceBase}/delete.php`, { id }, { withCredentials: true });
  }
}
