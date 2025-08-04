import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-checkin-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold flex items-center">
            <i class="fas fa-chart-line mr-3"></i>
            Financial Check-ins
          </h3>
          <p class="text-blue-100 text-sm mt-1">
            <i class="fas fa-shield-alt mr-1"></i>
            Primary Source: Advisor-verified business metrics
          </p>
        </div>
        <div class="flex space-x-2">
          <button
            (click)="onViewTrendsClick()"
            class="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            <i class="fas fa-chart-bar mr-1"></i>
            View Trends
          </button>
          <button
            (click)="onNewCheckInClick()"
            class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            <i class="fas fa-plus mr-1"></i>
            New Check-in
          </button>
        </div>
      </div>
    </div>
  `
})
export class FinancialCheckinHeaderComponent {
  @Output() viewTrendsClick = new EventEmitter<void>();
  @Output() newCheckInClick = new EventEmitter<void>();

  onViewTrendsClick() {
    this.viewTrendsClick.emit();
  }

  onNewCheckInClick() {
    this.newCheckInClick.emit();
  }
}
