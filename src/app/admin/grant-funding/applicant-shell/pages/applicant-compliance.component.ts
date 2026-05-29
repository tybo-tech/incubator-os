import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GrantApplicationService } from '../../services/grant-application.service';
import {
  IGrantComplianceData,
  ComplianceStatus,
} from '../../interfaces/grant-application.interfaces';

interface ComplianceItem {
  key: keyof IGrantComplianceData;
  expiryKey?: keyof IGrantComplianceData;
  dateKey?: keyof IGrantComplianceData;
  label: string;
  description: string;
  isBool?: boolean; // for SARS (yes/no rather than status)
}

@Component({
  selector: 'app-applicant-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6">

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <ng-container *ngIf="!isLoading()">

        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Compliance & Ownership</h2>
            <p class="text-sm text-gray-500 mt-0.5">Track compliance statuses and key dates.</p>
          </div>
          <div *ngIf="!editing()" class="flex space-x-2">
            <button (click)="startEdit()"
              class="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
              Edit
            </button>
          </div>
          <div *ngIf="editing()" class="flex space-x-2">
            <button (click)="cancelEdit()"
              class="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button (click)="save()" [disabled]="isSaving()"
              class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ isSaving() ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- Compliance Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          <!-- B-BBEE Certificate -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">B-BBEE Certificate</p>
                <p class="text-xs text-gray-500 mt-0.5">Broad-Based Black Economic Empowerment</p>
              </div>
              <span *ngIf="!editing()" [class]="statusBadge(compliance().bbbee_status)">
                {{ statusLabel(compliance().bbbee_status) }}
              </span>
            </div>
            <ng-container *ngIf="!editing()">
              <p class="text-xs text-gray-500" *ngIf="compliance().bbbee_expiry">
                Expiry: <span class="text-gray-700">{{ compliance().bbbee_expiry }}</span>
              </p>
            </ng-container>
            <ng-container *ngIf="editing()">
              <div class="space-y-2">
                <select [(ngModel)]="draft.bbbee_status"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select status</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="expired">Expired</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Expiry Date</label>
                  <input type="date" [(ngModel)]="draft.bbbee_expiry"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
            </ng-container>
          </div>

          <!-- Tax Clearance -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">Tax Clearance</p>
                <p class="text-xs text-gray-500 mt-0.5">SARS Tax Compliance Status (TCS)</p>
              </div>
              <span *ngIf="!editing()" [class]="statusBadge(compliance().tax_clearance_status)">
                {{ statusLabel(compliance().tax_clearance_status) }}
              </span>
            </div>
            <ng-container *ngIf="!editing()">
              <p class="text-xs text-gray-500" *ngIf="compliance().tax_clearance_expiry">
                Expiry: <span class="text-gray-700">{{ compliance().tax_clearance_expiry }}</span>
              </p>
            </ng-container>
            <ng-container *ngIf="editing()">
              <div class="space-y-2">
                <select [(ngModel)]="draft.tax_clearance_status"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select status</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="expired">Expired</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Expiry Date</label>
                  <input type="date" [(ngModel)]="draft.tax_clearance_expiry"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
            </ng-container>
          </div>

          <!-- CIPC Registration -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">CIPC Registration</p>
                <p class="text-xs text-gray-500 mt-0.5">Companies and Intellectual Property Commission</p>
              </div>
              <span *ngIf="!editing()" [class]="statusBadge(compliance().cipc_status)">
                {{ statusLabel(compliance().cipc_status) }}
              </span>
            </div>
            <ng-container *ngIf="!editing()">
              <div class="space-y-0.5">
                <p class="text-xs text-gray-500" *ngIf="compliance().cipc_registration_date">
                  Registered: <span class="text-gray-700">{{ compliance().cipc_registration_date }}</span>
                </p>
                <p class="text-xs text-gray-500" *ngIf="compliance().cipc_renewal_date">
                  Next Renewal: <span class="text-gray-700">{{ compliance().cipc_renewal_date }}</span>
                </p>
              </div>
            </ng-container>
            <ng-container *ngIf="editing()">
              <div class="space-y-2">
                <select [(ngModel)]="draft.cipc_status"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select status</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="expired">Expired</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Registration Date</label>
                  <input type="date" [(ngModel)]="draft.cipc_registration_date"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Next Renewal / Expiry Date</label>
                  <input type="date" [(ngModel)]="draft.cipc_renewal_date"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
            </ng-container>
          </div>

          <!-- SARS Registered -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">SARS Registered</p>
                <p class="text-xs text-gray-500 mt-0.5">South African Revenue Service</p>
              </div>
              <span *ngIf="!editing()" [class]="boolBadge(compliance().sars_registered)">
                {{ compliance().sars_registered ? 'Yes' : 'No' }}
              </span>
            </div>
            <ng-container *ngIf="editing()">
              <label class="flex items-center space-x-2 cursor-pointer mt-2">
                <input type="checkbox" [(ngModel)]="draft.sars_registered"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded">
                <span class="text-sm text-gray-700">Registered with SARS</span>
              </label>
            </ng-container>
          </div>

        </div>

      </ng-container>

      <!-- Toast -->
      <div *ngIf="toast()"
           class="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm z-50"
           [class.bg-green-600]="toast()!.type === 'success'"
           [class.bg-red-600]="toast()!.type === 'error'">
        {{ toast()!.message }}
      </div>

    </div>
  `
})
export class ApplicantComplianceComponent implements OnInit {
  @Input() set embeddedApplicantId(val: number) {
    if (val) {
      this.applicantId = val;
      this.loadData();
    }
  }

  applicantId = 0;
  compliance = signal<IGrantComplianceData>({});
  draft: IGrantComplianceData = {};
  isLoading = signal(true);
  isSaving = signal(false);
  editing = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  constructor(
    private route: ActivatedRoute,
    private grantService: GrantApplicationService
  ) {}

  ngOnInit(): void {
    if (!this.applicantId) {
      this.route.parent!.params.subscribe(params => {
        this.applicantId = +params['id'];
        this.loadData();
      });
    }
  }

  loadData(): void {
    this.isLoading.set(true);
    this.grantService.getCompliance(this.applicantId).subscribe({
      next: node => {
        this.compliance.set(node?.data ?? {});
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  startEdit(): void {
    this.draft = { ...this.compliance() };
    this.editing.set(true);
  }

  cancelEdit(): void { this.editing.set(false); }

  save(): void {
    this.isSaving.set(true);
    this.grantService.saveCompliance(this.applicantId, this.draft).subscribe({
      next: node => {
        this.compliance.set(node.data);
        this.isSaving.set(false);
        this.editing.set(false);
        this.showToast('Compliance saved', 'success');
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('Failed to save. Please try again.', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  statusLabel(status?: ComplianceStatus | string): string {
    if (!status) return 'Not Set';
    const map: Record<string, string> = {
      valid: 'Valid',
      invalid: 'Invalid',
      expired: 'Expired',
      not_applicable: 'N/A',
    };
    return map[status] ?? status;
  }

  statusBadge(status?: ComplianceStatus | string): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ';
    const map: Record<string, string> = {
      valid:          base + 'bg-green-100 text-green-700',
      invalid:        base + 'bg-red-100 text-red-700',
      expired:        base + 'bg-orange-100 text-orange-700',
      not_applicable: base + 'bg-gray-100 text-gray-500',
    };
    return status ? (map[status] ?? base + 'bg-gray-100 text-gray-500') : base + 'bg-gray-100 text-gray-400';
  }

  boolBadge(val?: boolean): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ';
    return base + (val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');
  }
}
