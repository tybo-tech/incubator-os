import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Dashboard Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Financial Dashboard</h3>
        <div class="flex items-center space-x-3">
          <select class="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option>Last 12 Months</option>
            <option>Current Year</option>
            <option>Previous Year</option>
          </select>
        </div>
      </div>

      <!-- Quick Financial Health -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-600 font-medium">Financial Health</p>
              <p class="text-2xl font-bold text-green-700">85%</p>
            </div>
            <div class="p-2 bg-green-200 rounded-lg">
              <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-600 font-medium">Liquidity Ratio</p>
              <p class="text-2xl font-bold text-blue-700">4.2</p>
            </div>
            <div class="p-2 bg-blue-200 rounded-lg">
              <svg class="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-purple-600 font-medium">ROE</p>
              <p class="text-2xl font-bold text-purple-700">22.5%</p>
            </div>
            <div class="p-2 bg-purple-200 rounded-lg">
              <svg class="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-yellow-600 font-medium">Burn Rate</p>
              <p class="text-2xl font-bold text-yellow-700">R 95K</p>
            </div>
            <div class="p-2 bg-yellow-200 rounded-lg">
              <svg class="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Revenue Trend Chart -->
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <h4 class="text-md font-semibold text-gray-900 mb-4">Revenue Trend</h4>
          <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div class="text-center">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              <p class="text-gray-500">Revenue Chart Placeholder</p>
              <p class="text-sm text-gray-400">Chart integration ready</p>
            </div>
          </div>
        </div>

        <!-- Expense Breakdown -->
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <h4 class="text-md font-semibold text-gray-900 mb-4">Expense Breakdown</h4>
          <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div class="text-center">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
              </svg>
              <p class="text-gray-500">Pie Chart Placeholder</p>
              <p class="text-sm text-gray-400">Chart integration ready</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="bg-white p-6 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-md font-semibold text-gray-900">Recent Transactions</h4>
          <button class="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2025-10-05</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Client Payment - ABC Corp</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Revenue
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">+R 125,000</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2025-10-04</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Office Rent</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Expense
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-R 15,000</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2025-10-03</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Software Licenses</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Operating
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-R 8,500</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class FinancialDashboardComponent implements OnInit {
  companyId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get company ID from route hierarchy
    this.route.parent?.parent?.params.subscribe(params => {
      this.companyId = params['id'];
    });
  }
}
