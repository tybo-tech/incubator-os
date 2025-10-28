import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AccordionState {
  strengths: boolean;
  weaknesses: boolean;
  opportunities: boolean;
  threats: boolean;
}

export type SwotCategory = 'strengths' | 'weaknesses' | 'opportunities' | 'threats';

/**
 * Singleton service for managing SWOT component UI state
 * Handles accordion states, editing states, and UI preferences
 */
@Injectable({
  providedIn: 'root'
})
export class SwotUIStateService {
  private accordionState$ = new BehaviorSubject<AccordionState>({
    strengths: true,
    weaknesses: true,
    opportunities: true,
    threats: true
  });

  private editingItems$ = new BehaviorSubject<Set<number>>(new Set());
  private isExporting$ = new BehaviorSubject<boolean>(false);

  constructor() {}

  // Accordion State Management

  /**
   * Get current accordion state
   */
  getAccordionState(): Observable<AccordionState> {
    return this.accordionState$.asObservable();
  }

  /**
   * Toggle specific accordion section
   */
  toggleAccordion(section: SwotCategory): void {
    const currentState = this.accordionState$.value;
    const updatedState = {
      ...currentState,
      [section]: !currentState[section]
    };
    this.accordionState$.next(updatedState);
  }

  /**
   * Set specific accordion section state
   */
  setAccordionState(section: SwotCategory, isOpen: boolean): void {
    const currentState = this.accordionState$.value;
    const updatedState = {
      ...currentState,
      [section]: isOpen
    };
    this.accordionState$.next(updatedState);
  }

  /**
   * Expand all accordion sections
   */
  expandAll(): void {
    this.accordionState$.next({
      strengths: true,
      weaknesses: true,
      opportunities: true,
      threats: true
    });
  }

  /**
   * Collapse all accordion sections
   */
  collapseAll(): void {
    this.accordionState$.next({
      strengths: false,
      weaknesses: false,
      opportunities: false,
      threats: false
    });
  }

  /**
   * Check if a specific section is open
   */
  isSectionOpen(section: SwotCategory): Observable<boolean> {
    return new Observable(observer => {
      this.accordionState$.subscribe(state => {
        observer.next(state[section]);
      });
    });
  }

  // Editing State Management

  /**
   * Get current editing items
   */
  getEditingItems(): Observable<Set<number>> {
    return this.editingItems$.asObservable();
  }

  /**
   * Check if an item is being edited
   */
  isItemEditing(itemId: number): Observable<boolean> {
    return new Observable(observer => {
      this.editingItems$.subscribe(editingSet => {
        observer.next(editingSet.has(itemId));
      });
    });
  }

  /**
   * Start editing an item
   */
  startEditing(itemId: number): void {
    const currentEditing = this.editingItems$.value;
    const updatedEditing = new Set(currentEditing);
    updatedEditing.add(itemId);
    this.editingItems$.next(updatedEditing);
  }

  /**
   * Stop editing an item
   */
  stopEditing(itemId: number): void {
    const currentEditing = this.editingItems$.value;
    const updatedEditing = new Set(currentEditing);
    updatedEditing.delete(itemId);
    this.editingItems$.next(updatedEditing);
  }

  /**
   * Stop editing all items
   */
  stopEditingAll(): void {
    this.editingItems$.next(new Set());
  }

  /**
   * Check if any items are being edited
   */
  hasEditingItems(): Observable<boolean> {
    return new Observable(observer => {
      this.editingItems$.subscribe(editingSet => {
        observer.next(editingSet.size > 0);
      });
    });
  }

  // Export State Management

  /**
   * Get export state
   */
  getExportState(): Observable<boolean> {
    return this.isExporting$.asObservable();
  }

  /**
   * Set export state
   */
  setExportState(isExporting: boolean): void {
    this.isExporting$.next(isExporting);
  }

  // Utility Methods

  /**
   * Reset all UI state to defaults
   */
  resetUIState(): void {
    this.accordionState$.next({
      strengths: true,
      weaknesses: true,
      opportunities: true,
      threats: true
    });
    this.editingItems$.next(new Set());
    this.isExporting$.next(false);
  }

  /**
   * Save current UI state to localStorage
   */
  saveUIState(companyId: number): void {
    const state = {
      accordion: this.accordionState$.value,
      timestamp: Date.now()
    };
    localStorage.setItem(`swot-ui-state-${companyId}`, JSON.stringify(state));
  }

  /**
   * Load UI state from localStorage
   */
  loadUIState(companyId: number): void {
    const saved = localStorage.getItem(`swot-ui-state-${companyId}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        // Only restore if saved within last 24 hours
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          this.accordionState$.next(state.accordion);
        }
      } catch (error) {
        console.warn('Failed to load saved UI state:', error);
      }
    }
  }

  /**
   * Get quick action methods for template
   */
  getQuickActions() {
    return {
      expandAll: () => this.expandAll(),
      collapseAll: () => this.collapseAll(),
      toggle: (section: SwotCategory) => this.toggleAccordion(section),
      stopEditingAll: () => this.stopEditingAll()
    };
  }
}