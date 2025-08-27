import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GroupingContext } from './types';

@Injectable({
  providedIn: 'root'
})
export class GroupingStateService {
  private readonly storageKey = 'grouping_context';

  private _context = signal<GroupingContext>({
    clientId: null,
    programId: null,
    cohortId: null
  });

  readonly context = this._context.asReadonly();

  constructor(private router: Router) {
    this.loadFromStorage();
  }

  updateContext(partial: Partial<GroupingContext>): void {
    const current = this._context();
    const newContext = { ...current, ...partial };

    // Clear child selections when parent changes
    if (partial.clientId !== undefined && partial.clientId !== current.clientId) {
      newContext.programId = null;
      newContext.cohortId = null;
    }
    if (partial.programId !== undefined && partial.programId !== current.programId) {
      newContext.cohortId = null;
    }

    this._context.set(newContext);
    this.saveToStorage();
    this.updateQueryParams();
  }

  clearContext(): void {
    this._context.set({ clientId: null, programId: null, cohortId: null });
    this.saveToStorage();
    this.updateQueryParams();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const context = JSON.parse(stored);
        this._context.set(context);
      }
    } catch (error) {
      console.warn('Failed to load grouping context from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._context()));
    } catch (error) {
      console.warn('Failed to save grouping context to storage:', error);
    }
  }

  private updateQueryParams(): void {
    const context = this._context();
    const queryParams: any = {};

    if (context.clientId) queryParams.clientId = context.clientId;
    if (context.programId) queryParams.programId = context.programId;
    if (context.cohortId) queryParams.cohortId = context.cohortId;

    this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
