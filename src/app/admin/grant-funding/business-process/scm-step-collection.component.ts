import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScmQuotation } from './scm-verification.models';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';

@Component({
  selector: 'app-scm-step-collection',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePadLibComponent],
  template: `
    <div>
      <h4 class="font-medium text-gray-900 mb-3 text-sm">Collection of Quotations</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Supplier Name</label>
          <input
            type="text"
            [(ngModel)]="quotation().supplier_name"
            placeholder="Enter supplier name"
            class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Date Received</label>
          <input
            type="date"
            [(ngModel)]="quotation().date_received"
            class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-700 mb-1">Comments</label>
          <textarea
            [(ngModel)]="quotation().comments"
            placeholder="Add comments"
            class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            rows="2"></textarea>
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-700 mb-1">Beneficiary Signature</label>
          <app-signature-pad-lib
            [(ngModel)]="quotation().beneficiary_signature"
            [width]="250"
            [height]="100">
          </app-signature-pad-lib>
        </div>
      </div>
    </div>
  `
})
export class ScmStepCollectionComponent {
  quotation = model.required<ScmQuotation>();
}