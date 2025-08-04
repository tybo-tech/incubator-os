import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-checkin-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-gray-600">Loading check-ins...</p>
    </div>

    <!-- Error State -->
    <div *ngIf="error" class="text-center py-8">
      <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
      <p class="text-red-600 mb-3">{{ error }}</p>
      <button
        (click)="onRetryClick()"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
      >
        <i class="fas fa-redo mr-2"></i>
        Retry
      </button>
    </div>
  `,
  styles: [
    `
      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class FinancialCheckinLoadingComponent {
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  @Output() retryClick = new EventEmitter<void>();

  onRetryClick() {
    this.retryClick.emit();
  }
}
