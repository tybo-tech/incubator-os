import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';
import { ApplicantOverview } from '../interfaces/applicant-overview.interface';

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

  /** Legacy fallback — used by standalone components not yet migrated. */
  getBankStatements(applicantId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${Constants.ApiBase}/api-nodes/node/get-nodes.php?type=grant_bank_statement&parentId=${applicantId}`
    );
  }
}
