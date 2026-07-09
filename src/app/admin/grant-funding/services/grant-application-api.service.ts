import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';
import { ApplicantOverview } from '../interfaces/applicant-overview.interface';

export interface Cohort {
  id: number;
  name: string;
}

export interface ImportResult {
  summary: {
    total: number;
    inserted: number;
    updated: number;
    attached_to_cohort: number;
    errors: number;
  };
  error_details: { node_id: number; company_name: string; message: string }[];
}

export interface UndoResult {
  summary: {
    total_in_cohort: number;
    detached_from_cohort: number;
    company_id_cleared: number;
    companies_deleted: number;
    errors: number;
  };
  error_details: { company_id: number; company_name: string; message: string }[];
}

@Injectable({ providedIn: 'root' })
export class GrantApplicationApiService {
  private baseUrl = `${Constants.ApiBase}/api/grant-applications`;

  constructor(private http: HttpClient) {}

  getOverview(applicantId: number): Observable<ApplicantOverview> {
    return this.http.get<ApplicantOverview>(
      `${this.baseUrl}/queries/get-overview.php?applicantId=${applicantId}`
    );
  }

  updateApplication(
    applicantId: number,
    data: Record<string, any>
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/commands/update-application.php`,
      { applicantId, data }
    );
  }

  getCohorts(): Observable<Cohort[]> {
    return this.http.get<Cohort[]>(
      `${Constants.ApiBase}/api-nodes/category/list-categories.php?type=cohort`
    );
  }

  executeImport(applicantIds: number[], cohortId: number, status?: string): Observable<ImportResult> {
    return this.http.post<ImportResult>(
      `${this.baseUrl}/commands/execute-import-companies.php`,
      { cohort_id: cohortId, status: status || null }
    );
  }

  undoImport(cohortId: number): Observable<UndoResult> {
    return this.http.post<UndoResult>(
      `${this.baseUrl}/commands/undo-import-companies.php`,
      { cohort_id: cohortId }
    );
  }

  /** Legacy fallback — used by standalone components not yet migrated. */
  getBankStatements(applicantId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${Constants.ApiBase}/api-nodes/node/get-nodes.php?type=grant_bank_statement&parentId=${applicantId}`
    );
  }
}
