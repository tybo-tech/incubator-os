import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Action Item data model interface - matches action_items table exactly
 */
export interface ActionItem {
  id: number;
  tenant_id?: number;
  company_id: number;
  context_type: 'swot' | 'gps';
  category: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number; // 0-100
  target_completion_date?: string;
  actual_completion_date?: string;
  owner_user_id?: number;
  assigned_to_user_id?: number;
  estimated_hours?: number;
  actual_hours?: number;
  budget_allocated?: number;
  budget_spent?: number;
  dependencies?: string;
  notes?: string;
  tags?: string;
  source_data?: string;
  metrics?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Action Item filters interface
 */
export interface ActionItemFilters {
  tenant_id?: number;
  company_id?: number;
  context_type?: 'swot' | 'gps';
  category?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_user_id?: number;
  is_archived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Action Item statistics interface
 */
export interface ActionItemStatistics {
  total_items: number;
  pending_items: number;
  in_progress_items: number;
  completed_items: number;
  on_hold_items: number;
  cancelled_items: number;
  archived_items: number;
  average_progress: number;
  swot_items: number;
  gps_items: number;
}

/**
 * Category breakdown interface
 */
export interface CategoryBreakdown {
  category: string;
  total_count: number;
  completed_count: number;
  average_progress: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActionItemService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/action-items`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /* =========================================================================
     CORE CRUD OPERATIONS
     ========================================================================= */

  /**
   * Get all action items with optional filters
   */
  getAllActionItems(filters?: ActionItemFilters): Observable<ActionItem[]> {
    console.log('📋 Getting all action items with filters:', filters);

    let url = `${this.apiUrl}/list-action-items.php`;
    if (filters) {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ActionItemFilters] !== undefined) {
          params.append(key, String(filters[key as keyof ActionItemFilters]));
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<ActionItem[]>(url)
      .pipe(catchError(this.handleError('Get all action items')));
  }

  /**
   * Get action item by ID
   */
  getActionItemById(id: number): Observable<ActionItem> {
    console.log('📋 Getting action item by ID:', id);
    return this.http.get<ActionItem>(`${this.apiUrl}/get-action-item.php?id=${id}`)
      .pipe(catchError(this.handleError('Get action item by ID')));
  }

  /**
   * Add new action item
   */
  addActionItem(data: Partial<ActionItem>): Observable<ActionItem> {
    console.log('📋 Adding action item:', data);
    return this.http.post<ActionItem>(`${this.apiUrl}/add-action-item.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Add action item')));
  }

  /**
   * Update action item
   */
  updateActionItem(id: number, data: Partial<ActionItem>): Observable<ActionItem> {
    console.log('📋 Updating action item:', id, data);
    return this.http.put<ActionItem>(`${this.apiUrl}/update-action-item.php?id=${id}`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Update action item')));
  }

  /**
   * Delete action item
   */
  deleteActionItem(id: number): Observable<any> {
    console.log('📋 Deleting action item:', id);
    return this.http.delete(`${this.apiUrl}/delete-action-item.php?id=${id}`)
      .pipe(catchError(this.handleError('Delete action item')));
  }

  /* =========================================================================
     SPECIALIZED OPERATIONS
     ========================================================================= */

  /**
   * Get action items by context type (SWOT or GPS)
   */
  getActionItemsByContext(contextType: 'swot' | 'gps', filters?: ActionItemFilters): Observable<ActionItem[]> {
    console.log('📋 Getting action items by context:', contextType);
    const contextFilters = { ...filters, context_type: contextType };
    return this.getAllActionItems(contextFilters);
  }

  /**
   * Get action items by company and context
   */
  getActionItemsByCompanyAndContext(companyId: number, contextType: 'swot' | 'gps', filters?: ActionItemFilters): Observable<ActionItem[]> {
    console.log('📋 Getting action items by company and context:', companyId, contextType);
    const companyContextFilters = { ...filters, company_id: companyId, context_type: contextType };
    return this.getAllActionItems(companyContextFilters);
  }

  /**
   * Get action items by status
   */
  getActionItemsByStatus(status: string, filters?: ActionItemFilters): Observable<ActionItem[]> {
    console.log('📋 Getting action items by status:', status);
    const statusFilters = { ...filters, status: status as any };
    return this.getAllActionItems(statusFilters);
  }

  /**
   * Mark action item as completed
   */
  markActionItemCompleted(id: number): Observable<ActionItem> {
    console.log('📋 Marking action item as completed:', id);
    return this.http.post<ActionItem>(`${this.apiUrl}/mark-completed.php?id=${id}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError('Mark action item completed')));
  }

  /**
   * Update action item progress
   */
  updateActionItemProgress(id: number, progress: number): Observable<ActionItem> {
    console.log('📋 Updating action item progress:', id, progress);
    return this.http.post<ActionItem>(`${this.apiUrl}/update-progress.php?id=${id}&progress=${progress}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError('Update action item progress')));
  }

  /**
   * Archive action item
   */
  archiveActionItem(id: number): Observable<ActionItem> {
    console.log('📋 Archiving action item:', id);
    return this.http.post<ActionItem>(`${this.apiUrl}/archive-action-item.php?id=${id}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError('Archive action item')));
  }

  /**
   * Get action item statistics
   */
  getActionItemStatistics(filters?: Partial<ActionItemFilters>): Observable<ActionItemStatistics> {
    console.log('📋 Getting action item statistics');

    let url = `${this.apiUrl}/get-statistics.php`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', String(filters.company_id));
      if (filters.context_type) params.append('context_type', filters.context_type);
      if (filters.is_archived !== undefined) params.append('is_archived', String(filters.is_archived ? 1 : 0));
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<ActionItemStatistics>(url)
      .pipe(catchError(this.handleError('Get action item statistics')));
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(filters?: Partial<ActionItemFilters>): Observable<CategoryBreakdown[]> {
    console.log('📋 Getting category breakdown');

    let url = `${this.apiUrl}/get-category-breakdown.php`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', String(filters.company_id));
      if (filters.context_type) params.append('context_type', filters.context_type);
      if (filters.is_archived !== undefined) params.append('is_archived', String(filters.is_archived ? 1 : 0));
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<CategoryBreakdown[]>(url)
      .pipe(catchError(this.handleError('Get category breakdown')));
  }

  /* =========================================================================
     HELPER METHODS
     ========================================================================= */

  /**
   * Get action items for dropdown/select options
   */
  getActionItemOptions(filters?: ActionItemFilters): Observable<{ value: number; label: string; status: string }[]> {
    return new Observable(observer => {
      this.getAllActionItems(filters).subscribe({
        next: (items) => {
          const options = items.map(item => ({
            value: item.id,
            label: `${item.category}: ${item.description.substring(0, 50)}...`,
            status: item.status,
            priority: item.priority,
            progress: item.progress
          }));
          observer.next(options);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Get SWOT action items for a company
   */
  getSwotActionItems(companyId: number, filters?: ActionItemFilters): Observable<ActionItem[]> {
    console.log('📋 Getting SWOT action items for company:', companyId);
    return this.getActionItemsByCompanyAndContext(companyId, 'swot', filters);
  }

  /**
   * Get GPS action items for a company
   */
  getGpsActionItems(companyId: number, filters?: ActionItemFilters): Observable<ActionItem[]> {
    console.log('📋 Getting GPS action items for company:', companyId);
    return this.getActionItemsByCompanyAndContext(companyId, 'gps', filters);
  }

  /**
   * Create SWOT action item
   */
  createSwotActionItem(companyId: number, category: string, description: string, additionalData?: Partial<ActionItem>): Observable<ActionItem> {
    console.log('📋 Creating SWOT action item:', { companyId, category, description });
    const swotData: Partial<ActionItem> = {
      company_id: companyId,
      context_type: 'swot',
      category,
      description,
      status: 'pending',
      priority: 'medium',
      progress: 0,
      is_archived: false,
      ...additionalData
    };
    return this.addActionItem(swotData);
  }

  /**
   * Create GPS action item
   */
  createGpsActionItem(companyId: number, category: string, description: string, additionalData?: Partial<ActionItem>): Observable<ActionItem> {
    console.log('📋 Creating GPS action item:', { companyId, category, description });
    const gpsData: Partial<ActionItem> = {
      company_id: companyId,
      context_type: 'gps',
      category,
      description,
      status: 'pending',
      priority: 'medium',
      progress: 0,
      is_archived: false,
      ...additionalData
    };
    return this.addActionItem(gpsData);
  }

  /**
   * Get status options for dropdown
   */
  getStatusOptions(): { value: string; label: string; color: string }[] {
    return [
      { value: 'pending', label: 'Pending', color: '#6B7280' },
      { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
      { value: 'completed', label: 'Completed', color: '#10B981' },
      { value: 'on_hold', label: 'On Hold', color: '#F59E0B' },
      { value: 'cancelled', label: 'Cancelled', color: '#EF4444' }
    ];
  }

  /**
   * Get priority options for dropdown
   */
  getPriorityOptions(): { value: string; label: string; color: string }[] {
    return [
      { value: 'low', label: 'Low', color: '#10B981' },
      { value: 'medium', label: 'Medium', color: '#F59E0B' },
      { value: 'high', label: 'High', color: '#EF4444' },
      { value: 'urgent', label: 'Urgent', color: '#7C2D12' }
    ];
  }

  /**
   * Calculate completion percentage for a list of action items
   */
  calculateCompletionPercentage(items: ActionItem[]): number {
    if (items.length === 0) return 0;
    const totalProgress = items.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(totalProgress / items.length);
  }

  /**
   * Group action items by category
   */
  groupByCategory(items: ActionItem[]): { [category: string]: ActionItem[] } {
    return items.reduce((groups, item) => {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as { [category: string]: ActionItem[] });
  }

  /**
   * Group action items by status
   */
  groupByStatus(items: ActionItem[]): { [status: string]: ActionItem[] } {
    return items.reduce((groups, item) => {
      const status = item.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(item);
      return groups;
    }, {} as { [status: string]: ActionItem[] });
  }

  /* =========================================================================
     ERROR HANDLING
     ========================================================================= */

  /**
   * Handle HTTP operation that failed
   */
  private handleError(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`📋 ActionItemService: ${operation} failed:`, error);

      let errorMessage = 'An error occurred';
      if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return throwError(() => new Error(`${operation}: ${errorMessage}`));
    };
  }
}
