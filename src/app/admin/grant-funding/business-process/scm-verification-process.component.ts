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
              Manage supplier quotations through the verification workflow.
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
        <!-- Add Quotation Section -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">+</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Add New Quotation</h3>
                <p class="text-sm text-gray-500">Start the verification process by adding a new supplier quotation.</p>
              </div>
            </div>
            <button
              (click)="addQuotation()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Quotation
            </button>
          </div>
        </div>

        <!-- Quotations Status Table -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">📋</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Quotations Status</h3>
                <p class="text-sm text-gray-500">Track the progress of each supplier through the verification workflow.</p>
              </div>
            </div>
          </div>

          <!-- Validation Message -->
          <div *ngIf="scmVerification().quotations.items.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No quotations added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add quotations to begin the verification process.</p>
              </div>
            </div>
          </div>

          <!-- Quotations Table -->
          <div *ngIf="scmVerification().quotations.items.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Supplier</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Current Step</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().quotations.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900">
                    {{ item.supplier_name || 'Unnamed Supplier' }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ getStepName(getQuotationStep(item)) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      {{ getQuotationStep(item) === 1 ? 'bg-green-100 text-green-800' : 
                         getQuotationStep(item) === 2 ? 'bg-yellow-100 text-yellow-800' : 
                         getQuotationStep(item) === 3 ? 'bg-orange-100 text-orange-800' : 
                         'bg-purple-100 text-purple-800' }}">
                      {{ getQuotationStep(item) === 1 ? 'Completed' : 
                         getQuotationStep(item) === 2 ? 'In Progress' : 
                         getQuotationStep(item) === 3 ? 'Pending' : 
                         'Pending' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <button
                      (click)="openQuotationModal(i)"
                      class="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                      Process
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Workflow Overview -->
        <div class="border rounded-xl p-5 bg-white shadow-sm">
          <div class="flex items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">ⓘ</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Workflow Overview</h3>
                <p class="text-sm text-gray-500">Follow these sequential steps for each quotation.</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="border rounded-lg p-4 text-center">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mx-auto mb-3">
                <span class="font-semibold">1</span>
              </div>
              <h4 class="font-medium text-gray-900 mb-2">Collection of Quotations</h4>
              <p class="text-sm text-gray-500">Capture supplier quotations and initial details.</p>
            </div>
            <div class="border rounded-lg p-4 text-center">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 mx-auto mb-3">
                <span class="font-semibold">2</span>
              </div>
              <h4 class="font-medium text-gray-900 mb-2">Online Verification</h4>
              <p class="text-sm text-gray-500">Verify supplier legitimacy and credentials.</p>
            </div>
            <div class="border rounded-lg p-4 text-center">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 mx-auto mb-3">
                <span class="font-semibold">3</span>
              </div>
              <h4 class="font-medium text-gray-900 mb-2">Processing PO</h4>
              <p class="text-sm text-gray-500">Generate purchase orders and verify documentation.</p>
            </div>
            <div class="border rounded-lg p-4 text-center">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 mx-auto mb-3">
                <span class="font-semibold">4</span>
              </div>
              <h4 class="font-medium text-gray-900 mb-2">Payment Processing</h4>
              <p class="text-sm text-gray-500">Authorize and process payments.</p>
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
            {{ isSaving() ? 'Saving...' : 'Save All Progress' }}
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

    <!-- Modal for Processing Quotations -->
    <div *ngIf="showModal()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ currentQuotationIndex() !== null ? scmVerification().quotations.items[currentQuotationIndex()!].supplier_name : '' }} - 
            {{ getStepName(currentStep()) }}
          </h3>
          <button (click)="closeQuotationModal()" class="text-gray-400 hover:text-gray-500">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-6">
          <!-- Step 1: Collection of Quotations -->
          <div *ngIf="currentStep() === 1 && currentQuotationIndex() !== null">
            <h4 class="font-medium text-gray-900 mb-4">Collection of Quotations</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
                <input
                  type="text"
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].supplier_name"
                  placeholder="Enter supplier name"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Date Received</label>
                <input
                  type="date"
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].date_received"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                <textarea
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].comments"
                  placeholder="Add comments"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"></textarea>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Beneficiary Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].beneficiary_signature"
                  [width]="300"
                  [height]="150">
                </app-signature-pad-lib>
              </div>
            </div>
          </div>

          <!-- Step 2: Online Verification of Suppliers -->
          <div *ngIf="currentStep() === 2 && currentQuotationIndex() !== null">
            <h4 class="font-medium text-gray-900 mb-4">Online Verification of Suppliers</h4>
            <div *ngIf="scmVerification().quotations.items[currentQuotationIndex()!].online_verification">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CIPC Registration</label>
                  <input
                    type="text"
                    [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.cipc_registration"
                    placeholder="Enter CIPC registration"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CIPC Verified</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.cipc_verified"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Verified</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CIPC Confirmation Number</label>
                  <input
                    type="text"
                    [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.cipc_confirmation_number"
                    placeholder="Enter confirmation number"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
                  <input
                    type="text"
                    [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.vat_number"
                    placeholder="Enter VAT number"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">VAT Verified</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.vat_verified"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Verified</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Approved</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.approved"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Approved</label>
                  </div>
                </div>
              </div>

              <!-- Contact Details -->
              <div class="border rounded-lg p-4 mb-4">
                <h5 class="font-medium text-gray-900 mb-3">Contact Details</h5>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.contact_details.phone"
                      placeholder="Enter phone number"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.contact_details.email"
                      placeholder="Enter email address"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.contact_details.address"
                      placeholder="Enter address"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <div class="mt-3">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Contact Details Verified</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.contact_details.verified"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Verified</label>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Comments/Next Steps</label>
                <textarea
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].online_verification!.comments"
                  placeholder="Enter comments or next steps"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"></textarea>
              </div>
            </div>
          </div>

          <!-- Step 3: Processing Verified Quotations (Generate PO) -->
          <div *ngIf="currentStep() === 3 && currentQuotationIndex() !== null">
            <h4 class="font-medium text-gray-900 mb-4">Processing Verified Quotations (Generate PO)</h4>
            <div *ngIf="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Purchase Order Generated</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.purchase_order_generated"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Generated</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Emailed to Supplier Date</label>
                  <input
                    type="date"
                    [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.emailed_to_supplier_date"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tax Invoice Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.tax_invoice_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">BBBEE Certificate Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.bbbee_certificate_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bank Confirmation Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.bank_confirmation_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tax Clearance Certificate</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.tax_clearance_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Approved</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.approved"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Approved</label>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Comments/Next Steps</label>
                <textarea
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].purchase_order_processing!.comments"
                  placeholder="Enter comments or next steps"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"></textarea>
              </div>
            </div>
          </div>

          <!-- Step 4: Payment Processing -->
          <div *ngIf="currentStep() === 4 && currentQuotationIndex() !== null">
            <h4 class="font-medium text-gray-900 mb-4">Payment Processing</h4>
            <div *ngIf="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">VAT Invoice Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.vat_invoice_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bank Confirmation Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.bank_confirmation_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Payment Authorization Signed</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.payment_authorisation_signed"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Signed</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Payment Request Date</label>
                  <input
                    type="date"
                    [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.payment_request_date"
                    class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Payment Done</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.payment_done"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Completed</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Proof of Payment Sent</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.proof_of_payment_sent"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Sent</label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Delivery Note Received</label>
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.delivery_note_received"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label class="ml-2 text-sm text-gray-700">Received</label>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Comments/Next Steps</label>
                <textarea
                  [(ngModel)]="scmVerification().quotations.items[currentQuotationIndex()!].payment_processing!.comments"
                  placeholder="Enter comments or next steps"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"></textarea>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex justify-between pt-4">
            <button
              (click)="closeQuotationModal()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
            <div class="space-x-2">
              <button
                *ngIf="currentStep() > 1"
                (click)="currentStep.set(currentStep() - 1)"
                class="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                Previous
              </button>
              <button
                *ngIf="currentStep() < 4"
                (click)="processNextStep()"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Next
              </button>
              <button
                *ngIf="currentStep() === 4"
                (click)="closeQuotationModal()"
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                Complete
              </button>
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

  // Modal state
  showModal = signal(false);
  currentQuotationIndex = signal<number | null>(null);
  currentStep = signal<number>(1);

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

  // Determine the current workflow step for a quotation
  getQuotationStep(quotation: ScmQuotation): number {
    if (!quotation.online_verification) {
      return 1; // Collection of Quotations
    }
    if (!quotation.purchase_order_processing) {
      return 2; // Online Verification of Suppliers
    }
    if (!quotation.payment_processing) {
      return 3; // Processing Verified Quotations (Generate PO)
    }
    return 4; // Processing Payment Authorization/Payment
  }

  // Get step name for display
  getStepName(step: number): string {
    switch (step) {
      case 1: return 'Collection of Quotations';
      case 2: return 'Online Verification of Suppliers';
      case 3: return 'Processing Verified Quotations (Generate PO)';
      case 4: return 'Processing Payment Authorization/Payment';
      default: return 'Unknown';
    }
  }

  // Get step status for display
  getStepStatus(step: number): string {
    switch (step) {
      case 1: return 'Collected';
      case 2: return 'In Progress';
      case 3: return 'Pending';
      case 4: return 'Pending';
      default: return 'Pending';
    }
  }

  // Open modal for processing a quotation
  openQuotationModal(index: number): void {
    const quotation = this.scmVerification().quotations.items[index];
    const step = this.getQuotationStep(quotation);
    
    this.currentQuotationIndex.set(index);
    this.currentStep.set(step);
    this.showModal.set(true);
  }

  // Close modal
  closeQuotationModal(): void {
    this.showModal.set(false);
    this.currentQuotationIndex.set(null);
    this.currentStep.set(1);
  }

  // Process next step for a quotation
  processNextStep(): void {
    const index = this.currentQuotationIndex();
    if (index === null) return;
    
    const step = this.currentStep();
    
    switch (step) {
      case 1:
        // Initialize online verification when moving from step 1 to step 2
        this.initializeOnlineVerification(index);
        break;
      case 2:
        // Initialize purchase order processing when moving from step 2 to step 3
        this.initializePurchaseOrderProcessing(index);
        break;
      case 3:
        // Initialize payment processing when moving from step 3 to step 4
        this.initializePaymentProcessing(index);
        break;
      case 4:
        // Payment processing is the final step
        break;
    }
    
    // Move to next step
    if (step < 4) {
      this.currentStep.set(step + 1);
    }
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
