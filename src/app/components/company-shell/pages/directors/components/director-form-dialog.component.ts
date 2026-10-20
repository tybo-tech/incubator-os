import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../../../../shared/components/app-icon/app-icon';
import { DirectorSummary } from '../../../../../../services/company-capability.service';
import { isBlackRace, isFemale, parseSaId, SaIdDetails } from '../../../../../shared/utils/sa-id';

export interface DirectorFormValue {
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  race: string | null;
  id_number: string;
}

/**
 * Add/Edit director dialog — same shell as the financial-indicators form:
 * fixed header, scrollable body, fixed footer actions.
 *
 * The right-hand panel shows what the captured data will contribute to the
 * company's ownership flags, and exactly why a check passes or fails.
 */
@Component({
  selector: 'app-director-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ director() ? 'Edit Director' : 'Add Director' }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Ownership flags are recalculated from this roster on save.
            </p>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close dialog"
            title="Close">
            <app-icon name="x-mark" class="text-[20px]"></app-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
          <!-- Identity -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Full Name <span class="text-red-500">*</span></label>
              <input
                type="text"
                [(ngModel)]="form.full_name"
                placeholder="e.g. Sibusiso Mahlangu"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="form.email"
                placeholder="director@example.com"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                [(ngModel)]="form.phone"
                placeholder="e.g. 084 089 0282"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                [(ngModel)]="form.gender"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option [ngValue]="null">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Race</label>
              <select
                [(ngModel)]="form.race"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option [ngValue]="null">Select</option>
                <option value="Black">Black</option>
                <option value="African">African</option>
                <option value="Coloured">Coloured</option>
                <option value="Indian">Indian</option>
                <option value="White">White</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SA ID Number</label>
              <input
                type="text"
                [(ngModel)]="form.id_number"
                maxlength="13"
                inputmode="numeric"
                placeholder="13 digits"
                class="w-full border rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                [class.border-gray-300]="!idHasProblem()"
                [class.border-red-300]="idHasProblem()" />
              <p class="text-[11px] text-gray-400 mt-1">
                Date of birth, age, gender and youth status are derived from a valid ID.
              </p>
            </div>
          </div>

          <!-- Derived facts -->
          <div class="rounded-lg border" [ngClass]="derived().valid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'">
            <div class="flex items-start gap-3 px-4 py-3">
              <span
                class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                [ngClass]="derived().valid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                <app-icon [name]="derived().valid ? 'check' : 'information-circle'" class="text-[12px]"></app-icon>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium" [ngClass]="derived().valid ? 'text-green-800' : 'text-amber-800'">
                  {{ derived().valid ? 'ID verified — derived details' : 'ID not usable yet' }}
                </p>

                <div *ngIf="derived().valid" class="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div class="text-gray-500">Date of birth</div>
                    <div class="font-medium text-gray-900">{{ derived().dateOfBirth | date:'d MMM y' }}</div>
                  </div>
                  <div>
                    <div class="text-gray-500">Age</div>
                    <div class="font-medium text-gray-900">{{ derived().age }}</div>
                  </div>
                  <div>
                    <div class="text-gray-500">Gender on ID</div>
                    <div class="font-medium text-gray-900">{{ derived().gender }}</div>
                  </div>
                </div>

                <p class="text-xs mt-1" [ngClass]="derived().valid ? 'text-green-700' : 'text-amber-700'">
                  {{ derived().valid
                    ? (derived().isYouth ? 'Under 40 — counts towards youth ownership.' : '40 or older — does not count towards youth ownership.')
                    : derived().problem }}
                </p>

                <p *ngIf="genderMismatch()" class="text-xs mt-1 text-amber-700">
                  Gender is captured as {{ form.gender }} but the ID indicates {{ derived().gender }}. The captured gender is used for ownership.
                </p>
              </div>
            </div>
          </div>

          <!-- Ownership contribution -->
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
              Ownership contribution
            </h4>
            <div class="space-y-2">
              <div *ngFor="let check of contributions()" class="flex items-start gap-2">
                <span
                  class="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  [ngClass]="check.pass ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'">
                  <app-icon [name]="check.pass ? 'check' : 'x-mark'" class="text-[10px]"></app-icon>
                </span>
                <div class="min-w-0">
                  <span class="text-sm" [class.text-gray-900]="check.pass" [class.text-gray-600]="!check.pass">
                    {{ check.label }}
                  </span>
                  <span class="text-xs text-gray-500"> — {{ check.reason }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <p class="text-xs text-red-600" *ngIf="validationError()">{{ validationError() }}</p>
          <div class="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              (click)="close.emit()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              (click)="onSave()"
              [disabled]="saving() || !canSave()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ saving() ? 'Saving...' : (director() ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DirectorFormDialogComponent {
  director = input<DirectorSummary | null>(null);
  saving = input(false);

  close = output<void>();
  save = output<DirectorFormValue>();

  validationError = signal<string | null>(null);

  form: DirectorFormValue = this.emptyForm();

  constructor() {
    effect(() => {
      const director = this.director();
      this.form = director
        ? {
            full_name: director.fullName ?? '',
            email: director.email ?? null,
            phone: director.phone ?? null,
            gender: director.gender ?? null,
            race: director.race ?? null,
            id_number: (director.idNumber ?? '').trim(),
          }
        : this.emptyForm();
      this.validationError.set(null);
    });
  }

  derived(): SaIdDetails {
    return parseSaId(this.form.id_number);
  }

  idHasProblem(): boolean {
    return !!this.form.id_number.trim() && !this.derived().valid;
  }

  genderMismatch(): boolean {
    const derived = this.derived();
    return !!derived.valid && !!this.form.gender && this.form.gender !== derived.gender;
  }

  isBlack(): boolean {
    return isBlackRace(this.form.race);
  }

  contributions(): Array<{ label: string; pass: boolean; reason: string }> {
    const derived = this.derived();
    const black = this.isBlack();
    const blackWoman = black && isFemale(this.form.gender);
    const race = (this.form.race || '').trim();
    const gender = (this.form.gender || '').trim();

    return [
      {
        label: 'Black ownership',
        pass: black,
        reason: black
          ? `${race} director (counts as Black)`
          : race
            ? `recorded as ${race}, which does not count`
            : 'race not captured',
      },
      {
        label: 'Black women ownership',
        pass: blackWoman,
        reason: blackWoman
          ? 'Black and female'
          : black
            ? `gender recorded as ${gender || 'not captured'}`
            : 'requires a Black female director',
      },
      {
        label: 'Youth owned',
        pass: derived.isYouth,
        reason: derived.valid
          ? `age ${derived.age} — ${derived.isYouth ? 'under 40' : '40 or older'}`
          : derived.problem ?? 'no valid SA ID',
      },
    ];
  }

  canSave(): boolean {
    const name = this.form.full_name.trim();
    if (!name) return false;
    // An empty ID is allowed (ownership simply stays unknown), a malformed one is not.
    if (this.form.id_number.trim() && !this.derived().valid) return false;
    return true;
  }

  onSave(): void {
    const name = this.form.full_name.trim();
    if (!name) {
      this.validationError.set('Full name is required');
      return;
    }

    if (this.form.id_number.trim() && !this.derived().valid) {
      this.validationError.set(this.derived().problem || 'SA ID is not valid');
      return;
    }

    this.validationError.set(null);
    this.save.emit({
      full_name: name,
      email: this.form.email?.trim() || null,
      phone: this.form.phone?.trim() || null,
      gender: this.form.gender || null,
      race: this.form.race || null,
      id_number: this.form.id_number.trim(),
    });
  }

  private emptyForm(): DirectorFormValue {
    return { full_name: '', email: null, phone: null, gender: null, race: null, id_number: '' };
  }
}
