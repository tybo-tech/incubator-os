import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scm-verification-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="px-6 py-5 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <i class="fas fa-file-contract text-blue-600 text-xl mr-3"></i>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              SCM Verification Process
            </h2>
          </div>
        </div>
        <button
          (click)="onAddQuotation.emit()"
          class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
          <i class="fas fa-plus mr-1"></i>
          Add Quotation
        </button>
      </div>
    </div>
  `
})
export class ScmVerificationHeaderComponent {
  onAddQuotation = output<void>();
}