import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';
import { UploadService } from '../../../../services/UploadService';
import { 
  ScmQuotation,
  ScmSupplierVerification,
  ScmPurchaseOrder,
  ScmPayment,
  ScmVerificationStep,
  GrantScmVerification,
  DEFAULT_GRANT_SCM_VERIFICATION
} from './scm-verification.models';
import { GrantProcessExportService, CompanyInfo } from '../services/grant-process-export.service';

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


        <!-- Step 1 - Collection of Quotations -->
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
          <div *ngIf="scmVerification().step_1.items.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No quotations added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add at least one quotation to proceed with verification.</p>
              </div>
            </div>
          </div>

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
                <tr *ngFor="let item of scmVerification().step_1.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
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
                <tr *ngIf="scmVerification().step_1.items.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-gray-400">
                    <i class="fas fa-file-alt text-2xl mb-2 block"></i>
                    <p>No quotations added yet. Click "Add Quotation" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer - Only show if there are items -->
          <div *ngIf="scmVerification().step_1.items.length > 0" class="mt-6 pt-6 border-t border-gray-200">
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
                    [(ngModel)]="scmVerification().step_1.verified_by"
                    placeholder="Enter verifier name"
                    class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="scmVerification().step_1.signature"
                  [width]="200"
                  [height]="100">
                </app-signature-pad-lib>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2 - Supplier Verification -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">2</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Online Supplier Verification</h3>
                <p class="text-sm text-gray-500">Verify supplier legitimacy and credentials.</p>
              </div>
            </div>
            <button
              (click)="addSupplierVerification()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Supplier
            </button>
          </div>

          <!-- Validation Message -->
          <div *ngIf="scmVerification().step_2.items.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No suppliers added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add at least one supplier to proceed with verification.</p>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Supplier Name</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">CIPC Registration</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">VAT Number</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Verification Details</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Approved</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Comments</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_2.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.supplier_name"
                      placeholder="Enter supplier name"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.cipc_registration"
                      placeholder="Enter CIPC reg."
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.vat_number"
                      placeholder="Enter VAT number"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.verification_details"
                      placeholder="Verification details"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.approved"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                      <label class="ml-2 text-sm text-gray-700">Approved</label>
                    </div>
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
                      (click)="removeSupplierVerification(i)"
                      class="text-red-500 hover:text-red-700 text-sm flex items-center">
                      <i class="fas fa-trash mr-1"></i>
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_2.items.length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                    <i class="fas fa-file-alt text-2xl mb-2 block"></i>
                    <p>No suppliers added yet. Click "Add Supplier" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer - Only show if there are items -->
          <div *ngIf="scmVerification().step_2.items.length > 0" class="mt-6 pt-6 border-t border-gray-200">
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
                    [(ngModel)]="scmVerification().step_2.verified_by"
                    placeholder="Enter verifier name"
                    class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="scmVerification().step_2.signature"
                  [width]="200"
                  [height]="100">
                </app-signature-pad-lib>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3 - Processing Verified Quotations -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">3</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Processing Verified Quotations</h3>
                <p class="text-sm text-gray-500">Generate purchase orders and verify documentation.</p>
              </div>
            </div>
            <button
              (click)="addPurchaseOrder()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Purchase Order
            </button>
          </div>

          <!-- Validation Message -->
          <div *ngIf="scmVerification().step_3.items.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No purchase orders added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add at least one purchase order to proceed with verification.</p>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Supplier</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">PO Generated</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Tax Invoice</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">BBBEE</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Bank Confirmation</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Tax Clearance</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Approved</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Comments</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_3.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.supplier_name"
                      placeholder="Enter supplier name"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.purchase_order_generated"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.tax_invoice_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.bbbee_certificate_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.bank_confirmation_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.tax_clearance_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.approved"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
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
                      (click)="removePurchaseOrder(i)"
                      class="text-red-500 hover:text-red-700 text-sm flex items-center">
                      <i class="fas fa-trash mr-1"></i>
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_3.items.length === 0">
                  <td colspan="9" class="px-4 py-8 text-center text-gray-400">
                    <i class="fas fa-file-alt text-2xl mb-2 block"></i>
                    <p>No purchase orders added yet. Click "Add Purchase Order" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer - Only show if there are items -->
          <div *ngIf="scmVerification().step_3.items.length > 0" class="mt-6 pt-6 border-t border-gray-200">
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
                    [(ngModel)]="scmVerification().step_3.verified_by"
                    placeholder="Enter verifier name"
                    class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="scmVerification().step_3.signature"
                  [width]="200"
                  [height]="100">
                </app-signature-pad-lib>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4 - Payment Processing -->
        <div class="border rounded-xl p-5 mb-7 bg-white shadow-sm">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div class="flex items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                <span class="font-semibold">4</span>
              </div>
              <div>
                <h3 class="font-semibold text-lg">Payment Processing</h3>
                <p class="text-sm text-gray-500">Process payments and track delivery.</p>
              </div>
            </div>
            <button
              (click)="addPayment()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Payment
            </button>
          </div>

          <!-- Validation Message -->
          <div *ngIf="scmVerification().step_4.items.length === 0" class="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-yellow-500 text-lg mt-0.5 mr-3"></i>
              <div>
                <h4 class="font-medium text-yellow-800">No payments added</h4>
                <p class="text-sm text-yellow-700 mt-1">Add at least one payment to proceed with verification.</p>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Company</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Director</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Contact Number</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">VAT Invoice</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Bank Confirmation</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Authorisation Signed</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Payment Done</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Proof Of Payment</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Delivery Note</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_4.items; let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.company_name"
                      placeholder="Enter company name"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.director"
                      placeholder="Enter director name"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <input
                      type="text"
                      [(ngModel)]="item.contact_number"
                      placeholder="Enter contact number"
                      class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.vat_invoice_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.bank_confirmation_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.payment_authorisation_signed"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.payment_done"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.proof_of_payment_sent"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="item.delivery_note_received"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <button
                      (click)="removePayment(i)"
                      class="text-red-500 hover:text-red-700 text-sm flex items-center">
                      <i class="fas fa-trash mr-1"></i>
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_4.items.length === 0">
                  <td colspan="10" class="px-4 py-8 text-center text-gray-400">
                    <i class="fas fa-file-alt text-2xl mb-2 block"></i>
                    <p>No payments added yet. Click "Add Payment" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer - Only show if there are items -->
          <div *ngIf="scmVerification().step_4.items.length > 0" class="mt-6 pt-6 border-t border-gray-200">
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
                    [(ngModel)]="scmVerification().step_4.verified_by"
                    placeholder="Enter verifier name"
                    class="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                <app-signature-pad-lib
                  [(ngModel)]="scmVerification().step_4.signature"
                  [width]="200"
                  [height]="100">
                </app-signature-pad-lib>
              </div>
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
            step_1: { ...DEFAULT_GRANT_SCM_VERIFICATION.step_1, ...existingData.step_1 },
            step_2: { ...DEFAULT_GRANT_SCM_VERIFICATION.step_2, ...existingData.step_2 },
            step_3: { ...DEFAULT_GRANT_SCM_VERIFICATION.step_3, ...existingData.step_3 },
            step_4: { ...DEFAULT_GRANT_SCM_VERIFICATION.step_4, ...existingData.step_4 }
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

  // Step 1 - Quotations
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
      step_1: {
        ...data.step_1,
        items: [...data.step_1.items, newQuotation]
      }
    }));
  }

  removeQuotation(index: number): void {
    this.scmVerification.update(data => ({
      ...data,
      step_1: {
        ...data.step_1,
        items: data.step_1.items.filter((_, i) => i !== index)
      }
    }));
  }

  // Step 2 - Supplier Verification
  addSupplierVerification(): void {
    const newVerification: ScmSupplierVerification = {
      id: `sv_${Date.now()}`,
      supplier_name: '',
      cipc_registration: '',
      vat_number: '',
      verification_details: '',
      approved: false,
      comments: ''
    };

    this.scmVerification.update(data => ({
      ...data,
      step_2: {
        ...data.step_2,
        items: [...data.step_2.items, newVerification]
      }
    }));
  }

  removeSupplierVerification(index: number): void {
    this.scmVerification.update(data => ({
      ...data,
      step_2: {
        ...data.step_2,
        items: data.step_2.items.filter((_, i) => i !== index)
      }
    }));
  }

  // Step 3 - Purchase Orders
  addPurchaseOrder(): void {
    const newPurchaseOrder: ScmPurchaseOrder = {
      id: `po_${Date.now()}`,
      supplier_name: '',
      purchase_order_generated: false,
      emailed_to_supplier_date: '',
      tax_invoice_received: false,
      bbbee_certificate_received: false,
      bank_confirmation_received: false,
      tax_clearance_received: false,
      approved: false,
      comments: ''
    };

    this.scmVerification.update(data => ({
      ...data,
      step_3: {
        ...data.step_3,
        items: [...data.step_3.items, newPurchaseOrder]
      }
    }));
  }

  removePurchaseOrder(index: number): void {
    this.scmVerification.update(data => ({
      ...data,
      step_3: {
        ...data.step_3,
        items: data.step_3.items.filter((_, i) => i !== index)
      }
    }));
  }

  // Step 4 - Payments
  addPayment(): void {
    const newPayment: ScmPayment = {
      id: `p_${Date.now()}`,
      company_name: '',
      director: '',
      contact_number: '',
      vat_invoice_received: false,
      bank_confirmation_received: false,
      payment_authorisation_signed: false,
      payment_request_date: '',
      payment_done: false,
      proof_of_payment_sent: false,
      delivery_note_received: false
    };

    this.scmVerification.update(data => ({
      ...data,
      step_4: {
        ...data.step_4,
        items: [...data.step_4.items, newPayment]
      }
    }));
  }

  removePayment(index: number): void {
    this.scmVerification.update(data => ({
      ...data,
      step_4: {
        ...data.step_4,
        items: data.step_4.items.filter((_, i) => i !== index)
      }
    }));
  }

  exportToPdf(): void {
    const companyInfo: CompanyInfo = {
      companyName: this.scmVerification().beneficiary_company_name,
      directorName: this.scmVerification().director,
      contactNumber: this.scmVerification().contact_number,
      registrationNumber: '' // Registration number not available in this component
    };

    this.exportService.exportScmVerification(
      this.scmVerification(),
      companyInfo
    );
  }
}
