import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyCapabilityService, UpdateProfileRequest } from '../../../../services/company-capability.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';

/**
 * Compliance & Ownership card.
 *
 * The compliance score is not stored — it is derived from four company flags
 * (B-BBEE certificate, tax clearance, CIPC registration, CIPC trading status).
 * This card is the only place those flags are edited, so editing them here is
 * what actually changes the score shown on the Overview metric cards.
 *
 * Ownership flags (youth / black / black women) stay read-only: the backend
 * recalculates them from the active director roster.
 */
@Component({
  selector: 'app-company-compliance-card',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Compliance & Ownership</h3>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ getScore() }}% compliant
            <span *ngIf="getIssues().length"> · {{ getIssues().length }} issue{{ getIssues().length > 1 ? 's' : '' }}</span>
          </p>
        </div>
        <button
          *ngIf="!editing()"
          (click)="startEdit()"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
          <app-icon name="pencil-square" class="mr-1.5 text-[16px]"></app-icon>
          Edit
        </button>
      </div>

      <!-- View mode -->
      <div *ngIf="!editing()" class="space-y-4">
        <div *ngFor="let row of complianceRows" class="flex items-center justify-between">
          <span class="text-sm text-gray-600">{{ row.label }}</span>
          <span [ngClass]="statusClass(row.ok)" class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium">
            <app-icon [name]="row.ok ? 'check' : 'x-mark'" class="text-[11px]"></app-icon>
            {{ row.ok ? row.yes : row.no }}
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">CIPC Status</span>
          <span [ngClass]="isInBusiness(data?.cipc_status) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium">
            <app-icon [name]="isInBusiness(data?.cipc_status) ? 'check' : 'x-mark'" class="text-[11px]"></app-icon>
            {{ data?.cipc_status || 'Unknown' }}
          </span>
        </div>

        <hr class="my-4">

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Youth Owned</span>
            <span class="text-sm font-medium">{{ data?.youth_owned_text || (data?.youth_owned ? 'Yes' : 'No') }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Black Ownership</span>
            <span class="text-sm font-medium">{{ data?.black_ownership_text || (data?.black_ownership ? 'Yes' : 'No') }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Black Women Ownership</span>
            <span class="text-sm font-medium">{{ data?.black_women_ownership_text || (data?.black_women_ownership ? 'Yes' : 'No') }}</span>
          </div>

          <p class="text-[11px] text-gray-400 pt-1">
            Ownership is derived from the active director roster.
          </p>
        </div>
      </div>

      <!-- Edit mode -->
      <div *ngIf="editing()" class="space-y-4">
        <div class="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-blue-800">Compliance score after saving</span>
            <span class="text-sm font-bold text-blue-800">{{ getScore() }}%</span>
          </div>
        </div>

        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-gray-700">B-BBEE certificate valid</span>
          <input type="checkbox" [(ngModel)]="draft.has_valid_bbbbee"
                 class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        </label>

        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-gray-700">Tax clearance valid</span>
          <input type="checkbox" [(ngModel)]="draft.has_tax_clearance"
                 class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        </label>

        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-gray-700">CIPC registration valid</span>
          <input type="checkbox" [(ngModel)]="draft.has_cipc_registration"
                 class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        </label>

        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-gray-700">SARS registered</span>
          <input type="checkbox" [(ngModel)]="draft.is_sars_registered"
                 class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        </label>

        <div>
          <label class="block text-sm text-gray-700 mb-1">CIPC status</label>
          <select [(ngModel)]="draft.cipc_status"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option *ngFor="let option of cipcOptions" [value]="option">{{ option }}</option>
          </select>
          <p class="text-[11px] text-gray-400 mt-1">Counts as compliant only when set to "IN BUSINESS".</p>
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
      </div>

      <p *ngIf="saveSuccess()" class="mt-3 text-xs text-green-600">{{ saveSuccess() }}</p>
    </div>
  `
})
export class CompanyComplianceCardComponent {
  @Input() companyId!: number;
  @Input() data: any;
  @Output() saved = new EventEmitter<void>();

  editing = signal(false);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal<string | null>(null);

  draft: any = {};

  private readonly cipcFallbackOptions = [
    'IN BUSINESS',
    'AR DEREGISTRATION',
    'UNDER BUSINESS RESCUE',
    'DEREGISTRATION',
    'UNKNOWN',
  ];

  constructor(private capability: CompanyCapabilityService) {}

  /** Rows rendered in view mode — the same four factors the score is built from. */
  get complianceRows(): Array<{ label: string; ok: boolean; yes: string; no: string }> {
    const c = this.data;
    return [
      { label: 'B-BBEE Certificate', ok: !!c?.has_valid_bbbbee, yes: 'Valid', no: 'Invalid' },
      { label: 'Tax Clearance', ok: !!c?.has_tax_clearance, yes: 'Valid', no: 'Invalid' },
      { label: 'CIPC Registration', ok: !!c?.has_cipc_registration, yes: 'Valid', no: 'Invalid' },
      { label: 'SARS Registered', ok: !!c?.is_sars_registered, yes: 'Yes', no: 'No' },
    ];
  }

  /** Score of the current view, or a live preview of the draft while editing. */
  getScore(): number {
    const c = this.editing() ? this.draft : this.data;
    if (!c) return 0;

    const factors = [
      !!c.has_valid_bbbbee,
      !!c.has_tax_clearance,
      !!c.has_cipc_registration,
      this.isInBusiness(c.cipc_status),
    ];

    return Math.round((factors.filter(Boolean).length / factors.length) * 100);
  }

  getIssues(): string[] {
    const c = this.editing() ? this.draft : this.data;
    if (!c) return [];

    const issues: string[] = [];
    if (!c.has_valid_bbbbee) issues.push('B-BBEE');
    if (!c.has_tax_clearance) issues.push('Tax Clearance');
    if (!c.has_cipc_registration) issues.push('CIPC Registration');
    if (!this.isInBusiness(c.cipc_status)) issues.push('Business Status');
    return issues;
  }

  get cipcOptions(): string[] {
    const current = (this.draft.cipc_status || '').trim();
    const known = this.cipcFallbackOptions.some(
      option => option.toLowerCase() === current.toLowerCase()
    );
    return current && !known ? [current, ...this.cipcFallbackOptions] : this.cipcFallbackOptions;
  }

  statusClass(isValid: boolean): string {
    return isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  isInBusiness(status: string | null | undefined): boolean {
    // Stored values are inconsistent in casing/whitespace (e.g. "AR DEREGISTRATION ").
    return (status || '').trim().toUpperCase() === 'IN BUSINESS';
  }

  startEdit(): void {
    this.draft = {
      has_valid_bbbbee: !!this.data?.has_valid_bbbbee,
      has_tax_clearance: !!this.data?.has_tax_clearance,
      has_cipc_registration: !!this.data?.has_cipc_registration,
      is_sars_registered: !!this.data?.is_sars_registered,
      cipc_status: this.data?.cipc_status || 'UNKNOWN',
    };
    this.editing.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set(null);
  }

  save(): void {
    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    const payload: UpdateProfileRequest = {
      has_valid_bbbbee: !!this.draft.has_valid_bbbbee,
      has_tax_clearance: !!this.draft.has_tax_clearance,
      has_cipc_registration: !!this.draft.has_cipc_registration,
      is_sars_registered: !!this.draft.is_sars_registered,
      cipc_status: this.draft.cipc_status,
    };

    this.capability.updateProfile(this.companyId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editing.set(false);
        this.saveSuccess.set('Compliance details updated');
        setTimeout(() => this.saveSuccess.set(null), 3000);
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.error || 'Failed to save compliance details');
      },
    });
  }
}
