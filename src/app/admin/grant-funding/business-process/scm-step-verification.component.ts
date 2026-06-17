import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScmQuotation } from './scm-verification.models';

@Component({
  selector: 'app-scm-step-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h4 class="font-medium text-gray-900 mb-3 text-sm">Online Verification of Suppliers</h4>
      <div *ngIf="quotation().online_verification">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">CIPC Registration</label>
            <input
              type="text"
              [(ngModel)]="quotation().online_verification!.cipc_registration"
              placeholder="Enter CIPC registration"
              class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">CIPC Verified</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().online_verification!.cipc_verified"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Verified</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">VAT Number</label>
            <input
              type="text"
              [(ngModel)]="quotation().online_verification!.vat_number"
              placeholder="Enter VAT number"
              class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">VAT Verified</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().online_verification!.vat_verified"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Verified</label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Approved</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().online_verification!.approved"
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
                [(ngModel)]="quotation().online_verification!.contact_details.phone"
                placeholder="Enter phone number"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="quotation().online_verification!.contact_details.email"
                placeholder="Enter email address"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                [(ngModel)]="quotation().online_verification!.contact_details.address"
                placeholder="Enter address"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>
          <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">Contact Details Verified</label>
            <div class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="quotation().online_verification!.contact_details.verified"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label class="ml-2 text-xs text-gray-700">Verified</label>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Comments/Next Steps</label>
          <textarea
            [(ngModel)]="quotation().online_verification!.comments"
            placeholder="Enter comments or next steps"
            class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            rows="2"></textarea>
        </div>
      </div>
    </div>
  `
})
export class ScmStepVerificationComponent {
  quotation = model.required<ScmQuotation>();
}