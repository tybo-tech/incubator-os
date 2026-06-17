import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScmQuotation } from './scm-verification.models';

@Component({
  selector: 'app-scm-step-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h4 class="font-medium text-gray-900 mb-3 text-sm">Payment Processing</h4>
      <div *ngIf="quotation().payment_processing">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">VAT Invoice Received</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().payment_processing!.vat_invoice_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Bank Confirmation Received</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().payment_processing!.bank_confirmation_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Payment Authorization Signed</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().payment_processing!.payment_authorisation_signed"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Signed</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Payment Request Date</label>
            <input
              type="date"
              [(ngModel)]="quotation().payment_processing!.payment_request_date"
              class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Payment Done</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().payment_processing!.payment_done"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Completed</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Proof of Payment Sent</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().payment_processing!.proof_of_payment_sent"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Sent</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Delivery Note Received</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().payment_processing!.delivery_note_received"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Received</label>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Comments/Next Steps</label>
          <textarea
            [(ngModel)]="quotation().payment_processing!.comments"
            placeholder="Enter comments or next steps"
            class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            rows="2"></textarea>
        </div>
      </div>
    </div>
  `
})
export class ScmStepPaymentComponent {
  quotation = model.required<ScmQuotation>();
}