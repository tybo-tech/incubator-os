import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  GrantScmVerification,
  ScmQuotation
} from './scm-verification.models';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';
import { ScmVerificationService } from './scm-verification.service';

@Component({
  selector: 'app-scm-verification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePadLibComponent],
  template: `
    <div *ngIf="show()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-900">
            {{ currentQuotation() ? currentQuotation()!.supplier_name : '' }} - 
            {{ getStepName(currentStep()) }}
          </h3>
          <button (click)="onClose.emit()" class="text-gray-400 hover:text-gray-500">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-5">
          <!-- Step 1: Collection of Quotations -->
          <div *ngIf="currentStep() === 1 && currentQuotation()">
            <h4 class="font-medium text-gray-900 mb-3 text-sm">Collection of Quotations</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Supplier Name</label>
                <input
                  type="text"
                  [(ngModel)]="currentQuotation()!.supplier_name"
                  placeholder="Enter supplier name"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Date Received</label>
                <input
                  type="date"
                  [(ngModel)]="currentQuotation()!.date_received"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Comments</label>
                <textarea
                  [(ngModel)]="currentQuotation()!.comments"
                  placeholder="Add comments"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  rows="2"></textarea>
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Beneficiary Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="currentQuotation()!.beneficiary_signature"
                  [width]="250"
                  [height]="100">
                </app-signature-pad-lib>
              </div>
            </div>
          </div>

          <!-- Step 2: Online Verification of Suppliers -->
          <div *ngIf="currentStep() === 2 && currentQuotation()">
            <h4 class="font-medium text-gray-900 mb-3 text-sm">Online Verification of Suppliers</h4>
            <div *ngIf="currentQuotation()!.online_verification">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">CIPC Registration</label>
                  <input
                    type="text"
                    [(ngModel)]="currentQuotation()!.online_verification!.cipc_registration"
                    placeholder="Enter CIPC registration"
                    class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">CIPC Verified</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.online_verification!.cipc_verified"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Verified</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">VAT Number</label>
                  <input
                    type="text"
                    [(ngModel)]="currentQuotation()!.online_verification!.vat_number"
                    placeholder="Enter VAT number"
                    class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">VAT Verified</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.online_verification!.vat_verified"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Verified</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Approved</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.online_verification!.approved"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Approved</label>
                  </div>
                </div>
              </div>

              <!-- Contact Details -->
              <div class="border rounded-lg p-3 mb-3">
                <h5 class="font-medium text-gray-900 mb-2 text-sm">Contact Details</h5>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      [(ngModel)]="currentQuotation()!.online_verification!.contact_details.phone"
                      placeholder="Enter phone number"
                      class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      [(ngModel)]="currentQuotation()!.online_verification!.contact_details.email"
                      placeholder="Enter email address"
                      class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      [(ngModel)]="currentQuotation()!.online_verification!.contact_details.address"
                      placeholder="Enter address"
                      class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div class="mt-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Contact Details Verified</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.online_verification!.contact_details.verified"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Verified</label>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-700 mb-1">Comments/Next Steps</label>
                <textarea
                  [(ngModel)]="currentQuotation()!.online_verification!.comments"
                  placeholder="Enter comments or next steps"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  rows="2"></textarea>
              </div>
            </div>
          </div>

          <!-- Step 3: Processing Verified Quotations (Generate PO) -->
          <div *ngIf="currentStep() === 3 && currentQuotation()">
            <h4 class="font-medium text-gray-900 mb-3 text-sm">Processing Verified Quotations (Generate PO)</h4>
            <div *ngIf="currentQuotation()!.purchase_order_processing">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Purchase Order Generated</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.purchase_order_processing!.purchase_order_generated"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Generated</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Emailed to Supplier Date</label>
                  <input
                    type="date"
                    [(ngModel)]="currentQuotation()!.purchase_order_processing!.emailed_to_supplier_date"
                    class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Tax Invoice Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.purchase_order_processing!.tax_invoice_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">BBBEE Certificate Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.purchase_order_processing!.bbbee_certificate_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Bank Confirmation Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.purchase_order_processing!.bank_confirmation_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Tax Clearance Certificate</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.purchase_order_processing!.tax_clearance_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Approved</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.purchase_order_processing!.approved"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Approved</label>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-700 mb-1">Comments/Next Steps</label>
                <textarea
                  [(ngModel)]="currentQuotation()!.purchase_order_processing!.comments"
                  placeholder="Enter comments or next steps"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  rows="2"></textarea>
              </div>
            </div>
          </div>

          <!-- Step 4: Payment Processing -->
          <div *ngIf="currentStep() === 4 && currentQuotation()">
            <h4 class="font-medium text-gray-900 mb-3 text-sm">Payment Processing</h4>
            <div *ngIf="currentQuotation()!.payment_processing">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">VAT Invoice Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.payment_processing!.vat_invoice_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Bank Confirmation Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.payment_processing!.bank_confirmation_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Payment Authorization Signed</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.payment_processing!.payment_authorisation_signed"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Signed</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Payment Request Date</label>
                  <input
                    type="date"
                    [(ngModel)]="currentQuotation()!.payment_processing!.payment_request_date"
                    class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Payment Done</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.payment_processing!.payment_done"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Completed</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Proof of Payment Sent</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.payment_processing!.proof_of_payment_sent"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Sent</label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Delivery Note Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="currentQuotation()!.payment_processing!.delivery_note_received"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-xs text-gray-700">Received</label>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-700 mb-1">Comments/Next Steps</label>
                <textarea
                  [(ngModel)]="currentQuotation()!.payment_processing!.comments"
                  placeholder="Enter comments or next steps"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  rows="2"></textarea>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex justify-between pt-3">
            <div class="space-x-2">
              <button
                (click)="onSaveAndClose.emit()"
                class="px-3 py-1.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors">
                Save and Close
              </button>
              <button
                (click)="onClose.emit()"
                class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                Cancel
              </button>
            </div>
            <div class="space-x-2">
              <button
                *ngIf="currentStep() > 1"
                (click)="onPrevious.emit()"
                class="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                Previous
              </button>
              <button
                *ngIf="currentStep() < 4"
                (click)="onNext.emit()"
                class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Next
              </button>
              <button
                *ngIf="currentStep() === 4"
                (click)="onSaveAndClose.emit()"
                class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ScmVerificationModalComponent {
  show = input.required<boolean>();
  scmVerification = input.required<GrantScmVerification>();
  currentQuotationIndex = input.required<number | null>();
  currentStep = input.required<number>();
  
  onClose = output<void>();
  onSaveAndClose = output<void>();
  onNext = output<void>();
  onPrevious = output<void>();
  onComplete = output<void>();

  constructor(private scmVerificationService: ScmVerificationService) {}

  currentQuotation = computed<ScmQuotation | null>(() => {
    const index = this.currentQuotationIndex();
    if (index === null) return null;
    return this.scmVerification().quotations.items[index] || null;
  });

  getStepName(step: number): string {
    return this.scmVerificationService.getStepName(step);
  }

  markAsComplete(): void {
    // Emit the complete event which will be handled in the parent component
    this.onComplete.emit();
  }
}