import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IGrantApplicationData, SA_PROVINCES, SA_MUNICIPALITIES, RESIDENTIAL_AREAS } from '../../interfaces/grant-application.interfaces';
import { GrantApplicationService } from '../../services/grant-application.service';

@Component({
  selector: 'app-applicant-address',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Address</h2>
        <button *ngIf="!isEditing()" (click)="startEdit()"
                class="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
          Edit
        </button>
        <div *ngIf="isEditing()" class="flex space-x-2">
          <button (click)="cancel()"
                  class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button (click)="save()" [disabled]="isSaving()"
                  class="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ isSaving() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- View mode -->
      <div *ngIf="!isEditing()" class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Address Line 1</p>
          <p class="text-sm text-gray-900">{{ data.address_line1 || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Address Line 2</p>
          <p class="text-sm text-gray-900">{{ data.address_line2 || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Suburb</p>
          <p class="text-sm text-gray-900">{{ data.suburb || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">City</p>
          <p class="text-sm text-gray-900">{{ data.city || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">District</p>
          <p class="text-sm text-gray-900">{{ data.district || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Municipality</p>
          <p class="text-sm text-gray-900">{{ data.municipality || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Residential Area</p>
          <p class="text-sm text-gray-900">{{ residentialAreaLabel(data.residential_area) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Province</p>
          <p class="text-sm text-gray-900">{{ data.province || '—' }}</p>
        </div>
      </div>

      <!-- Edit mode -->
      <div *ngIf="isEditing()" class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
          <input type="text" [(ngModel)]="draft.address_line1" placeholder="Street address"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
          <input type="text" [(ngModel)]="draft.address_line2" placeholder="Unit / Building"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Suburb</label>
          <input type="text" [(ngModel)]="draft.suburb" placeholder="Suburb"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">City</label>
          <input type="text" [(ngModel)]="draft.city" placeholder="City"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">District</label>
          <input type="text" [(ngModel)]="draft.district" placeholder="District"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Municipality</label>
          <select [(ngModel)]="draft.municipality"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Select municipality</option>
            <option *ngFor="let m of municipalities" [value]="m">{{ m }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Residential Area</label>
          <select [(ngModel)]="draft.residential_area"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Select</option>
            <option *ngFor="let r of residentialAreas" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Province</label>
          <select [(ngModel)]="draft.province"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Select province</option>
            <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
          </select>
        </div>
      </div>
    </div>
  `
})
export class ApplicantAddressComponent {
  @Input() applicantId = 0;
  @Input() data: IGrantApplicationData = { company_name: '' };
  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  isEditing = signal(false);
  isSaving = signal(false);
  draft: Partial<IGrantApplicationData> = {};
  provinces = SA_PROVINCES;
  municipalities = SA_MUNICIPALITIES;
  residentialAreas = RESIDENTIAL_AREAS;

  residentialAreaLabel(value: string | undefined): string {
    return RESIDENTIAL_AREAS.find(r => r.value === value)?.label ?? (value || '—');
  }

  constructor(private grantService: GrantApplicationService) {}

  startEdit(): void {
    this.draft = {
      address_line1: this.data.address_line1,
      address_line2: this.data.address_line2,
      suburb: this.data.suburb,
      city: this.data.city,
      district: this.data.district,
      municipality: this.data.municipality,
      residential_area: this.data.residential_area,
      province: this.data.province,
    };
    this.isEditing.set(true);
  }

  cancel(): void { this.isEditing.set(false); }

  save(): void {
    this.isSaving.set(true);
    this.grantService.updateApplication(this.applicantId, {
      address_line1: this.draft.address_line1,
      address_line2: this.draft.address_line2,
      suburb: this.draft.suburb,
      city: this.draft.city,
      district: this.draft.district,
      municipality: this.draft.municipality,
      residential_area: this.draft.residential_area,
      province: this.draft.province,
    }).subscribe({
      next: node => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.dataUpdated.emit(node.data);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
