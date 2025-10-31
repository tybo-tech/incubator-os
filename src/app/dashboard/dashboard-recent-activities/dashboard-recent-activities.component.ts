import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  RecentActivitiesService,
  ActivityType,
  ActivityTypeOption,
  RecentActivity
} from '../../../services/recent-activities.service';

@Component({
  selector: 'app-dashboard-recent-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Recent Activities</h2>
        <div class="flex items-center space-x-3">
          <!-- Activity Type Selector -->
          <select
            [(ngModel)]="selectedType"
            (ngModelChange)="onTypeChange()"
            class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
            <option *ngFor="let type of activityTypes" [value]="type.value">
              {{ type.label }}
            </option>
          </select>

          <!-- Refresh Button -->
          <button
            (click)="refreshActivities()"
            [disabled]="isLoading()"
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
            <i class="fas fa-sync-alt w-4 h-4" [class.animate-spin]="isLoading()"></i>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading() && !activities().length" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading activities...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div class="flex">
          <i class="fas fa-exclamation-circle text-red-400"></i>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error Loading Activities</h3>
            <p class="mt-1 text-sm text-red-700">{{ error() }}</p>
            <button
              (click)="refreshActivities()"
              class="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
              Try again
            </button>
          </div>
        </div>
      </div>

      <!-- Activities List -->
      <div *ngIf="!isLoading() && activities().length" class="space-y-3">
        <div *ngFor="let activity of activities(); trackBy: trackByActivity"
             class="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
             (click)="onActivityClick(activity)">

          <!-- Activity Icon -->
          <div class="flex-shrink-0">
            <div [ngClass]="getActivityIconClass(activity)" class="w-8 h-8 rounded-full flex items-center justify-center">
              <i [class]="getSelectedTypeIcon()" class="text-sm"></i>
            </div>
          </div>

          <!-- Activity Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ getActivityTitle(activity) }}
                </p>
                <p class="text-sm text-gray-500 mt-1">
                  {{ getActivityDescription(activity) }}
                </p>

                <!-- Additional Info for Revenue/Costs -->
                <div *ngIf="selectedType === 'recent_revenue' || selectedType === 'recent_costs'"
                     class="flex items-center space-x-4 mt-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        [ngClass]="getAmountBadgeClass(activity)">
                    {{ formatCurrency(activity.total_amount || 0) }}
                  </span>
                  <span *ngIf="activity.financial_year" class="text-xs text-gray-400">
                    {{ activity.financial_year }}
                  </span>
                  <span *ngIf="activity.affected_period && activity.affected_period !== 'Multiple Months'"
                        class="text-xs text-blue-600">
                    {{ activity.affected_period }}
                  </span>
                </div>

                <!-- Additional Info for Companies -->
                <div *ngIf="selectedType === 'recent_companies'" class="flex items-center space-x-4 mt-2">
                  <span *ngIf="activity.registration_no" class="text-xs text-gray-500">
                    Reg: {{ activity.registration_no }}
                  </span>
                  <span *ngIf="activity.industry" class="text-xs text-blue-600">
                    {{ activity.industry }}
                  </span>
                  <span *ngIf="activity.city" class="text-xs text-gray-500">
                    {{ activity.city }}
                  </span>
                </div>
              </div>

              <!-- Timestamp and Action -->
              <div class="flex flex-col items-end space-y-1 ml-3">
                <span class="text-xs text-gray-400">
                  {{ formatTimeAgo(activity.updated_at) }}
                </span>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getActionBadgeClass(activity.action_type)">
                  {{ activity.action_type }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && !activities().length && !error()"
           class="text-center py-8">
        <i [class]="getSelectedTypeIcon()" class="text-4xl text-gray-300 mb-3"></i>
        <h3 class="text-sm font-medium text-gray-900 mb-1">No Recent Activities</h3>
        <p class="text-sm text-gray-500">
          No {{ getSelectedTypeLabel().toLowerCase() }} found in the system yet.
        </p>
      </div>

      <!-- Load More / Pagination -->
      <div *ngIf="activities().length && pagination()" class="mt-6 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          Showing {{ activities().length }} of {{ pagination()?.total || 0 }} activities
        </div>

        <button
          *ngIf="pagination()?.has_more"
          (click)="loadMore()"
          [disabled]="isLoading()"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
          <span *ngIf="!isLoading()">Load More</span>
          <span *ngIf="isLoading()" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            Loading...
          </span>
        </button>
      </div>

      <!-- View All Link -->
      <div *ngIf="activities().length" class="mt-4 pt-4 border-t border-gray-200">
        <button
          (click)="viewAllActivities()"
          class="text-sm font-medium text-blue-600 hover:text-blue-500">
          View all {{ getSelectedTypeLabel().toLowerCase() }} →
        </button>
      </div>
    </div>
  `
})
export class DashboardRecentActivitiesComponent implements OnInit {
  // State
  activities = signal<RecentActivity[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  pagination = signal<any>(null);

  selectedType: ActivityType = 'recent_revenue';
  activityTypes: ActivityTypeOption[] = [];

  constructor(
    private recentActivitiesService: RecentActivitiesService,
    private router: Router
  ) {
    this.activityTypes = this.recentActivitiesService.getActivityTypes();
  }

  ngOnInit() {
    this.loadActivities();
  }

  onTypeChange() {
    this.activities.set([]);
    this.pagination.set(null);
    this.error.set(null);
    this.loadActivities();
  }

  loadActivities() {
    this.isLoading.set(true);
    this.error.set(null);

    this.recentActivitiesService.getRecentActivities(this.selectedType, 10, 0)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.activities.set(response.result.data);
            this.pagination.set(response.result.pagination);
          } else {
            this.error.set('Failed to load activities');
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load activities');
          this.isLoading.set(false);
        }
      });
  }

  loadMore() {
    if (!this.pagination()?.has_more || this.isLoading()) return;

    this.isLoading.set(true);
    const currentOffset = this.activities().length;

    this.recentActivitiesService.getRecentActivities(this.selectedType, 10, currentOffset)
      .subscribe({
        next: (response) => {
          if (response.success) {
            const currentActivities = this.activities();
            this.activities.set([...currentActivities, ...response.result.data]);
            this.pagination.set(response.result.pagination);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load more activities');
          this.isLoading.set(false);
        }
      });
  }

  refreshActivities() {
    this.activities.set([]);
    this.pagination.set(null);
    this.loadActivities();
  }

  // Utility Methods
  trackByActivity(index: number, activity: RecentActivity): number {
    return activity.id;
  }

  getActivityTitle(activity: RecentActivity): string {
    switch (this.selectedType) {
      case 'recent_revenue':
        return `${activity.company_name} - Revenue ${activity.action_type}`;
      case 'recent_costs':
        return `${activity.company_name} - Costs ${activity.action_type}`;
      case 'recent_companies':
        return `${activity.company_name} - Company ${activity.action_type}`;
      default:
        return `${activity.company_name} - ${activity.action_type}`;
    }
  }

  getActivityDescription(activity: RecentActivity): string {
    switch (this.selectedType) {
      case 'recent_revenue':
      case 'recent_costs':
        const amount = this.formatCurrency(activity.total_amount || 0);
        const period = activity.affected_period && activity.affected_period !== 'Multiple Months'
          ? ` for ${activity.affected_period}`
          : '';
        return `${activity.action_type} ${amount}${period}`;
      case 'recent_companies':
        const details = [
          activity.registration_no ? `Reg: ${activity.registration_no}` : '',
          activity.industry || '',
          activity.city || ''
        ].filter(Boolean).join(' • ');
        return details || 'Company information updated';
      default:
        return activity.notes || `${activity.action_type} activity`;
    }
  }

  getActivityIconClass(activity: RecentActivity): string {
    const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center';

    if (activity.action_type === 'Created') {
      return `${baseClasses} bg-green-100 text-green-600`;
    } else {
      return `${baseClasses} bg-blue-100 text-blue-600`;
    }
  }

  getAmountBadgeClass(activity: RecentActivity): string {
    const amount = activity.total_amount || 0;
    if (amount > 100000) {
      return 'bg-green-100 text-green-800';
    } else if (amount > 50000) {
      return 'bg-blue-100 text-blue-800';
    } else if (amount > 0) {
      return 'bg-gray-100 text-gray-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  }

  getActionBadgeClass(actionType: string): string {
    if (actionType === 'Created') {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  }

  getSelectedTypeIcon(): string {
    const type = this.activityTypes.find(t => t.value === this.selectedType);
    return type?.icon || 'fas fa-activity';
  }

  getSelectedTypeLabel(): string {
    const type = this.activityTypes.find(t => t.value === this.selectedType);
    return type?.label || 'Activities';
  }

  formatCurrency(amount: number): string {
    return this.recentActivitiesService.formatCurrency(amount);
  }

  formatTimeAgo(dateString: string): string {
    return this.recentActivitiesService.formatTimeAgo(dateString);
  }

  // Navigation
  onActivityClick(activity: RecentActivity) {
    if (this.selectedType === 'recent_companies') {
      this.router.navigate(['/companies', activity.company_id || activity.id]);
    } else if (this.selectedType === 'recent_revenue' || this.selectedType === 'recent_costs') {
      this.router.navigate(['/companies', activity.company_id, 'financial']);
    }
  }

  viewAllActivities() {
    // Navigate to a dedicated activities page or filtered companies list
    if (this.selectedType === 'recent_companies') {
      this.router.navigate(['/companies']);
    } else {
      // Could navigate to a financial overview or companies list
      this.router.navigate(['/companies']);
    }
  }
}
