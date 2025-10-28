import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, of } from 'rxjs';
import { ActionItemService, ActionItem } from './action-item.service';
import { ToastService } from '../app/services/toast.service';

export interface SwotItem {
  id?: number;
  content: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  company_id: number;
}

export interface SwotData {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

export interface SwotSummary {
  strengths: number;
  weaknesses: number;
  opportunities: number;
  threats: number;
  total: number;
}

/**
 * Singleton service for managing SWOT analysis data
 * Handles data loading, caching, and CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class SwotDataService {
  private swotData$ = new BehaviorSubject<SwotData>({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  });

  private loading$ = new BehaviorSubject<boolean>(false);
  private currentCompanyId: number | null = null;

  constructor(
    private actionItemService: ActionItemService,
    private toastService: ToastService
  ) {}

  /**
   * Get current SWOT data as observable
   */
  getSwotData(): Observable<SwotData> {
    return this.swotData$.asObservable();
  }

  /**
   * Get loading state
   */
  getLoadingState(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  /**
   * Get SWOT summary statistics
   */
  getSwotSummary(): Observable<SwotSummary> {
    return this.swotData$.pipe(
      map(data => ({
        strengths: data.strengths.length,
        weaknesses: data.weaknesses.length,
        opportunities: data.opportunities.length,
        threats: data.threats.length,
        total: data.strengths.length + data.weaknesses.length + 
               data.opportunities.length + data.threats.length
      }))
    );
  }

  /**
   * Load SWOT data for a company
   */
  loadSwotData(companyId: number): Observable<SwotData> {
    if (this.currentCompanyId === companyId) {
      return this.swotData$.asObservable();
    }

    this.loading$.next(true);
    this.currentCompanyId = companyId;

    return this.actionItemService.getSwotActionItems(companyId).pipe(
      map(actionItems => this.categorizeActionItems(actionItems)),
      tap(swotData => {
        this.swotData$.next(swotData);
        this.loading$.next(false);
      }),
      catchError(error => {
        console.error('Error loading SWOT data:', error);
        this.toastService.show('Failed to load SWOT analysis data', 'error');
        this.loading$.next(false);
        return of(this.getEmptySwotData());
      })
    );
  }

  /**
   * Add new SWOT item
   */
  addSwotItem(companyId: number, category: 'strength' | 'weakness' | 'opportunity' | 'threat'): Observable<SwotItem> {
    const apiCategory = this.convertToApiCategory(category);

    return this.actionItemService.createSwotActionItem(companyId, apiCategory, '').pipe(
      map(actionItem => this.convertToSwotItem(actionItem)),
      tap(newItem => {
        const currentData = this.swotData$.value;
        const updatedData = { ...currentData };
        
        switch (category) {
          case 'strength':
            updatedData.strengths = [...currentData.strengths, newItem];
            break;
          case 'weakness':
            updatedData.weaknesses = [...currentData.weaknesses, newItem];
            break;
          case 'opportunity':
            updatedData.opportunities = [...currentData.opportunities, newItem];
            break;
          case 'threat':
            updatedData.threats = [...currentData.threats, newItem];
            break;
        }

        this.swotData$.next(updatedData);
        this.toastService.show(`New ${category} added`, 'success');
      }),
      catchError(error => {
        console.error('Error adding SWOT item:', error);
        this.toastService.show(`Failed to add ${category}`, 'error');
        throw error;
      })
    );
  }

  /**
   * Update SWOT item
   */
  updateSwotItem(item: SwotItem): Observable<SwotItem> {
    if (!item.id || !item.content.trim()) {
      return of(item);
    }

    const actionItemData = this.convertToActionItem(item);

    return this.actionItemService.updateActionItem(item.id, actionItemData).pipe(
      map(() => item),
      tap(() => {
        this.toastService.show('SWOT item updated', 'success');
      }),
      catchError(error => {
        console.error('Error updating SWOT item:', error);
        this.toastService.show('Failed to update SWOT item', 'error');
        throw error;
      })
    );
  }

  /**
   * Delete SWOT item
   */
  deleteSwotItem(item: SwotItem): Observable<void> {
    if (!item.id) {
      return of();
    }

    return this.actionItemService.deleteActionItem(item.id).pipe(
      tap(() => {
        const currentData = this.swotData$.value;
        const updatedData = { ...currentData };
        
        // Remove from appropriate array
        updatedData.strengths = currentData.strengths.filter(s => s !== item);
        updatedData.weaknesses = currentData.weaknesses.filter(w => w !== item);
        updatedData.opportunities = currentData.opportunities.filter(o => o !== item);
        updatedData.threats = currentData.threats.filter(t => t !== item);

        this.swotData$.next(updatedData);
        this.toastService.show('SWOT item deleted', 'success');
      }),
      catchError(error => {
        console.error('Error deleting SWOT item:', error);
        this.toastService.show('Failed to delete SWOT item', 'error');
        throw error;
      })
    );
  }

  /**
   * Get items for a specific category
   */
  getItemsByCategory(category: 'strength' | 'weakness' | 'opportunity' | 'threat'): Observable<SwotItem[]> {
    return this.swotData$.pipe(
      map(data => {
        switch (category) {
          case 'strength': return data.strengths;
          case 'weakness': return data.weaknesses;
          case 'opportunity': return data.opportunities;
          case 'threat': return data.threats;
          default: return [];
        }
      })
    );
  }

  /**
   * Clear cached data (useful when switching companies)
   */
  clearCache(): void {
    this.currentCompanyId = null;
    this.swotData$.next(this.getEmptySwotData());
  }

  // Private helper methods

  private categorizeActionItems(actionItems: ActionItem[]): SwotData {
    const strengths = actionItems.filter(item => 
      this.isCategory(item.category, ['strengths', 'strength'])
    ).map(item => this.convertToSwotItem(item));

    const weaknesses = actionItems.filter(item => 
      this.isCategory(item.category, ['weaknesses', 'weakness'])
    ).map(item => this.convertToSwotItem(item));

    const opportunities = actionItems.filter(item => 
      this.isCategory(item.category, ['opportunities', 'opportunity'])
    ).map(item => this.convertToSwotItem(item));

    const threats = actionItems.filter(item => 
      this.isCategory(item.category, ['threats', 'threat'])
    ).map(item => this.convertToSwotItem(item));

    return {
      strengths,
      weaknesses,
      opportunities,
      threats
    };
  }

  private isCategory(itemCategory: string | undefined, categories: string[]): boolean {
    if (!itemCategory) return false;
    return categories.some(cat => itemCategory.toLowerCase() === cat.toLowerCase());
  }

  private convertToSwotItem(actionItem: ActionItem): SwotItem {
    let normalizedCategory: 'strength' | 'weakness' | 'opportunity' | 'threat';
    const category = actionItem.category?.toLowerCase();

    if (category === 'strengths' || category === 'strength') {
      normalizedCategory = 'strength';
    } else if (category === 'weaknesses' || category === 'weakness') {
      normalizedCategory = 'weakness';
    } else if (category === 'opportunities' || category === 'opportunity') {
      normalizedCategory = 'opportunity';
    } else if (category === 'threats' || category === 'threat') {
      normalizedCategory = 'threat';
    } else {
      normalizedCategory = 'strength'; // Default fallback
    }

    return {
      id: actionItem.id,
      content: actionItem.description || '',
      category: normalizedCategory,
      company_id: actionItem.company_id
    };
  }

  private convertToActionItem(swotItem: SwotItem): Partial<ActionItem> {
    const apiCategory = this.convertToApiCategory(swotItem.category);

    return {
      id: swotItem.id,
      company_id: swotItem.company_id,
      context_type: 'swot',
      category: apiCategory,
      description: swotItem.content,
      status: 'pending',
      priority: 'medium'
    };
  }

  private convertToApiCategory(category: 'strength' | 'weakness' | 'opportunity' | 'threat'): string {
    const categoryMap = {
      'strength': 'Strengths',
      'weakness': 'Weaknesses',
      'opportunity': 'Opportunities',
      'threat': 'Threats'
    };
    return categoryMap[category];
  }

  private getEmptySwotData(): SwotData {
    return {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };
  }
}