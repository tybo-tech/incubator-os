import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricType, CreateMetricTypeDto, UpdateMetricTypeDto, MetricPeriodType } from '../../../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../../../services/metrics.service';
import { CategoryManagementComponent } from '../category-management/category-management.component';

@Component({
  selector: 'app-type-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryManagementComponent],
  template: `
    <div class="bg-white-50 rounded-lg p-6 border border-green-200">
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
          <app-category-management
            [selectedCategoryIds]="selectedCategoryIds"
            [metricTypeId]="editingType?.id"
            (categoriesChanged)="onCategoriesChanged($event)"
          ></app-category-management>
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
  selectedCategoryIds: number[] = [];

  constructor(
    private metricsService: MetricsService
  ) {}

  async ngOnInit(): Promise<void> {
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

  onCategoriesChanged(categoryIds: number[]): void {
    this.selectedCategoryIds = categoryIds;
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
