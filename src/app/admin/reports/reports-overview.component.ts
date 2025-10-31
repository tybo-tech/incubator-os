import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportsService, DashboardData } from '../../../services/reports.service';
import { RecentActivitiesService, RecentActivity, ActivityType, ActivityTypeOption, FinancialStatistics, StatisticsType } from '../../../services/recent-activities.service';

@Component({
  selector: 'app-reports-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Reports Overview</h1>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading reports...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 class="text-red-800 font-semibold">Error Loading Reports</h3>
          <p class="text-red-600 mt-2">{{ error }}</p>
          <button
            (click)="loadReports()"
            class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>

        <!-- Dashboard Content -->
        <div *ngIf="dashboard && !isLoading" class="space-y-6">

          <!-- Overall Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total Clients</p>
                  <p class="text-2xl font-bold text-blue-600">{{ dashboard.summary.total_clients || 0 }}</p>
                </div>
                <i class="fas fa-building text-blue-500 text-xl"></i>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total Programs</p>
                  <p class="text-2xl font-bold text-green-600">{{ dashboard.summary.total_programs || 0 }}</p>
                </div>
                <i class="fas fa-project-diagram text-green-500 text-xl"></i>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total Cohorts</p>
                  <p class="text-2xl font-bold text-purple-600">{{ dashboard.summary.total_cohorts || 0 }}</p>
                </div>
                <i class="fas fa-users text-purple-500 text-xl"></i>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500">Total Companies</p>
                  <p class="text-2xl font-bold text-orange-600">{{ dashboard.summary.total_companies || 0 }}</p>
                </div>
                <i class="fas fa-industry text-orange-500 text-xl"></i>
              </div>
            </div>
          </div>

          <!-- Enhanced Financial Dashboard - 3 Column Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Column 1: Recent Financial Activities -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-6 py-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-clock mr-2 text-blue-500"></i>
                    Recent Financial Activities
                  </h2>
                  <div class="flex items-center space-x-2">
                    <!-- Activity Type Filter -->
                    <select
                      [(ngModel)]="selectedActivityType"
                      (ngModelChange)="onActivityTypeChange()"
                      class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option *ngFor="let option of activityTypeOptions" [value]="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <!-- Refresh Button -->
                    <button
                      (click)="loadRecentActivities()"
                      [disabled]="isLoadingActivities"
                      class="text-sm bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50">
                      <i class="fas fa-sync-alt" [class.animate-spin]="isLoadingActivities"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div class="p-4">
                <!-- Loading State for Activities -->
                <div *ngIf="isLoadingActivities" class="flex justify-center items-center py-6">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span class="ml-2 text-gray-600 text-sm">Loading...</span>
                </div>

                <!-- Activities Error State -->
                <div *ngIf="activitiesError" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p class="text-red-600 text-sm">{{ activitiesError }}</p>
                </div>

                <!-- Activities List -->
                <div *ngIf="!isLoadingActivities && !activitiesError" class="space-y-2">
                  <div *ngFor="let activity of recentActivities.slice(0, 6)"
                       class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       (click)="navigateToActivity(activity)">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ activity.company_name }}</p>
                      <p class="text-xs text-gray-500 truncate">{{ getActivityDescription(activity) }}</p>
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                      <p class="text-sm font-semibold text-green-600" *ngIf="activity.total_amount">
                        {{ formatCurrency(activity.total_amount_raw || activity.total_amount) }}
                      </p>
                      <p class="text-xs text-gray-500">{{ formatTimeAgo(activity.updated_at) }}</p>
                    </div>
                  </div>

                  <!-- View All Activities Link -->
                  <div class="pt-3 border-t border-gray-200">
                    <button
                      (click)="viewAllActivities()"
                      class="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View All Activities →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 2: Top Revenue Companies -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-lg font-semibold text-gray-900">
                  <i class="fas fa-trophy mr-2 text-yellow-500"></i>
                  Top Revenue Companies
                </h2>
              </div>
              <div class="p-4">
                <!-- Loading State for Stats -->
                <div *ngIf="isLoadingStats" class="flex justify-center items-center py-6">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span class="ml-2 text-gray-600 text-sm">Loading...</span>
                </div>

                <!-- Stats Error State -->
                <div *ngIf="statsError" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p class="text-red-600 text-sm">{{ statsError }}</p>
                </div>

                <!-- Top Companies List -->
                <div *ngIf="!isLoadingStats && !statsError" class="space-y-3">
                  <div *ngFor="let company of topRevenueCompanies; let i = index"
                       class="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 hover:from-green-100 hover:to-blue-100 transition-colors cursor-pointer">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-800 text-sm font-bold">
                          {{ i + 1 }}
                        </span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{{ company.company_name }}</p>
                        <p class="text-xs text-gray-500">{{ company.revenue_entries }} revenue entries</p>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p class="text-sm font-bold text-green-600">{{ formatCurrency(company.total_revenue) }}</p>
                      <p class="text-xs text-gray-500">{{ formatTimeAgo(company.last_updated) }}</p>
                    </div>
                  </div>

                  <!-- Max Revenue Highlight -->
                  <div *ngIf="maxRevenueRecord" class="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm font-medium text-gray-900">🏆 Highest Single Entry</p>
                        <p class="text-xs text-gray-600">{{ maxRevenueRecord.company_name }}</p>
                      </div>
                      <p class="text-lg font-bold text-orange-600">{{ formatCurrency(maxRevenueRecord.total_amount) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 3: Performance Overview -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-lg font-semibold text-gray-900">
                  <i class="fas fa-chart-pie mr-2 text-purple-500"></i>
                  Performance Overview
                </h2>
              </div>
              <div class="p-4">
                <!-- Loading State -->
                <div *ngIf="isLoadingStats" class="flex justify-center items-center py-6">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span class="ml-2 text-gray-600 text-sm">Loading...</span>
                </div>

                <!-- Performance Stats -->
                <div *ngIf="!isLoadingStats && monthlyPerformance" class="space-y-4">
                  <!-- Summary Cards -->
                  <div class="grid grid-cols-2 gap-3">
                    <div [class]="getStatCardClass('revenue')" class="p-3 rounded-lg">
                      <p class="text-xs text-white opacity-90">Total Revenue</p>
                      <p class="text-lg font-bold text-white">{{ formatCurrency(monthlyPerformance.total_revenue) }}</p>
                    </div>
                    <div [class]="getStatCardClass('cost')" class="p-3 rounded-lg">
                      <p class="text-xs text-white opacity-90">Total Costs</p>
                      <p class="text-lg font-bold text-white">{{ formatCurrency(monthlyPerformance.total_costs) }}</p>
                    </div>
                    <div [class]="getStatCardClass('profit')" class="p-3 rounded-lg">
                      <p class="text-xs text-white opacity-90">Net Profit</p>
                      <p class="text-lg font-bold text-white">{{ formatCurrency(monthlyPerformance.net_profit) }}</p>
                    </div>
                    <div [class]="getStatCardClass('companies')" class="p-3 rounded-lg">
                      <p class="text-xs text-white opacity-90">Active Companies</p>
                      <p class="text-lg font-bold text-white">{{ monthlyPerformance.active_companies }}</p>
                    </div>
                  </div>

                  <!-- Key Metrics -->
                  <div class="space-y-2 pt-2 border-t border-gray-200">
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Profit Margin</span>
                      <span class="text-sm font-semibold" 
                            [class]="monthlyPerformance.profit_margin > 0 ? 'text-green-600' : 'text-red-600'">
                        {{ monthlyPerformance.profit_margin }}%
                      </span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Avg Revenue/Company</span>
                      <span class="text-sm font-semibold text-gray-900">
                        {{ formatCurrency(monthlyPerformance.avg_revenue_per_company) }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Highest Entry</span>
                      <span class="text-sm font-semibold text-gray-900">
                        {{ formatCurrency(monthlyPerformance.highest_single_amount) }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Total Entries</span>
                      <span class="text-sm font-semibold text-gray-900">{{ monthlyPerformance.total_entries }}</span>
                    </div>
                  </div>

                  <!-- Refresh Button -->
                  <div class="pt-3 border-t border-gray-200">
                    <button
                      (click)="loadFinancialStatistics()"
                      [disabled]="isLoadingStats"
                      class="w-full text-center text-sm bg-purple-600 text-white py-2 px-3 rounded-md hover:bg-purple-700 disabled:opacity-50">
                      <i class="fas fa-sync-alt mr-1" [class.animate-spin]="isLoadingStats"></i>
                      Refresh Statistics
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Performing Cohorts -->
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Top Performing Cohorts</h2>
            </div>
            <div class="p-6">
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead>
                    <tr class="border-b">
                      <th class="text-left py-2 text-sm font-medium text-gray-500">Cohort</th>
                      <th class="text-left py-2 text-sm font-medium text-gray-500">Program</th>
                      <th class="text-right py-2 text-sm font-medium text-gray-500">Companies</th>
                      <th class="text-right py-2 text-sm font-medium text-gray-500">Active</th>
                      <th class="text-right py-2 text-sm font-medium text-gray-500">Avg Turnover</th>
                      <th class="text-right py-2 text-sm font-medium text-gray-500">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let cohort of topCohorts" class="border-b">
                      <td class="py-3 text-sm font-medium text-gray-900">{{ cohort.cohort_name }}</td>
                      <td class="py-3 text-sm text-gray-600">{{ cohort.program_name }}</td>
                      <td class="py-3 text-sm text-right">{{ cohort.total_companies }}</td>
                      <td class="py-3 text-sm text-right">{{ cohort.active_companies }}</td>
                      <td class="py-3 text-sm text-right">{{ formatCurrency(cohort.avg_turnover) }}</td>
                      <td class="py-3 text-sm text-right">
                        <span [class]="getComplianceClass(cohort.full_compliance_rate)">
                          {{ safeToFixed(cohort.full_compliance_rate) }}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Industry Distribution -->
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Industry Distribution</h2>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div *ngFor="let industry of dashboard.industry_distribution?.slice(0, 6)"
                     class="p-4 border rounded-lg">
                  <h3 class="font-medium text-gray-900">{{ industry.industry }}</h3>
                  <p class="text-2xl font-bold text-blue-600 mt-2">{{ industry.total_companies }}</p>
                  <p class="text-sm text-gray-500">{{ industry.cohorts_count }} cohorts</p>
                  <p class="text-sm text-gray-500">Avg: {{ formatCurrency(industry.avg_turnover) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Geographic Distribution -->
          <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Geographic Distribution</h2>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div *ngFor="let location of dashboard.geographic_distribution?.slice(0, 8)"
                     class="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h3 class="font-medium text-gray-900">{{ location.location }}</h3>
                    <p class="text-sm text-gray-500">{{ location.cohort_count }} cohorts</p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-bold text-blue-600">{{ location.company_count }}</p>
                    <p class="text-sm text-gray-500">companies</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="bg-gray-100 rounded-lg p-4">
            <p class="text-sm text-gray-600">
              <i class="fas fa-info-circle mr-2"></i>
              Report generated on {{ dashboard.metadata.generated_at | date:'medium' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReportsOverviewComponent implements OnInit {
  dashboard: DashboardData | null = null;
  isLoading = false;
  error: string | null = null;

  // Recent Activities properties
  recentActivities: RecentActivity[] = [];
  isLoadingActivities = false;
  activitiesError: string | null = null;
  selectedActivityType: ActivityType = 'recent_revenue_enhanced';

  // Financial Statistics properties
  topRevenueCompanies: any[] = [];
  maxRevenueRecord: any = null;
  monthlyPerformance: any = null;
  isLoadingStats = false;
  statsError: string | null = null;

  activityTypeOptions: ActivityTypeOption[] = [
    {
      value: 'recent_revenue_enhanced',
      label: 'Enhanced Revenue Activity',
      description: 'Recent revenue with amounts and totals',
      icon: 'fas fa-money-bill-wave text-green-500'
    },
    {
      value: 'recent_revenue',
      label: 'Recent Revenue',
      description: 'Latest revenue entries and updates',
      icon: 'fas fa-chart-line text-green-500'
    },
    {
      value: 'recent_costs',
      label: 'Recent Costs',
      description: 'Latest cost entries and updates',
      icon: 'fas fa-chart-bar text-red-500'
    },
    {
      value: 'recent_companies',
      label: 'Recent Companies',
      description: 'Latest company registrations and updates',
      icon: 'fas fa-building text-blue-500'
    },
    {
      value: 'recent_compliance',
      label: 'Recent Compliance',
      description: 'Latest compliance activities',
      icon: 'fas fa-shield-alt text-purple-500'
    }
  ];

  constructor(
    private reportsService: ReportsService,
    private recentActivitiesService: RecentActivitiesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReports();
    this.loadRecentActivities();
    this.loadFinancialStatistics();
  }

  loadReports(): void {
    this.isLoading = true;
    this.error = null;

    this.reportsService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load reports';
        this.isLoading = false;
        console.error('Reports error:', err);
      }
    });
  }

  // Recent Activities Methods
  loadRecentActivities(): void {
    this.isLoadingActivities = true;
    this.activitiesError = null;

    this.recentActivitiesService.getRecentActivities(this.selectedActivityType, 8, 0).subscribe({
      next: (response) => {
        if (response.success) {
          this.recentActivities = response.result.data;
        } else {
          this.activitiesError = 'Failed to load recent activities';
        }
        this.isLoadingActivities = false;
      },
      error: (err) => {
        this.activitiesError = err.message || 'Failed to load recent activities';
        this.isLoadingActivities = false;
        console.error('Recent activities error:', err);
      }
    });
  }

  onActivityTypeChange(): void {
    this.loadRecentActivities();
  }

  getActivityIcon(activity: RecentActivity): string {
    const option = this.activityTypeOptions.find(opt => opt.value === this.selectedActivityType);
    return option?.icon || 'fas fa-circle text-gray-400';
  }

  getActivityDescription(activity: RecentActivity): string {
    const action = activity.action_type || 'Updated';

    switch (this.selectedActivityType) {
      case 'recent_revenue':
        return `${action} revenue data${activity.financial_year ? ` for ${activity.financial_year}` : ''}`;
      case 'recent_costs':
        return `${action} cost data${activity.affected_period ? ` for ${activity.affected_period}` : ''}`;
      case 'recent_companies':
        return `${action} company profile${activity.registration_no ? ` (${activity.registration_no})` : ''}`;
      case 'recent_compliance':
        return `${action} compliance information`;
      default:
        return `${action} business data`;
    }
  }

  formatTimeAgo(dateString: string): string {
    return this.recentActivitiesService.formatTimeAgo(dateString);
  }

  navigateToActivity(activity: RecentActivity): void {
    if (activity.company_id) {
      // Navigate to the specific company
      this.router.navigate(['/company', activity.company_id]);
    } else {
      // Navigate to companies list
      this.router.navigate(['/companies']);
    }
  }

  viewAllActivities(): void {
    // Navigate to the dedicated recent activities dashboard
    this.router.navigate(['/dashboard/recent-activities']);
  }

  get topCohorts() {
    if (!this.dashboard?.cohort_performance) return [];

    // Combine performance and compliance data
    const cohorts = this.dashboard.cohort_performance.map(cohort => {
      const compliance = this.dashboard?.compliance_summary?.find(c => c.cohort_id === cohort.cohort_id);
      const complianceRate = compliance?.full_compliance_rate;

      return {
        ...cohort,
        full_compliance_rate: this.toNumber(complianceRate)
      };
    });

    return cohorts
      .sort((a, b) => b.total_companies - a.total_companies)
      .slice(0, 10);
  }

  formatCurrency(amount: number | string | null | undefined): string {
    const numAmount = this.toNumber(amount);
    if (numAmount === 0) return 'R0';
    return this.reportsService.formatCurrency(numAmount);
  }

  safeToFixed(value: number | string | null | undefined, decimals: number = 1): string {
    const numValue = this.toNumber(value);
    return numValue.toFixed(decimals);
  }

  // Utility method to safely convert string/number to number
  private toNumber(value: number | string | null | undefined): number {
    if (!value) return 0;
    const num = parseFloat(value.toString());
    return isNaN(num) ? 0 : num;
  }

  getComplianceClass(rate: number | string | null | undefined): string {
    const safeRate = this.toNumber(rate);
    const status = this.reportsService.getComplianceStatus(safeRate);
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';

    switch (status.color) {
      case 'green': return `${baseClasses} bg-green-100 text-green-800`;
      case 'blue': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'yellow': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'red': return `${baseClasses} bg-red-100 text-red-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  // Financial Statistics Methods
  loadFinancialStatistics(): void {
    this.isLoadingStats = true;
    this.statsError = null;

    // Load multiple statistics in parallel
    const topCompanies$ = this.recentActivitiesService.getFinancialStatistics('top_revenue', 5);
    const maxRevenue$ = this.recentActivitiesService.getFinancialStatistics('max_revenue', 1);
    const monthlySummary$ = this.recentActivitiesService.getFinancialStatistics('monthly_summary', 1);

    // Combine all statistics
    Promise.all([
      topCompanies$.toPromise(),
      maxRevenue$.toPromise(),
      monthlySummary$.toPromise()
    ]).then(([topCompanies, maxRevenue, monthlySummary]) => {
      if (topCompanies?.success) {
        this.topRevenueCompanies = topCompanies.result.data;
      }
      if (maxRevenue?.success) {
        this.maxRevenueRecord = maxRevenue.result.data;
      }
      if (monthlySummary?.success) {
        this.monthlyPerformance = monthlySummary.result.data;
      }
      this.isLoadingStats = false;
    }).catch((error) => {
      this.statsError = 'Failed to load financial statistics';
      this.isLoadingStats = false;
      console.error('Financial statistics error:', error);
    });
  }

  getStatCardClass(type: string): string {
    switch (type) {
      case 'revenue': return 'bg-gradient-to-br from-green-500 to-green-600 text-white';
      case 'cost': return 'bg-gradient-to-br from-red-500 to-red-600 text-white';
      case 'profit': return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white';
      case 'companies': return 'bg-gradient-to-br from-purple-500 to-purple-600 text-white';
      default: return 'bg-gradient-to-br from-gray-500 to-gray-600 text-white';
    }
  }
}
