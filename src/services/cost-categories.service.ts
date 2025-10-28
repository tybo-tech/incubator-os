import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Constants } from './service';

/**
 * Cost Categories filters for list operations
 */
export interface ICostCategoriesFilters {
  parent_id?: number | 'null';
  industry_id?: number | 'null';
  search?: string;
  cost_type?: 'direct' | 'operational';
  status_id?: number;
}

/**
 * Cost Category data model
 */
export interface CostCategory {
  id: number;
  name: string;
  parent_id?: number | null;
  industry_id?: number | null;
  cost_type?: 'direct' | 'operational' | null;
  status_id?: number;
  children?: CostCategory[];
}

/**
 * Cost Category Statistics interface
 */
export interface CostCategoryStatistics {
  id: number;
  name: string;
  direct_children: number;
  total_descendants: number;
  has_parent: boolean;
  industry_id?: number | null;
}

/**
 * Cost Category Tree interface
 */
export interface CostCategoryTree extends CostCategory {
  children: CostCategoryTree[];
}

/**
 * Move Category request interface
 */
export interface MoveCategoryRequest {
  category_id: number;
  new_parent_id?: number | null;
}

/**
 * 📊 Cost Categories Service
 * Handles all cost category operations including hierarchical management,
 * tree structures, and category relationships.
 */
@Injectable({ providedIn: 'root' })
export class CostCategoriesService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/cost-categories`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Centralized error handling for API calls
   */
  private handleError(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);
      return throwError(() => new Error(`Failed to ${operation.toLowerCase()}: ${error.message || 'Unknown error'}`));
    };
  }

  /**
   * Add new cost category
   */
  addCostCategory(data: Partial<CostCategory>): Observable<CostCategory> {
    console.log('📂 Adding cost category:', data);
    return this.http.post<CostCategory>(`${this.apiUrl}/add-cost-category.php`, data, this.httpOptions)
      .pipe(catchError(this.handleError('Add cost category')));
  }

  /**
   * Get cost category by ID
   */
  getCostCategoryById(id: number): Observable<CostCategory> {
    return this.http.get<CostCategory>(`${this.apiUrl}/get-cost-category.php?id=${id}`)
      .pipe(catchError(this.handleError('Get cost category')));
  }

  /**
   * Update cost category
   */
  updateCostCategory(id: number, data: Partial<CostCategory>): Observable<CostCategory> {
    const payload = { id, ...data };
    console.log('📂 Updating cost category:', { id, data: payload });
    return this.http.post<CostCategory>(`${this.apiUrl}/update-cost-category.php`, payload, this.httpOptions)
      .pipe(catchError(this.handleError('Update cost category')));
  }

  /**
   * Delete cost category
   */
  deleteCostCategory(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.get<{ success: boolean; message: string }>(`${this.apiUrl}/delete-cost-category.php?id=${id}`)
      .pipe(catchError(this.handleError('Delete cost category')));
  }

  /**
   * List cost categories with optional filters
   */
  listCostCategories(filters: ICostCategoriesFilters = {}): Observable<CostCategory[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.http.get<CostCategory[]>(`${this.apiUrl}/list-cost-categories.php?${params.toString()}`)
      .pipe(catchError(this.handleError('List cost categories')));
  }

  /**
   * Get cost category tree structure
   */
  getCostCategoryTree(industryId?: number): Observable<CostCategoryTree[]> {
    const params = new URLSearchParams();
    if (industryId !== undefined) {
      params.append('industry_id', industryId.toString());
    }

    return this.http.get<CostCategoryTree[]>(`${this.apiUrl}/get-cost-category-tree.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get cost category tree')));
  }

  /**
   * Get children of a specific cost category
   */
  getCostCategoryChildren(parentId: number): Observable<CostCategory[]> {
    return this.http.get<CostCategory[]>(`${this.apiUrl}/get-cost-category-children.php?parent_id=${parentId}`)
      .pipe(catchError(this.handleError('Get cost category children')));
  }

  /**
   * Get root cost categories (categories with no parent)
   */
  getRootCostCategories(industryId?: number): Observable<CostCategory[]> {
    const params = new URLSearchParams();
    if (industryId !== undefined) {
      params.append('industry_id', industryId.toString());
    }

    return this.http.get<CostCategory[]>(`${this.apiUrl}/get-root-cost-categories.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Get root cost categories')));
  }

  /**
   * Get cost categories by industry
   */
  getCostCategoriesByIndustry(industryId: number): Observable<CostCategory[]> {
    return this.listCostCategories({ industry_id: industryId });
  }

  /**
   * Search cost categories by name
   */
  searchCostCategories(search: string, industryId?: number): Observable<CostCategory[]> {
    const params = new URLSearchParams({ search });
    if (industryId !== undefined) {
      params.append('industry_id', industryId.toString());
    }

    return this.http.get<CostCategory[]>(`${this.apiUrl}/search-cost-categories.php?${params.toString()}`)
      .pipe(catchError(this.handleError('Search cost categories')));
  }

  /**
   * Get cost category breadcrumb path
   */
  getCostCategoryBreadcrumb(categoryId: number): Observable<CostCategory[]> {
    return this.http.get<CostCategory[]>(`${this.apiUrl}/get-cost-category-breadcrumb.php?id=${categoryId}`)
      .pipe(catchError(this.handleError('Get cost category breadcrumb')));
  }

  /**
   * Get cost category statistics
   */
  getCostCategoryStatistics(categoryId: number): Observable<CostCategoryStatistics> {
    return this.http.get<CostCategoryStatistics>(`${this.apiUrl}/get-cost-category-statistics.php?id=${categoryId}`)
      .pipe(catchError(this.handleError('Get cost category statistics')));
  }

  /**
   * Move cost category to new parent
   */
  moveCostCategory(request: MoveCategoryRequest): Observable<CostCategory> {
    console.log('📂 Moving cost category:', request);
    return this.http.post<CostCategory>(`${this.apiUrl}/move-cost-category.php`, request, this.httpOptions)
      .pipe(catchError(this.handleError('Move cost category')));
  }

  /**
   * Helper method to flatten tree structure to array
   */
  flattenCategoryTree(tree: CostCategoryTree[]): CostCategory[] {
    const flattened: CostCategory[] = [];
    
    const flatten = (categories: CostCategoryTree[]) => {
      for (const category of categories) {
        const { children, ...categoryWithoutChildren } = category;
        flattened.push(categoryWithoutChildren);
        if (children && children.length > 0) {
          flatten(children);
        }
      }
    };
    
    flatten(tree);
    return flattened;
  }

  /**
   * Helper method to find category by ID in tree structure
   */
  findCategoryInTree(tree: CostCategoryTree[], categoryId: number): CostCategoryTree | null {
    for (const category of tree) {
      if (category.id === categoryId) {
        return category;
      }
      if (category.children && category.children.length > 0) {
        const found = this.findCategoryInTree(category.children, categoryId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Helper method to get category path names (for breadcrumbs)
   */
  getCategoryPathNames(breadcrumb: CostCategory[]): string[] {
    return breadcrumb.map(category => category.name);
  }

  /**
   * Helper method to build category dropdown options
   */
  buildCategoryOptions(categories: CostCategory[], level: number = 0): Array<{ value: number; label: string; level: number }> {
    const options: Array<{ value: number; label: string; level: number }> = [];
    
    for (const category of categories) {
      const indent = '  '.repeat(level);
      options.push({
        value: category.id,
        label: `${indent}${category.name}`,
        level: level
      });
      
      if (category.children && category.children.length > 0) {
        options.push(...this.buildCategoryOptions(category.children, level + 1));
      }
    }
    
    return options;
  }

  /**
   * Helper method to validate category hierarchy (client-side check)
   */
  canMoveCategoryToParent(categoryId: number, newParentId: number | null, tree: CostCategoryTree[]): boolean {
    if (newParentId === null) return true;
    if (categoryId === newParentId) return false;

    const category = this.findCategoryInTree(tree, categoryId);
    if (!category) return false;

    // Check if newParentId is a descendant of categoryId
    const isDescendant = (categories: CostCategoryTree[]): boolean => {
      for (const cat of categories) {
        if (cat.id === newParentId) return true;
        if (cat.children && cat.children.length > 0 && isDescendant(cat.children)) {
          return true;
        }
      }
      return false;
    };

    return !isDescendant(category.children || []);
  }

  /**
   * Helper method to count categories by industry
   */
  countCategoriesByIndustry(categories: CostCategory[]): Map<number | null, number> {
    const counts = new Map<number | null, number>();
    
    for (const category of categories) {
      const industryId = category.industry_id ?? null;
      counts.set(industryId, (counts.get(industryId) || 0) + 1);
    }
    
    return counts;
  }

  /**
   * Helper method to get category depth (for tree operations)
   */
  getCategoryDepth(categoryId: number, tree: CostCategoryTree[]): number {
    const findDepth = (categories: CostCategoryTree[], currentDepth: number): number => {
      for (const category of categories) {
        if (category.id === categoryId) {
          return currentDepth;
        }
        if (category.children && category.children.length > 0) {
          const depth = findDepth(category.children, currentDepth + 1);
          if (depth !== -1) return depth;
        }
      }
      return -1;
    };
    
    return findDepth(tree, 0);
  }

  /**
   * Helper method to filter categories by search term
   */
  filterCategoriesBySearch(categories: CostCategory[], searchTerm: string): CostCategory[] {
    if (!searchTerm || searchTerm.trim() === '') return categories;
    
    const term = searchTerm.toLowerCase().trim();
    return categories.filter(category => 
      category.name.toLowerCase().includes(term)
    );
  }

  /**
   * Helper method to sort categories alphabetically
   */
  sortCategoriesAlphabetically(categories: CostCategory[]): CostCategory[] {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get categories without children (leaf nodes)
   */
  getLeafCategories(tree: CostCategoryTree[]): CostCategory[] {
    const leafCategories: CostCategory[] = [];
    
    const findLeaves = (categories: CostCategoryTree[]) => {
      for (const category of categories) {
        if (!category.children || category.children.length === 0) {
          const { children, ...leafCategory } = category;
          leafCategories.push(leafCategory);
        } else {
          findLeaves(category.children);
        }
      }
    };
    
    findLeaves(tree);
    return leafCategories;
  }

  /**
   * Get cost categories by type (direct or operational)
   */
  getCostCategoriesByType(costType: 'direct' | 'operational'): Observable<CostCategory[]> {
    return this.listCostCategories({ cost_type: costType });
  }

  /**
   * Get direct cost categories only
   */
  getDirectCostCategories(): Observable<CostCategory[]> {
    return this.http.get<CostCategory[]>(`${this.apiUrl}/get-direct-categories.php`)
      .pipe(catchError(this.handleError('Get direct cost categories')));
  }

  /**
   * Get operational cost categories only
   */
  getOperationalCostCategories(): Observable<CostCategory[]> {
    return this.http.get<CostCategory[]>(`${this.apiUrl}/get-operational-categories.php`)
      .pipe(catchError(this.handleError('Get operational cost categories')));
  }

  /**
   * Helper method to check if category has children
   */
  hasChildren(categoryId: number, tree: CostCategoryTree[]): boolean {
    const category = this.findCategoryInTree(tree, categoryId);
    return category ? (category.children && category.children.length > 0) : false;
  }
}