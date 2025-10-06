import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- P&L Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Profit & Loss Statement</h3>
        <div class="flex items-center space-x-3">
          <select class="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option>Current Year</option>
            <option>Previous Year</option>
            <option>YTD</option>
            <option>Custom Period</option>
          </select>
          <button class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Export
          </button>
        </div>
      </div>

      <!-- P&L Statement Table -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Year</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Year</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Change</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <!-- Revenue Section -->
              <tr class="bg-blue-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">REVENUE</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Sales Revenue</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 2,400,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 2,133,333</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">R 266,667</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+12.5%</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Service Revenue</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 300,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 250,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">R 50,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+20.0%</td>
              </tr>
              <tr class="border-t-2 border-gray-300">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 pl-8">Total Revenue</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">R 2,700,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">R 2,383,333</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">R 316,667</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">+13.3%</td>
              </tr>

              <!-- Cost of Sales Section -->
              <tr class="bg-red-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">COST OF SALES</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Materials</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 450,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 400,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">R 50,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">+12.5%</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Direct Labor</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 300,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 250,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">R 50,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">+20.0%</td>
              </tr>
              <tr class="border-t-2 border-gray-300">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 pl-8">Total Cost of Sales</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">R 750,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">R 650,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">R 100,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">+15.4%</td>
              </tr>

              <!-- Gross Profit -->
              <tr class="bg-green-50 border-t-4 border-green-200">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-800">GROSS PROFIT</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-800 text-right">R 1,950,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-800 text-right">R 1,733,333</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">R 216,667</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">+12.5%</td>
              </tr>

              <!-- Operating Expenses -->
              <tr class="bg-yellow-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">OPERATING EXPENSES</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"></td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Salaries & Wages</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 800,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 750,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">R 50,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">+6.7%</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Rent & Utilities</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 180,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 180,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">R 0</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">0.0%</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Marketing & Advertising</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 120,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 100,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">R 20,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">+20.0%</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8">Professional Services</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">R 85,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">R 75,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">R 10,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">+13.3%</td>
              </tr>
              <tr class="border-t-2 border-gray-300">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 pl-8">Total Operating Expenses</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">R 1,185,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">R 1,105,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">R 80,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">+7.2%</td>
              </tr>

              <!-- Operating Profit -->
              <tr class="bg-blue-50 border-t-4 border-blue-200">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-800">OPERATING PROFIT (EBITDA)</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-800 text-right">R 765,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-800 text-right">R 628,333</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">R 136,667</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">+21.8%</td>
              </tr>

              <!-- Net Profit -->
              <tr class="bg-green-100 border-t-4 border-green-400">
                <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-green-900">NET PROFIT</td>
                <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-green-900 text-right">R 450,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-green-900 text-right">R 375,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-green-600 text-right">R 75,000</td>
                <td class="px-6 py-4 whitespace-nowrap text-lg font-bold text-green-600 text-right">+20.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Key Ratios Summary -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <p class="text-sm text-gray-600">Gross Margin</p>
          <p class="text-xl font-bold text-gray-900">72.2%</p>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <p class="text-sm text-gray-600">Operating Margin</p>
          <p class="text-xl font-bold text-gray-900">28.3%</p>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <p class="text-sm text-gray-600">Net Margin</p>
          <p class="text-xl font-bold text-gray-900">16.7%</p>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <p class="text-sm text-gray-600">Revenue Growth</p>
          <p class="text-xl font-bold text-green-600">+13.3%</p>
        </div>
      </div>
    </div>
  `
})
export class ProfitLossComponent implements OnInit {
  companyId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get company ID from route hierarchy
    this.route.parent?.parent?.params.subscribe(params => {
      this.companyId = params['id'];
    });
  }
}
