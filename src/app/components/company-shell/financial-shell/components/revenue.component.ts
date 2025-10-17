import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyFinancialYearlyStatsService } from '../../../../../services/company-financial-yearly-stats.service';

// Chart Components
import { LineChartComponent } from '../../../../charts/line-chart/line-chart.component';
import { BarChartComponent } from '../../../../charts/bar-chart/bar-chart.component';
import { DoughnutComponent } from '../../../../charts/doughnut/doughnut.component';

// Chart Data Interfaces
import { ILineChart, IBarChart } from '../../../../../models/Charts';
import { IKeyValue } from '../../../../../models/IKeyValue';

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
  imports: [CommonModule, FormsModule, LineChartComponent, BarChartComponent],
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
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
        ></div>
      </div>

      <!-- Charts and Analytics Section -->
      <div *ngIf="!loading && revenueRows.length > 0" class="space-y-8 mb-12">
        <!-- Key Metrics Cards -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center mb-6">
            <i class="fas fa-tachometer-alt text-purple-600 text-xl mr-3"></i>
            <h3 class="text-lg font-semibold text-gray-900">
              Key Revenue Metrics
            </h3>
          </div>

          <!-- Horizontal Grid for 3 Revenue Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              *ngFor="let metric of keyMetrics"
              class="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <!-- Icon and Value -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex-1">
                  <div
                    class="text-2xl font-bold mb-1"
                    [ngClass]="metric.color || 'text-gray-800'"
                  >
                    {{ metric.value }}
                  </div>
                  <div class="text-sm font-medium text-gray-600 capitalize">
                    {{ metric.key }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ metric.subtitle }}
                  </div>
                </div>

                <!-- Icon -->
                <div class="ml-4">
                  <div
                    class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200"
                  >
                    <i
                      [class]="metric.icon || 'fas fa-chart-line'"
                      [ngClass]="metric.color || 'text-gray-600'"
                    ></i>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full transition-all duration-500 rounded-full"
                  [ngClass]="
                    metric.color === 'text-green-600'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  "
                  [style.width]="'85%'"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Quarterly Trends Line Chart -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <app-line-chart
              [componentTitle]="'Quarterly Revenue Trends'"
              [data]="quarterlyTrendsChart"
            >
            </app-line-chart>
          </div>

          <!-- Yearly Comparison Bar Chart -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <app-bar-chart
              [componentTitle]="'Revenue Comparison by Year'"
              [data]="yearlyComparisonChart"
            >
            </app-bar-chart>
          </div>
        </div>
      </div>

      <!-- Revenue Tables -->
      <div *ngIf="!loading" class="space-y-12">
        <!-- Domestic Revenue Section -->
        <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
          <!-- Section Header -->
          <div
            class="bg-blue-50 border-b border-blue-100 px-6 py-4 rounded-t-lg"
          >
            <div class="flex items-center">
              <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <h3 class="text-lg font-semibold text-blue-800">
                Domestic Revenue
              </h3>
              <div class="ml-4 text-sm text-blue-600">
                <i class="fas fa-home mr-1"></i>
                Local market revenue by quarters
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 table-fixed">
              <thead class="bg-blue-500">
                <tr>
                  <th
                    class="w-32 px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Financial Year
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q1
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q2
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q3
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q4
                  </th>
                  <th
                    class="w-32 px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Total Revenue
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  *ngFor="let row of revenueRows; let i = index"
                  class="hover:bg-blue-50 transition-colors duration-200"
                >
                  <td class="w-32 px-6 py-5 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm font-medium text-gray-900">{{
                        row.financial_year_name
                      }}</span>
                      <span
                        class="text-xs text-gray-500 ml-2"
                        *ngIf="row.quarter_details"
                      >
                        ({{ getFinancialYearPeriod(row) }})
                      </span>
                    </div>
                  </td>

                  <!-- Q1 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.revenue_q1) }}
                      </span>
                    </div>
                  </td>

                  <!-- Q2 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.revenue_q2) }}
                      </span>
                    </div>
                  </td>

                  <!-- Q3 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.revenue_q3) }}
                      </span>
                    </div>
                  </td>

                  <!-- Q4 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.revenue_q4) }}
                      </span>
                    </div>
                  </td>

                  <!-- Total -->
                  <td class="w-32 px-6 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-lg font-semibold text-blue-600">
                        {{ formatCurrency(row.revenue_total) }}
                      </span>
                      <span class="text-xs text-gray-500 block mt-1">ZAR</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Export Revenue Section -->
        <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
          <!-- Section Header -->
          <div
            class="bg-green-50 border-b border-green-100 px-6 py-4 rounded-t-lg"
          >
            <div class="flex items-center">
              <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <h3 class="text-lg font-semibold text-green-800">
                Export Revenue
              </h3>
              <div class="ml-4 text-sm text-green-600">
                <i class="fas fa-globe mr-1"></i>
                International market revenue and ratios
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 table-fixed">
              <thead class="bg-green-500">
                <tr>
                  <th
                    class="w-32 px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Financial Year
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q1
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q2
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q3
                  </th>
                  <th
                    class="w-28 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Q4
                  </th>
                  <th
                    class="w-32 px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Total Export
                  </th>
                  <th
                    class="w-20 px-4 py-4 text-center text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Export Ratio
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  *ngFor="let row of revenueRows; let i = index"
                  class="hover:bg-green-50 transition-colors duration-200"
                >
                  <td class="w-32 px-6 py-5 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm font-medium text-gray-900">{{
                        row.financial_year_name
                      }}</span>
                      <span
                        class="text-xs text-gray-500 ml-2"
                        *ngIf="row.quarter_details"
                      >
                        ({{ getFinancialYearPeriod(row) }})
                      </span>
                    </div>
                  </td>

                  <!-- Export Q1 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.export_q1) }}
                      </span>
                    </div>
                  </td>

                  <!-- Export Q2 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.export_q2) }}
                      </span>
                    </div>
                  </td>

                  <!-- Export Q3 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.export_q3) }}
                      </span>
                    </div>
                  </td>

                  <!-- Export Q4 -->
                  <td class="w-28 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ formatCurrency(row.export_q4) }}
                      </span>
                    </div>
                  </td>

                  <!-- Export Total -->
                  <td class="w-32 px-6 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <span class="text-lg font-semibold text-green-600">
                        {{ formatCurrency(row.export_total) }}
                      </span>
                      <span class="text-xs text-gray-500 block mt-1">ZAR</span>
                    </div>
                  </td>

                  <!-- Export Ratio -->
                  <td class="w-20 px-4 py-5 whitespace-nowrap">
                    <div class="text-center">
                      <div
                        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200"
                      >
                        <i class="fas fa-percentage mr-1 text-xs"></i>
                        {{ row.export_ratio.toFixed(1) }}%
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="!loading && revenueRows.length === 0"
          class="text-center py-12"
        >
          <i class="fas fa-chart-line text-gray-400 text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No Revenue Data
          </h3>
          <p class="text-gray-600 mb-4">
            Revenue calculations are based on monthly financial data.<br />
            Add monthly financial entries to see quarterly revenue summaries.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RevenueComponent implements OnInit {
  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  revenueRows: RevenueDisplayRow[] = [];
  loading = false;

  // Chart Data Properties
  quarterlyTrendsChart: ILineChart = { labels: [], datasets: [] };
  yearlyComparisonChart: IBarChart = { labels: [], datasets: [] };
  keyMetrics: IKeyValue[] = [];

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
      this.clientId = queryParams?.['clientId']
        ? parseInt(queryParams['clientId'], 10)
        : 0;
      this.programId = queryParams?.['programId']
        ? parseInt(queryParams['programId'], 10)
        : 0;
      this.cohortId = queryParams?.['cohortId']
        ? parseInt(queryParams['cohortId'], 10)
        : 0;

      console.log('Revenue Component - IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId,
      });

      this.loadRevenueData();
    }
  }

  async loadRevenueData(): Promise<void> {
    this.loading = true;
    try {
      // Get quarterly revenue for all years - this is now live calculated from monthly data
      const quarterlyData = await this.financialService
        .getQuarterlyRevenueAllYears(this.companyId)
        .toPromise();

      // Map the API response to display rows
      this.revenueRows = (quarterlyData || []).map((data) => ({
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
        account_breakdown: data.account_breakdown,
      }));

      console.log(
        'Revenue Component - Live quarterly data loaded:',
        this.revenueRows
      );

      // Prepare chart data
      this.prepareChartData();
    } catch (error) {
      console.error('Error loading quarterly revenue data:', error);
      this.revenueRows = [];
    } finally {
      this.loading = false;
    }
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return 'R0';

    // For large numbers, show without decimals unless there are cents
    const hasDecimals = value % 1 !== 0;

    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatPercentage(value: number | null): string {
    if (value === null || value === undefined) return '0%';
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
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

  private prepareChartData(): void {
    if (!this.revenueRows || this.revenueRows.length === 0) return;

    // 1. Quarterly Trends Line Chart (Q1-Q4 across all years)
    this.quarterlyTrendsChart = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: this.revenueRows.map((row, index) => ({
        label: row.financial_year_name,
        data: [row.revenue_q1, row.revenue_q2, row.revenue_q3, row.revenue_q4],
        borderColor: this.getYearColor(index, 'border'),
        backgroundColor: this.getYearColor(index, 'background'),
        borderWidth: 3,
        fill: false,
        tension: 0.4,
      })),
    };

    // 2. Yearly Comparison Bar Chart (Total Revenue by Year)
    this.yearlyComparisonChart = {
      labels: this.revenueRows.map((row) => row.financial_year_name),
      datasets: [
        {
          label: 'Domestic Revenue',
          data: this.revenueRows.map((row) => row.revenue_total),
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        },
        {
          label: 'Export Revenue',
          data: this.revenueRows.map((row) => row.export_total),
          backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
        },
      ],
    };

    // 4. Key Metrics Cards - Calculate totals and create three main revenue metrics
    const totalRevenue = this.revenueRows.reduce(
      (sum, row) => sum + row.revenue_total + row.export_total,
      0
    );
    const totalDomestic = this.revenueRows.reduce(
      (sum, row) => sum + row.revenue_total,
      0
    );
    const totalExport = this.revenueRows.reduce(
      (sum, row) => sum + row.export_total,
      0
    );

    this.keyMetrics = [
      {
        key: 'Total Revenue',
        value: this.formatCurrency(totalRevenue),
        subtitle: 'All financial years',
        icon: 'fas fa-chart-line',
        color: 'text-blue-600',
      },
      {
        key: 'Domestic Revenue',
        value: this.formatCurrency(totalDomestic),
        subtitle: 'Local market total',
        icon: 'fas fa-home',
        color: 'text-blue-600',
      },
      {
        key: 'Export Revenue',
        value: this.formatCurrency(totalExport),
        subtitle: 'International market total',
        icon: 'fas fa-globe',
        color: 'text-green-600',
      },
    ];
  }

  private getYearColor(index: number, type: 'border' | 'background'): string {
    const colors = [
      {
        border: 'rgba(59, 130, 246, 1)',
        background: 'rgba(59, 130, 246, 0.2)',
      }, // Blue
      { border: 'rgba(34, 197, 94, 1)', background: 'rgba(34, 197, 94, 0.2)' }, // Green
      {
        border: 'rgba(168, 85, 247, 1)',
        background: 'rgba(168, 85, 247, 0.2)',
      }, // Purple
      {
        border: 'rgba(245, 158, 11, 1)',
        background: 'rgba(245, 158, 11, 0.2)',
      }, // Amber
      { border: 'rgba(239, 68, 68, 1)', background: 'rgba(239, 68, 68, 0.2)' }, // Red
    ];

    const colorIndex = index % colors.length;
    return colors[colorIndex][type];
  }
}
