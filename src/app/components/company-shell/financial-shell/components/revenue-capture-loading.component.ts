import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-capture-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div class="flex justify-center items-center space-x-2">
        <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
        <span class="text-gray-600">{{ message }}</span>
      </div>
    </div>
  `
})
export class RevenueCaptureLoadingComponent {
  @Input() message = 'Loading financial data...';
}
