import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

// ── Response shapes ──────────────────────────────────────────────────────────

// ── Form Analytics ────────────────────────────────────────────────────────────

export interface IFormQuestionAnalytics {
  id: string;
  label: string;
  type: 'boolean' | 'select' | 'number';
  total_answered: number;
  total_possible: number;
  breakdown: Partial<Record<string, number>>;
  options?: string[];                               // select questions: defined option list
  stats?: { min: number; max: number; avg: number; sum: number }; // number questions
}

export interface IFormSectionAnalytics {
  id: string;
  title: string;
  questions: IFormQuestionAnalytics[];
}

export interface IFormStageAnalytics {
  stage_key: string;
  stage_label: string;
  stage_type: string;
  stage_color: string;
  template_id: number;
  template_name: string;
  total_submissions: number;
  submitted_count: number;
  draft_count: number;
  sections: IFormSectionAnalytics[];
}

export interface IFormAnalytics {
  workflow_id: string;
  workflow_name: string;
  total_applicants: number;
  stage_count: number;
  stages: IFormStageAnalytics[];
}

// ── Financial Report ──────────────────────────────────────────────────────────

export interface IApplicantSummary {
  id: number;
  company_id: number | null;
  company_name: string;
  status: string;
  province: string;
  registration_number: string;
  workflow_id: string;
  created_at: string;
  fy_count: number;
  grand_total: number;
  active_months: number;
  captured_months: number;
  avg_per_active_month: number;
  consistency_rate: number;
  consistency_label: 'Consistent' | 'Moderate' | 'Irregular';
  consistency_note: string;
}

export interface IFyRow {
  node_id: number;
  financial_year_id: number;
  financial_year_name: string;
  months: Record<string, number | null>;
  total: number;
  active_months: number;
  captured_months: number;
  avg_per_active_month: number;
  consistency_rate: number;
  consistency_label: 'Consistent' | 'Moderate' | 'Irregular';
}

export interface IApplicantFinancialSummary {
  applicant_id: number;
  company_name: string;
  status: string;
  province: string;
  registration_number: string;
  workflow_id: string;
  grand_total: number;
  active_months: number;
  captured_months: number;
  avg_per_active_month: number;
  consistency_rate: number;
  consistency_label: 'Consistent' | 'Moderate' | 'Irregular';
  consistency_note: string;
  fy_count: number;
  fy_rows: IFyRow[];
}

export interface IFormSubmissionRecord {
  id: number;
  parent_id: number;
  form_template_id: number;
  form_template_name: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  answers: Record<string, any>;
  meta: { interviewer_notes?: string; decision?: string };
  created_at: string;
}

export interface IApplicantSubmissions {
  applicant_id: number;
  company_id: number;
  company_name: string;
  total: number;
  submissions: IFormSubmissionRecord[];
}

export interface IFinancialOverviewApplicant extends IApplicantSummary {
  rank: number;
}

export interface IFinancialOverview {
  workflow_id: string | null;
  total_applicants: number;
  applicants_with_data: number;
  total_pool_value: number;
  overall_active_months: number;
  overall_captured_months: number;
  overall_avg_per_active_month: number;
  top_avg_per_month: number;
  applicants: IFinancialOverviewApplicant[];
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GrantReportsService {
  private readonly base = `${Constants.ApiBase}/api-nodes/grant`;

  constructor(private http: HttpClient) {}

  /**
   * All grant applicants with aggregated bank-statement stats.
   * All filters are optional.
   */
  getApplicants(filters?: {
    workflow_id?: string;
    status?: string;
    province?: string;
  }): Observable<IApplicantSummary[]> {
    let params = new HttpParams();
    if (filters?.workflow_id) params = params.set('workflow_id', filters.workflow_id);
    if (filters?.status)      params = params.set('status',      filters.status);
    if (filters?.province)    params = params.set('province',    filters.province);
    return this.http.get<IApplicantSummary[]>(`${this.base}/applicants.php`, { params });
  }

  /**
   * Full per-FY financial breakdown for a single applicant.
   * Includes months array, totals, consistency score, avg per month.
   */
  getFinancialSummary(applicantId: number): Observable<IApplicantFinancialSummary> {
    return this.http.get<IApplicantFinancialSummary>(
      `${this.base}/applicant-financial-summary.php`,
      { params: new HttpParams().set('id', applicantId) }
    );
  }

  /**
   * All form / interview submissions for a grant applicant.
   */
  getFormSubmissions(applicantId: number): Observable<IApplicantSubmissions> {
    return this.http.get<IApplicantSubmissions>(
      `${this.base}/applicant-submissions.php`,
      { params: new HttpParams().set('applicant_id', applicantId) }
    );
  }

  /**
   * Cross-applicant financial leaderboard scoped to a workflow.
   */
  getFinancialOverview(workflowId?: string): Observable<IFinancialOverview> {
    let params = new HttpParams();
    if (workflowId) params = params.set('workflow_id', workflowId);
    return this.http.get<IFinancialOverview>(
      `${this.base}/financial-overview.php`,
      { params }
    );
  }

  /**
   * Aggregated form / interview analytics for every stage that has a template
   * in the given workflow.  Only boolean, select, and number fields are
   * aggregated — free-text fields are excluded.
   */
  getFormAnalytics(workflowId: string): Observable<IFormAnalytics> {
    return this.http.get<IFormAnalytics>(
      `${this.base}/form-analytics.php`,
      { params: new HttpParams().set('workflow_id', workflowId) }
    );
  }
}
