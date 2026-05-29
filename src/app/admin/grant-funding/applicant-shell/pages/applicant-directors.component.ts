import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IGrantApplicationData,
  IDirector,
  SA_PROVINCES,
  NOK_RELATIONSHIP_OPTIONS,
  SA_RACES,
} from '../../interfaces/grant-application.interfaces';
import { GrantApplicationService } from '../../services/grant-application.service';

@Component({
  selector: 'app-applicant-directors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">
          Directors
          <span class="ml-2 text-xs font-normal text-gray-500">({{ data.directors?.length || 0 }})</span>
        </h2>
        <button (click)="openAdd()"
                class="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add Director
        </button>
      </div>

      <!-- Directors list -->
      <div class="divide-y divide-gray-100">
        <ng-container *ngFor="let director of data.directors; let i = index">
          <div class="px-5 py-3">
            <!-- Row header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full
                            flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {{ director.name.charAt(0) }}{{ director.surname.charAt(0) }}
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ director.name }} {{ director.surname }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    <span *ngIf="director.gender">{{ genderLabel(director.gender) }}</span>
                    <span *ngIf="director.gender && director.id_number"> · </span>
                    <span *ngIf="director.id_number">ID: {{ director.id_number }}</span>
                    <span *ngIf="(director.gender || director.id_number) && director.cell_phone"> · </span>
                    <span *ngIf="director.cell_phone">{{ director.cell_phone }}</span>
                    <span *ngIf="(director.gender || director.id_number || director.cell_phone) && director.email"> · </span>
                    <span *ngIf="director.email">{{ director.email }}</span>
                  </p>
                  <p *ngIf="director.kin_name" class="text-xs text-gray-400 mt-0.5">
                    NOK: {{ director.kin_name }}
                    <span *ngIf="director.kin_relationship"> ({{ director.kin_relationship }})</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-3">
                <button (click)="openEdit(i)" title="Edit director"
                        class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button (click)="remove(i)" title="Remove director"
                        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Inline edit form -->
            <div *ngIf="editingIndex() === i"
                 class="mt-4 pt-4 border-t border-blue-100 bg-blue-50/40 rounded-lg p-4 -mx-1">
              <ng-container *ngTemplateOutlet="directorForm; context: { $implicit: editDraft, idErr: editIdError(), ring: 'blue', onIdChange: onEditIdChange.bind(this) }"></ng-container>
              <div class="flex space-x-2 mt-4">
                <button (click)="cancelEdit()"
                        class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <button (click)="saveEdit(i)" [disabled]="isSaving()"
                        class="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {{ isSaving() ? 'Saving…' : 'Save Changes' }}
                </button>
              </div>
            </div>
          </div>
        </ng-container>

        <div *ngIf="!data.directors?.length" class="px-5 py-8 text-center text-sm text-gray-400">
          No directors added yet.
        </div>
      </div>

      <!-- Add Director form -->
      <div *ngIf="isAdding()" class="px-5 py-4 border-t border-gray-200 bg-gray-50">
        <p class="text-sm font-semibold text-gray-700 mb-4">New Director</p>
        <ng-container *ngTemplateOutlet="directorForm; context: { $implicit: newDraft, idErr: newIdError(), ring: 'green', onIdChange: onNewIdChange.bind(this) }"></ng-container>
        <div class="flex space-x-2 mt-4">
          <button (click)="cancelAdd()"
                  class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button (click)="confirmAdd()" [disabled]="isSaving()"
                  class="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {{ isSaving() ? 'Saving…' : 'Add Director' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Shared form template -->
    <ng-template #directorForm let-d let-idErr="idErr" let-ring="ring" let-onIdChange="onIdChange">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs text-gray-600 mb-1">First Name <span class="text-red-500">*</span></label>
          <input type="text" [(ngModel)]="d.name" placeholder="First name"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Surname <span class="text-red-500">*</span></label>
          <input type="text" [(ngModel)]="d.surname" placeholder="Surname"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Gender</label>
          <select [(ngModel)]="d.gender"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent bg-white">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Race</label>
          <select [(ngModel)]="d.race"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent bg-white">
            <option value="">Select</option>
            <option *ngFor="let r of races" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs text-gray-600 mb-1">ID Number</label>
          <input type="text" [(ngModel)]="d.id_number" (ngModelChange)="onIdChange($event)"
                 placeholder="13-digit SA ID number" maxlength="13"
                 [class]="'w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent ' +
                   (idErr ? 'border-red-400 focus:ring-red-400' :
                    d.id_number?.length === 13 ? 'border-green-400 focus:ring-green-400' :
                    'border-gray-300 focus:ring-' + ring + '-500')">
          <p *ngIf="idErr" class="mt-1 text-xs text-red-600">{{ idErr }}</p>
          <p *ngIf="!idErr && d.id_number?.length === 13" class="mt-1 text-xs text-green-600">
            Valid SA ID — date of birth and gender auto-filled
          </p>
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Date of Birth</label>
          <input type="date" [(ngModel)]="d.date_of_birth"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
      </div>

      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-5 mb-3">Contact Details</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs text-gray-600 mb-1">Cell Phone</label>
          <input type="tel" [(ngModel)]="d.cell_phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Alt Cell Phone</label>
          <input type="tel" [(ngModel)]="d.alt_cell_phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Phone</label>
          <input type="tel" [(ngModel)]="d.phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Alt Phone</label>
          <input type="tel" [(ngModel)]="d.alt_phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs text-gray-600 mb-1">Email Address</label>
          <input type="email" [(ngModel)]="d.email" placeholder="email@example.com"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
      </div>

      <div class="flex items-center my-4">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next of Kin</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs text-gray-600 mb-1">Full Name</label>
          <input type="text" [(ngModel)]="d.kin_name" placeholder="Next of kin name"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Relationship</label>
          <select [(ngModel)]="d.kin_relationship"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent bg-white">
            <option value="">Select relationship</option>
            <option *ngFor="let r of nokRelationships" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Phone Number</label>
          <input type="tel" [(ngModel)]="d.kin_phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
      </div>

      <div class="flex items-center my-4">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Director Address</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div class="sm:col-span-2">
          <label class="block text-xs text-gray-600 mb-1">Address Line 1</label>
          <input type="text" [(ngModel)]="d.address_line1" placeholder="Street address"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Address Line 2</label>
          <input type="text" [(ngModel)]="d.address_line2" placeholder="Unit / Building"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Suburb</label>
          <input type="text" [(ngModel)]="d.suburb" placeholder="Suburb"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">City</label>
          <input type="text" [(ngModel)]="d.city" placeholder="City"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">District</label>
          <input type="text" [(ngModel)]="d.district" placeholder="District"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Province</label>
          <select [(ngModel)]="d.province"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ ring }}-500 focus:border-transparent bg-white">
            <option value="">Select province</option>
            <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
          </select>
        </div>
      </div>
    </ng-template>
  `
})
export class ApplicantDirectorsComponent {
  @Input() applicantId = 0;
  @Input() data: IGrantApplicationData = { company_name: '' };
  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  isAdding = signal(false);
  editingIndex = signal<number | null>(null);
  isSaving = signal(false);

  newDraft: Partial<IDirector> = {};
  editDraft: Partial<IDirector> = {};

  editIdError = signal<string | null>(null);
  newIdError = signal<string | null>(null);

  provinces = SA_PROVINCES;
  nokRelationships = NOK_RELATIONSHIP_OPTIONS;
  races = SA_RACES;

  constructor(private grantService: GrantApplicationService) {}

  // ── Add ──────────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.newDraft = {};
    this.editingIndex.set(null);
    this.isAdding.set(true);
  }
  cancelAdd(): void { this.isAdding.set(false); }

  confirmAdd(): void {
    if (!this.newDraft.name?.trim() || !this.newDraft.surname?.trim()) return;
    const directors = [...(this.data.directors ?? []), this.newDraft as IDirector];
    this.persist({ directors }, () => {
      this.isAdding.set(false);
      this.newDraft = {};
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(index: number): void {
    this.editDraft = { ...this.data.directors![index] };
    this.editingIndex.set(index);
    this.isAdding.set(false);
  }
  cancelEdit(): void { this.editingIndex.set(null); }

  saveEdit(index: number): void {
    if (!this.editDraft.name?.trim() || !this.editDraft.surname?.trim()) return;
    const directors = [...(this.data.directors ?? [])];
    directors[index] = this.editDraft as IDirector;
    this.persist({ directors }, () => this.editingIndex.set(null));
  }

  // ── Remove ───────────────────────────────────────────────────────────────────
  remove(index: number): void {
    const directors = (this.data.directors ?? []).filter((_, i) => i !== index);
    this.persist({ directors });
  }

  // ── SA ID validation ─────────────────────────────────────────────────────────
  onEditIdChange(id: string): void {
    this.editIdError.set(null);
    if (!id || id.length < 13) return;
    const r = this.parseSAID(id);
    if (r.valid) {
      this.editDraft.date_of_birth = r.dob;
      this.editDraft.gender = r.gender;
    } else {
      this.editIdError.set(r.error);
    }
  }

  onNewIdChange(id: string): void {
    this.newIdError.set(null);
    if (!id || id.length < 13) return;
    const r = this.parseSAID(id);
    if (r.valid) {
      this.newDraft.date_of_birth = r.dob;
      this.newDraft.gender = r.gender;
    } else {
      this.newIdError.set(r.error);
    }
  }

  private parseSAID(id: string): { valid: true; dob: string; gender: 'male' | 'female' } | { valid: false; error: string } {
    if (!/^\d{13}$/.test(id)) return { valid: false, error: 'ID number must be exactly 13 digits' };
    const yy = parseInt(id.substring(0, 2), 10);
    const mm = parseInt(id.substring(2, 4), 10);
    const dd = parseInt(id.substring(4, 6), 10);
    if (mm < 1 || mm > 12) return { valid: false, error: 'ID contains an invalid month' };
    const century = yy <= (new Date().getFullYear() - 2000) ? 2000 : 1900;
    const fullYear = century + yy;
    const dob = new Date(fullYear, mm - 1, dd);
    if (dob.getMonth() !== mm - 1 || dob.getDate() !== dd) return { valid: false, error: 'ID contains an invalid date' };
    if (dob > new Date()) return { valid: false, error: 'Date of birth cannot be in the future' };
    const citizenship = parseInt(id[10], 10);
    if (citizenship !== 0 && citizenship !== 1) return { valid: false, error: 'Invalid citizenship digit (position 11)' };
    let odd = 0, evenStr = '';
    for (let i = 0; i < 13; i++) {
      if (i % 2 === 0) odd += parseInt(id[i], 10);
      else evenStr += id[i];
    }
    let evenSum = 0;
    for (const ch of (parseInt(evenStr, 10) * 2).toString()) evenSum += parseInt(ch, 10);
    if ((odd + evenSum) % 10 !== 0) return { valid: false, error: 'ID number failed checksum validation' };
    const gender = parseInt(id.substring(6, 10), 10) >= 5000 ? 'male' : 'female';
    const dobStr = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return { valid: true, dob: dobStr, gender };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  genderLabel(gender?: string): string {
    const map: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say' };
    return gender ? (map[gender] ?? gender) : '';
  }

  private persist(patch: Partial<IGrantApplicationData>, onSuccess?: () => void): void {
    this.isSaving.set(true);
    this.grantService.updateApplication(this.applicantId, patch).subscribe({
      next: node => {
        this.isSaving.set(false);
        onSuccess?.();
        this.dataUpdated.emit(node.data);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
