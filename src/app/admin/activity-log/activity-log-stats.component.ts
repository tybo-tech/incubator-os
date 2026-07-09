import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogStateService } from '../../services/activity-log-state.service';

@Component({
  selector: 'app-activity-log-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Events</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ state.stats().total }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Unique Users</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ state.stats().uniqueUsers }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Logins</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ state.stats().logins }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Pages Viewed</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ state.stats().topPages.length }}</p>
      </div>
    </div>

    <div *ngIf="state.stats().topPages.length > 0" class="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-6">
      <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Top Pages</p>
      <div class="space-y-1.5">
        <div *ngFor="let page of state.stats().topPages" class="flex items-center justify-between text-sm">
          <span class="text-gray-700 font-mono text-xs truncate">{{ page.url }}</span>
          <span class="text-gray-500 font-medium tabular-nums ml-3">{{ page.count }}</span>
        </div>
      </div>
    </div>
  `,
})
export class ActivityLogStatsComponent {
  state = inject(ActivityLogStateService);
}
