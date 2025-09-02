import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, switchMap, of, forkJoin } from 'rxjs';
import { Constants } from './service';
import { ICategory, ICompany } from '../models/simple.schema';
import {
  IForm,
  IFormSession,
  IFormNode,
  ISessionFieldResponse,
  ICategoryItemWithSession,
  CompanyFormContext,
  CompanyFormTab,
  ProgramFormConfig,
  FormSearchFilters
} from '../models/form-system.models';
import { CategoryService } from './category.service';
import { FormService } from './form.service';
import { FormSessionService } from './form-session.service';
import { FormNodeService } from './form-node.service';

/**
 * Service to integrate company details with dynamic forms based on category hierarchy
 * Bridges CategoryItem enrollments with Form system for dynamic company detail tabs
 */
@Injectable({ providedIn: 'root' })
export class CompanyFormIntegrationService {
  private readonly apiUrl = `${Constants.ApiBase}/api-nodes`;
  private readonly http = inject(HttpClient);
  private readonly categoryService = inject(CategoryService);
  private readonly formService = inject(FormService);
  private readonly formSessionService = inject(FormSessionService);
  private readonly formNodeService = inject(FormNodeService);

  /* =========================================================================
     COMPANY ENROLLMENT CONTEXT
     ========================================================================= */

  /**
   * Get all enrollments for a company with form session data
   */
  getCompanyEnrollments(companyId: number): Observable<ICategoryItemWithSession[]> {
    return this.http.get<ICategoryItemWithSession[]>(
      `${this.apiUrl}/category-item/list-for-company.php?company_id=${companyId}`
    ).pipe(
      switchMap(enrollments => {
        if (enrollments.length === 0) return of([]);

        // Load form sessions for each enrollment
        const sessionObservables = enrollments.map(enrollment =>
          this.formSessionService.getFormSessionsByEnrollment(enrollment.id).pipe(
            map((sessions: IFormSession[]) => ({
              ...enrollment,
              form_sessions: sessions,
              active_sessions: sessions.filter(s => s.status === 'draft' || s.status === 'submitted'),
              completed_sessions: sessions.filter(s => s.status === 'advisor_verified' || s.status === 'program_approved')
            }))
          )
        );

        return combineLatest(sessionObservables);
      })
    );
  }

  /**
   * Get specific enrollment context with hierarchy and forms
   */
  getEnrollmentContext(categoryItemId: number): Observable<CompanyFormContext & {
    enrollment: ICategoryItemWithSession;
    program_config: ProgramFormConfig
  }> {
    return this.http.get<ICategoryItemWithSession>(
      `${this.apiUrl}/category-item/get-by-id.php?id=${categoryItemId}`
    ).pipe(
      switchMap(enrollment => {
        return combineLatest([
          this.formSessionService.getFormSessionsByEnrollment(categoryItemId),
          this.getProgramFormConfig(enrollment.program_id)
        ]).pipe(
          map(([sessions, programConfig]) => ({
            company_id: enrollment.company_id,
            categories_item_id: enrollment.id,
            program_id: enrollment.program_id,
            cohort_id: enrollment.cohort_id,
            client_id: enrollment.client_id || undefined,
            enrollment: {
              ...enrollment,
              form_sessions: sessions,
              active_sessions: sessions.filter((s: IFormSession) => s.status === 'draft' || s.status === 'submitted'),
              completed_sessions: sessions.filter((s: IFormSession) => s.status === 'advisor_verified' || s.status === 'program_approved')
            },
            program_config: programConfig
          }))
        );
      })
    );
  }

  /* =========================================================================
     PROGRAM FORM CONFIGURATION
     ========================================================================= */

  /**
   * Get form configuration for a program
   */
  getProgramFormConfig(programId: number): Observable<ProgramFormConfig> {
    // Search for forms with program scope
    const filters: FormSearchFilters = {
      scope_type: 'program',
      scope_id: programId
    };

    return combineLatest([
      this.formService.searchForms(filters),
      this.categoryService.getCategoryById(programId)
    ]).pipe(
      map(([forms, program]) => ({
        program_id: programId,
        program_name: program.name,
        forms: forms,
        default_form_id: forms.length > 0 ? forms[0].id : undefined,
        form_order: forms.map(f => f.id)
      }))
    );
  }

  /**
   * Get all available form configurations for different programs
   */
  getAllProgramFormConfigs(programIds: number[]): Observable<Map<number, ProgramFormConfig>> {
    const configObservables = programIds.map(programId =>
      this.getProgramFormConfig(programId).pipe(
        map(config => ({ programId, config }))
      )
    );

    return combineLatest(configObservables).pipe(
      map(results => {
        const configMap = new Map<number, ProgramFormConfig>();
        results.forEach(({ programId, config }) => {
          configMap.set(programId, config);
        });
        return configMap;
      })
    );
  }

  /* =========================================================================
     DYNAMIC TAB GENERATION
     ========================================================================= */

  /**
   * Generate dynamic tabs for company detail page based on enrollment
   */
  generateCompanyTabs(companyId: number, currentEnrollmentId?: number): Observable<CompanyFormTab[]> {
    return this.getCompanyEnrollments(companyId).pipe(
      switchMap(enrollments => {
        if (enrollments.length === 0) {
          return of([]);
        }

        // Get unique program IDs
        const programIds = [...new Set(enrollments.map(e => e.program_id))];

        return this.getAllProgramFormConfigs(programIds).pipe(
          switchMap(configMap => {
            const tabObservables: Observable<CompanyFormTab>[] = [];

            // Add dynamic tabs for each program form
            programIds.forEach(programId => {
              const config = configMap.get(programId);
              if (config && config.forms.length > 0) {
                const programEnrollments = enrollments.filter(e => e.program_id === programId);

                config.forms.forEach(form => {
                  const enrollment = currentEnrollmentId ?
                    programEnrollments.find(e => e.id === currentEnrollmentId) :
                    programEnrollments[0];

                  if (enrollment) {
                    const tabObservable = this.createFormTab(form, enrollment);
                    tabObservables.push(tabObservable);
                  }
                });
              }
            });

            return tabObservables.length > 0 ? combineLatest(tabObservables) : of([]);
          })
        );
      })
    );
  }

  /**
   * Create a form tab with full form data
   */
  private createFormTab(form: IForm, enrollment: ICategoryItemWithSession): Observable<CompanyFormTab> {
    return combineLatest([
      this.formNodeService.getFormNodes(form.id),
      this.getOrCreateFormSession(form.id, enrollment.id, enrollment.company_id)
    ]).pipe(
      map(([nodes, session]) => ({
        form: form,
        nodes: nodes,
        session: session,
        responses: [], // TODO: Load actual responses
        is_active: session.status === 'draft' || session.status === 'submitted',
        can_edit: session.status === 'draft'
      }))
    );
  }

  /* =========================================================================
     SESSION MANAGEMENT
     ========================================================================= */

  /**
   * Initialize form session for company enrollment
   */
  initializeFormSession(
    formId: number,
    categoryItemId: number,
    companyId: number
  ): Observable<IFormSession> {
    return this.formSessionService.addFormSession({
      form_id: formId,
      categories_item_id: categoryItemId,
      session_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      status: 'draft',
      started_at: new Date().toISOString()
    });
  }

  /**
   * Get or create form session for company enrollment
   */
  getOrCreateFormSession(
    formId: number,
    categoryItemId: number,
    companyId: number
  ): Observable<IFormSession> {
    // Try to find existing session
    return this.formSessionService.getFormSessionsByEnrollment(categoryItemId).pipe(
      switchMap((sessions: IFormSession[]) => {
        const existingSession = sessions.find(s => s.form_id === formId);
        if (existingSession) {
          return of(existingSession);
        }
        return this.initializeFormSession(formId, categoryItemId, companyId);
      })
    );
  }

  /* =========================================================================
     ANALYTICS & PROGRESS TRACKING
     ========================================================================= */

  /**
   * Get form completion statistics for company
   */
  getCompanyFormStatistics(companyId: number): Observable<{
    total_forms: number;
    completed_forms: number;
    in_progress_forms: number;
    completion_percentage: number;
    by_program: Array<{
      program_id: number;
      program_name: string;
      total_forms: number;
      completed_forms: number;
      completion_percentage: number;
    }>;
  }> {
    return this.getCompanyEnrollments(companyId).pipe(
      switchMap(enrollments => {
        const programIds = [...new Set(enrollments.map(e => e.program_id))];

        return this.getAllProgramFormConfigs(programIds).pipe(
          map(configMap => {
            let totalForms = 0;
            let completedForms = 0;
            let inProgressForms = 0;
            const byProgram: any[] = [];

            programIds.forEach(programId => {
              const config = configMap.get(programId);
              const programEnrollments = enrollments.filter(e => e.program_id === programId);

              if (config) {
                const programTotalForms = config.forms.length;
                const programCompletedForms = programEnrollments.reduce((acc, enrollment) => {
                  return acc + (enrollment.completed_sessions?.length || 0);
                }, 0);

                totalForms += programTotalForms;
                completedForms += programCompletedForms;
                inProgressForms += programEnrollments.reduce((acc, enrollment) => {
                  return acc + (enrollment.active_sessions?.length || 0);
                }, 0);

                byProgram.push({
                  program_id: programId,
                  program_name: config.program_name,
                  total_forms: programTotalForms,
                  completed_forms: programCompletedForms,
                  completion_percentage: programTotalForms > 0 ?
                    Math.round((programCompletedForms / programTotalForms) * 100) : 0
                });
              }
            });

            return {
              total_forms: totalForms,
              completed_forms: completedForms,
              in_progress_forms: inProgressForms,
              completion_percentage: totalForms > 0 ?
                Math.round((completedForms / totalForms) * 100) : 0,
              by_program: byProgram
            };
          })
        );
      })
    );
  }
}
