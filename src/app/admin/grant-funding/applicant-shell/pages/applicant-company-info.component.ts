import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IGrantApplicationData } from '../../interfaces/grant-application.interfaces';
import { GrantApplicationApiService } from '../../services/grant-application-api.service';
import { IndustryPickerComponent, IndustrySelection } from './industry-picker.component';

@Component({
  selector: 'app-applicant-company-info',
  standalone: true,
  imports: [CommonModule, FormsModule, IndustryPickerComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Company Information</h2>
        <button *ngIf="!isEditing()"
                (click)="startEdit()"
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
          <p class="text-xs text-gray-500 mb-0.5">Company Name</p>
          <p class="text-sm font-medium text-gray-900">{{ data.company_name || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Trade Name</p>
          <p class="text-sm font-medium text-gray-900">{{ data.trade_name || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Registration Number</p>
          <p class="text-sm font-medium text-gray-900">{{ data.registration_number || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Industry</p>
          <p class="text-sm font-medium text-gray-900">
            <span *ngIf="data.industry_name"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              {{ data.industry_name }}
            </span>
            <span *ngIf="!data.industry_name" class="text-gray-400">—</span>
          </p>
        </div>
      </div>

      <!-- Edit mode -->
      <div *ngIf="isEditing()" class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">
            Company Name <span class="text-red-500">*</span>
          </label>
          <input type="text" [(ngModel)]="draft.company_name" placeholder="Enter company name"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Trade Name</label>
          <input type="text" [(ngModel)]="draft.trade_name" placeholder="Trading as (if different)"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Registration Number</label>
          <input type="text" [(ngModel)]="draft.registration_number" placeholder="e.g. 2023/123456/07"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Industry</label>
          <app-industry-picker
            [industryId]="draft.industry_id"
            [industryName]="draft.industry_name"
            (industryChanged)="onIndustryChanged($event)">
          </app-industry-picker>
        </div>
      </div>
    </div>
  `
})
export class ApplicantCompanyInfoComponent {
  @Input() applicantId = 0;
  @Input() data: IGrantApplicationData = { company_name: '' };
  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  isEditing = signal(false);
  isSaving = signal(false);
  draft: Partial<IGrantApplicationData> = {};

  constructor(private api: GrantApplicationApiService) {}

  startEdit(): void {
    this.draft = {
      company_name: this.data.company_name,
      trade_name: this.data.trade_name,
      registration_number: this.data.registration_number,
      industry_id: this.data.industry_id,
      industry_name: this.data.industry_name,
    };
    this.isEditing.set(true);
  }

  cancel(): void { this.isEditing.set(false); }

  onIndustryChanged(sel: IndustrySelection | null): void {
    this.draft.industry_id = sel?.id ?? null;
    this.draft.industry_name = sel?.name ?? null;
  }

  save(): void {
    if (!this.draft.company_name?.trim()) return;
    this.isSaving.set(true);
    this.api.updateApplication(this.applicantId, {
      company_name: this.draft.company_name,
      trade_name: this.draft.trade_name,
      registration_number: this.draft.registration_number,
      industry_id: this.draft.industry_id,
      industry_name: this.draft.industry_name,
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
