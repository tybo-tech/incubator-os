import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../models/schema';
import { Company } from '../../../../../models/business.models';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Financial Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Estimated Turnover</div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatCurrency(company.data.turnover_estimated || 0) }}
            </div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Actual Turnover</div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatCurrency(company.data.turnover_actual || 0) }}
            </div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Raw Turnover Data</div>
            <div class="text-sm text-gray-900">
              {{ company.data.company_turnover_raw || 'N/A' }}
            </div>
          </div>
        </div>

        <!-- Bank Statements Section -->
        <div class="mt-8">
          <h4 class="text-md font-medium text-gray-900 mb-4">Bank Statements</h4>
          <div class="bg-gray-50 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <p class="text-gray-600">Bank statement integration coming soon</p>
            <p class="text-sm text-gray-500 mt-1">We'll display quarterly financial data here</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinancialTabComponent {
  @Input() company!: INode<Company>;

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
