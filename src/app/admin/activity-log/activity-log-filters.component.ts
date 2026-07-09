import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogStateService } from '../../services/activity-log-state.service';
import { ActivityAction } from '../../services/activity-log.interfaces';

interface ActionMeta {
  icon: string;
  color: string;
  label: string;
}

const ACTION_META: Record<ActivityAction, ActionMeta> = {
  login:       { icon: 'fa-right-to-bracket',  color: 'text-emerald-600 bg-emerald-50',  label: 'Login' },
  logout:      { icon: 'fa-right-from-bracket', color: 'text-gray-600 bg-gray-100',      label: 'Logout' },
  page_view:   { icon: 'fa-eye',                color: 'text-blue-600 bg-blue-50',       label: 'Page View' },
  create:      { icon: 'fa-plus',               color: 'text-green-600 bg-green-50',     label: 'Create' },
  update:      { icon: 'fa-pen',                color: 'text-amber-600 bg-amber-50',    label: 'Update' },
  delete:      { icon: 'fa-trash-can',          color: 'text-red-600 bg-red-50',         label: 'Delete' },
  bulk_update: { icon: 'fa-layer-group',        color: 'text-violet-600 bg-violet-50',   label: 'Bulk Update' },
  export:      { icon: 'fa-download',           color: 'text-cyan-600 bg-cyan-50',       label: 'Export' },
  import:      { icon: 'fa-upload',             color: 'text-indigo-600 bg-indigo-50',   label: 'Import' },
};

@Component({
  selector: 'app-activity-log-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <select
        [(ngModel)]="state.actionFilter"
        (change)="state.applyFilter()"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All actions</option>
        <option *ngFor="let meta of actionMetaEntries" [value]="meta[0]">
          {{ meta[1].label }}
        </option>
      </select>

      <select
        [(ngModel)]="state.userFilter"
        (change)="state.applyFilter()"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All users</option>
        <option *ngFor="let name of state.uniqueUsers()" [value]="name">
          {{ name }}
        </option>
      </select>

      <select
        [(ngModel)]="state.urlFilter"
        (change)="state.applyFilter()"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All pages</option>
        <option *ngFor="let url of state.uniqueUrls()" [value]="url">
          {{ url }}
        </option>
      </select>

      <button
        (click)="clearFilters()"
        *ngIf="state.actionFilter() || state.userFilter() || state.urlFilter()"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500
               hover:bg-gray-50 transition-colors"
      >
        <i class="fas fa-times text-xs mr-1"></i>
        Clear
      </button>

      <button
        (click)="state.loadLogs()"
        [disabled]="state.isLoading()"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600
               hover:bg-gray-50 transition-colors flex items-center gap-2 ml-auto"
      >
        <i class="fas fa-sync-alt text-xs" [class.animate-spin]="state.isLoading()"></i>
        Refresh
      </button>
    </div>
  `,
})
export class ActivityLogFiltersComponent {
  state = inject(ActivityLogStateService);

  readonly actionMetaEntries = Object.entries(ACTION_META);

  clearFilters(): void {
    this.state.actionFilter.set('');
    this.state.userFilter.set('');
    this.state.urlFilter.set('');
    this.state.applyFilter();
  }
}
