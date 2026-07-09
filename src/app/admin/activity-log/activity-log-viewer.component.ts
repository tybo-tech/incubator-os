import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogStateService } from '../../services/activity-log-state.service';
import { ActivityLogStatsComponent } from './activity-log-stats.component';
import { ActivityLogFiltersComponent } from './activity-log-filters.component';
import { ActivityLogListComponent } from './activity-log-list.component';

@Component({
  selector: 'app-activity-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    ActivityLogStatsComponent,
    ActivityLogFiltersComponent,
    ActivityLogListComponent,
  ],
  template: `
    <div class="p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Activity Log</h2>
          <p class="text-sm text-gray-500 mt-1">
            Track user actions and system events across the platform.
          </p>
        </div>
      </div>

      <app-activity-log-stats></app-activity-log-stats>
      <app-activity-log-filters></app-activity-log-filters>
      <app-activity-log-list></app-activity-log-list>
    </div>
  `,
})
export class ActivityLogViewerComponent implements OnInit {
  private state = inject(ActivityLogStateService);

  ngOnInit(): void {
    this.state.loadLogs();
  }
}
