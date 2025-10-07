import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ratios',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center mb-4">
        <i class="fas fa-calculator text-red-600 text-2xl mr-3"></i>
        <h2 class="text-xl font-bold text-gray-900">Ratios</h2>
      </div>
      <p class="text-gray-600">Financial ratios and performance metrics</p>
      <div class="mt-6 text-center text-gray-500">
        <i class="fas fa-cogs text-4xl mb-2"></i>
        <p>Component ready for implementation</p>
      </div>
    </div>
  `
})
export class RatiosComponent {}
