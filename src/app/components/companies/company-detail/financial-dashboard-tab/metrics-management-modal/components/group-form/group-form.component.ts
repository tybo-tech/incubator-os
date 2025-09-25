import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricGroup, CreateMetricGroupDto, UpdateMetricGroupDto } from '../../../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../../../services/metrics.service';

@Component({
  selector: 'app-group-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-blue-50 rounded-lg p-6 border border-blue-200">
      <h3 class="text-xl font-semibold text-blue-900 mb-6 flex items-center gap-2">
        <i class="fas text-lg" [class.fa-plus]="!editingGroup" [class.fa-edit]="editingGroup"></i>
        {{ editingGroup ? 'Edit Group' : 'Create New Group' }}
      </h3>

      <form (ngSubmit)="saveGroup()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
          <input
            type="text"
            [(ngModel)]="groupData.code"
            name="code"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., REVENUE"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            [(ngModel)]="groupData.name"
            name="name"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Revenue Metrics"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            [(ngModel)]="groupData.description"
            name="description"
            rows="3"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of this group..."
          ></textarea>
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="!!groupData.show_total"
              (change)="groupData.show_total = $any($event.target).checked ? 1 : 0"
              name="show_total"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Show Total</span>
          </label>

          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="!!groupData.show_margin"
              (change)="groupData.show_margin = $any($event.target).checked ? 1 : 0"
              name="show_margin"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Show Margin</span>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Graph Color</label>
          <input
            type="color"
            [(ngModel)]="groupData.graph_color"
            name="graph_color"
            class="w-full h-10 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Order</label>
          <input
            type="number"
            [(ngModel)]="groupData.order_no"
            name="order_no"
            min="1"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 1, 2, 3..."
          />
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
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isLoading ? (editingGroup ? 'Updating...' : 'Creating...') : (editingGroup ? 'Update Group' : 'Create Group') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class GroupFormComponent implements OnInit {
  @Input() editingGroup: IMetricGroup | null = null;
  @Input() clientId: number = 1;

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  isLoading = false;
  groupData: CreateMetricGroupDto & { order_no?: number } = this.initGroupData();

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void {
    if (this.editingGroup) {
      this.groupData = {
        client_id: this.editingGroup.client_id,
        code: this.editingGroup.code,
        name: this.editingGroup.name,
        description: this.editingGroup.description || '',
        show_total: this.editingGroup.show_total,
        show_margin: this.editingGroup.show_margin,
        graph_color: this.editingGroup.graph_color || '#6B7280',
        order_no: this.editingGroup.order_no || 1
      };
    } else {
      this.groupData = this.initGroupData();
    }
  }

  private initGroupData(): CreateMetricGroupDto & { order_no?: number } {
    return {
      client_id: this.clientId,
      code: '',
      name: '',
      description: '',
      show_total: 1,
      show_margin: 0,
      graph_color: '#6B7280',
      order_no: 1
    };
  }

  isValid(): boolean {
    return !!(this.groupData.code && this.groupData.name);
  }

  async saveGroup(): Promise<void> {
    if (!this.isValid()) return;

    try {
      this.isLoading = true;

      if (this.editingGroup) {
        const updateDto: UpdateMetricGroupDto = {
          id: this.editingGroup.id,
          ...this.groupData
        };
        await this.metricsService.updateGroup(updateDto).toPromise();
      } else {
        await this.metricsService.addGroup(this.groupData).toPromise();
      }

      this.save.emit();
    } catch (error) {
      console.error('Failed to save group:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
