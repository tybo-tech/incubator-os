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
      <div class="flex items-center gap-4 border-b">
        <button
          (click)="setInner('bank-statements')"
          class="py-2 px-3 text-sm border-b-2"
          [class.border-blue-600]="innerTab === 'bank-statements'"
          [class.text-blue-600]="innerTab === 'bank-statements'"
        >
          🏦 Bank Statements
        </button>
        <!-- <button
        (click)="setInner('all-metrics')"
        class="py-2 px-3 text-sm border-b-2"
        [class.border-blue-600]="innerTab === 'all-metrics'"
        [class.text-blue-600]="innerTab === 'all-metrics'"
      >⭐ All Metrics</button> -->
        <ng-container *ngFor="let g of metricGroups">
          <button
            (click)="setInner(groupInnerId(g.id))"
            class="py-2 px-3 text-sm border-b-2"
            [class.border-blue-600]="innerTab === groupInnerId(g.id)"
            [class.text-blue-600]="innerTab === groupInnerId(g.id)"
            [title]="g.code || g.name"
          >
            {{ g.name }}
          </button>
        </ng-container>
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
}
