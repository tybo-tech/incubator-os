import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICategory } from '../../../../../../../../models/simple.schema';
import { CategoryService } from '../../../../../../../../services/category.service';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <i class="fas fa-tags text-green-600"></i>
        Category Management
      </h4>
      <p class="text-sm text-gray-600 mb-4">Select categories for this metric type (e.g., Balance Sheet Assets/Liabilities).</p>

      <div class="space-y-4">
        <!-- Add New Category Input -->
        <div class="flex gap-2 mb-3">
          <input
            type="text"
            [(ngModel)]="newCategoryInput"
            (keyup.enter)="createCategory()"
            placeholder="Create new category..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
          />
          <input
            type="text"
            [(ngModel)]="newCategoryDescription"
            (keyup.enter)="createCategory()"
            placeholder="Description (optional)..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
          />
          <button
            type="button"
            (click)="createCategory()"
            [disabled]="isCreatingCategory || !newCategoryInput.trim()"
            class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <i class="fas fa-plus"></i>
            Create
          </button>
        </div>

        <!-- Loading State for Categories -->
        <div *ngIf="isLoadingCategories" class="text-center py-4">
          <i class="fas fa-spinner fa-spin text-gray-400"></i>
          <span class="text-sm text-gray-500 ml-2">Loading categories...</span>
        </div>

        <!-- Category Selection List -->
        <div *ngIf="!isLoadingCategories && availableCategories.length > 0"
             class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
          <div *ngFor="let category of availableCategories"
               class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
            <label class="flex items-center gap-2 flex-1 cursor-pointer">
              <input
                type="checkbox"
                [checked]="selectedCategoryIds.includes(category.id)"
                (change)="toggleCategory(category.id)"
                class="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span class="text-sm text-gray-700 font-medium">{{ category.name }}</span>
              <span *ngIf="category.description" class="text-xs text-gray-500">({{ category.description }})</span>
            </label>
            <span class="text-xs text-gray-400">ID: {{ category.id }}</span>
          </div>
        </div>

        <!-- Selected Categories Summary -->
        <div *ngIf="selectedCategoryIds.length > 0" class="mt-4 p-3 bg-green-50 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-check-circle text-green-600"></i>
            <span class="text-sm font-medium text-green-800">Selected Categories ({{ selectedCategoryIds.length }})</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <span *ngFor="let category of getSelectedCategories()"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              {{ category.name }}
              <button
                type="button"
                (click)="removeCategory(category.id)"
                class="text-green-600 hover:text-green-800"
                title="Remove category"
              >
                <i class="fas fa-times"></i>
              </button>
            </span>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoadingCategories && availableCategories.length === 0"
             class="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded-lg">
          <i class="fas fa-info-circle text-gray-400 mb-2"></i>
          <div>No metric categories available.</div>
          <div class="text-xs mt-1">Create your first category using the form above.</div>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-center gap-2 text-red-800">
            <i class="fas fa-exclamation-triangle"></i>
            <span class="text-sm font-medium">Error</span>
          </div>
          <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  `
})
export class CategoryManagementComponent implements OnInit {
  @Input() selectedCategoryIds: number[] = [];
  @Input() metricTypeId?: number; // For loading existing categories when editing

  @Output() categoriesChanged = new EventEmitter<number[]>();

  // State
  availableCategories: ICategory[] = [];
  isLoadingCategories = false;
  isCreatingCategory = false;
  errorMessage = '';

  // Form inputs
  newCategoryInput = '';
  newCategoryDescription = '';

  constructor(private categoryService: CategoryService) {}

  async ngOnInit(): Promise<void> {
    await this.loadMetricCategories();

    // If editing an existing metric type, load its categories
    if (this.metricTypeId) {
      await this.loadMetricTypeCategories();
    }
  }

  async loadMetricCategories(): Promise<void> {
    try {
      this.isLoadingCategories = true;
      this.errorMessage = '';

      this.availableCategories = await this.categoryService.getMetricCategories().toPromise() || [];
      console.log('Loaded metric categories:', this.availableCategories);
    } catch (error) {
      console.error('Error loading metric categories:', error);
      this.errorMessage = 'Failed to load categories. Please try again.';
      this.availableCategories = [];
    } finally {
      this.isLoadingCategories = false;
    }
  }

  async loadMetricTypeCategories(): Promise<void> {
    if (!this.metricTypeId) return;

    try {
      const typeCategories = await this.categoryService.getMetricTypeCategories(this.metricTypeId).toPromise() || [];
      this.selectedCategoryIds = typeCategories.map(cat => cat.id);
      this.emitCategoriesChanged();
    } catch (error) {
      console.error('Error loading metric type categories:', error);
    }
  }

  async createCategory(): Promise<void> {
    if (!this.newCategoryInput.trim()) return;

    try {
      this.isCreatingCategory = true;
      this.errorMessage = '';

      const newCategory = await this.categoryService.addMetricCategory(
        this.newCategoryInput.trim(),
        this.newCategoryDescription.trim() || undefined
      ).toPromise();

      if (newCategory) {
        // Add to available categories
        this.availableCategories.push(newCategory);

        // Auto-select the new category
        this.selectedCategoryIds.push(newCategory.id);
        this.emitCategoriesChanged();

        // Clear form
        this.newCategoryInput = '';
        this.newCategoryDescription = '';

        console.log('Created new metric category:', newCategory);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      this.errorMessage = 'Failed to create category. Please try again.';
    } finally {
      this.isCreatingCategory = false;
    }
  }

  toggleCategory(categoryId: number): void {
    if (this.selectedCategoryIds.includes(categoryId)) {
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
    } else {
      this.selectedCategoryIds.push(categoryId);
    }
    this.emitCategoriesChanged();
  }

  removeCategory(categoryId: number): void {
    this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
    this.emitCategoriesChanged();
  }

  getSelectedCategories(): ICategory[] {
    return this.availableCategories.filter(cat => this.selectedCategoryIds.includes(cat.id));
  }

  private emitCategoriesChanged(): void {
    this.categoriesChanged.emit([...this.selectedCategoryIds]);
  }

  // Public methods for parent component
  getSelectedCategoryIds(): number[] {
    return [...this.selectedCategoryIds];
  }

  setSelectedCategories(categoryIds: number[]): void {
    this.selectedCategoryIds = [...categoryIds];
  }
}
