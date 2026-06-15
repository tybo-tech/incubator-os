import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { SignaturePadComponent } from '../../../components/shared/signature-pad.component';

interface ScmQuotation {
  id: string;
  supplier_name: string;
  date_received?: string;
  beneficiary_signature?: string;
  comments?: string;
}

interface ScmSupplierVerification {
  id: string;
  supplier_name: string;
  cipc_registration?: string;
  vat_number?: string;
  verification_details?: string;
  approved?: boolean;
  comments?: string;
}

interface ScmPurchaseOrder {
  id: string;
  supplier_name: string;
  purchase_order_generated: boolean;
  emailed_to_supplier_date?: string;
  tax_invoice_received: boolean;
  bbbee_certificate_received: boolean;
  bank_confirmation_received: boolean;
  tax_clearance_received: boolean;
  approved: boolean;
  comments?: string;
}

interface ScmPayment {
  id: string;
  company_name: string;
  director: string;
  contact_number: string;
  vat_invoice_received: boolean;
  bank_confirmation_received: boolean;
  payment_authorisation_signed: boolean;
  payment_request_date?: string;
  payment_done: boolean;
  proof_of_payment_sent: boolean;
  delivery_note_received: boolean;
}

interface ScmVerificationStep<T> {
  items: T[];
  verified_by?: string;
  signature?: string;
}

interface GrantScmVerification {
  beneficiary_company_name: string;
  director: string;
  contact_number: string;
  
  step_1: ScmVerificationStep<ScmQuotation>;
  step_2: ScmVerificationStep<ScmSupplierVerification>;
  step_3: ScmVerificationStep<ScmPurchaseOrder>;
  step_4: ScmVerificationStep<ScmPayment>;
}

const DEFAULT_GRANT_SCM_VERIFICATION: GrantScmVerification = {
  beneficiary_company_name: '',
  director: '',
  contact_number: '',
  
  step_1: {
    items: [],
    verified_by: '',
    signature: ''
  },
  step_2: {
    items: [],
    verified_by: '',
    signature: ''
  },
  step_3: {
    items: [],
    verified_by: '',
    signature: ''
  },
  step_4: {
    items: [],
    verified_by: '',
    signature: ''
  }
};

@Component({
  selector: 'app-scm-verification-process',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePadComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">
          SCM Verification Process
        </h2>
        <p class="text-xs text-gray-500 mt-1">
          Manage supplier quotations, verification, purchase orders and payments.
        </p>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading()" class="p-5">
        <!-- Applicant Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Company</label>
            <p class="text-sm font-medium text-gray-900">{{ scmVerification().beneficiary_company_name || 'Not set' }}</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Director</label>
            <p class="text-sm font-medium text-gray-900">{{ scmVerification().director || 'Not set' }}</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
            <p class="text-sm font-medium text-gray-900">{{ scmVerification().contact_number || 'Not set' }}</p>
          </div>
        </div>

        <!-- Step 1 - Collection of Quotations -->
        <div class="border rounded-xl p-4 mb-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="font-semibold">Step 1 - Collection of Quotations</h3>
              <p class="text-xs text-gray-500">Capture quotations received from suppliers.</p>
            </div>
            <button 
              (click)="addQuotation()"
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + Add Quotation
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Supplier</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Date Received</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Beneficiary Signature</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Comments</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_1.items; let i = index" class="border-t border-gray-100">
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.supplier_name" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="date" 
                      [(ngModel)]="item.date_received" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <app-signature-pad
                      [(ngModel)]="item.beneficiary_signature"
                      [width]="200"
                      [height]="100"
                      placeholder="Please sign here">
                    </app-signature-pad>
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.comments" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <button 
                      (click)="removeQuotation(i)"
                      class="text-red-500 hover:text-red-700 text-xs">
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_1.items.length === 0">
                  <td colspan="5" class="px-3 py-4 text-center text-xs text-gray-400">
                    No quotations added yet. Click "Add Quotation" to get started.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer -->
          <div class="mt-4 pt-4 border-t">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Verified By</label>
                <input
                  type="text"
                  [(ngModel)]="scmVerification().step_1.verified_by"
                  class="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Signature</label>
                <app-signature-pad
                  [(ngModel)]="scmVerification().step_1.signature"
                  [width]="400"
                  [height]="150"
                  placeholder="Please sign here">
                </app-signature-pad>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2 - Supplier Verification -->
        <div class="border rounded-xl p-4 mb-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="font-semibold">Step 2 - Online Supplier Verification</h3>
              <p class="text-xs text-gray-500">Verify supplier legitimacy and credentials.</p>
            </div>
            <button 
              (click)="addSupplierVerification()"
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + Add Supplier
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Supplier Name</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">CIPC Registration</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">VAT Number</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Verification Details</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Approved</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Comments</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_2.items; let i = index" class="border-t border-gray-100">
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.supplier_name" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.cipc_registration" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.vat_number" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.verification_details" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.approved" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.comments" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <button 
                      (click)="removeSupplierVerification(i)"
                      class="text-red-500 hover:text-red-700 text-xs">
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_2.items.length === 0">
                  <td colspan="7" class="px-3 py-4 text-center text-xs text-gray-400">
                    No suppliers added yet. Click "Add Supplier" to get started.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer -->
          <div class="mt-4 pt-4 border-t">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Verified By</label>
                <input
                  type="text"
                  [(ngModel)]="scmVerification().step_2.verified_by"
                  class="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Signature</label>
                <app-signature-pad
                  [(ngModel)]="scmVerification().step_2.signature"
                  [width]="400"
                  [height]="150"
                  placeholder="Please sign here">
                </app-signature-pad>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3 - Processing Verified Quotations -->
        <div class="border rounded-xl p-4 mb-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="font-semibold">Step 3 - Processing Verified Quotations</h3>
              <p class="text-xs text-gray-500">Generate purchase orders and verify documentation.</p>
            </div>
            <button 
              (click)="addPurchaseOrder()"
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + Add Purchase Order
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Supplier</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">PO Generated</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Tax Invoice</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">BBBEE</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Bank Confirmation</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Tax Clearance</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Approved</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Comments</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_3.items; let i = index" class="border-t border-gray-100">
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.supplier_name" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.purchase_order_generated" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.tax_invoice_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.bbbee_certificate_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.bank_confirmation_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.tax_clearance_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.approved" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.comments" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <button 
                      (click)="removePurchaseOrder(i)"
                      class="text-red-500 hover:text-red-700 text-xs">
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_3.items.length === 0">
                  <td colspan="9" class="px-3 py-4 text-center text-xs text-gray-400">
                    No purchase orders added yet. Click "Add Purchase Order" to get started.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer -->
          <div class="mt-4 pt-4 border-t">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Verified By</label>
                <input
                  type="text"
                  [(ngModel)]="scmVerification().step_3.verified_by"
                  class="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Signature</label>
                <app-signature-pad
                  [(ngModel)]="scmVerification().step_3.signature"
                  [width]="400"
                  [height]="150"
                  placeholder="Please sign here">
                </app-signature-pad>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4 - Payment Processing -->
        <div class="border rounded-xl p-4 mb-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="font-semibold">Step 4 - Payment Processing</h3>
              <p class="text-xs text-gray-500">Process payments and track delivery.</p>
            </div>
            <button 
              (click)="addPayment()"
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + Add Payment
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Company</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Director</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Contact Number</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">VAT Invoice</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Bank Confirmation</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Authorisation Signed</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Payment Done</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Proof Of Payment</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Delivery Note</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of scmVerification().step_4.items; let i = index" class="border-t border-gray-100">
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.company_name" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.director" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="text" 
                      [(ngModel)]="item.contact_number" 
                      class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.vat_invoice_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.bank_confirmation_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.payment_authorisation_signed" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.payment_done" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.proof_of_payment_sent" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.delivery_note_received" 
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  </td>
                  <td class="px-3 py-2">
                    <button 
                      (click)="removePayment(i)"
                      class="text-red-500 hover:text-red-700 text-xs">
                      Remove
                    </button>
                  </td>
                </tr>
                <tr *ngIf="scmVerification().step_4.items.length === 0">
                  <td colspan="10" class="px-3 py-4 text-center text-xs text-gray-400">
                    No payments added yet. Click "Add Payment" to get started.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Verification Footer -->
          <div class="mt-4 pt-4 border-t">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Verified By</label>
                <input
                  type="text"
                  [(ngModel)]="scmVerification().step_4.verified_by"
                  class="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Signature</label>
                <app-signature-pad
                  [(ngModel)]="scmVerification().step_4.signature"
                  [width]="400"
                  [height]="150"
                  placeholder="Please sign here">
                </app-signature-pad>
              </div>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end">
          <button
            (click)="saveScmVerification()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ isSaving() ? 'Saving...' : 'Save SCM Verification' }}
          </button>
        </div>

        <!-- Status Message -->
        <div *ngIf="saveStatus()" class="mt-4 p-3 rounded-lg"
             [class]="saveStatus()!.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
          {{ saveStatus()!.message }}
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

  constructor(@Inject(NodeService) private nodeService: NodeService) {}

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
}