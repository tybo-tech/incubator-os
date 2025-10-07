import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { ICompanyFinancials } from '../../../../../services/company-financials.service';

interface QuarterlySummary {
  year: number;
  quarter: number;
  quarter_label: string;
  total_turnover: number;
  month_count: number;
  avg_monthly_turnover: number;
  months: string[];
}

interface YearlySummary {
  year: number;
  total_turnover: number;
  quarter_count: number;
  month_count: number;
  avg_quarterly_turnover: number;
  avg_monthly_turnover: number;
  quarters: QuarterlySummary[];
}

@Component({
  selector: 'app-bank-statement-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <i class="fas fa-chart-bar text-blue-600 text-xl mr-3"></i>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Financial Summary</h3>
            <p class="text-sm text-gray-600">Quarterly and yearly turnover overview</p>
          </div>
        </div>

        <!-- Total Summary -->
        <div class="text-right">
          <div class="text-2xl font-bold text-blue-600">{{ formatCurrency(grandTotal) }}</div>
          <div class="text-sm text-gray-500">Total Turnover</div>
        </div>
      </div>

      <!-- No Data State -->
      <div *ngIf="yearlySummaries.length === 0" class="text-center py-8">
        <i class="fas fa-chart-line text-gray-300 text-3xl mb-3"></i>
        <p class="text-gray-500">No financial data available</p>
      </div>

      <!-- Yearly Summaries -->
      <div *ngIf="yearlySummaries.length > 0" class="space-y-4">
        <div *ngFor="let yearSummary of yearlySummaries"
             class="bg-white rounded-lg border border-gray-200 p-4">

          <!-- Year Header -->
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <i class="fas fa-calendar-alt text-indigo-500 mr-3"></i>
              <div>
                <h4 class="text-lg font-semibold text-gray-900">{{ yearSummary.year }}</h4>
                <p class="text-sm text-gray-500">{{ yearSummary.month_count }} months of data</p>
              </div>
            </div>

            <div class="text-right">
              <div class="text-xl font-bold text-indigo-600">{{ formatCurrency(yearSummary.total_turnover) }}</div>
              <div class="text-sm text-gray-500">Avg: {{ formatCurrency(yearSummary.avg_monthly_turnover) }}/month</div>
            </div>
          </div>

          <!-- Quarterly Breakdown -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div *ngFor="let quarter of yearSummary.quarters"
                 class="bg-gray-50 rounded-lg p-3 border border-gray-100">

              <!-- Quarter Header -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center">
                  <div class="w-3 h-3 rounded-full mr-2"
                       [class]="getQuarterColor(quarter.quarter)"></div>
                  <span class="font-medium text-gray-900">{{ quarter.quarter_label }}</span>
                </div>
                <span class="text-xs text-gray-500">{{ quarter.month_count }}m</span>
              </div>

              <!-- Quarter Stats -->
              <div class="space-y-1">
                <div class="text-lg font-bold text-gray-900">
                  {{ formatCurrency(quarter.total_turnover) }}
                </div>
                <div class="text-sm text-gray-500">
                  Avg: {{ formatCurrency(quarter.avg_monthly_turnover) }}/mo
                </div>
                <div class="text-xs text-gray-400">
                  {{ quarter.months.join(', ') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Growth Indicator (if we have previous year data) -->
          <div *ngIf="getYearGrowth(yearSummary.year) !== null"
               class="mt-3 pt-3 border-t border-gray-100">
            <div class="flex items-center justify-center">
              <div class="flex items-center text-sm"
                   [class]="getYearGrowth(yearSummary.year)! >= 0 ? 'text-green-600' : 'text-red-600'">
                <i [class]="getYearGrowth(yearSummary.year)! >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
                   class="mr-1"></i>
                <span class="font-medium">
                  {{ Math.abs(getYearGrowth(yearSummary.year)!).toFixed(1) }}%
                </span>
                <span class="ml-1">vs previous year</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div *ngIf="yearlySummaries.length > 0"
           class="mt-6 pt-4 border-t border-blue-200">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div class="text-lg font-bold text-gray-900">{{ totalYears }}</div>
            <div class="text-sm text-gray-500">Years</div>
          </div>
          <div>
            <div class="text-lg font-bold text-gray-900">{{ totalMonths }}</div>
            <div class="text-sm text-gray-500">Months</div>
          </div>
          <div>
            <div class="text-lg font-bold text-gray-900">{{ formatCurrency(averageMonthlyTurnover) }}</div>
            <div class="text-sm text-gray-500">Avg/Month</div>
          </div>
          <div>
            <div class="text-lg font-bold text-gray-900">{{ bestQuarter.quarter_label }} {{ bestQuarter.year }}</div>
            <div class="text-sm text-gray-500">Best Quarter</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BankStatementSummaryComponent implements OnInit, OnChanges {
  @Input() company: ICompany | null = null;
  @Input() financials: ICompanyFinancials[] = [];
  @Input() selectedYear: string | number = 'all';

  yearlySummaries: YearlySummary[] = [];
  grandTotal = 0;
  totalYears = 0;
  totalMonths = 0;
  averageMonthlyTurnover = 0;
  bestQuarter: QuarterlySummary = { year: 0, quarter: 1, quarter_label: 'Q1', total_turnover: 0, month_count: 0, avg_monthly_turnover: 0, months: [] };

  ngOnInit() {
    this.calculateSummaries();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['financials'] || changes['selectedYear']) {
      this.calculateSummaries();
    }
  }

  calculateSummaries() {
    if (!this.financials || this.financials.length === 0) {
      this.resetSummaries();
      return;
    }

    // Filter data based on selected year
    let filteredData = this.financials;
    if (this.selectedYear !== 'all') {
      filteredData = this.financials.filter(f => f.year === Number(this.selectedYear));
    }

    // Group by year and quarter
    const yearQuarterMap = new Map<string, ICompanyFinancials[]>();

    filteredData.forEach(record => {
      const key = `${record.year}-${record.quarter}`;
      if (!yearQuarterMap.has(key)) {
        yearQuarterMap.set(key, []);
      }
      yearQuarterMap.get(key)!.push(record);
    });

    // Build quarterly summaries
    const quarterSummaries: QuarterlySummary[] = [];
    yearQuarterMap.forEach((records, key) => {
      const [year, quarter] = key.split('-').map(Number);
      const turnoverSum = records.reduce((sum, r) => sum + (Number(r.turnover) || 0), 0);
      const months = records.map(r => this.getMonthName(r.month)).sort();

      quarterSummaries.push({
        year,
        quarter,
        quarter_label: `Q${quarter}`,
        total_turnover: turnoverSum,
        month_count: records.length,
        avg_monthly_turnover: turnoverSum / records.length,
        months
      });
    });

    // Group quarters by year
    const yearMap = new Map<number, QuarterlySummary[]>();
    quarterSummaries.forEach(q => {
      if (!yearMap.has(q.year)) {
        yearMap.set(q.year, []);
      }
      yearMap.get(q.year)!.push(q);
    });

    // Build yearly summaries
    this.yearlySummaries = Array.from(yearMap.entries()).map(([year, quarters]) => {
      const totalTurnover = quarters.reduce((sum, q) => sum + q.total_turnover, 0);
      const totalMonths = quarters.reduce((sum, q) => sum + q.month_count, 0);

      return {
        year,
        total_turnover: totalTurnover,
        quarter_count: quarters.length,
        month_count: totalMonths,
        avg_quarterly_turnover: totalTurnover / quarters.length,
        avg_monthly_turnover: totalTurnover / totalMonths,
        quarters: quarters.sort((a, b) => a.quarter - b.quarter)
      };
    }).sort((a, b) => b.year - a.year); // Sort by year descending

    // Calculate aggregate stats
    this.grandTotal = this.yearlySummaries.reduce((sum, y) => sum + y.total_turnover, 0);
    this.totalYears = this.yearlySummaries.length;
    this.totalMonths = this.yearlySummaries.reduce((sum, y) => sum + y.month_count, 0);
    this.averageMonthlyTurnover = this.totalMonths > 0 ? this.grandTotal / this.totalMonths : 0;

    // Find best quarter
    const allQuarters = this.yearlySummaries.flatMap(y => y.quarters);
    this.bestQuarter = allQuarters.reduce((best, current) =>
      current.total_turnover > best.total_turnover ? current : best,
      allQuarters[0] || this.bestQuarter
    );
  }

  resetSummaries() {
    this.yearlySummaries = [];
    this.grandTotal = 0;
    this.totalYears = 0;
    this.totalMonths = 0;
    this.averageMonthlyTurnover = 0;
    this.bestQuarter = { year: 0, quarter: 1, quarter_label: 'Q1', total_turnover: 0, month_count: 0, avg_monthly_turnover: 0, months: [] };
  }

  getQuarterColor(quarter: number): string {
    const colors = {
      1: 'bg-green-400',   // Q1 - Green
      2: 'bg-blue-400',    // Q2 - Blue
      3: 'bg-yellow-400',  // Q3 - Yellow
      4: 'bg-red-400'      // Q4 - Red
    };
    return colors[quarter as keyof typeof colors] || 'bg-gray-400';
  }

  getYearGrowth(year: number): number | null {
    const currentYear = this.yearlySummaries.find(y => y.year === year);
    const previousYear = this.yearlySummaries.find(y => y.year === year - 1);

    if (!currentYear || !previousYear || previousYear.total_turnover === 0) {
      return null;
    }

    return ((currentYear.total_turnover - previousYear.total_turnover) / previousYear.total_turnover) * 100;
  }

  getMonthName(month: number): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[month - 1] || 'Unknown';
  }

  formatCurrency(value: number): string {
    if (isNaN(value) || value === 0) return 'R0';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  // Expose Math for template
  Math = Math;
}
