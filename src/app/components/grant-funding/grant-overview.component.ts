import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-grant-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div class="flex items-center mb-6">
        <i class="fas fa-chart-pie text-green-600 text-2xl mr-3"></i>
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Grant Funding Overview</h2>
          <p class="text-gray-600 mt-1">Summary of all grant funding activity for this company.</p>
        </div>
      </div>

      <!-- Placeholder content -->
      <div class="flex flex-col items-center justify-center py-16 text-gray-400">
        <i class="fas fa-hand-holding-usd text-6xl mb-4 text-green-200"></i>
        <p class="text-lg font-medium text-gray-500">Grant Funding Overview</p>
        <p class="text-sm text-gray-400 mt-1">Grant funding details will be displayed here.</p>
      </div>
    </div>
  `,
})
export class GrantOverviewComponent {}
