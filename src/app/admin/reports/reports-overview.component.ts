import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService, DashboardData } from '../../../services/reports.service';

@Component({
  selector: 'app-reports-overview',
  standalone: true,
  imports: [CommonModule],
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

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.loadReports();
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
}
