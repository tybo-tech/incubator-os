import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

export interface AppContext {
  clientId: number | null;
  programId: number | null;
  cohortId: number | null;
  companyId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {
  private contextSubject = new BehaviorSubject<AppContext>({
    clientId: null,
    programId: null,
    cohortId: null,
    companyId: null
  });

  public context$: Observable<AppContext> = this.contextSubject.asObservable();

  constructor() {}

  /**
   * Update the application context
   */
  updateContext(context: Partial<AppContext>): void {
    const currentContext = this.contextSubject.value;
    const newContext = { ...currentContext, ...context };
    this.contextSubject.next(newContext);

    console.log('ContextService - Context updated:', newContext);
  }

  /**
   * Get current context
   */
  getCurrentContext(): AppContext {
    return this.contextSubject.value;
  }

  /**
   * Get query parameters object for navigation
   */
  getQueryParams(): any {
    const context = this.getCurrentContext();
    const params: any = {};

    if (context.clientId) params.clientId = context.clientId;
    if (context.programId) params.programId = context.programId;
    if (context.cohortId) params.cohortId = context.cohortId;

    return params;
  }

  /**
   * Extract context from route query parameters
   */
  extractContextFromRoute(route: ActivatedRoute): void {
    route.queryParams.subscribe(queryParams => {
      this.updateContext({
        clientId: queryParams['clientId'] ? parseInt(queryParams['clientId'], 10) : null,
        programId: queryParams['programId'] ? parseInt(queryParams['programId'], 10) : null,
        cohortId: queryParams['cohortId'] ? parseInt(queryParams['cohortId'], 10) : null
      });
    });

    route.params.subscribe(params => {
      if (params['id']) {
        this.updateContext({
          companyId: parseInt(params['id'], 10)
        });
      }
    });
  }

  /**
   * Navigate with preserved context
   */
  navigateWithContext(router: Router, path: string[]): void {
    router.navigate(path, {
      queryParams: this.getQueryParams()
    });
  }

  /**
   * Check if we have complete context for company operations
   */
  hasCompanyContext(): boolean {
    const context = this.getCurrentContext();
    return !!(context.clientId && context.programId && context.cohortId && context.companyId);
  }

  /**
   * Clear context (for logout, etc.)
   */
  clearContext(): void {
    this.contextSubject.next({
      clientId: null,
      programId: null,
      cohortId: null,
      companyId: null
    });
  }
}
