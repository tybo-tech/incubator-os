import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// Live Profit Calculation System
import {
  ProfitCalculationService,
  ProfitSummary,
  QuarterlyProfit,
} from '../../../../../services/profit-calculation.service';
import { ToastService } from '../../../../services/toast.service';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';

// Chart Components
import { LineChartComponent } from '../../../../charts/line-chart/line-chart.component';
import { BarChartComponent } from '../../../../charts/bar-chart/bar-chart.component';
import { DoughnutComponent } from '../../../../charts/doughnut/doughnut.component';

// Chart Data Interfaces
import {
  ILineChart,
  IBarChart,
  IDoughnutChart,
} from '../../../../../models/Charts';
import { IKeyValue } from '../../../../../models/IKeyValue';

// Display row interface for UI binding
interface ProfitDisplayRow {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;

  // Revenue Data
  revenue_total: number;

  // Cost Data
  direct_costs: number;
  operational_costs: number;
  total_costs: number;

  // Profit Metrics
  gross_profit: number;
  operating_profit: number;
  gross_margin: number;
  operating_margin: number;

  // Quarter Details
  quarter_details?: {
    q1_months: string[];
    q2_months: string[];
    q3_months: string[];
    q4_months: string[];
  };
}

@Component({
  selector: 'app-profits',
  standalone: true,
  imports: [CommonModule, FormsModule, LineChartComponent, BarChartComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <i class="fas fa-chart-line text-yellow-600 text-2xl mr-3"></i>
          <h2 class="text-xl font-bold text-gray-900">Profit Analysis</h2>
          <div class="ml-4 text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            Live calculations from monthly financial data
          </div>
        </div>
        
        <!-- Financial Year Selector -->
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-600">Financial Year:</label>
          <select 
            class="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none text-sm"
            [(ngModel)]="selectedYearId" 
            (ngModelChange)="onYearChange()">
            <option *ngFor="let y of financialYears" [ngValue]="y.id">{{ y.name }}</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
        ></div>
      </div>

      <!-- Charts and Analytics Section -->
      <div *ngIf="!loading && profitRows.length > 0" class="space-y-8 mb-12">
        <!-- Key Metrics Cards -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center mb-6">
            <i class="fas fa-tachometer-alt text-purple-600 text-xl mr-3"></i>
            <h3 class="text-lg font-semibold text-gray-900">
              Key Profit Metrics
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
          <!-- Profit Trends Line Chart -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <app-line-chart
              [componentTitle]="'Profit Trends Over Time'"
              [data]="profitTrendsChart"
            >
            </app-line-chart>
          </div>

          <!-- Profit Comparison Bar Chart -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <app-bar-chart
              [componentTitle]="'Revenue vs Costs vs Profits'"
              [data]="profitComparisonChart"
            >
            </app-bar-chart>
          </div>
        </div>

        <!-- Margin Distribution -->
        <!-- <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="max-w-md mx-auto">
            <app-doughnut
              [componentTitle]="'Margin Distribution (Latest Year)'"
              [data]="marginDistributionChart">
            </app-doughnut>
          </div>
        </div> -->
      </div>

      <!-- Profit Data Table -->
      <div *ngIf="!loading && profitRows.length > 0" class="space-y-6">
        <!-- Profit Analysis Table -->
        <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
          <!-- Section Header -->
          <div
            class="bg-yellow-50 border-b border-yellow-100 px-6 py-4 rounded-t-lg"
          >
            <div class="flex items-center">
              <div class="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
              <h3 class="text-lg font-semibold text-yellow-800">
                Profit Analysis Summary
              </h3>
              <div class="ml-4 text-sm text-yellow-600">
                <i class="fas fa-coins mr-1"></i>
                Live profit calculations by financial year
              </div>
            </div>
          </div>

          <!-- Profit Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-yellow-500">
                <tr>
                  <th
                    class="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Financial Year
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Revenue
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Direct Costs
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Gross Profit
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Operational Costs
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Operating Profit
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Gross Margin
                  </th>
                  <th
                    class="px-4 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider"
                  >
                    Operating Margin
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  *ngFor="let row of profitRows; let i = index"
                  class="hover:bg-yellow-50 transition-colors duration-200"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col">
                      <span class="text-sm font-medium text-gray-900">{{
                        row.financial_year_name
                      }}</span>
                      <span
                        class="text-xs text-gray-500"
                        *ngIf="row.quarter_details"
                      >
                        {{ getFinancialYearPeriod(row) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span class="text-sm font-medium text-gray-900">
                      {{ formatCurrency(row.revenue_total) }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span class="text-sm font-medium text-red-600">
                      {{ formatCurrency(row.direct_costs) }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-medium"
                      [ngClass]="
                        row.gross_profit >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      "
                    >
                      {{ formatCurrency(row.gross_profit) }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span class="text-sm font-medium text-red-600">
                      {{ formatCurrency(row.operational_costs) }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-medium"
                      [ngClass]="
                        row.operating_profit >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      "
                    >
                      {{ formatCurrency(row.operating_profit) }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-medium"
                      [ngClass]="
                        row.gross_margin >= 0
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      "
                    >
                      {{ (row.gross_margin || 0).toFixed(1) }}%
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-medium"
                      [ngClass]="
                        row.operating_margin >= 0
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      "
                    >
                      {{ (row.operating_margin || 0).toFixed(1) }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!loading && profitRows.length === 0"
        class="text-center py-12"
      >
        <i class="fas fa-coins text-yellow-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          No Profit Data Available
        </h3>
        <p class="text-gray-600 mb-4">
          Profit calculations require both revenue and cost data.<br />
          Add financial years with revenue and expense entries to see profit
          analysis.
        </p>
      </div>
    </div>
  `,
})
export class ProfitsComponent implements OnInit {
  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;
  profitRows: ProfitDisplayRow[] = [];
  loading = false;

  // Financial Year Selection
  financialYears: FinancialYear[] = [];
  selectedYearId!: number;

  // Chart Data Properties
  profitTrendsChart: ILineChart = { labels: [], datasets: [] };
  profitComparisonChart: IBarChart = { labels: [], datasets: [] };
  marginDistributionChart: IDoughnutChart = { labels: [], datasets: [] };
  keyMetrics: IKeyValue[] = [];

  constructor(
    private route: ActivatedRoute,
    private profitCalculationService: ProfitCalculationService,
    private toastService: ToastService,
    private financialYearService: FinancialYearService
  ) {}

    async ngOnInit(): Promise<void> {
    // Get companyId from route params (two levels up: /company/:id/financial/revenue)
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    // Get query parameters
    const queryParams = this.route.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);
      this.clientId = queryParams && queryParams['clientId']
        ? parseInt(queryParams['clientId'], 10)
        : 0;
      this.programId = queryParams && queryParams['programId']
        ? parseInt(queryParams['programId'], 10)
        : 0;
      this.cohortId = queryParams && queryParams['cohortId']
        ? parseInt(queryParams['cohortId'], 10)
        : 0;

      console.log('Profits Component - IDs:', {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId,
      });

      // Load financial years first
      await this.loadFinancialYears();
      
      // Load profit data
      this.loadProfitData();
    }
  }

  async loadFinancialYears(): Promise<void> {
    try {
      this.financialYears = await firstValueFrom(
        this.financialYearService.getAllFinancialYears()
      );
      
      if (this.financialYears.length > 0) {
        // Default to the most recent financial year (first in list)
        this.selectedYearId = this.financialYears[0].id;
      }
      
      console.log('Financial Years loaded:', this.financialYears);
    } catch (error) {
      console.error('Error loading financial years:', error);
      this.toastService.show('Failed to load financial years', 'error');
    }
  }

  onYearChange(): void {
    console.log('Financial year changed to:', this.selectedYearId);
    // TODO: Load detailed quarterly profit data for selected year
    // This will be implemented in the next step
  }

  async loadProfitData(): Promise<void> {
    this.loading = true;
    try {
      console.log('Loading profit data for company:', this.companyId);

      // Load profit summary data for all years using our live calculation service
      const profitSummaryData = await firstValueFrom(
        this.profitCalculationService.getProfitSummaryAllYears(this.companyId)
      );

      console.log('Profit API Response:', profitSummaryData);

      if (
        profitSummaryData &&
        Array.isArray(profitSummaryData) &&
        profitSummaryData.length > 0
      ) {
        // Transform the profit summary data to display rows
        this.profitRows = profitSummaryData.map((profit: any) => ({
          financial_year_id: profit.financial_year_id,
          financial_year_name: profit.financial_year_name,
          fy_start_year: profit.fy_start_year,
          fy_end_year: profit.fy_end_year,
          revenue_total: profit.revenue_total || 0,
          direct_costs: profit.direct_costs || 0,
          operational_costs: profit.operational_costs || 0,
          total_costs: profit.total_costs || 0,
          gross_profit: profit.gross_profit || profit.profit_total || 0,
          operating_profit: profit.operating_profit || profit.profit_total || 0,
          gross_margin: profit.gross_margin || profit.profit_margin_total || 0,
          operating_margin: profit.operating_margin || profit.profit_margin_total || 0,
          quarter_details: profit.quarter_details,
        }));

        console.log(
          'Profits Component - Live profit data loaded:',
          this.profitRows
        );

        // Show success message
        this.toastService.success(
          `Loaded profit data for ${this.profitRows.length} financial year(s)`
        );
      } else {
        console.warn('No profit data received:', profitSummaryData);
        this.profitRows = [];
        this.toastService.warning('No profit data available for this company');
      }

      // Prepare chart data
      this.prepareChartData();
    } catch (error) {
      console.error('Error loading profit data:', error);
      this.profitRows = [];
      this.toastService.error(
        'Failed to load profit data. Please check the backend connection.'
      );
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

  getFinancialYearPeriod(row: ProfitDisplayRow): string {
    if (row.quarter_details) {
      const q1Months = row.quarter_details.q1_months.join('-');
      const q4Months = row.quarter_details.q4_months.join('-');
      return `${q1Months} to ${q4Months}`;
    }
    return `${row.fy_start_year}-${row.fy_end_year}`;
  }

  private prepareChartData(): void {
    if (!this.profitRows || this.profitRows.length === 0) return;

    // 1. Profit Trends Line Chart (Gross vs Operating Profit across years)
    this.profitTrendsChart = {
      labels: this.profitRows.map(
        (row) => `FY${row.fy_start_year}-${row.fy_end_year}`
      ),
      datasets: [
        {
          label: 'Gross Profit',
          data: this.profitRows.map((row) => row.gross_profit),
          borderColor: 'rgba(251, 191, 36, 1)', // Yellow-400
          backgroundColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Operating Profit',
          data: this.profitRows.map((row) => row.operating_profit),
          borderColor: 'rgba(217, 119, 6, 1)', // Yellow-600
          backgroundColor: 'rgba(217, 119, 6, 0.3)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
        },
      ],
    };

    // 2. Profit Comparison Bar Chart (Revenue vs Costs vs Profits)
    this.profitComparisonChart = {
      labels: this.profitRows.map((row) => row.financial_year_name),
      datasets: [
        {
          label: 'Revenue',
          data: this.profitRows.map((row) => row.revenue_total),
          backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
        },
        {
          label: 'Direct Costs',
          data: this.profitRows.map((row) => row.direct_costs),
          backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
        },
        {
          label: 'Operational Costs',
          data: this.profitRows.map((row) => row.operational_costs),
          backgroundColor: 'rgba(245, 158, 11, 0.8)', // Amber
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 2,
        },
        {
          label: 'Operating Profit',
          data: this.profitRows.map((row) => row.operating_profit),
          backgroundColor: 'rgba(217, 119, 6, 0.8)', // Yellow-600
          borderColor: 'rgba(217, 119, 6, 1)',
          borderWidth: 2,
        },
      ],
    };

    // 3. Margin Distribution Doughnut Chart (Latest Year)
    const latestYear = this.profitRows[0]; // Assuming sorted by latest first
    if (latestYear) {
      const directCostPct =
        (latestYear.direct_costs / latestYear.revenue_total) * 100;
      const operationalCostPct =
        (latestYear.operational_costs / latestYear.revenue_total) * 100;
      const grossProfitPct =
        (latestYear.gross_profit / latestYear.revenue_total) * 100;

      this.marginDistributionChart = {
        labels: ['Direct Costs', 'Operational Costs', 'Gross Profit'],
        datasets: [
          {
            data: [directCostPct, operationalCostPct, grossProfitPct],
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)', // Red for Direct Costs
              'rgba(245, 158, 11, 0.8)', // Amber for Operational Costs
              'rgba(34, 197, 94, 0.8)', // Green for Gross Profit
            ],
            borderColor: [
              'rgba(239, 68, 68, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(34, 197, 94, 1)',
            ],
            borderWidth: 2,
          },
        ],
      };
    }

    // 4. Key Metrics Cards - Calculate totals and create three main profit metrics
    const totalOperatingProfit = this.profitRows.reduce(
      (sum, row) => sum + row.operating_profit,
      0
    );
    const totalGrossProfit = this.profitRows.reduce(
      (sum, row) => sum + row.gross_profit,
      0
    );
    const avgOperatingMargin =
      this.profitRows.reduce((sum, row) => sum + row.operating_margin, 0) /
      this.profitRows.length;

    this.keyMetrics = [
      {
        key: 'Total Operating Profit',
        value: this.formatCurrency(totalOperatingProfit),
        subtitle: 'All financial years',
        icon: 'fas fa-coins',
        color: totalOperatingProfit >= 0 ? 'text-yellow-600' : 'text-red-600',
      },
      {
        key: 'Total Gross Profit',
        value: this.formatCurrency(totalGrossProfit),
        subtitle: 'Revenue minus direct costs',
        icon: 'fas fa-chart-line',
        color: totalGrossProfit >= 0 ? 'text-yellow-600' : 'text-red-600',
      },
      {
        key: 'Average Operating Margin',
        value: `${avgOperatingMargin.toFixed(1)}%`,
        subtitle: 'Profitability efficiency',
        icon: 'fas fa-percentage',
        color: avgOperatingMargin >= 0 ? 'text-yellow-600' : 'text-red-600',
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
