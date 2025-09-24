import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { MetricsTabComponent } from '../metrics-tab/metrics-tab.component';
import { FinancialTabComponent } from '../financial-tab/financial-tab.component';
import { MetricGroupTabMeta } from '../tabs-navigation/tabs-navigation.component';

// Internal sub-tab ids
export type FinancialDashboardInnerTab =
  | 'bank-statements'
  | 'all-metrics'
  | `group-${number}`;

@Component({
  selector: 'app-financial-dashboard-tab',
  standalone: true,
  imports: [CommonModule, MetricsTabComponent, FinancialTabComponent],
  template: `
    <div class="space-y-6">
      <!-- Enhanced Tab Navigation -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center gap-1 p-1">
          <button
            (click)="setInner('bank-statements')"
            class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 border"
            [class]="getTabClasses(innerTab === 'bank-statements')"
          >
            🏦 Bank Statements
          </button>

          <!-- All Metrics Tab (optional) -->
          <button
            *ngIf="showAllMetricsTab"
            (click)="setInner('all-metrics')"
            class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 border"
            [class]="getTabClasses(innerTab === 'all-metrics')"
          >
            📊 All Metrics
          </button>

          <!-- Dynamic Group Tabs -->
          <ng-container *ngFor="let g of metricGroups">
            <button
              (click)="setInner(groupInnerId(g.id))"
              class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 border"
              [class]="getTabClasses(innerTab === groupInnerId(g.id))"
              [title]="g.code || g.name"
            >
              {{ g.name }}
            </button>
          </ng-container>
        </div>
      </div>

      <!-- Bank Statements (old financial tab) -->
      <app-financial-tab
        *ngIf="innerTab === 'bank-statements'"
        [company]="company"
      ></app-financial-tab>

      <!-- All metrics aggregate -->
      <app-metrics-tab
        *ngIf="innerTab === 'all-metrics'"
        [company]="company"
        [clientId]="clientId"
        [programId]="programId"
        [cohortId]="cohortId"
      ></app-metrics-tab>

      <!-- Filtered metric group -->
      <app-metrics-tab
        *ngIf="isGroupInner(innerTab)"
        [company]="company"
        [clientId]="clientId"
        [programId]="programId"
        [cohortId]="cohortId"
        [filterGroupId]="extractGroupId(innerTab)"
      ></app-metrics-tab>
    </div>
  `,
})
export class FinancialDashboardTabComponent {
  @Input() company!: ICompany;
  @Input() clientId: number = 1;
  @Input() programId: number = 0;
  @Input() cohortId: number = 0;
  @Input() metricGroups: MetricGroupTabMeta[] = [];
  @Input() showAllMetricsTab: boolean = false; // Optional "All Metrics" tab

  innerTab: FinancialDashboardInnerTab = 'bank-statements';

  setInner(tab: FinancialDashboardInnerTab) {
    this.innerTab = tab;
  }

  groupInnerId(id: number): FinancialDashboardInnerTab {
    return `group-${id}` as FinancialDashboardInnerTab;
  }

  isGroupInner(tab: FinancialDashboardInnerTab): boolean {
    return tab.startsWith('group-');
  }

  extractGroupId(tab: FinancialDashboardInnerTab): number | null {
    if (!this.isGroupInner(tab)) return null;
    return parseInt(tab.split('group-')[1], 10) || null;
  }

  /**
   * Get CSS classes for tab styling based on active state
   */
  getTabClasses(isActive: boolean): string {
    const baseClasses = 'border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50';
    const activeClasses = 'border-blue-500 text-blue-600 bg-blue-50 shadow-sm';

    return isActive ? activeClasses : baseClasses;
  }
}
