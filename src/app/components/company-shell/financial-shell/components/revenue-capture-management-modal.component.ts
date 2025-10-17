import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-capture-management-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-800">
            Management Modal
          </h3>
          <button
            type="button"
            (click)="onClose()"
            class="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <i class="fas fa-times w-5 h-5"></i>
          </button>
        </div>

        <p class="text-gray-600 mb-4">
          This will be replaced with the full FinancialManagementModalComponent.
        </p>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            (click)="onClose()"
            class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <i class="fas fa-times mr-2"></i>
            Close
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <i class="fas fa-save mr-2"></i>
            Save
          </button>
        </div>
      </div>
    </div>
  `
})
export class RevenueCaptureManagementModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
