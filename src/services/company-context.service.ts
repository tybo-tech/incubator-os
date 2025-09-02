// src/services/company-context.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, shareReplay, switchMap, catchError } from 'rxjs/operators';

import { ICompany } from '../models/simple.schema';
import { ICategoryItemWithSession, CompanyFormTab } from '../models/form-system.models';
import { CompanyFormIntegrationService } from './company-form-integration.service';

export interface ContextItem {
  clientId: number;
  clientName: string;
  programId: number;
  programName: string;
  cohortId: number;
  cohortName: string;
}

export interface EnhancedCompanyContext {
  // Core company
  company: ICompany;

  // Navigation context
  categoryContext: ContextItem[];

  // Enrollment context
  currentEnrollment: ICategoryItemWithSession | null;
  allEnrollments: ICategoryItemWithSession[];

  // Tab configuration
  dynamicTabs: CompanyFormTab[];

  // State flags
  hasMultipleEnrollments: boolean;
  useHybridMode: boolean;

  // Loading states
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private companySubject = new BehaviorSubject<ICompany | null>(null);
  private contextSubject = new BehaviorSubject<ContextItem[]>([]);
  private currentEnrollmentSubject = new BehaviorSubject<ICategoryItemWithSession | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  company$ = this.companySubject.asObservable();
  context$ = this.contextSubject.asObservable();
  currentEnrollment$ = this.currentEnrollmentSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  // Enhanced context combining all data
  enhancedContext$: Observable<EnhancedCompanyContext | null> = combineLatest([
    this.company$,
    this.context$,
    this.currentEnrollment$,
    this.loading$,
    this.error$
  ]).pipe(
    switchMap(([company, context, currentEnrollment, loading, error]) => {
      if (!company) {
        return of(null);
      }

      if (loading) {
        return of({
          company,
          categoryContext: context,
          currentEnrollment,
          allEnrollments: [],
          dynamicTabs: [],
          hasMultipleEnrollments: false,
          useHybridMode: false,
          loading: true,
          error
        });
      }

      this.loadingSubject.next(true);

      return this.formIntegrationService.getCompanyFormTabs(company.id).pipe(
        map((result: { enrollments: ICategoryItemWithSession[]; tabs: CompanyFormTab[] }) => ({
          company,
          categoryContext: context,
          currentEnrollment: currentEnrollment || (result.enrollments.length === 1 ? result.enrollments[0] : null),
          allEnrollments: result.enrollments,
          dynamicTabs: result.tabs,
          hasMultipleEnrollments: result.enrollments.length > 1,
          useHybridMode: result.tabs.length > 0,
          loading: false,
          error: null
        })),
        catchError(err => {
          this.errorSubject.next('Failed to load enrollment data');
          this.loadingSubject.next(false);
          return of({
            company,
            categoryContext: context,
            currentEnrollment,
            allEnrollments: [],
            dynamicTabs: [],
            hasMultipleEnrollments: false,
            useHybridMode: false,
            loading: false,
            error: 'Failed to load enrollment data'
          });
        })
      );
    }),
    shareReplay(1)
  );

  constructor(
    private formIntegrationService: CompanyFormIntegrationService
  ) {
    // Subscribe to enhanced context to update loading state
    this.enhancedContext$.subscribe(context => {
      if (context && !context.loading) {
        this.loadingSubject.next(false);
        if (!context.error) {
          this.errorSubject.next(null);
        }
      }
    });
  }

  // Set company and load enrollments
  setCompany(company: ICompany): void {
    console.log('CompanyContextService: Setting company', company.name);
    this.companySubject.next(company);
    this.errorSubject.next(null);
  }

  // Set navigation context (from query params)
  setContext(context: ContextItem[]): void {
    console.log('CompanyContextService: Setting context', context);
    this.contextSubject.next(context);
  }

  // Switch enrollment context
  setCurrentEnrollment(enrollment: ICategoryItemWithSession | null): void {
    console.log('CompanyContextService: Setting current enrollment', enrollment?.program_name);
    this.currentEnrollmentSubject.next(enrollment);
  }

  // Refresh enrollments for current company
  refreshEnrollments(): void {
    const currentCompany = this.companySubject.value;
    if (currentCompany) {
      console.log('CompanyContextService: Refreshing enrollments for', currentCompany.name);
      this.setCompany(currentCompany);
    }
  }

  // Clear all context
  clearContext(): void {
    console.log('CompanyContextService: Clearing all context');
    this.companySubject.next(null);
    this.contextSubject.next([]);
    this.currentEnrollmentSubject.next(null);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
  }

  // Get current values (synchronous)
  getCurrentCompany(): ICompany | null {
    return this.companySubject.value;
  }

  getCurrentContext(): ContextItem[] {
    return this.contextSubject.value;
  }

  getCurrentEnrollment(): ICategoryItemWithSession | null {
    return this.currentEnrollmentSubject.value;
  }

  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  hasError(): string | null {
    return this.errorSubject.value;
  }

  // Helper methods
  hasContext(): boolean {
    return this.contextSubject.value.length > 0;
  }

  getContextString(): string {
    const context = this.contextSubject.value;
    return context.map(c => `${c.clientName} → ${c.programName} → ${c.cohortName}`).join(' | ');
  }

  // Auto-select enrollment if only one exists
  autoSelectSingleEnrollment(): void {
    this.enhancedContext$.subscribe(context => {
      if (context &&
          context.allEnrollments.length === 1 &&
          !context.currentEnrollment) {
        this.setCurrentEnrollment(context.allEnrollments[0]);
      }
    });
  }

  /**
   * Get company enrollments from integration service
   */
  getCompanyEnrollments(companyId: number): Observable<ICategoryItemWithSession[]> {
    return this.formIntegrationService.getCompanyEnrollments(companyId);
  }

  /**
   * Set enrollment context
   */
  setEnrollmentContext(enrollment: ICategoryItemWithSession | null): void {
    this.currentEnrollmentSubject.next(enrollment);
  }

  /**
   * Get current context as snapshot
   */
  getCurrentContextSnapshot(): {
    company: any | null;
    enrollment: ICategoryItemWithSession | null;
    tabs: CompanyFormTab[];
  } {
    return {
      company: this.companySubject.value,
      enrollment: this.currentEnrollmentSubject.value,
      tabs: [] // Will be populated when tabs are loaded
    };
  }
}
