import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-growth-area-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-2xl shadow-lg border border-green-100 my-6 transition-all duration-300 hover:shadow-xl">
      <!-- Header with Add Growth Area Button -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-md transform hover:scale-105 transition-transform">
            <i class="fas fa-chart-line text-white text-xl"></i>
          </div>
          <h3 class="text-2xl font-bold text-gray-800">Growth Areas & SWOT Analysis</h3>
        </div>
        <button
          (click)="addGrowthArea.emit()"
          class="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-md transition-all duration-300 flex items-center space-x-2 group">
          <i class="fas fa-plus text-white text-sm group-hover:rotate-90 transition-transform"></i>
          <span>Add Growth Area</span>
        </button>
      </div>

      <!-- Empty State -->
      <div *ngIf="showEmptyState" class="text-center py-12 animate-fade-in">
        <div class="p-4 bg-green-100 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4 shadow-inner">
          <i class="fas fa-chart-line text-green-500 text-3xl"></i>
        </div>
        <h4 class="text-lg font-semibold text-gray-700 mb-2">No Growth Areas Yet</h4>
        <p class="text-gray-600 mb-6 max-w-md mx-auto">Start your SWOT analysis by identifying strengths, weaknesses, opportunities, and threats to drive your growth strategy.</p>
        <button
          (click)="addGrowthArea.emit()"
          class="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5">
          Create First Growth Area
        </button>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class GrowthAreaHeaderComponent {
  @Input() showEmptyState: boolean = false;
  @Output() addGrowthArea = new EventEmitter<void>();
}
