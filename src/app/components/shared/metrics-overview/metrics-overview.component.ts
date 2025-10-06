import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MetricCard {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
  bgColor: string;
  textColor: string;
}

@Component({
  selector: 'app-metrics-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      <div
        *ngFor="let metric of metrics"
        class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-500 mb-1">{{ metric.title }}</p>
            <p class="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{{ metric.value }}</p>
            <p
              *ngIf="metric.change"
              [class]="getChangeClasses(metric.changeType)">
              {{ metric.change }}
            </p>
          </div>
          <div [class]="'p-3 rounded-lg ' + metric.bgColor">
            <svg class="w-6 h-6 lg:w-8 lg:h-8" [class]="metric.textColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="metric.icon"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MetricsOverviewComponent {
  @Input() metrics: MetricCard[] = [];

  getChangeClasses(changeType?: string): string {
    switch (changeType) {
      case 'positive':
        return 'text-sm text-green-600 font-medium';
      case 'negative':
        return 'text-sm text-red-600 font-medium';
      case 'neutral':
        return 'text-sm text-gray-600 font-medium';
      default:
        return 'text-sm text-gray-600';
    }
  }
}
