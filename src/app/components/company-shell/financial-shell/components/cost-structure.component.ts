import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cost-structure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center mb-4">
        <i class="fas fa-chart-pie text-purple-600 text-2xl mr-3"></i>
        <h2 class="text-xl font-bold text-gray-900">Cost Structure</h2>
      </div>
      <p class="text-gray-600">Cost breakdown and structure analysis</p>
      <div class="mt-6 text-center text-gray-500">
        <i class="fas fa-cogs text-4xl mb-2"></i>
        <p>Component ready for implementation</p>
      </div>
    </div>
  `
})
export class CostStructureComponent {}
