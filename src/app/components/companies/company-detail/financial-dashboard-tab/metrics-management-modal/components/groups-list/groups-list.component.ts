import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMetricGroup, IMetricType } from '../../../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../../../services/metrics.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Header with Action Buttons -->
    <div class="mb-6 flex justify-between items-center">
      <h3 class="text-xl font-semibold text-gray-900">All Groups</h3>
      <div class="flex gap-3">
        <button
          (click)="orderGroups.emit()"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <i class="fas fa-sort"></i>
          Order Groups
        </button>
        <button
          (click)="createGroup.emit()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <i class="fas fa-plus"></i>
          Create New Group
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="groups.length === 0" class="text-center py-12 text-gray-500">
      <i class="fas fa-folder-open text-6xl mx-auto mb-4 text-gray-300 block"></i>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No Groups Found</h3>
      <p class="mb-4">Create your first metric group to get started</p>
    </div>

    <!-- Groups Grid -->
    <div *ngIf="groups.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div *ngFor="let group of groups"
           class="group bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all duration-200"
           (click)="viewGroupTypes.emit(group)">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded" [style.background-color]="group.graph_color || '#6B7280'"></div>
            <div>
              <h4 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{{ group.name }}</h4>
              <p class="text-sm text-gray-600">{{ group.code }}</p>
            </div>
          </div>

          <button
            (click)="$event.stopPropagation(); editGroup.emit(group)"
            class="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 rounded transition-all"
            title="Edit Group"
          >
            <i class="fas fa-edit text-sm"></i>
          </button>
        </div>

        <p *ngIf="group.description" class="text-sm text-gray-500 mb-3 line-clamp-2">{{ group.description }}</p>

        <div class="flex items-center justify-between">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {{ getTypesCount(group.id) }} types
          </span>

          <div class="flex gap-2">
            <span *ngIf="group.show_total" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Total
            </span>
            <span *ngIf="group.show_margin" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Margin
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GroupsListComponent implements OnInit {
  @Input() clientId: number = 1;
  @Input() types: IMetricType[] = [];

  @Output() createGroup = new EventEmitter<void>();
  @Output() editGroup = new EventEmitter<IMetricGroup>();
  @Output() viewGroupTypes = new EventEmitter<IMetricGroup>();
  @Output() orderGroups = new EventEmitter<void>();

  groups: IMetricGroup[] = [];
  isLoading = false;

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  async loadGroups(): Promise<void> {
    try {
      this.isLoading = true;
      const groups = await this.metricsService.listGroups(this.clientId).toPromise();
      this.groups = (groups || []).sort((a: IMetricGroup, b: IMetricGroup) => (a.order_no || 0) - (b.order_no || 0));
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getTypesCount(groupId: number): number {
    return this.types.filter(type => type.group_id === groupId).length;
  }
}
