import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface LatestMetrics {
  turnover: number;
  netProfitMargin: number;
  cashPosition: number;
  workingCapitalRatio: number;
  period: string;
  growthIndicators: {
    turnoverGrowth: number;
    marginImprovement: number;
    cashGrowth: number;
  };
}

@Component({
  selector: 'app-financial-checkin-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="latestMetrics" class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6">
      <div class="flex justify-between items-center mb-3">
        <h4 class="font-medium text-gray-900 flex items-center">
          <i class="fas fa-chart-pie mr-2"></i>
          Latest Metrics ({{ latestMetrics.period }})
        </h4>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Monthly Turnover -->
        <div class="bg-white rounded-lg p-3 border">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-600">Monthly Turnover</span>
            <i class="fas fa-money-bill-wave text-green-500"></i>
          </div>
          <div class="text-lg font-semibold text-gray-900">
            R {{ latestMetrics.turnover | number : '1.0-0' }}
          </div>
          <div
            class="text-xs flex items-center mt-1"
            [class]="latestMetrics.growthIndicators.turnoverGrowth >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            <i
              [class]="latestMetrics.growthIndicators.turnoverGrowth >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
              class="mr-1"
            ></i>
            {{ latestMetrics.growthIndicators.turnoverGrowth | number : '1.0-0' }}%
          </div>
        </div>

        <!-- Net Profit Margin -->
        <div class="bg-white rounded-lg p-3 border">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-600">Net Profit Margin</span>
            <i class="fas fa-percentage text-blue-500"></i>
          </div>
          <div
            class="text-lg font-semibold"
            [class]="latestMetrics.netProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            {{ latestMetrics.netProfitMargin | number : '1.1-1' }}%
          </div>
          <div
            class="text-xs flex items-center mt-1"
            [class]="latestMetrics.growthIndicators.marginImprovement >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            <i
              [class]="latestMetrics.growthIndicators.marginImprovement >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
              class="mr-1"
            ></i>
            {{ latestMetrics.growthIndicators.marginImprovement | number : '1.1-1' }}pp
          </div>
        </div>

        <!-- Cash Position -->
        <div class="bg-white rounded-lg p-3 border">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-600">Cash Position</span>
            <i class="fas fa-university text-purple-500"></i>
          </div>
          <div class="text-lg font-semibold text-gray-900">
            R {{ latestMetrics.cashPosition | number : '1.0-0' }}
          </div>
          <div
            class="text-xs flex items-center mt-1"
            [class]="latestMetrics.growthIndicators.cashGrowth >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            <i
              [class]="latestMetrics.growthIndicators.cashGrowth >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
              class="mr-1"
            ></i>
            {{ latestMetrics.growthIndicators.cashGrowth | number : '1.0-0' }}%
          </div>
        </div>

        <!-- Working Capital -->
        <div class="bg-white rounded-lg p-3 border">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-600">Working Capital</span>
            <i class="fas fa-balance-scale text-orange-500"></i>
          </div>
          <div class="text-lg font-semibold flex items-center">
            <span [class]="getWorkingCapitalClass(latestMetrics.workingCapitalRatio)">
              {{ latestMetrics.workingCapitalRatio | number : '1.2-2' }}
            </span>
            <i class="ml-2" [class]="getWorkingCapitalIcon(latestMetrics.workingCapitalRatio)"></i>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ getWorkingCapitalStatus(latestMetrics.workingCapitalRatio) }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinancialCheckinMetricsComponent {
  @Input() latestMetrics: LatestMetrics | null = null;

  getWorkingCapitalClass(ratio: number): string {
    if (ratio >= 1.5) return 'text-green-600';
    if (ratio >= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  }

  getWorkingCapitalIcon(ratio: number): string {
    if (ratio >= 1.5) return 'fas fa-check-circle text-green-600';
    if (ratio >= 1.0) return 'fas fa-exclamation-triangle text-yellow-600';
    return 'fas fa-times-circle text-red-600';
  }

  getWorkingCapitalStatus(ratio: number): string {
    if (ratio >= 1.5) return 'Healthy';
    if (ratio >= 1.0) return 'Adequate';
    return 'Low';
  }
}
