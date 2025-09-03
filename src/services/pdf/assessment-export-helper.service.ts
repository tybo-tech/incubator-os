// services/pdf/assessment-export-helper.service.ts - Assessment Export Helper Service

import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AssessmentExportService, ConsolidatedAssessment, AssessmentExportOptions } from './assessment-export.service';
import { CompanyService } from '../company.service';
import { HttpClient } from '@angular/common/http';
import { Constants } from '../service';
import { ICompany } from '../../models/simple.schema';

@Injectable({
  providedIn: 'root'
})
export class AssessmentExportHelperService {

  constructor(
    private assessmentExportService: AssessmentExportService,
    private companyService: CompanyService,
    private http: HttpClient
  ) {}

  /**
   * Export assessment for a specific company ID
   */
  exportAssessmentByCompanyId(
    companyId: number,
    options: AssessmentExportOptions = {}
  ): Observable<void> {
    return forkJoin({
      company: this.companyService.getCompanyById(companyId),
      assessment: this.getConsolidatedAssessment(companyId)
    }).pipe(
      switchMap(({ company, assessment }) => {
        if (!assessment) {
          throw new Error('No assessment data found for this company');
        }
        return this.assessmentExportService.exportAssessmentPdf(company, assessment, options);
      })
    );
  }

  /**
   * Export assessment from existing data
   */
  exportAssessmentFromData(
    company: ICompany,
    assessmentData: ConsolidatedAssessment,
    options: AssessmentExportOptions = {}
  ): Observable<void> {
    return this.assessmentExportService.exportAssessmentPdf(company, assessmentData, options);
  }

  /**
   * Preview assessment data (for debugging)
   */
  previewAssessmentData(companyId: number): Observable<{
    company: ICompany;
    assessment: ConsolidatedAssessment | null;
    responseCount: number;
    completionPercentage: number;
  }> {
    return forkJoin({
      company: this.companyService.getCompanyById(companyId),
      assessment: this.getConsolidatedAssessment(companyId)
    }).pipe(
      map(({ company, assessment }) => ({
        company,
        assessment,
        responseCount: assessment ? Object.keys(assessment.data.responses).length : 0,
        completionPercentage: assessment ? assessment.data.metadata.progress_percentage : 0
      }))
    );
  }

  /**
   * Get consolidated assessment data
   */
  private getConsolidatedAssessment(companyId: number): Observable<ConsolidatedAssessment | null> {
    const url = `${Constants.ApiBase}/api-nodes/company/${companyId}/consolidated-assessment`;
    return this.http.get<ConsolidatedAssessment[]>(url).pipe(
      map(response => {
        if (response && Array.isArray(response) && response.length > 0) {
          return response[0] as ConsolidatedAssessment;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Check if company has assessment data
   */
  hasAssessmentData(companyId: number): Observable<boolean> {
    return this.getConsolidatedAssessment(companyId).pipe(
      map(assessment => !!assessment && Object.keys(assessment.data.responses).length > 0)
    );
  }

  /**
   * Get assessment statistics
   */
  getAssessmentStats(companyId: number): Observable<{
    hasData: boolean;
    responseCount: number;
    completionPercentage: number;
    lastUpdated: string | null;
    currentSection: string | null;
  }> {
    return this.getConsolidatedAssessment(companyId).pipe(
      map(assessment => {
        if (!assessment) {
          return {
            hasData: false,
            responseCount: 0,
            completionPercentage: 0,
            lastUpdated: null,
            currentSection: null
          };
        }

        return {
          hasData: true,
          responseCount: Object.keys(assessment.data.responses).length,
          completionPercentage: assessment.data.metadata.progress_percentage,
          lastUpdated: assessment.data.metadata.last_updated,
          currentSection: assessment.data.metadata.current_section
        };
      })
    );
  }

  /**
   * Export with common preset options
   */
  exportCompleteReport(companyId: number): Observable<void> {
    const options: AssessmentExportOptions = {
      includeEmptyAnswers: false,
      groupBySection: true,
      includeMetadata: true,
      customTitle: 'Complete Business Assessment Report'
    };
    return this.exportAssessmentByCompanyId(companyId, options);
  }

  /**
   * Export summary report (no metadata, compact format)
   */
  exportSummaryReport(companyId: number): Observable<void> {
    const options: AssessmentExportOptions = {
      includeEmptyAnswers: false,
      groupBySection: true,
      includeMetadata: false,
      customTitle: 'Business Assessment Summary'
    };
    return this.exportAssessmentByCompanyId(companyId, options);
  }

  /**
   * Export detailed report (includes everything)
   */
  exportDetailedReport(companyId: number): Observable<void> {
    const options: AssessmentExportOptions = {
      includeEmptyAnswers: true,
      groupBySection: true,
      includeMetadata: true,
      customTitle: 'Detailed Business Assessment Report'
    };
    return this.exportAssessmentByCompanyId(companyId, options);
  }
}
