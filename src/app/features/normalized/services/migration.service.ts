import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

export interface MigrationPreview {
  swot: { nodes_seen: number; nodes_selected: number; nodes_skipped_duplicates: number; analyses_created: number; items_created: number; items_skipped_empty: number; errors: any[] };
  gps: { nodes_seen: number; nodes_selected: number; nodes_skipped_duplicates: number; targets_created: number; targets_skipped_empty: number; sources_created: number; errors: any[] };
  duplicates_flagged: any[];
  companies_processed: number[];
  rolled_back: boolean;
}

export interface MigrationResponse {
  success: boolean;
  action: string;
  data: MigrationPreview;
  error?: string;
}

export interface AuditRow {
  id: number;
  user_id: number | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  company_ids: number[];
  result_summary: any;
  errors: any;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class MigrationService {
  private http = inject(HttpClient);
  private base = `${Constants.ApiBase}api-nodes/imports/normalized-migrate.php`;
  private auditBase = `${Constants.ApiBase}api-nodes/imports/migration-audit-list.php`;

  preview(companyIds: number[]): Observable<MigrationResponse> {
    return this.http.post<MigrationResponse>(this.base, { action: 'preview', companyIds }, { withCredentials: true });
  }

  migrate(companyIds: number[], confirm: string): Observable<MigrationResponse> {
    return this.http.post<MigrationResponse>(this.base, { action: 'migrate', companyIds, confirm }, { withCredentials: true });
  }

  auditHistory(limit = 20): Observable<{ success: boolean; audits: AuditRow[] }> {
    return this.http.get<{ success: boolean; audits: AuditRow[] }>(`${this.auditBase}?limit=${limit}`, { withCredentials: true });
  }

  counts(): Observable<any> {
    return this.http.post<any>(this.base, { action: 'counts' }, { withCredentials: true });
  }
}
