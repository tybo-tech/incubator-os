import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricType, CreateMetricTypeDto, UpdateMetricTypeDto, MetricPeriodType } from '../../../../../../../../models/metrics.model';
import { ICategory } from '../../../../../../../../models/simple.schema';
import { MetricsService } from '../../../../../../../../services/metrics.service';
import { CategoryService } from '../../../../../../../../services/category.service';

@Component({
  selector: 'app-type-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-green-50 rounded-lg p-6 border border-green-200">
      <h3 class="text-xl font-semibold text-green-900 mb-6 flex items-center gap-2">
        <i class="fas text-lg" [class.fa-plus]="!editingType" [class.fa-edit]="editingType"></i>
        {{ editingType ? 'Edit Type' : 'Create New Type' }}
      </h3>

      <form (ngSubmit)="saveType()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
          <input
            type="text"
            [(ngModel)]="typeData.code"
            name="code"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="e.g., REVENUE_TOTAL"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            [(ngModel)]="typeData.name"
            name="name"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="e.g., Total Revenue"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            [(ngModel)]="typeData.description"
            name="description"
            rows="3"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Brief description of this metric type..."
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
          <select
            [(ngModel)]="typeData.unit"
            name="unit"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="COUNT">COUNT</option>
            <option value="PERCENTAGE">PERCENTAGE</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Period Type *</label>
          <select
            [(ngModel)]="typeData.period_type"
            name="period_type"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="!!typeData.show_total"
              (change)="typeData.show_total = $any($event.target).checked ? 1 : 0"
              name="show_total"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span class="text-sm text-gray-700">Show Total</span>
          </label>

          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="!!typeData.show_margin"
              (change)="typeData.show_margin = $any($event.target).checked ? 1 : 0"
              name="show_margin"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span class="text-sm text-gray-700">Show Margin</span>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Graph Color</label>
          <input
            type="color"
            [(ngModel)]="typeData.graph_color"
            name="graph_color"
            class="w-full h-10 border border-gray-300 rounded-md"
          />
        </div>

        <!-- Category Management Section -->
        <div class="md:col-span-2">
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
                  (keyup.enter)="addCategory()"
                  placeholder="Create new category..."
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
                <button
                  type="button"
                  (click)="addCategory()"
                  [disabled]="isLoading"
                  class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <i class="fas fa-plus"></i>
                  Create
                </button>
              </div>

              <!-- Category Selection List -->
              <div *ngIf="availableCategories.length > 0" class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <div *ngFor="let category of availableCategories"
                     class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                  <label class="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="selectedCategoryIds.includes(category.id)"
                      (change)="toggleCategory(category.id)"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span class="text-sm text-gray-700">{{ category.name }}</span>
                    <span *ngIf="category.description" class="text-xs text-gray-500">({{ category.description }})</span>
                  </label>
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

              <div *ngIf="availableCategories.length === 0"
                   class="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded-lg">
                No categories available. Create your first category above.
              </div>
            </div>
          </div>
        </div>

        <div class="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            (click)="cancel.emit()"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="isLoading || !isValid()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ isLoading ? (editingType ? 'Updating...' : 'Creating...') : (editingType ? 'Update Type' : 'Create Type') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class TypeFormComponent implements OnInit {
  @Input() editingType: IMetricType | null = null;
  @Input() groupId!: number;

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  isLoading = false;
  typeData: CreateMetricTypeDto = this.initTypeData();

  // Category Management
  availableCategories: ICategory[] = [];
  selectedCategoryIds: number[] = [];
  newCategoryInput: string = '';

  constructor(
    private metricsService: MetricsService,
    private categoryService: CategoryService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCategories();

    if (this.editingType) {
      this.typeData = {
        group_id: this.editingType.group_id,
        code: this.editingType.code,
        name: this.editingType.name,
        description: this.editingType.description || '',
        unit: this.editingType.unit,
        show_total: this.editingType.show_total,
        show_margin: this.editingType.show_margin,
        graph_color: this.editingType.graph_color || '#1f77b4',
        period_type: this.editingType.period_type,
        category_ids: []
      };

      // Load type categories
      if (this.editingType.categories) {
        this.selectedCategoryIds = this.editingType.categories.map(cat => cat.id);
      }
    } else {
      this.typeData = this.initTypeData();
    }
  }

  private initTypeData(): CreateMetricTypeDto {
    return {
      group_id: this.groupId,
      code: '',
      name: '',
      description: '',
      unit: 'ZAR',
      show_total: 1,
      show_margin: 0,
      graph_color: '#1f77b4',
      period_type: 'QUARTERLY',
      category_ids: []
    };
  }

  async loadCategories(): Promise<void> {
    try {
      this.availableCategories = await this.categoryService.getMetricCategories().toPromise() || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.availableCategories = [];
    }
  }

  async addCategory(): Promise<void> {
    if (this.newCategoryInput.trim()) {
      try {
        this.isLoading = true;
        const newCategory = await this.categoryService.addMetricCategory(
          this.newCategoryInput.trim(),
          ''
        ).toPromise();

        if (newCategory) {
          this.availableCategories.push(newCategory);
          this.selectedCategoryIds.push(newCategory.id);
          this.newCategoryInput = '';
        }
      } catch (error) {
        console.error('Error creating category:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  toggleCategory(categoryId: number): void {
    if (this.selectedCategoryIds.includes(categoryId)) {
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
    } else {
      this.selectedCategoryIds.push(categoryId);
    }
  }

  removeCategory(categoryId: number): void {
    this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
  }

  getSelectedCategories(): ICategory[] {
    return this.availableCategories.filter(cat => this.selectedCategoryIds.includes(cat.id));
  }

  isValid(): boolean {
    return !!(this.typeData.code && this.typeData.name && this.typeData.unit);
  }

  async saveType(): Promise<void> {
    if (!this.isValid()) return;

    try {
      this.isLoading = true;

      // Set category IDs
      this.typeData.category_ids = this.selectedCategoryIds;

      if (this.editingType) {
        const updateDto: UpdateMetricTypeDto = {
          id: this.editingType.id,
          ...this.typeData
        };
        await this.metricsService.updateType(updateDto).toPromise();
      } else {
        await this.metricsService.addType(this.typeData).toPromise();
      }

      this.save.emit();
    } catch (error) {
      console.error('Failed to save type:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
