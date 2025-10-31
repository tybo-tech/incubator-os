import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecentActivitiesService, RecentActivity, ActivityType } from '../../services/recent-activities.service';

@Component({
  selector: 'app-enhanced-activities-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Backdrop -->
    <div *ngIf="isVisible"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         (click)="closeModal()">

      <!-- Modal Content -->
      <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-white">
                <i class="fas fa-chart-line mr-2"></i>
                Enhanced Financial Activities
              </h2>
              <p class="text-blue-100 text-sm mt-1">Real-time financial data from company revenue statistics</p>
            </div>
            <div class="flex items-center space-x-3">
              <!-- Activity Type Filter -->
              <select
                [(ngModel)]="selectedActivityType"
                (ngModelChange)="loadEnhancedActivities()"
                class="text-sm border border-white border-opacity-30 rounded-md px-3 py-1 bg-white bg-opacity-20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50">
                <option value="recent_revenue_enhanced" class="text-gray-900">Enhanced Revenue</option>
                <option value="recent_financial_updates" class="text-gray-900">Financial Updates</option>
              </select>
              <!-- Close Button -->
              <button
                (click)="closeModal()"
                class="text-white hover:text-blue-200 transition-colors">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto max-h-[70vh]">

          <!-- Loading State -->
          <div *ngIf="isLoading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Loading enhanced activities...</span>
          </div>

          <!-- Error State -->
          <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
              <p class="text-red-600">{{ error }}</p>
            </div>
            <button
              (click)="loadEnhancedActivities()"
              class="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
              Retry
            </button>
          </div>

          <!-- Enhanced Activities Grid -->
          <div *ngIf="!isLoading && !error" class="space-y-4">

            <!-- Summary Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
                <p class="text-sm opacity-90">Total Activities</p>
                <p class="text-2xl font-bold">{{ activities.length }}</p>
              </div>
              <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                <p class="text-sm opacity-90">Total Value</p>
                <p class="text-2xl font-bold">{{ getTotalValue() | currency:'ZAR':'symbol':'1.0-0' }}</p>
              </div>
              <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                <p class="text-sm opacity-90">Active Companies</p>
                <p class="text-2xl font-bold">{{ getUniqueCompanies() }}</p>
              </div>
              <div class="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                <p class="text-sm opacity-90">Avg per Company</p>
                <p class="text-2xl font-bold">{{ getAverageValue() | currency:'ZAR':'symbol':'1.0-0' }}</p>
              </div>
            </div>

            <!-- Activities Table -->
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Financial Year
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr *ngFor="let activity of activities; let i = index"
                        class="hover:bg-gray-50 transition-colors"
                        [class.bg-green-50]="activity.entry_type === 'Revenue'"
                        [class.bg-red-50]="activity.entry_type === 'Cost'">

                      <!-- Company Name -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-8 w-8">
                            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span class="text-white text-sm font-bold">{{ activity.company_name.charAt(0) }}</span>
                            </div>
                          </div>
                          <div class="ml-3">
                            <p class="text-sm font-medium text-gray-900">{{ activity.company_name }}</p>
                            <p class="text-xs text-gray-500">ID: {{ activity.company_id }}</p>
                          </div>
                        </div>
                      </td>

                      <!-- Entry Type -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                              [class]="getEntryTypeClass(activity.entry_type || 'Unknown')">
                          <i [class]="getEntryTypeIcon(activity.entry_type || 'Unknown')" class="mr-1"></i>
                          {{ activity.entry_type || 'Unknown' }}
                        </span>
                      </td>

                      <!-- Amount -->
                      <td class="px-6 py-4 whitespace-nowrap text-right">
                        <div class="text-sm">
                          <p class="font-semibold" [class]="getAmountClass(activity.entry_type || 'Unknown')">
                            {{ formatCurrency(activity.total_amount_raw || activity.total_amount) }}
                          </p>
                          <p class="text-xs text-gray-500">{{ activity.total_amount }}</p>
                        </div>
                      </td>

                      <!-- Financial Year -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm text-gray-900">{{ activity.financial_year || 'Current' }}</span>
                      </td>

                      <!-- Last Updated -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm">
                          <p class="text-gray-900">{{ formatDate(activity.updated_at) }}</p>
                          <p class="text-xs text-gray-500">{{ formatTimeAgo(activity.updated_at) }}</p>
                        </div>
                      </td>

                      <!-- Actions -->
                      <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <div class="flex items-center space-x-2">
                          <button
                            (click)="viewCompany(activity.company_id || 0)"
                            class="text-blue-600 hover:text-blue-800 transition-colors">
                            <i class="fas fa-eye mr-1"></i>
                            View
                          </button>
                          <button
                            (click)="editFinancials(activity)"
                            class="text-green-600 hover:text-green-800 transition-colors">
                            <i class="fas fa-edit mr-1"></i>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Load More Button -->
            <div class="text-center pt-4" *ngIf="activities.length >= currentLimit">
              <button
                (click)="loadMore()"
                [disabled]="isLoadingMore"
                class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <i class="fas fa-plus mr-2" [class.animate-spin]="isLoadingMore"></i>
                Load More Activities
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-600">
              <i class="fas fa-info-circle mr-1"></i>
              Showing {{ activities.length }} enhanced financial activities
            </div>
            <div class="flex items-center space-x-3">
              <button
                (click)="refreshData()"
                [disabled]="isLoading"
                class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                <i class="fas fa-sync-alt mr-1" [class.animate-spin]="isLoading"></i>
                Refresh
              </button>
              <button
                (click)="closeModal()"
                class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EnhancedActivitiesModalComponent implements OnInit {
  @Input() isVisible = false;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() viewCompanyEvent = new EventEmitter<number>();

  activities: RecentActivity[] = [];
  selectedActivityType: ActivityType = 'recent_revenue_enhanced';
  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;
  currentLimit = 20;

  constructor(private recentActivitiesService: RecentActivitiesService) {}

  ngOnInit(): void {
    if (this.isVisible) {
      this.loadEnhancedActivities();
    }
  }

  loadEnhancedActivities(): void {
    this.isLoading = true;
    this.error = null;
    this.currentLimit = 20;

    this.recentActivitiesService.getRecentActivities(this.selectedActivityType, this.currentLimit, 0).subscribe({
      next: (response) => {
        if (response.success) {
          this.activities = response.result.data;
        } else {
          this.error = 'Failed to load enhanced activities';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load enhanced activities';
        this.isLoading = false;
        console.error('Enhanced activities error:', err);
      }
    });
  }

  loadMore(): void {
    this.isLoadingMore = true;
    const newLimit = this.currentLimit + 20;

    this.recentActivitiesService.getRecentActivities(this.selectedActivityType, newLimit, 0).subscribe({
      next: (response) => {
        if (response.success) {
          this.activities = response.result.data;
          this.currentLimit = newLimit;
        }
        this.isLoadingMore = false;
      },
      error: (err) => {
        console.error('Load more error:', err);
        this.isLoadingMore = false;
      }
    });
  }

  refreshData(): void {
    this.loadEnhancedActivities();
  }

  closeModal(): void {
    this.closeEvent.emit();
  }

  viewCompany(companyId: number): void {
    this.viewCompanyEvent.emit(companyId);
    this.closeModal();
  }

  editFinancials(activity: RecentActivity): void {
    // Navigate to financial editing for this company
    console.log('Edit financials for:', activity);
    // Could emit an event or navigate to edit page
  }

  // Utility methods
  getTotalValue(): number {
    return this.activities.reduce((sum, activity) => {
      return sum + (activity.total_amount_raw || parseFloat(activity.total_amount?.toString() || '0') || 0);
    }, 0);
  }

  getUniqueCompanies(): number {
    const uniqueCompanies = new Set(this.activities.map(a => a.company_id));
    return uniqueCompanies.size;
  }

  getAverageValue(): number {
    const total = this.getTotalValue();
    const count = this.getUniqueCompanies();
    return count > 0 ? total / count : 0;
  }

  getEntryTypeClass(type: string): string {
    switch (type) {
      case 'Revenue':
        return 'bg-green-100 text-green-800';
      case 'Cost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getEntryTypeIcon(type: string): string {
    switch (type) {
      case 'Revenue':
        return 'fas fa-arrow-up';
      case 'Cost':
        return 'fas fa-arrow-down';
      default:
        return 'fas fa-circle';
    }
  }

  getAmountClass(type: string): string {
    switch (type) {
      case 'Revenue':
        return 'text-green-600';
      case 'Cost':
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  }

  formatCurrency(amount: number | string | null | undefined): string {
    const numValue = parseFloat(amount?.toString() || '0') || 0;
    return this.recentActivitiesService.formatCurrency(numValue);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTimeAgo(dateString: string): string {
    return this.recentActivitiesService.formatTimeAgo(dateString);
  }
}
