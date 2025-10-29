import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cost-kpi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- KPIs Grid -->
    <div class="grid md:grid-cols-4 gap-4 mb-6">
      <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div class="text-xs text-gray-500">Revenue</div>
        <div class="text-xl font-semibold" [class.text-gray-400]="isLoading">
          <span *ngIf="!isLoading">R {{ totalRevenue | number:'1.0-0' }}</span>
          <span *ngIf="isLoading">Loading...</span>
        </div>
        <div class="text-xs text-green-600 mt-1" *ngIf="!isLoading">*From database</div>
      </div>

      <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div class="text-xs text-gray-500">Direct Costs (COGS)</div>
        <div class="text-xl font-semibold">R {{ directCosts | number:'1.0-0' }}</div>
      </div>

      <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div class="text-xs text-gray-500">Operating Expenses</div>
        <div class="text-xl font-semibold">R {{ operationalCosts | number:'1.0-0' }}</div>
      </div>

      <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div class="text-xs text-gray-500">Net Profit (Rev - COGS - OPEX)</div>
        <div class="text-xl font-semibold"
             [class.text-emerald-600]="netProfit >= 0"
             [class.text-rose-600]="netProfit < 0">
             R {{ netProfit | number:'1.0-0' }}
        </div>
      </div>
    </div>

    <!-- Grand Totals Summary -->
    <div class="mt-8 p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
      <div class="flex flex-wrap items-center gap-6">
        <div class="text-lg font-semibold flex items-center gap-2">
          <i class="fa-solid fa-sack-dollar"></i> Grand Totals
        </div>
        <div class="text-gray-700">Direct: <span class="font-semibold">R {{ directCosts | number:'1.0-0' }}</span></div>
        <div class="text-gray-700">Operational: <span class="font-semibold">R {{ operationalCosts | number:'1.0-0' }}</span></div>
        <div class="ms-auto text-gray-900 font-semibold">
          Net: <span [class.text-emerald-600]="netProfit >= 0" [class.text-rose-600]="netProfit < 0">
            R {{ netProfit | number:'1.0-0' }}
          </span>
        </div>
      </div>
    </div>
  `
})
export class CostKpiComponent {
  @Input() totalRevenue = 0;
  @Input() directCosts = 0;
  @Input() operationalCosts = 0;
  @Input() isLoading = false;

  get netProfit(): number {
    return this.totalRevenue - this.directCosts - this.operationalCosts;
  }
}
