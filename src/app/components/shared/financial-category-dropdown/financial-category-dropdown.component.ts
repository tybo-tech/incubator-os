import { Component, Input, Output, EventEmitter, OnInit, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialCategory } from '../../../../models/financial.models';
import { FinancialCategoryService } from '../../../../services/financial-category.service';

@Component({
  selector: 'app-financial-category-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <select
        [(ngModel)]="selectedCategoryId"
        (ngModelChange)="onCategoryChange($event)"
        [disabled]="isLoading() || isCreating()"
        aria-label="Select financial category"
        class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        [class.opacity-50]="isLoading() || isCreating()"
      >
        <option value="" disabled>
          {{ isLoading() ? 'Loading categories...' : 'Select category' }}
        </option>

        @for (category of categories(); track category.id) {
          <option [value]="category.id">{{ category.name }}</option>
        }

        <!-- Add New Category Option -->
        <option value="ADD_NEW" class="font-semibold text-green-600">
          + Add New Category
        </option>
      </select>

      <!-- New Category Input (appears when ADD_NEW is selected) -->
      @if (isCreating()) {
        <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
          <div class="space-y-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Category Name</label>
              <input
                type="text"
                [(ngModel)]="newCategoryName"
                (keyup.enter)="createNewCategory()"
                (keyup.escape)="cancelNewCategory()"
                placeholder="Enter category name"
                class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                #newCategoryInput
              />
            </div>

            @if (description) {
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  [(ngModel)]="newCategoryDescription"
                  placeholder="Enter description"
                  class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            }

            <div class="flex gap-2">
              <button
                (click)="createNewCategory()"
                [disabled]="!newCategoryName.trim() || isSubmitting()"
                class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs px-3 py-1.5 rounded transition"
              >
                {{ isSubmitting() ? 'Creating...' : 'Create' }}
              </button>
              <button
                (click)="cancelNewCategory()"
                [disabled]="isSubmitting()"
                class="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white text-xs px-3 py-1.5 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FinancialCategoryDropdownComponent implements OnInit, OnChanges {
  @Input() itemType: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity' = 'direct_cost';
  @Input() selectedCategoryId: number | null = null;
  @Input() placeholder = 'Select category';
  @Input() description = false; // Whether to show description field when creating new category
  @Input() disabled = false;

  // New inputs for multi-type loading and filtering
  @Input() loadMultipleTypes = false; // Whether to load categories for multiple types
  @Input() allowedTypes: ('direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity')[] = []; // Types to load when loadMultipleTypes is true

  @Output() categorySelected = new EventEmitter<FinancialCategory | null>();
  @Output() categoryCreated = new EventEmitter<FinancialCategory>();

  // Signals for reactive state management
  allCategories = signal<FinancialCategory[]>([]); // All loaded categories
  categories = signal<FinancialCategory[]>([]); // Filtered categories for display
  isLoading = signal(false);
  isCreating = signal(false);
  isSubmitting = signal(false);  // New category form data
  newCategoryName = '';
  newCategoryDescription = '';

  constructor(private financialCategoryService: FinancialCategoryService) {}

  ngOnInit() {
    this.loadCategories();
  }

  /**
   * Load categories based on configuration
   */
  loadCategories() {
    this.isLoading.set(true);

    let categoryObservable;

    if (this.loadMultipleTypes && this.allowedTypes.length > 0) {
      // Load multiple types for flexible filtering
      const [type1, type2] = this.allowedTypes;
      categoryObservable = this.financialCategoryService.listCategoriesByMultipleTypes(type1, type2, true);
    } else {
      // Load single type (backward compatibility)
      categoryObservable = this.financialCategoryService.listCategoriesByType(this.itemType);
    }

    categoryObservable.subscribe({
      next: (categories) => {
        this.allCategories.set(categories);
        this.filterCategories();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load financial categories:', error);
        this.allCategories.set([]);
        this.categories.set([]);
        this.isLoading.set(false);
        // Non-intrusive error handling for loading
        console.warn('Categories could not be loaded. Please refresh the page or contact support if the issue persists.');
      }
    });
  }

  /**
   * Filter categories based on current itemType context
   */
  filterCategories() {
    const allCats = this.allCategories();

    if (this.loadMultipleTypes) {
      // When loading multiple types, filter to show only current itemType
      const filtered = allCats.filter(cat => cat.item_type === this.itemType);
      this.categories.set(filtered);
    } else {
      // When loading single type, show all loaded categories
      this.categories.set(allCats);
    }
  }

  /**
   * Update filtering when itemType changes
   */
  ngOnChanges() {
    if (this.allCategories().length > 0) {
      this.filterCategories();
    }
  }  /**
   * Handle category selection change
   */
  onCategoryChange(categoryId: string | number) {
    if (categoryId === 'ADD_NEW') {
      this.startNewCategoryCreation();
      return;
    }

    // Find and emit the selected category
    const selectedCategory = this.categories().find(cat => cat.id === Number(categoryId));
    this.categorySelected.emit(selectedCategory || null);
  }

  /**
   * Start the new category creation flow
   */
  startNewCategoryCreation() {
    this.isCreating.set(true);
    this.newCategoryName = '';
    this.newCategoryDescription = '';

    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Enter category name"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  }

  /**
   * Create a new financial category
   */
  createNewCategory() {
    if (!this.newCategoryName.trim()) return;

    this.isSubmitting.set(true);

    const newCategoryData: Partial<FinancialCategory> = {
      name: this.newCategoryName.trim(),
      item_type: this.itemType,
      description: this.newCategoryDescription.trim() || null,
      is_active: true
    };

    this.financialCategoryService.addFinancialCategory(newCategoryData)
      .subscribe({
        next: (newCategory) => {
          // Add the new category to all categories
          this.allCategories.update(cats => [...cats, newCategory].sort((a, b) => a.name.localeCompare(b.name)));

          // Refresh the filtered categories
          this.filterCategories();

          // Select the new category
          this.selectedCategoryId = newCategory.id!;
          this.categorySelected.emit(newCategory);
          this.categoryCreated.emit(newCategory);

          // Reset the form
          this.cancelNewCategory();

          console.log('New category created successfully:', newCategory);
        },
        error: (error) => {
          console.error('Failed to create financial category:', error);
          // User-friendly error message
          alert('Error creating category. Please check your input and try again.');
          this.isSubmitting.set(false);
        }
      });
  }

  /**
   * Cancel new category creation
   */
  cancelNewCategory() {
    this.isCreating.set(false);
    this.isSubmitting.set(false);
    this.newCategoryName = '';
    this.newCategoryDescription = '';

    // Reset select to empty if no category was selected
    if (!this.selectedCategoryId) {
      this.selectedCategoryId = null;
    }
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: number): FinancialCategory | undefined {
    return this.categories().find(cat => cat.id === id);
  }

  /**
   * Refresh categories (useful after external changes)
   */
  refreshCategories() {
    this.loadCategories();
  }
}
