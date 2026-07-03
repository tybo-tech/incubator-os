import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogService } from '../../services/activity-log.service';
import { ActivityLog, ActivityAction } from '../../services/activity-log.interfaces';

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
  selector: 'app-activity-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Activity Log</h2>
          <p class="text-sm text-gray-500 mt-1">
            Track user actions and system events across the platform.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <select
            [(ngModel)]="actionFilter"
            (change)="applyFilter()"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All actions</option>
            <option *ngFor="let meta of actionMetaEntries" [value]="meta[0]">
              {{ meta[1].label }}
            </option>
          </select>
          <button
            (click)="loadLogs()"
            [disabled]="isLoading()"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600
                   hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-sync-alt text-xs" [class.animate-spin]="isLoading()"></i>
            Refresh
          </button>
        </div>
      </div>

      <div *ngIf="isLoading()" class="flex justify-center items-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-500 text-sm">Loading activity log\u2026</span>
      </div>

      <div
        *ngIf="error()"
        class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
      >
        <p class="text-sm text-red-700">{{ error() }}</p>
        <button
          (click)="loadLogs()"
          class="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
        >
          Try again
        </button>
      </div>

      <div
        *ngIf="!isLoading() && !error() && filtered().length === 0"
        class="text-center py-16 bg-white rounded-xl border border-gray-200"
      >
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-clock-rotate-left text-gray-300 text-xl"></i>
        </div>
        <h3 class="text-sm font-medium text-gray-900 mb-1">No activity yet</h3>
        <p class="text-sm text-gray-500">
          Activity will appear here as users interact with the system.
        </p>
      </div>

      <div
        *ngIf="!isLoading() && !error() && filtered().length > 0"
        class="space-y-2"
      >
        <div
          *ngFor="let log of filtered()"
          class="bg-white rounded-xl border border-gray-200 px-4 py-3
                 flex items-start gap-3 hover:border-gray-300 transition-colors"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            [class]="getMeta(log)?.color"
          >
            <i [class]="'fas ' + (getMeta(log)?.icon || 'fa-circle')" class="text-xs"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-medium text-gray-900 truncate">
                  {{ log.data.user_name || 'System' }}
                </span>
                <span class="text-xs text-gray-400">/</span>
                <span class="text-xs font-medium text-gray-500">
                  {{ getMeta(log)?.label || log.data.action }}
                </span>
              </div>
              <span class="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {{ formatTimeAgo(log.created_at) }}
              </span>
            </div>

            <p class="text-sm text-gray-600 mt-0.5 truncate">
              {{ log.data.details || log.data.url || '\u2014' }}
            </p>

            <div *ngIf="log.data.entity_type" class="flex items-center gap-2 mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium
                          bg-gray-100 text-gray-500">
                {{ log.data.entity_type }}
              </span>
              <span *ngIf="log.data.entity_id" class="text-[10px] text-gray-400 font-mono">
                #{{ log.data.entity_id }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ActivityLogViewerComponent implements OnInit {
  private logSvc = inject(ActivityLogService);

  logs = signal<ActivityLog[]>([]);
  filtered = signal<ActivityLog[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  actionFilter = '';

  readonly actionMetaEntries = Object.entries(ACTION_META);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.logSvc.getLogs().subscribe({
      next: (logs) => {
        const sorted = logs.sort((a, b) => {
          const tA = a.created_at || '';
          const tB = b.created_at || '';
          return tB.localeCompare(tA);
        });
        this.logs.set(sorted);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load activity log.');
        this.isLoading.set(false);
      },
    });
  }

  applyFilter(): void {
    const filter = this.actionFilter;
    if (!filter) {
      this.filtered.set(this.logs());
    } else {
      this.filtered.set(this.logs().filter((l) => l.data.action === filter));
    }
  }

  getMeta(log: ActivityLog): ActionMeta | undefined {
    return ACTION_META[log.data.action];
  }

  formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
}
