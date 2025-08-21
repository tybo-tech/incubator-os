import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../../models/simple.schema';

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <i class="fas fa-chart-line text-blue-600 mr-2"></i>
          <div class="text-sm text-gray-600">Estimated Turnover</div>
        </div>
        <div class="text-2xl font-bold text-gray-900">
          {{ formatCurrency(company.turnover_estimated || 0) }}
        </div>
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <i class="fas fa-chart-bar text-green-600 mr-2"></i>
          <div class="text-sm text-gray-600">Actual Turnover</div>
        </div>
        <div class="text-2xl font-bold text-gray-900">
          {{ formatCurrency(company.turnover_actual || 0) }}
        </div>
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <i class="fas fa-database text-purple-600 mr-2"></i>
          <div class="text-sm text-gray-600">Raw Turnover Data</div>
        </div>
        <div class="text-sm text-gray-900">
          {{ company.turnover_estimated |currency:'ZAR' }}
        </div>
      </div>
    </div>
  `
})
export class FinancialOverviewComponent {
  @Input() company!: ICompany;

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
