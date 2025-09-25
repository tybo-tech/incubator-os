import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMetricGroup, IMetricType, UpdateMetricGroupOrderDto } from '../../../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../../../services/metrics.service';

@Component({
  selector: 'app-group-ordering',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Header with Save/Cancel Buttons -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h3 class="text-xl font-semibold text-purple-900">Order Groups</h3>
        <p class="text-sm text-purple-600 mt-1">Drag and drop or use buttons to reorder groups</p>
      </div>
      <div class="flex gap-3">
        <button
          (click)="cancelOrderChanges()"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          (click)="saveGroupOrder()"
          [disabled]="!isDirty || isLoading"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Saving...' : 'Save Order' }}
        </button>
      </div>
    </div>

    <!-- Orderable Groups List -->
    <div class="space-y-3">
      <div *ngFor="let group of orderedGroups; let i = index"
           class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <!-- Group Info -->
          <div class="flex items-center gap-3 flex-1">
            <div class="w-6 h-6 rounded" [style.background-color]="group.graph_color || '#6B7280'"></div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h5 class="font-semibold text-gray-900">{{ group.name }}</h5>
                <span class="text-sm text-gray-500">{{ group.code }}</span>
              </div>
              <p *ngIf="group.description" class="text-sm text-gray-600">{{ group.description }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ getTypesCount(group.id) }} types</p>
            </div>
          </div>

          <!-- Order Controls -->
          <div class="flex items-center gap-2">
            <!-- Current Order Display -->
            <span class="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              #{{ i + 1 }}
            </span>

            <!-- Move Up Button -->
            <button
              (click)="moveGroupUp(i)"
              [disabled]="i === 0"
              class="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 rounded hover:bg-purple-50 disabled:hover:bg-transparent"
              title="Move Up"
            >
              <i class="fas fa-chevron-up"></i>
            </button>

            <!-- Move Down Button -->
            <button
              (click)="moveGroupDown(i)"
              [disabled]="i === orderedGroups.length - 1"
              class="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 rounded hover:bg-purple-50 disabled:hover:bg-transparent"
              title="Move Down"
            >
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <div class="mt-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
      <div class="flex items-start gap-3">
        <i class="fas fa-info-circle text-purple-600 mt-0.5"></i>
        <div class="text-sm text-purple-800">
          <p class="font-medium mb-1">How to reorder groups:</p>
          <ul class="space-y-1 text-purple-700">
            <li>• Use the up/down arrow buttons to move groups one position at a time</li>
            <li>• The order number shown reflects the current position</li>
            <li>• Click "Save Order" to persist changes to the database</li>
            <li>• Click "Cancel" to discard changes and return to groups list</li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class GroupOrderingComponent implements OnInit {
  @Input() groups: IMetricGroup[] = [];
  @Input() types: IMetricType[] = [];

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  orderedGroups: IMetricGroup[] = [];
  isDirty = false;
  isLoading = false;

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void {
    // Create a copy sorted by order_no
    this.orderedGroups = [...this.groups].sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
    this.isDirty = false;
  }

  getTypesCount(groupId: number): number {
    return this.types.filter(type => type.group_id === groupId).length;
  }

  moveGroupUp(index: number): void {
    if (index > 0 && index < this.orderedGroups.length) {
      // Swap with previous item
      const temp = this.orderedGroups[index];
      this.orderedGroups[index] = this.orderedGroups[index - 1];
      this.orderedGroups[index - 1] = temp;
      this.isDirty = true;
    }
  }

  moveGroupDown(index: number): void {
    if (index >= 0 && index < this.orderedGroups.length - 1) {
      // Swap with next item
      const temp = this.orderedGroups[index];
      this.orderedGroups[index] = this.orderedGroups[index + 1];
      this.orderedGroups[index + 1] = temp;
      this.isDirty = true;
    }
  }

  cancelOrderChanges(): void {
    this.cancel.emit();
  }

  async saveGroupOrder(): Promise<void> {
    if (!this.isDirty || this.orderedGroups.length === 0) return;

    try {
      this.isLoading = true;

      // Create order update payload - assign order_no based on current position
      const orderUpdates: UpdateMetricGroupOrderDto[] = this.orderedGroups.map((group, index) => ({
        id: group.id,
        order_no: index + 1
      }));

      await this.metricsService.updateGroupOrder(orderUpdates).toPromise();
      this.save.emit();
    } catch (error) {
      console.error('Failed to update group order:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
