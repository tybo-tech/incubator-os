import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyFinancialYearlyStatsService, QuarterlyRevenue } from '../../../../../services/company-financial-yearly-stats.service';

// Display row interface for UI binding
interface RevenueDisplayRow {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;
  start_month: number;
  revenue_q1: number;
  revenue_q2: number;
  revenue_q3: number;
  revenue_q4: number;
  revenue_total: number;
  export_q1: number;
  export_q2: number;
  export_q3: number;
  export_q4: number;
  export_total: number;
  export_ratio: number;
  quarter_details?: {
    q1_months: string[];
    q2_months: string[];
    q3_months: string[];
    q4_months: string[];
  };
  account_breakdown?: any[];
}

@Component({
  selector: 'app-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <i class="fas fa-chart-line text-green-600 text-2xl mr-3"></i>
          <h2 class="text-xl font-bold text-gray-900">Revenue Summary</h2>
          <div class="ml-4 text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            Live calculations from monthly financial data
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <!-- Revenue Tables -->
      <div *ngIf="!loading" class="space-y-8">

        <!-- Revenue Section -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q1
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q2
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q3
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q4
                </th>
                <th class="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let row of revenueRows; let i = index" class="hover:bg-gray-50">
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">{{ row.financial_year_name }}</span>
                    <span class="text-xs text-gray-500 ml-2" *ngIf="row.quarter_details">
                      ({{ getFinancialYearPeriod(row) }})
                    </span>
                  </div>
                </td>

                <!-- Q1 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.revenue_q1) }}
                  </span>
                </td>

                <!-- Q2 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.revenue_q2) }}
                  </span>
                </td>

                <!-- Q3 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.revenue_q3) }}
                  </span>
                </td>

                <!-- Q4 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.revenue_q4) }}
                  </span>
                </td>

                <!-- Total -->
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold text-gray-900">
                      {{ formatCurrency(row.revenue_total) }}
                    </span>
                    <span class="text-xs text-gray-500 block">USD</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Export Revenue Section -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Export revenue
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q1
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q2
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q3
                </th>
                <th class="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q4
                </th>
                <th class="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th class="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ratio
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let row of revenueRows; let i = index" class="hover:bg-gray-50">
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">{{ row.financial_year_name }}</span>
                  </div>
                </td>

                <!-- Export Q1 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q1) }}
                  </span>
                </td>

                <!-- Export Q2 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q2) }}
                  </span>
                </td>

                <!-- Export Q3 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q3) }}
                  </span>
                </td>

                <!-- Export Q4 -->
                <td class="w-28 px-4 py-4 whitespace-nowrap">
                  <span class="block text-sm text-center text-gray-900">
                    {{ formatCurrency(row.export_q4) }}
                  </span>
                </td>

                <!-- Export Total -->
                <td class="w-32 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold text-gray-900">
                      {{ formatCurrency(row.export_total) }}
                    </span>
                    <span class="text-xs text-gray-500 block">USD</span>
                  </div>
                </td>

                <!-- Ratio -->
                <td class="w-20 px-4 py-4 whitespace-nowrap">
                  <div class="text-center">
                    <span class="text-sm font-semibold text-blue-600">
                      {{ formatPercentage(row.export_ratio) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && revenueRows.length === 0" class="text-center py-12">
        <i class="fas fa-chart-line text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Revenue Data</h3>
        <p class="text-gray-600 mb-4">
          Revenue calculations are based on monthly financial data.<br>
          Add monthly financial entries to see quarterly revenue summaries.
        </p>
      </div>

    </div>
  `
})
export class RevenueComponent implements OnInit {
  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  revenueRows: RevenueDisplayRow[] = [];
  loading = false;

  constructor(
    private financialService: CompanyFinancialYearlyStatsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get companyId from route params (two levels up: /company/:id/financial/revenue)
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    // Get query parameters
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);

      // Extract required query parameters
      this.clientId = queryParams?.['clientId'] ? parseInt(queryParams['clientId'], 10) : 0;
      this.programId = queryParams?.['programId'] ? parseInt(queryParams['programId'], 10) : 0;
      this.cohortId = queryParams?.['cohortId'] ? parseInt(queryParams['cohortId'], 10) : 0;

      console.log('Revenue Component - IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });

      this.loadRevenueData();
    }
  }

  async loadRevenueData(): Promise<void> {
    this.loading = true;
    try {
      // Get quarterly revenue for all years - this is now live calculated from monthly data
      const quarterlyData = await this.financialService.getQuarterlyRevenueAllYears(this.companyId).toPromise();

      // Map the API response to display rows
      this.revenueRows = (quarterlyData || []).map(data => ({
        financial_year_id: data.financial_year_id,
        financial_year_name: data.financial_year_name,
        fy_start_year: data.fy_start_year,
        fy_end_year: data.fy_end_year,
        start_month: data.start_month,
        revenue_q1: data.revenue_q1,
        revenue_q2: data.revenue_q2,
        revenue_q3: data.revenue_q3,
        revenue_q4: data.revenue_q4,
        revenue_total: data.revenue_total,
        export_q1: data.export_q1,
        export_q2: data.export_q2,
        export_q3: data.export_q3,
        export_q4: data.export_q4,
        export_total: data.export_total,
        export_ratio: data.export_ratio,
        quarter_details: data.quarter_details,
        account_breakdown: data.account_breakdown
      }));

      console.log('Revenue Component - Live quarterly data loaded:', this.revenueRows);

    } catch (error) {
      console.error('Error loading quarterly revenue data:', error);
      this.revenueRows = [];
    } finally {
      this.loading = false;
    }
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number | null): string {
    if (value === null || value === undefined) return '0%';
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  getFinancialYearPeriod(row: RevenueDisplayRow): string {
    if (row.quarter_details) {
      const q1Months = row.quarter_details.q1_months.join('-');
      const q4Months = row.quarter_details.q4_months.join('-');
      return `${q1Months} to ${q4Months}`;
    }
    return `${row.fy_start_year}-${row.fy_end_year}`;
  }
}
