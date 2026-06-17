import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  GrantScmVerification,
  ScmQuotation
} from './scm-verification.models';
import { ScmVerificationService } from './scm-verification.service';

@Component({
  selector: 'app-scm-verification-status-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Quotations Status Table -->
    <div class="border rounded-xl p-4 mb-6 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="text-left px-3 py-2 font-medium text-gray-700">Supplier</th>
              <th class="text-left px-3 py-2 font-medium text-gray-700">Current Step</th>
              <th class="text-left px-3 py-2 font-medium text-gray-700">Status</th>
              <th class="text-left px-3 py-2 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of scmVerification().quotations.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
              <td class="px-3 py-2 font-medium text-gray-900">
                {{ item.supplier_name || 'Unnamed Supplier' }}
              </td>
              <td class="px-3 py-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ getStepName(getQuotationStep(item)) }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                  {{ getQuotationStep(item) === 1 ? 'bg-green-100 text-green-800' : 
                     getQuotationStep(item) === 2 ? 'bg-yellow-100 text-yellow-800' : 
                     getQuotationStep(item) === 3 ? 'bg-orange-100 text-orange-800' : 
                     'bg-purple-100 text-purple-800' }}">
                  {{ getQuotationStep(item) === 1 ? 'Collected' : 
                     getQuotationStep(item) === 2 ? 'In Progress' : 
                     getQuotationStep(item) === 3 ? 'Pending' : 
                     'Pending' }}
                </span>
              </td>
              <td class="px-3 py-2">
                <button
                  (click)="onProcessQuotation.emit(i)"
                  class="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                  Process
                </button>
              </td>
            </tr>
            <tr *ngIf="scmVerification().quotations.items.length === 0">
              <td colspan="4" class="px-3 py-4 text-center text-gray-400 text-sm">
                <i class="fas fa-file-alt text-lg mb-1 block"></i>
                <p>No quotations added yet. Click "Add Quotation" to get started.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ScmVerificationStatusTableComponent {
  scmVerification = input.required<GrantScmVerification>();
  
  onProcessQuotation = output<number>();

  constructor(private scmVerificationService: ScmVerificationService) {}

  getQuotationStep(quotation: ScmQuotation): number {
    return this.scmVerificationService.getQuotationStep(quotation);
  }

  getStepName(step: number): string {
    return this.scmVerificationService.getStepName(step);
  }
}