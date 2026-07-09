import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyCapabilityService, UpdateProfileRequest } from '../../../../services/company-capability.service';

@Component({
  selector: 'app-company-profile-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Company Information</h3>
        <button
          *ngIf="!editing()"
          (click)="startEdit()"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </button>
      </div>

      <!-- View Mode -->
      <div *ngIf="!editing()" class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
          <p class="text-gray-900">{{ data?.name || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Registration Number</label>
          <p class="text-gray-900">{{ data?.registration_no || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Contact Person</label>
          <p class="text-gray-900">{{ data?.contact_person || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">CIPC Status</label>
          <span [ngClass]="{
            'bg-green-100 text-green-800': data?.cipc_status === 'IN BUSINESS',
            'bg-red-100 text-red-800': data?.cipc_status !== 'IN BUSINESS',
            'bg-gray-100 text-gray-800': !data?.cipc_status
          }" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
            {{ data?.cipc_status || 'Unknown' }}
          </span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Business Location</label>
          <p class="text-gray-900">{{ data?.business_location || data?.city || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Service Offering</label>
          <p class="text-gray-900">{{ data?.service_offering || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">B-BBEE Level</label>
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {{ data?.bbbee_level || 'N/A' }}
          </span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Contact Number</label>
          <p class="text-gray-900">{{ data?.contact_number || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
          <p class="text-gray-900">{{ data?.email_address || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Trading Name</label>
          <p class="text-gray-900">{{ data?.trading_name || 'Nil' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Total Employees</label>
          <p class="text-gray-900">{{ (data?.permanent_employees || 0) + (data?.temporary_employees || 0) }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">Estimated Turnover</label>
          <p class="text-gray-900">{{ data?.turnover_estimated ? 'R ' + data?.turnover_estimated.toLocaleString() : 'N/A' }}</p>
        </div>
      </div>

      <!-- Edit Mode -->
      <div *ngIf="editing()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" [(ngModel)]="draft.name" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
            <input type="text" [(ngModel)]="draft.registration_no" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input type="text" [(ngModel)]="draft.contact_person" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input type="text" [(ngModel)]="draft.contact_number" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" [(ngModel)]="draft.email_address" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Trading Name</label>
            <input type="text" [(ngModel)]="draft.trading_name" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Business Location</label>
            <input type="text" [(ngModel)]="draft.business_location" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" [(ngModel)]="draft.city" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
            <input type="text" [(ngModel)]="draft.suburb" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" [(ngModel)]="draft.address" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Service Offering</label>
            <input type="text" [(ngModel)]="draft.service_offering" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">B-BBEE Level</label>
            <input type="text" [(ngModel)]="draft.bbbee_level" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
          <button
            (click)="save()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ isSaving() ? 'Saving...' : 'Save Changes' }}
          </button>
          <button
            (click)="cancelEdit()"
            class="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
        <p *ngIf="saveError()" class="text-xs text-red-600">{{ saveError() }}</p>
        <p *ngIf="saveSuccess()" class="text-xs text-green-600">{{ saveSuccess() }}</p>
      </div>
    </div>
  `
})
export class CompanyProfileEditorComponent {
  @Input() companyId!: number;
  @Input() data: any;
  @Output() saved = new EventEmitter<void>();

  editing = signal(false);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal<string | null>(null);

  draft: any = {};

  constructor(private capability: CompanyCapabilityService) {}

  startEdit(): void {
    this.draft = { ...this.data };
    this.editing.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  save(): void {
    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    const payload: UpdateProfileRequest = {
      name: this.draft.name,
      registration_no: this.draft.registration_no,
      trading_name: this.draft.trading_name,
      contact_person: this.draft.contact_person,
      contact_number: this.draft.contact_number,
      email_address: this.draft.email_address,
      city: this.draft.city,
      suburb: this.draft.suburb,
      address: this.draft.address,
      business_location: this.draft.business_location,
      service_offering: this.draft.service_offering,
      bbbee_level: this.draft.bbbee_level,
    };

    this.capability.updateProfile(this.companyId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editing.set(false);
        this.saveSuccess.set('Company profile updated successfully');
        setTimeout(() => this.saveSuccess.set(null), 3000);
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.error || 'Failed to save');
      }
    });
  }
}