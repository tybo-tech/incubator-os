import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScmQuotation } from './scm-verification.models';

@Component({
  selector: 'app-scm-step-processing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h4 class="font-medium text-gray-900 mb-3 text-sm">Processing Verified Quotations (Generate PO)</h4>
      <div *ngIf="quotation().purchase_order_processing">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Purchase Order Generated</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().purchase_order_processing!.purchase_order_generated"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Generated</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Emailed to Supplier Date</label>
            <input
              type="date"
              [(ngModel)]="quotation().purchase_order_processing!.emailed_to_supplier_date"
              class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Tax Invoice Received</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().purchase_order_processing!.tax_invoice_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">BBBEE Certificate Received</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().purchase_order_processing!.bbbee_certificate_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Bank Confirmation Received</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().purchase_order_processing!.bank_confirmation_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Tax Clearance Certificate</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().purchase_order_processing!.tax_clearance_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Approved</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().purchase_order_processing!.approved"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Approved</label>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Comments/Next Steps</label>
          <textarea
            [(ngModel)]="quotation().purchase_order_processing!.comments"
            placeholder="Enter comments or next steps"
            class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            rows="2"></textarea>
        </div>
      </div>
    </div>
  `
})
export class ScmStepProcessingComponent {
  quotation = model.required<ScmQuotation>();
}