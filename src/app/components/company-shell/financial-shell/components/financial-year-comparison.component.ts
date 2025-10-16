import { Component, Input, signal, computed, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineChartComponent } from '../../../../charts/line-chart/line-chart.component';
import { BarChartComponent } from '../../../../charts/bar-chart/bar-chart.component';
import { YearGroup } from '../models/revenue-capture.interface';
import { FinancialComparisonService } from '../services/financial-comparison.service';
import { ILineChart, IBarChart } from '../../../../../models/Charts';

@Component({
  selector: 'app-financial-year-comparison',
  standalone: true,
  imports: [CommonModule, LineChartComponent, BarChartComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Financial Years Comparison
          </h3>
          <p class="text-gray-600 text-sm mt-1">Compare revenue trends across multiple financial years</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="toggleChartType()"
            [attr.aria-label]="currentChartType() === 'line' ? 'Switch to totals view' : 'Switch to trends view'"
            class="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" *ngIf="currentChartType() === 'line'">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" *ngIf="currentChartType() === 'bar'">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
            </svg>
            {{ currentChartType() === 'line' ? 'Show Totals' : 'Show Trends' }}
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4" *ngIf="comparisonSummary()">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div class="text-sm text-blue-600 font-medium">Years Compared</div>
          <div class="text-2xl font-semibold text-blue-800 mt-1">{{ comparisonSummary()!.totalYears }}</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <div class="text-sm text-green-600 font-medium">Total Revenue</div>
          <div class="text-2xl font-semibold text-green-800 mt-1">R{{ formatNumber(comparisonSummary()!.totalRevenue) }}</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div class="text-sm text-purple-600 font-medium">Best Year</div>
          <div class="text-lg font-semibold text-purple-800 mt-1" *ngIf="comparisonSummary()!.bestYear">
            {{ comparisonSummary()!.bestYear!.name }}
          </div>
          <div class="text-sm text-purple-600">R{{ formatNumber(comparisonSummary()!.bestYear?.total || 0) }}</div>
        </div>
        <div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div class="text-sm text-amber-600 font-medium">Avg Monthly</div>
          <div class="text-2xl font-semibold text-amber-800 mt-1">R{{ formatNumber(comparisonSummary()!.averageMonthlyRevenue) }}</div>
        </div>
      </div>

      <!-- Chart Display -->
      <div class="bg-gray-50 rounded-lg p-6" *ngIf="hasData()">
        <div class="relative" *ngIf="currentChartType() === 'line'">
          <div class="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
            Monthly Trends
          </div>
          <app-line-chart
            [componentTitle]="'Monthly Revenue Trends Comparison'"
            [data]="monthlyTrendsChart()">
          </app-line-chart>
        </div>
        <div class="relative" *ngIf="currentChartType() === 'bar'">
          <div class="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
            Annual Totals
          </div>
          <app-bar-chart
            [componentTitle]="'Annual Revenue Totals Comparison'"
            [data]="annualTotalsChart()">
          </app-bar-chart>
        </div>

        <!-- Chart Loading State -->
        <div *ngIf="isLoadingCharts()" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600 text-sm">Generating charts...</span>
        </div>
      </div>      <!-- Growth Rates Table -->
      <div class="bg-gray-50 rounded-lg p-4" *ngIf="comparisonSummary()?.growthRates && comparisonSummary()!.growthRates.length > 1">
        <h4 class="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
          Year-over-Year Growth Rates
        </h4>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-600">
                <th class="pb-2 font-medium">Financial Year</th>
                <th class="pb-2 font-medium text-right">Growth Rate</th>
                <th class="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody class="space-y-2">
              <tr *ngFor="let growth of comparisonSummary()!.growthRates" class="border-t border-gray-200">
                <td class="py-2 font-medium text-gray-800">{{ growth.yearName }}</td>
                <td class="py-2 text-right font-semibold"
                    [class.text-green-600]="growth.growthRate > 0"
                    [class.text-red-600]="growth.growthRate < 0"
                    [class.text-gray-600]="growth.growthRate === 0">
                  {{ growth.growthRate === 0 ? 'Baseline' : (growth.growthRate > 0 ? '+' : '') + growth.growthRate.toFixed(1) + '%' }}
                </td>
                <td class="py-2 text-right">
                  <span *ngIf="growth.growthRate > 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
                    </svg>
                    Growth
                  </span>
                  <span *ngIf="growth.growthRate < 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path>
                    </svg>
                    Decline
                  </span>
                  <span *ngIf="growth.growthRate === 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Base
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- No Data State -->
      <div *ngIf="!hasData()" class="text-center py-12">
        <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No comparison data available</h3>
        <p class="text-gray-500">Add multiple financial years with revenue data to see comparisons.</p>
      </div>
    </div>
  `
})
export class FinancialYearComparisonComponent implements OnInit, OnChanges, OnDestroy {
  @Input() years: YearGroup[] = [];

  // Chart state
  readonly currentChartType = signal<'line' | 'bar'>('line');
  readonly monthlyTrendsChart = signal<ILineChart>({ labels: [], datasets: [] });
  readonly annualTotalsChart = signal<IBarChart>({ labels: [], datasets: [] });
  readonly comparisonSummary = signal<ReturnType<typeof this.comparisonService.getComparisonSummary> | null>(null);
  readonly isLoadingCharts = signal<boolean>(false);

  // Computed properties
  readonly hasData = computed(() => this.years && this.years.length > 1);

  constructor(private comparisonService: FinancialComparisonService) {}

  ngOnInit(): void {
    this.updateCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['years']) {
      this.updateCharts();
    }
  }

  ngOnDestroy(): void {
    // Clean up any resources if needed
    this.resetCharts();
  }

  /**
   * Toggle between line chart (trends) and bar chart (totals)
   */
  toggleChartType(): void {
    this.currentChartType.update(type => type === 'line' ? 'bar' : 'line');
  }

  /**
   * Update all chart data when years change
   */
  private updateCharts(): void {
    if (!this.years || this.years.length === 0) {
      this.resetCharts();
      return;
    }

    this.isLoadingCharts.set(true);

    try {
      // Use setTimeout to prevent blocking the UI during chart generation
      setTimeout(() => {
        try {
          // Generate monthly trends comparison
          const monthlyChart = this.comparisonService.generateYearlyComparisonLineChart(this.years);
          this.monthlyTrendsChart.set(monthlyChart);

          // Generate annual totals comparison
          const annualChart = this.comparisonService.generateYearlyTotalsBarChart(this.years);
          this.annualTotalsChart.set(annualChart);

          // Generate summary statistics
          const summary = this.comparisonService.getComparisonSummary(this.years);
          this.comparisonSummary.set(summary);

          console.log('📊 Financial comparison charts updated:', {
            years: this.years.length,
            monthlyDatasets: monthlyChart.datasets.length,
            annualDatasets: annualChart.datasets.length,
            summary
          });

          this.isLoadingCharts.set(false);
        } catch (error) {
          console.error('Failed to generate comparison charts:', error);
          this.resetCharts();
          this.isLoadingCharts.set(false);
        }
      }, 0);
    } catch (error) {
      console.error('Failed to initialize chart generation:', error);
      this.resetCharts();
      this.isLoadingCharts.set(false);
    }
  }

  /**
   * Reset all charts to empty state
   */
  private resetCharts(): void {
    this.monthlyTrendsChart.set({ labels: [], datasets: [] });
    this.annualTotalsChart.set({ labels: [], datasets: [] });
    this.comparisonSummary.set(null);
    this.isLoadingCharts.set(false);
  }

  /**
   * Format numbers for display
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toLocaleString();
    }
  }
}
