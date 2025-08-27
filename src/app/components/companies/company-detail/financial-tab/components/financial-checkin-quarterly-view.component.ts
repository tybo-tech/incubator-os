import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompanyFinancials } from '../../../../../../services/company-financials.service';

interface QuarterlyMetrics {
  quarter: string;
  turnover: number;
  grossProfit: number;
  netProfit: number;
  averageMargin: number;
  checkInsCount: number;
  hasData: boolean;
}

@Component({
  selector: 'app-financial-checkin-quarterly-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-6">
      <!-- Header with Primary Source Indicator -->
      <div class="flex justify-between items-center mb-4">
        <div>
          <h4 class="text-md font-medium text-gray-900 flex items-center">
            <i class="fas fa-chart-bar mr-2"></i>
            Quarterly Business Performance
          </h4>
          <p class="text-sm text-blue-600 mt-1">
            <i class="fas fa-shield-alt mr-1"></i>
            Based on advisor-verified Financial Check-ins
          </p>
        </div>
        <div class="text-xs text-gray-500">
          {{ currentYear }} • {{ getTotalCheckIns() }} check-ins recorded
        </div>
      </div>

      <!-- Quarterly Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div *ngFor="let quarterData of quarterlyMetrics"
             class="rounded-lg p-4 border-2 transition-all"
             [class]="getQuarterCardClass(quarterData)">

          <!-- Quarter Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <i class="fas fa-calendar-quarter text-blue-600 mr-2"></i>
              <h6 class="font-medium text-gray-900">{{ quarterData.quarter }}</h6>
            </div>
            <div class="text-xs text-gray-500">
              {{ quarterData.checkInsCount }} check-in{{ quarterData.checkInsCount !== 1 ? 's' : '' }}
            </div>
          </div>

          <!-- Metrics Display -->
          <div *ngIf="quarterData.hasData; else noData" class="space-y-2">
            <!-- Monthly Turnover -->
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 flex items-center">
                <i class="fas fa-money-bill-wave text-green-500 mr-1"></i>
                Turnover:
              </span>
              <span class="font-semibold text-green-600">
                {{ formatCurrency(quarterData.turnover) }}
              </span>
            </div>

            <!-- Gross Profit -->
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 flex items-center">
                <i class="fas fa-chart-line text-blue-500 mr-1"></i>
                Gross Profit:
              </span>
              <span class="font-semibold text-blue-600">
                {{ formatCurrency(quarterData.grossProfit) }}
              </span>
            </div>

            <!-- Net Profit -->
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 flex items-center">
                <i class="fas fa-piggy-bank text-purple-500 mr-1"></i>
                Net Profit:
              </span>
              <span class="font-semibold"
                   [class]="quarterData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(quarterData.netProfit) }}
              </span>
            </div>

            <!-- Average Margin -->
            <div class="flex justify-between items-center border-t pt-2">
              <span class="text-sm text-gray-600 flex items-center">
                <i class="fas fa-percentage text-orange-500 mr-1"></i>
                Avg Margin:
              </span>
              <span class="font-semibold"
                   [class]="quarterData.averageMargin >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ quarterData.averageMargin | number:'1.1-1' }}%
              </span>
            </div>
          </div>

          <!-- No Data Template -->
          <ng-template #noData>
            <div class="text-center py-4">
              <i class="fas fa-chart-line text-gray-300 text-2xl mb-2"></i>
              <p class="text-sm text-gray-500">No check-ins recorded</p>
              <p class="text-xs text-gray-400">Add financial check-ins to see metrics</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Summary Insights -->
      <div *ngIf="hasAnyData()" class="mt-4 bg-blue-50 rounded-lg p-4">
        <h5 class="font-medium text-blue-900 mb-2 flex items-center">
          <i class="fas fa-lightbulb mr-2"></i>
          Business Insights
        </h5>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="flex items-center">
            <i class="fas fa-trophy text-yellow-500 mr-2"></i>
            <span class="text-blue-800">
              <strong>Best Quarter:</strong> {{ getBestQuarter() }}
            </span>
          </div>
          <div class="flex items-center">
            <i class="fas fa-chart-line text-green-500 mr-2"></i>
            <span class="text-blue-800">
              <strong>Total Revenue:</strong> {{ formatCurrency(getTotalRevenue()) }}
            </span>
          </div>
          <div class="flex items-center">
            <i class="fas fa-percentage text-blue-500 mr-2"></i>
            <span class="text-blue-800">
              <strong>Avg Margin:</strong> {{ getOverallMargin() | number:'1.1-1' }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinancialCheckinQuarterlyViewComponent {
  @Input() checkIns: ICompanyFinancials[] = [];

  currentYear = new Date().getFullYear();
  quarterlyMetrics: QuarterlyMetrics[] = [];

  ngOnInit() {
    this.calculateQuarterlyMetrics();
  }

  ngOnChanges() {
    this.calculateQuarterlyMetrics();
  }

  private calculateQuarterlyMetrics() {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    this.quarterlyMetrics = quarters.map(quarter => {
      const quarterCheckIns = this.getQuarterCheckIns(quarter);

      if (quarterCheckIns.length === 0) {
        return {
          quarter,
          turnover: 0,
          grossProfit: 0,
          netProfit: 0,
          averageMargin: 0,
          checkInsCount: 0,
          hasData: false
        };
      }

      // Calculate quarter totals
      // For turnover, we're using turnover field instead of monthly avg
      const turnover = quarterCheckIns.reduce((sum, ci) => {
        const val = ci.turnover;
        // Handle string numbers from database
        const numVal = typeof val === 'string' ? parseFloat(val) : (val || 0);
        return sum + (isNaN(numVal) ? 0 : numVal);
      }, 0);

      const grossProfit = quarterCheckIns.reduce((sum, ci) => {
        const val = ci.gross_profit;
        const numVal = typeof val === 'string' ? parseFloat(val) : (val || 0);
        return sum + (isNaN(numVal) ? 0 : numVal);
      }, 0);

      const netProfit = quarterCheckIns.reduce((sum, ci) => {
        const val = ci.net_profit;
        const numVal = typeof val === 'string' ? parseFloat(val) : (val || 0);
        return sum + (isNaN(numVal) ? 0 : numVal);
      }, 0);

      // Calculate margin only from records that have both turnover and net profit
      const marginsCount = quarterCheckIns.filter(ci =>
        ci.turnover_monthly_avg != null && ci.np_margin != null &&
        !isNaN(parseFloat(ci.turnover_monthly_avg.toString())) &&
        !isNaN(parseFloat(ci.np_margin.toString()))
      ).length;

      // Calculate average margin from records that have both turnover and margin
      const averageMargin = quarterCheckIns.reduce((sum, ci) => {
        if (!ci.turnover || !ci.np_margin) return sum;
        const margin = typeof ci.np_margin === 'string' ? parseFloat(ci.np_margin) : ci.np_margin;
        return isNaN(margin) ? sum : sum + margin;
      }, 0) / (quarterCheckIns.length || 1); // Avoid division by zero

      return {
        quarter,
        turnover,
        grossProfit,
        netProfit,
        averageMargin,
        checkInsCount: quarterCheckIns.length,
        hasData: true
      };
    });
  }

  private getQuarterCheckIns(quarter: string): ICompanyFinancials[] {
    return this.checkIns.filter(checkIn => {
      // Match by quarter field or derive from month
      if (checkIn.quarter_label === quarter) {
        return true;
      }

      // Derive quarter from month if no quarter specified
      const month = typeof checkIn.month === 'string' ?
        parseInt(checkIn.month, 10) : (checkIn.month || 0);

      switch (quarter) {
        case 'Q1': return month >= 1 && month <= 3;
        case 'Q2': return month >= 4 && month <= 6;
        case 'Q3': return month >= 7 && month <= 9;
        case 'Q4': return month >= 10 && month <= 12;
        default: return false;
      }
    });
  }

  formatCurrency(amount: number): string {
    // Handle potential NaN values
    const safeAmount = isNaN(amount) ? 0 : amount;

    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  }

  getQuarterCardClass(quarterData: QuarterlyMetrics): string {
    if (!quarterData.hasData) {
      return 'bg-gray-50 border-gray-200';
    }

    // Highlight quarters with good performance
    if (quarterData.averageMargin > 20) {
      return 'bg-green-50 border-green-200';
    } else if (quarterData.averageMargin > 10) {
      return 'bg-blue-50 border-blue-200';
    } else if (quarterData.averageMargin < 0) {
      return 'bg-red-50 border-red-200';
    }

    return 'bg-gray-50 border-gray-200';
  }

  getTotalCheckIns(): number {
    return this.checkIns.length;
  }

  hasAnyData(): boolean {
    return this.quarterlyMetrics.some(q => q.hasData);
  }

  getBestQuarter(): string {
    const validQuarters = this.quarterlyMetrics.filter(q =>
      q.hasData && !isNaN(q.turnover) && q.turnover > 0
    );

    if (validQuarters.length === 0) return 'None';

    const bestQuarter = validQuarters.reduce((best, current) =>
      (current.turnover || 0) > (best.turnover || 0) ? current : best
    );

    return bestQuarter.quarter;
  }

  getTotalRevenue(): number {
    const total = this.quarterlyMetrics
      .filter(q => q.hasData && !isNaN(q.turnover))
      .reduce((sum, q) => sum + (q.turnover || 0), 0);
    return isNaN(total) ? 0 : total;
  }

  getOverallMargin(): number {
    const validQuarters = this.quarterlyMetrics.filter(q =>
      q.hasData && !isNaN(q.averageMargin) && q.averageMargin !== null
    );

    if (validQuarters.length === 0) return 0;

    const total = validQuarters.reduce((sum, q) => sum + (q.averageMargin || 0), 0);
    return isNaN(total) ? 0 : total / validQuarters.length;
  }
}
