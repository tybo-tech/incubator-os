import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-capture-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
      <i class="fas fa-chart-bar text-gray-400 text-5xl mb-4"></i>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No financial data captured yet
      </h3>
      <p class="text-gray-500 mb-4">
        Start by adding a financial year from the dropdown above, then begin
        capturing your monthly revenue data.
      </p>
      <div class="text-sm text-gray-400">
        <span class="inline-flex items-center gap-1">
          <i class="fas fa-info-circle"></i>
          Only financial years with captured data are displayed
        </span>
      </div>
    </div>
  `
})
export class RevenueCaptureEmptyStateComponent {}
