import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-company-financials',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Financial Overview</h2>
          <p class="text-gray-600">Comprehensive financial metrics and performance indicators</p>
        </div>

        <!-- Financial Metrics Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500">Total Revenue</p>
                <p class="text-3xl font-bold text-gray-900">R 2.4M</p>
                <p class="text-sm text-green-600">+12.5% from last year</p>
              </div>
              <div class="p-3 bg-blue-100 rounded-lg">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500">Gross Profit</p>
                <p class="text-3xl font-bold text-gray-900">R 1.8M</p>
                <p class="text-sm text-green-600">+8.2% from last year</p>
              </div>
              <div class="p-3 bg-green-100 rounded-lg">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500">Net Profit</p>
                <p class="text-3xl font-bold text-gray-900">R 450K</p>
                <p class="text-sm text-red-600">-2.1% from last year</p>
              </div>
              <div class="p-3 bg-yellow-100 rounded-lg">
                <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Tabs -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <!-- Tab Navigation -->
          <div class="border-b border-gray-200">
            <nav class="flex space-x-8 px-6">
              <button
                *ngFor="let tab of financialTabs"
                (click)="activeFinancialTab = tab.id"
                [class]="getFinancialTabClasses(tab.id)"
                class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap">
                {{ tab.label }}
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div class="p-6">
            <!-- Profit & Loss Tab -->
            <div *ngIf="activeFinancialTab === 'pnl'">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Year</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Year</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Revenue</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R 2,400,000</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R 2,133,333</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">+12.5%</td>
                    </tr>
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Cost of Sales</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R 600,000</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R 533,333</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">+12.5%</td>
                    </tr>
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Gross Profit</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R 1,800,000</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R 1,600,000</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">+12.5%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Balance Sheet Tab -->
            <div *ngIf="activeFinancialTab === 'balance'">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Balance Sheet</h3>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 class="text-md font-medium text-gray-900 mb-3">Assets</h4>
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Current Assets</span>
                      <span class="text-sm font-medium text-gray-900">R 1,200,000</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Fixed Assets</span>
                      <span class="text-sm font-medium text-gray-900">R 800,000</span>
                    </div>
                    <div class="flex justify-between border-t pt-3">
                      <span class="text-sm font-medium text-gray-900">Total Assets</span>
                      <span class="text-sm font-bold text-gray-900">R 2,000,000</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 class="text-md font-medium text-gray-900 mb-3">Liabilities & Equity</h4>
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Current Liabilities</span>
                      <span class="text-sm font-medium text-gray-900">R 300,000</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Long-term Debt</span>
                      <span class="text-sm font-medium text-gray-900">R 500,000</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Equity</span>
                      <span class="text-sm font-medium text-gray-900">R 1,200,000</span>
                    </div>
                    <div class="flex justify-between border-t pt-3">
                      <span class="text-sm font-medium text-gray-900">Total Liab. & Equity</span>
                      <span class="text-sm font-bold text-gray-900">R 2,000,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ratios Tab -->
            <div *ngIf="activeFinancialTab === 'ratios'">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Financial Ratios</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Liquidity Ratios</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Current Ratio</span>
                      <span class="text-sm font-medium text-gray-900">4.0</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Quick Ratio</span>
                      <span class="text-sm font-medium text-gray-900">3.2</span>
                    </div>
                  </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Profitability Ratios</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Gross Margin</span>
                      <span class="text-sm font-medium text-gray-900">75%</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Net Margin</span>
                      <span class="text-sm font-medium text-gray-900">18.8%</span>
                    </div>
                  </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Efficiency Ratios</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">ROA</span>
                      <span class="text-sm font-medium text-gray-900">22.5%</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">ROE</span>
                      <span class="text-sm font-medium text-gray-900">37.5%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompanyFinancialsComponent implements OnInit {
  companyId: string | null = null;
  activeFinancialTab = 'pnl';

  financialTabs = [
    { id: 'pnl', label: 'Profit & Loss' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'ratios', label: 'Financial Ratios' }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
    });
  }

  getFinancialTabClasses(tabId: string): string {
    return this.activeFinancialTab === tabId
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
  }
}
