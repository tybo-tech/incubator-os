import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IndustryReportsService, IndustryDashboardResponse } from '../../../../services/industry-reports.service';
import { IIndustryStatsCard, IBarChart, IDoughnutChart, IKeyValue } from '../../../../models/Charts';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-industry-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Industry Performance Overview</h2>
          <p class="text-gray-600 text-sm mt-1">Key statistics across all industries</p>
        </div>
        <button
          (click)="refreshData()"
          [disabled]="isLoading()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center">
          <svg class="w-4 h-4 mr-2" [class.animate-spin]="isLoading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Refresh
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading statistics...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-red-800">{{ error() }}</span>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div *ngIf="!isLoading() && !error()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div *ngFor="let stat of statsCards()"
             class="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <!-- Icon and Title -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="p-2 rounded-lg" [style.background-color]="stat.color + '20'">
                <i [class]="stat.icon" [style.color]="stat.color" class="text-lg"></i>
              </div>
            </div>
          </div>

          <!-- Value -->
          <div class="mb-1">
            <div class="text-2xl font-bold text-gray-900">{{ stat.value }}</div>
            <div class="text-sm font-medium text-gray-700">{{ stat.title }}</div>
          </div>

          <!-- Subtitle -->
          <div *ngIf="stat.subtitle" class="text-xs text-gray-500">
            {{ stat.subtitle }}
          </div>
        </div>
      </div>

      <!-- Top Industries -->
      <div *ngIf="!isLoading() && !error() && topIndustries().length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Industries by Company Count -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Industries by Companies</h3>
          <div class="space-y-3">
            <div *ngFor="let industry of topIndustries().slice(0, 5); let i = index"
                 class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                     [style.background-color]="getIndustryColor(i)">
                  {{ i + 1 }}
                </div>
                <span class="ml-3 font-medium text-gray-900">{{ industry.industry }}</span>
              </div>
              <div class="text-right">
                <div class="text-lg font-semibold text-gray-900">{{ industry.total }}</div>
                <div class="text-xs text-gray-500">companies</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Industry Distribution Chart Placeholder -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Industry Distribution</h3>
          <div class="flex items-center justify-center h-40 bg-white rounded-lg border border-gray-200">
            <div class="text-center">
              <i class="fa-solid fa-chart-pie text-4xl text-gray-400 mb-2"></i>
              <p class="text-gray-600">Chart Component Ready</p>
              <p class="text-xs text-gray-500">Use app-doughnut for visualization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IndustryStatisticsComponent implements OnInit {
  // State management
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Data signals
  statsCards = signal<IIndustryStatsCard[]>([]);
  topIndustries = signal<any[]>([]);
  dashboardData = signal<IndustryDashboardResponse | null>(null);

  constructor(private industryReportsService: IndustryReportsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.industryReportsService.getDashboardStats()
      .pipe(
        catchError(error => {
          console.error('Failed to load industry statistics:', error);
          this.error.set('Failed to load industry statistics. Please try again.');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe((data: IndustryDashboardResponse) => {
        this.dashboardData.set(data);
        this.statsCards.set(this.industryReportsService.transformOverviewToStatsCards(data.overview));
        this.topIndustries.set(data.top_industries);
        this.isLoading.set(false);
      });
  }

  refreshData(): void {
    this.loadData();
  }

  getIndustryColor(index: number): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#8B5CF6', // Purple
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#EC4899', // Pink
      '#6B7280', // Gray
      '#14B8A6', // Teal
    ];
    return colors[index % colors.length];
  }
}
