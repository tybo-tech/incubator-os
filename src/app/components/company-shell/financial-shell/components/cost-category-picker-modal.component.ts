import { Component, Input, Output, EventEmitter, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CostCategoriesService, CostCategory, ICostCategoriesFilters } from '../../../../../services/cost-categories.service';
import { IndustryService, IndustryListOptions } from '../../../../../services/industry.service';
import { INode } from '../../../../../models/schema';
import { Industry } from '../../../../../models/simple.schema';
import { ToastService } from '../../../../services/toast.service';

type CostType = 'direct' | 'operational';

/**
 * Smart category picker modal with industry filtering and add-on-the-fly functionality
 */
@Component({
  selector: 'app-cost-category-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen()" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <!-- Modal Header -->
        <header class="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 class="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <i class="fa-solid fa-folder-tree"></i>
              Select {{ costType() | titlecase }} Cost Category
            </h2>
            <p class="text-sm text-blue-600 mt-1">Choose from existing categories or create a new one</p>
          </div>
          <button
            type="button"
            (click)="close()"
            class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-2">
            <i class="fa-solid fa-times w-5 h-5"></i>
          </button>
        </header>

        <!-- Filters Section -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Industry/Sector Filter -->
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">Industry:</label>
              <select
                [ngModel]="selectedIndustryId()"
                (ngModelChange)="onIndustryChange($event)"
                class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-48">
                <option [ngValue]="null">All Industries</option>
                <option *ngFor="let industry of industries()" [ngValue]="industry.id">
                  {{ industry.data.name }}
                </option>
              </select>
            </div>

            <!-- Search -->
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">Search:</label>
              <input
                type="text"
                [ngModel]="searchTerm()"
                (ngModelChange)="onSearchChange($event)"
                placeholder="Search categories..."
                class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-48">
            </div>

            <!-- Category Count -->
            <div class="ml-auto text-sm text-gray-600">
              {{ filteredCategories().length }} categories found
            </div>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-hidden flex flex-col">
          <!-- Add New Category Form -->
          <div class="p-4 bg-blue-50 border-b border-blue-200">
            <h3 class="text-sm font-semibold text-blue-800 mb-2">Add New Category</h3>
            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <input
                  type="text"
                  [(ngModel)]="newCategoryName"
                  placeholder="Enter new category name"
                  class="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  (keydown.enter)="addNewCategory()">
              </div>
              <div>
                <select
                  [(ngModel)]="newCategoryIndustryId"
                  class="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-40">
                  <option [ngValue]="null">No Industry</option>
                  <option *ngFor="let industry of industries()" [ngValue]="industry.id">
                    {{ industry.data.name }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                (click)="addNewCategory()"
                [disabled]="!newCategoryName.trim() || loading()"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm whitespace-nowrap">
                {{ loading() ? 'Adding...' : 'Add Category' }}
              </button>
            </div>
          </div>

          <!-- Categories Grid -->
          <div class="flex-1 overflow-y-auto p-4">
            <div *ngIf="loading() && filteredCategories().length === 0" class="text-center py-8 text-gray-500">
              <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
              <p>Loading categories...</p>
            </div>

            <div *ngIf="!loading() && filteredCategories().length === 0" class="text-center py-8 text-gray-500">
              <i class="fa-solid fa-folder-open text-2xl mb-2"></i>
              <p>No categories found</p>
              <p class="text-sm">Try adjusting your filters or add a new category above</p>
            </div>

            <div *ngIf="filteredCategories().length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                *ngFor="let category of filteredCategories(); trackBy: trackCategory"
                type="button"
                (click)="selectCategory(category)"
                class="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left transition-all group">

                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-medium text-gray-900 group-hover:text-blue-800 text-sm line-clamp-2">
                    {{ category.name }}
                  </h4>
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0"
                        [class]="getCostTypeBadgeClass(category.cost_type)">
                    {{ category.cost_type || 'Untyped' }}
                  </span>
                </div>

                <div class="space-y-1">
                  <!-- Industry Info -->
                  <div *ngIf="getIndustryName(category.industry_id)" class="flex items-center text-xs text-gray-600">
                    <i class="fa-solid fa-industry w-3 h-3 mr-1"></i>
                    <span class="truncate">{{ getIndustryName(category.industry_id) }}</span>
                  </div>

                  <!-- Parent Info -->
                  <div *ngIf="category.parent_id" class="flex items-center text-xs text-gray-600">
                    <i class="fa-solid fa-folder w-3 h-3 mr-1"></i>
                    <span class="truncate">Parent: {{ getParentName(category.parent_id) }}</span>
                  </div>

                  <!-- ID for debugging -->
                  <div class="flex items-center text-xs text-gray-400">
                    <i class="fa-solid fa-hashtag w-3 h-3 mr-1"></i>
                    <span>ID: {{ category.id }}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <footer class="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-600">
            <i class="fa-solid fa-info-circle mr-1"></i>
            Click on a category to select it
          </div>
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm">
            Cancel
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class CostCategoryPickerModalComponent implements OnInit {
  @Input() companyId!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() categorySelected = new EventEmitter<CostCategory>();

  // Modal state
  readonly isOpen = signal(false);
  readonly loading = signal(false);
  readonly costType = signal<CostType>('direct');

  // Data
  readonly categories = signal<CostCategory[]>([]);
  readonly industries = signal<INode<Industry>[]>([]);

  // Filters - using signals for reactivity
  readonly selectedIndustryId = signal<number | null>(null);
  readonly searchTerm = signal<string>('');

  // New category form
  newCategoryName = '';
  newCategoryIndustryId: number | null = null;

  // Computed filtered categories
  readonly filteredCategories = computed(() => {
    let filtered = this.categories();

    // Filter by cost type
    filtered = filtered.filter(cat => cat.cost_type === this.costType());

    // Filter by industry if selected
    const industryId = this.selectedIndustryId();
    if (industryId) {
      filtered = filtered.filter(cat => cat.industry_id === industryId);
    }

    // Filter by search term
    const search = this.searchTerm();
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort alphabetically
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor(
    private costCategoriesService: CostCategoriesService,
    private industryService: IndustryService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadIndustries();
  }

  /**
   * Open the modal for a specific cost type
   */
  open(costType: CostType = 'direct') {
    this.costType.set(costType);
    this.isOpen.set(true);
    this.resetFilters();
    this.loadCategories();
  }

  /**
   * Close the modal
   */
  close() {
    this.isOpen.set(false);
    this.resetForm();
    this.closed.emit();
  }

  /**
   * Load all categories from API
   */
  private loadCategories() {
    this.loading.set(true);
    this.costCategoriesService.listCostCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Load industries for filtering
   */
  private loadIndustries() {
    const options: IndustryListOptions = {
      is_active: true,
      limit: 1000,
      order_by: 'name',
      order_dir: 'ASC'
    };

    this.industryService.listIndustries(options).subscribe({
      next: (response) => {
        this.industries.set(response.data);
      },
      error: (error) => {
        console.error('Failed to load industries:', error);
      }
    });
  }

  /**
   * Handle industry filter change
   */
  onIndustryChange(value: number | null) {
    this.selectedIndustryId.set(value);
    console.log('Industry filter changed to:', value);
  }

  /**
   * Handle search change (could add debouncing if needed)
   */
  onSearchChange(value: string) {
    this.searchTerm.set(value);
  }

  /**
   * Add a new category
   */
  addNewCategory() {
    if (!this.newCategoryName.trim()) return;

    this.loading.set(true);

    const newCategory = {
      name: this.newCategoryName.trim(),
      industry_id: this.newCategoryIndustryId,
      cost_type: this.costType(),
      status_id: 1
    };

    this.costCategoriesService.addCostCategory(newCategory).subscribe({
      next: (category) => {
        this.loading.set(false);
        console.log('✅ Created new category:', category);
        this.toastService.success(`Category "${category.name}" has been created successfully`);

        // Add to local state
        const currentCategories = this.categories();
        this.categories.set([...currentCategories, category]);

        // Clear form
        this.newCategoryName = '';
        this.newCategoryIndustryId = null;

        // Auto-select the new category
        this.selectCategory(category);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to create category:', error);
        this.toastService.error('Failed to create category. Please try again.');
      }
    });
  }

  /**
   * Select a category and close modal
   */
  selectCategory(category: CostCategory) {
    console.log('✅ Category selected:', category);
    this.categorySelected.emit(category);
    this.close();
  }

  /**
   * Get industry name by ID
   */
  getIndustryName(industryId: number | null | undefined): string {
    if (!industryId) return '';
    const industry = this.industries().find(ind => ind.id === industryId);
    return industry?.data?.name || '';
  }

  /**
   * Get parent category name by ID
   */
  getParentName(parentId: number | null | undefined): string {
    if (!parentId) return '';
    const parent = this.categories().find(cat => cat.id === parentId);
    return parent?.name || `ID: ${parentId}`;
  }

  /**
   * Get CSS class for cost type badge
   */
  getCostTypeBadgeClass(costType: string | null | undefined): string {
    switch (costType) {
      case 'direct':
        return 'bg-emerald-100 text-emerald-800';
      case 'operational':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  /**
   * Track function for ngFor performance
   */
  trackCategory = (_index: number, category: CostCategory) => category.id;

  /**
   * Reset filters to default values
   */
  private resetFilters() {
    this.selectedIndustryId.set(null);
    this.searchTerm.set('');
  }

  /**
   * Reset form to default values
   */
  private resetForm() {
    this.newCategoryName = '';
    this.newCategoryIndustryId = null;
    this.resetFilters();
  }
}
