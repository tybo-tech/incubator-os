import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';
import { UploadService } from '../../../../services/UploadService';
import { 
  ScmQuotation,
  ScmVerificationStep,
  GrantScmVerification,
  DEFAULT_GRANT_SCM_VERIFICATION,
  ScmOnlineVerification,
  ScmSupplierContactDetails,
  ScmPurchaseOrderProcessing,
  ScmPaymentProcessing
} from './scm-verification.models';
import { GrantProcessExportService, CompanyInfo } from '../services/grant-process-export.service';
import { IGrantApplicationData } from '../interfaces/grant-application.interfaces';

@Component({
  selector: 'app-scm-verification-process',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePadLibComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-100">
        <div class="flex items-center">
          <i class="fas fa-file-contract text-blue-600 text-xl mr-3"></i>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              SCM Verification Process
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              Manage supplier quotations, verification, purchase orders and payments.
            </p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading SCM verification data...</span>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading()" class="p-6">
        <!-- Collection of Quotations -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">1</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Collection of Quotations</h3>
                <p class="text-sm text-gray-500">Capture quotations received from suppliers.</p>
              </div>
            </div>
            <button
              (click)="addQuotation()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Quotation
            </button>
          </div>

          <!-- Validation Message -->
          <div *ngIf="scmVerification().quotations.items.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No quotations added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add at least one quotation to proceed with verification.</p>
              </div>
            </div>
          </div>

          <!-- Quotations Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Supplier</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Date Received</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Beneficiary Signature</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Comments</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().quotations.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.supplier_name"
                      placeholder="Enter supplier name"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="date"
                      [(ngModel)]="item.date_received"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <app-signature-pad-lib
                      [(ngModel)]="item.beneficiary_signature"
                      [width]="150"
                      [height]="75">
                    </app-signature-pad-lib>
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.comments"
                      placeholder="Add comments"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <button
                      (click)="removeQuotation(i)"
                      class="text-red-500 hover:text-red-700 text-sm flex items-center">
                      <i class="fas fa-trash mr-1"></i>
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().quotations.items.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-gray-400">
                    <i class="fas fa-file-alt text-2xl mb-2 block"></i>
                    <p>No quotations added yet. Click "Add Quotation" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer - Only show if there are items -->
          <div *ngIf="scmVerification().quotations.items.length > 0" class="mt-6 pt-6 border-t border-gray-200">
            <h4 class="font-medium text-gray-900 mb-4 flex items-center">
              <i class="fas fa-check-circle text-green-500 mr-2"></i>
              Verification Details
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Verified By</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fas fa-user text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="scmVerification().quotations.verified_by"
                    placeholder="Enter verifier name"
                    class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="scmVerification().quotations.signature"
                  [width]="200"
                  [height]="100">
                </app-signature-pad-lib>
              </div>
            </div>
          </div>
        </div>

        <!-- Online Supplier Verification for each quotation -->
        <div *ngFor="let quotation of scmVerification().quotations.items; let qIndex = index" class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">2</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Online Supplier Verification - {{ quotation.supplier_name }}</h3>
              <p class="text-sm text-gray-500">Verify supplier legitimacy and credentials.</p>
            </div>
          </div>

          <!-- Initialize online verification if not exists -->
          <div *ngIf="!quotation.online_verification" class="mb-4">
            <button
              (click)="initializeOnlineVerification(qIndex)"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Initialize Verification
            </button>
          </div>

          <!-- Online Verification Form -->
          <div *ngIf="quotation.online_verification">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">CIPC Registration</label>
                <input
                  type="text"
                  [(ngModel)]="quotation.online_verification.cipc_registration"
                  placeholder="Enter CIPC registration"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">CIPC Verified</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.online_verification.cipc_verified"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Verified</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">CIPC Confirmation Number</label>
                <input
                  type="text"
                  [(ngModel)]="quotation.online_verification.cipc_confirmation_number"
                  placeholder="Enter confirmation number"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
                <input
                  type="text"
                  [(ngModel)]="quotation.online_verification.vat_number"
                  placeholder="Enter VAT number"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">VAT Verified</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.online_verification.vat_verified"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Verified</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Approved</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.online_verification.approved"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Approved</label>
                </div>
              </div>
            </div>

            <!-- Contact Details -->
            <div class="border rounded-lg p-4 mb-5">
              <h4 class="font-medium text-gray-900 mb-3">Contact Details</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    [(ngModel)]="quotation.online_verification.contact_details.phone"
                    placeholder="Enter phone number"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    [(ngModel)]="quotation.online_verification.contact_details.email"
                    placeholder="Enter email address"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    [(ngModel)]="quotation.online_verification.contact_details.address"
                    placeholder="Enter address"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div class="mt-3">
                <label class="block text-sm font-medium text-gray-700 mb-2">Contact Details Verified</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.online_verification.contact_details.verified"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Verified</label>
                </div>
              </div>
            </div>

            <!-- Comments -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 mb-2">Comments/Next Steps</label>
              <textarea
                [(ngModel)]="quotation.online_verification.comments"
                placeholder="Enter comments or next steps"
                class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- Processing Verified Quotations (Generate PO) for each quotation -->
        <div *ngFor="let quotation of scmVerification().quotations.items; let qIndex = index" class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">3</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Processing Verified Quotations - {{ quotation.supplier_name }}</h3>
              <p class="text-sm text-gray-500">Generate purchase orders and verify documentation.</p>
            </div>
          </div>

          <!-- Initialize purchase order processing if not exists -->
          <div *ngIf="!quotation.purchase_order_processing" class="mb-4">
            <button
              (click)="initializePurchaseOrderProcessing(qIndex)"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Initialize Processing
            </button>
          </div>

          <!-- Purchase Order Processing Form -->
          <div *ngIf="quotation.purchase_order_processing">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Purchase Order Generated</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.purchase_order_processing.purchase_order_generated"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Generated</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Emailed to Supplier Date</label>
                <input
                  type="date"
                  [(ngModel)]="quotation.purchase_order_processing.emailed_to_supplier_date"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tax Invoice Received</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.purchase_order_processing.tax_invoice_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">BBBEE Certificate Received</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.purchase_order_processing.bbbee_certificate_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Bank Confirmation Received</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.purchase_order_processing.bank_confirmation_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tax Clearance Certificate</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.purchase_order_processing.tax_clearance_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Approved</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.purchase_order_processing.approved"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Approved</label>
                </div>
              </div>
            </div>

            <!-- Comments -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 mb-2">Comments/Next Steps</label>
              <textarea
                [(ngModel)]="quotation.purchase_order_processing.comments"
                placeholder="Enter comments or next steps"
                class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- Payment Processing for each quotation -->
        <div *ngFor="let quotation of scmVerification().quotations.items; let qIndex = index" class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
              <span class="font-semibold">4</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">Payment Processing - {{ quotation.supplier_name }}</h3>
              <p class="text-sm text-gray-500">Process payments and track delivery.</p>
            </div>
          </div>

          <!-- Initialize payment processing if not exists -->
          <div *ngIf="!quotation.payment_processing" class="mb-4">
            <button
              (click)="initializePaymentProcessing(qIndex)"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Initialize Payment Processing
            </button>
          </div>

          <!-- Payment Processing Form -->
          <div *ngIf="quotation.payment_processing">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">VAT Invoice Received</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.payment_processing.vat_invoice_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Bank Confirmation Received</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.payment_processing.bank_confirmation_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Payment Authorization Signed</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.payment_processing.payment_authorisation_signed"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Signed</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Payment Request Date</label>
                <input
                  type="date"
                  [(ngModel)]="quotation.payment_processing.payment_request_date"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Payment Done</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.payment_processing.payment_done"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Completed</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Proof of Payment Sent</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.payment_processing.proof_of_payment_sent"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Sent</label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Delivery Note Received</label>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="quotation.payment_processing.delivery_note_received"
                    class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label class="ml-2 text-sm text-gray-700">Received</label>
                </div>
              </div>
            </div>

            <!-- Comments -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 mb-2">Comments/Next Steps</label>
              <textarea
                [(ngModel)]="quotation.payment_processing.comments"
                placeholder="Enter comments or next steps"
                class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            (click)="exportToPdf()"
            class="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <i class="fas fa-file-pdf mr-2"></i>
            Export to PDF
          </button>
          <button
            (click)="saveScmVerification()"
            [disabled]="isSaving()"
            class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center">
            <i class="fas fa-save mr-2"></i>
            {{ isSaving() ? 'Saving...' : 'Save SCM Verification' }}
          </button>
        </div>

        <!-- Status Message -->
        <div *ngIf="saveStatus()" class="mt-6 p-4 rounded-lg"
             [class]="saveStatus()!.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
          <div class="flex">
            <i class="fas text-lg mt-0.5 mr-3"
               [class]="saveStatus()!.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'"></i>
            <div>
              <h4 class="font-medium"
                  [class]="saveStatus()!.type === 'success' ? 'text-green-800' : 'text-red-800'">
                {{ saveStatus()!.type === 'success' ? 'Success' : 'Error' }}
              </h4>
              <p class="mt-1">{{ saveStatus()!.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ScmVerificationProcessComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantId!: number;
  @Input() applicantData!: IGrantApplicationData;

  isLoading = signal(true);
  isSaving = signal(false);
  saveStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  scmVerification = signal<GrantScmVerification>({ ...DEFAULT_GRANT_SCM_VERIFICATION });
  scmVerificationNode = signal<any>(null);

  constructor(
  @Inject(NodeService) private nodeService: NodeService,
  @Inject(UploadService) private uploadService: UploadService,
  @Inject(GrantProcessExportService) private exportService: GrantProcessExportService
) {}

  ngOnInit(): void {
    this.loadScmVerification();
    // Pre-populate company information
    this.prepopulateCompanyInfo();
  }

  loadScmVerification(): void {
    this.isLoading.set(true);
    // Try to load existing SCM verification for this company
    this.nodeService.getNodes('grant_scm_verification', this.companyId).subscribe({
      next: (nodes: any[]) => {
        if (nodes.length > 0) {
          // Load existing SCM verification data
          const existingData = nodes[0].data as GrantScmVerification;
          this.scmVerification.set({
            ...DEFAULT_GRANT_SCM_VERIFICATION,
            ...existingData,
            quotations: { ...DEFAULT_GRANT_SCM_VERIFICATION.quotations, ...existingData.quotations }
          });
          this.scmVerificationNode.set(nodes[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  saveScmVerification(): void {
    this.isSaving.set(true);
    this.saveStatus.set(null);

    const scmData = this.scmVerification();

    // Save or update the SCM verification node
    const nodeData: any = {
      type: 'grant_scm_verification',
      parent_id: this.companyId,
      data: scmData
    };

    // If we have an existing node, update it, otherwise create a new one
    let saveObservable;
    if (this.scmVerificationNode()) {
      nodeData.id = this.scmVerificationNode().id;
      saveObservable = this.nodeService.updateNode(nodeData);
    } else {
      saveObservable = this.nodeService.addNode(nodeData);
    }

    saveObservable.subscribe({
      next: (response: any) => {
        this.isSaving.set(false);
        this.scmVerificationNode.set(response);
        this.saveStatus.set({ message: 'SCM Verification saved successfully!', type: 'success' });
        // Clear status message after 3 seconds
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.saveStatus.set({ message: 'Failed to save SCM Verification. Please try again.', type: 'error' });
        console.error('Error saving SCM Verification:', error);
      }
    });
  }

  // Add Quotation
  addQuotation(): void {
    const newQuotation: ScmQuotation = {
      id: `q_${Date.now()}`,
      supplier_name: '',
      date_received: '',
      beneficiary_signature: '',
      comments: ''
    };

    this.scmVerification.update(data => ({
      ...data,
      quotations: {
        ...data.quotations,
        items: [...data.quotations.items, newQuotation]
      }
    }));
  }

  removeQuotation(index: number): void {
    this.scmVerification.update(data => ({
      ...data,
      quotations: {
        ...data.quotations,
        items: data.quotations.items.filter((_, i) => i !== index)
      }
    }));
  }

  // Initialize online verification for a quotation
  initializeOnlineVerification(index: number): void {
    this.scmVerification.update(data => {
      const items = [...data.quotations.items];
      items[index] = {
        ...items[index],
        online_verification: {
          cipc_registration: '',
          cipc_verified: false,
          cipc_confirmation_number: '',
          vat_number: '',
          vat_verified: false,
          contact_details: {
            phone: '',
            email: '',
            address: '',
            verified: false
          },
          approved: false,
          comments: ''
        }
      };
      return {
        ...data,
        quotations: {
          ...data.quotations,
          items
        }
      };
    });
  }

  // Initialize purchase order processing for a quotation
  initializePurchaseOrderProcessing(index: number): void {
    this.scmVerification.update(data => {
      const items = [...data.quotations.items];
      items[index] = {
        ...items[index],
        purchase_order_processing: {
          purchase_order_generated: false,
          emailed_to_supplier_date: '',
          tax_invoice_received: false,
          bbbee_certificate_received: false,
          bank_confirmation_received: false,
          tax_clearance_received: false,
          approved: false,
          comments: ''
        }
      };
      return {
        ...data,
        quotations: {
          ...data.quotations,
          items
        }
      };
    });
  }

  // Initialize payment processing for a quotation
  initializePaymentProcessing(index: number): void {
    this.scmVerification.update(data => {
      const items = [...data.quotations.items];
      items[index] = {
        ...items[index],
        payment_processing: {
          vat_invoice_received: false,
          bank_confirmation_received: false,
          payment_authorisation_signed: false,
          payment_request_date: '',
          payment_done: false,
          proof_of_payment_sent: false,
          delivery_note_received: false,
          comments: ''
        }
      };
      return {
        ...data,
        quotations: {
          ...data.quotations,
          items
        }
      };
    });
  }

  prepopulateCompanyInfo(): void {
    // Get primary director information
    const primaryDirector = this.applicantData.directors?.[0];
    const directorName = primaryDirector 
      ? [primaryDirector.name, primaryDirector.surname].filter(Boolean).join(' ') 
      : '';
    
    // Get contact number (cell phone or phone)
    const contactNumber = primaryDirector 
      ? (primaryDirector.cell_phone || primaryDirector.phone || '') 
      : '';

    // Update the SCM verification data with company information
    this.scmVerification.update(data => ({
      ...data,
      beneficiary_company_name: this.applicantData.company_name || '',
      director: directorName,
      contact_number: contactNumber
    }));
  }

  exportToPdf(): void {
    // Get primary director information
    const primaryDirector = this.applicantData.directors?.[0];
    const directorName = primaryDirector 
      ? [primaryDirector.name, primaryDirector.surname].filter(Boolean).join(' ') 
      : '';
    
    // Get contact number (cell phone or phone)
    const contactNumber = primaryDirector 
      ? (primaryDirector.cell_phone || primaryDirector.phone || '') 
      : '';

    const companyInfo: CompanyInfo = {
      companyName: this.applicantData.company_name || '',
      directorName: directorName,
      contactNumber: contactNumber,
      registrationNumber: this.applicantData.registration_number || ''
    };

    this.exportService.exportScmVerification(
      this.scmVerification(),
      companyInfo
    );
  }
}
