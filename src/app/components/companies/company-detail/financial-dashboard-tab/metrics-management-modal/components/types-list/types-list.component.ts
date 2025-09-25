import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMetricGroup, IMetricType } from '../../../../../../../../models/metrics.model';

@Component({
  selector: 'app-types-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Header with Group Info -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded" [style.background-color]="group.graph_color || '#6B7280'"></div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ group.name }}</h3>
            <p class="text-sm text-gray-600">{{ group.code }} • {{ types.length }} types</p>
          </div>
        </div>
        <button
          (click)="createType.emit()"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <i class="fas fa-plus"></i>
          Create New Type
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="types.length === 0" class="text-center py-12 text-gray-500">
      <i class="fas fa-chart-bar text-6xl mx-auto mb-4 text-gray-300 block"></i>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No Types Found</h3>
      <p class="mb-4">Create your first metric type for this group</p>
    </div>

    <!-- Types List -->
    <div *ngIf="types.length > 0" class="space-y-3">
      <div *ngFor="let type of types"
           class="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded" [style.background-color]="type.graph_color || '#6B7280'"></div>
            <div>
              <h5 class="font-semibold text-gray-900">{{ type.name }}</h5>
              <p class="text-sm text-gray-600">{{ type.code }} • {{ type.unit }}</p>
              <p *ngIf="type.description" class="text-xs text-gray-500 mt-1">{{ type.description }}</p>

              <div class="flex items-center gap-2 mt-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [class]="type.period_type === 'QUARTERLY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'">
                  {{ type.period_type }}
                </span>

                <span *ngIf="type.show_total" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Total
                </span>

                <span *ngIf="type.show_margin" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Margin
                </span>

                <!-- Categories Display -->
                <span *ngIf="type.categories && type.categories.length > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <i class="fas fa-tags mr-1"></i>
                  {{ type.categories.length }} categories
                </span>
              </div>

              <!-- Categories List (if any) -->
              <div *ngIf="type.categories && type.categories.length > 0" class="mt-2">
                <div class="flex flex-wrap gap-1">
                  <span *ngFor="let category of type.categories.slice(0, 3)"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border">
                    {{ category.name }}
                  </span>
                  <span *ngIf="type.categories && type.categories.length > 3"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                    +{{ type.categories.length - 3 }} more
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="editType.emit(type)"
              class="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 rounded transition-all"
              title="Edit Type"
            >
              <i class="fas fa-edit text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TypesListComponent {
  @Input() group!: IMetricGroup;
  @Input() types: IMetricType[] = [];

  @Output() createType = new EventEmitter<void>();
  @Output() editType = new EventEmitter<IMetricType>();
}
