import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CompanyCapabilityService, DirectorSummary, OwnershipSummary } from '../../../../../services/company-capability.service';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon';
import { ToastService } from '../../../../services/toast.service';
import { DirectorRosterComponent } from './components/director-roster.component';
import { DirectorFormDialogComponent, DirectorFormValue } from './components/director-form-dialog.component';

interface OwnershipCheck {
  label: string;
  pass: boolean;
  reason: string;
}

/**
 * Directors tab — director roster plus the ownership flags it drives.
 *
 * Ownership is never typed in. It is derived from the active directors:
 * race (Black / Coloured / Indian), gender (female) and age (under 40, read
 * from a valid 13-digit SA ID). Every flag is shown with the reason it is on
 * or off, so a wrong result is traceable to a specific director field.
 */
@Component({
  selector: 'app-directors-page',
  standalone: true,
  imports: [CommonModule, AppIconComponent, DirectorRosterComponent, DirectorFormDialogComponent],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Directors</h2>
            <p class="text-gray-600 text-sm mt-1">Roster, identity data and derived ownership</p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              type="button"
              (click)="load()"
              class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
              <app-icon name="arrow-path" class="mr-1.5 text-[16px]"></app-icon>
              Refresh
            </button>
            <button
              type="button"
              (click)="openCreate()"
              class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              <app-icon name="plus" class="mr-1.5 text-[16px]"></app-icon>
              Add Director
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-500">Loading directors...</span>
        </div>

        <!-- Error -->
        <div *ngIf="error() && !loading()" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600 text-sm">{{ error() }}</p>
          <button
            type="button"
            (click)="load()"
            class="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
            Try Again
          </button>
        </div>

        <ng-container *ngIf="!loading() && !error()">
          <!-- Summary -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p class="text-sm text-gray-500 font-medium">Directors</p>
                <p class="text-xl font-bold text-gray-900 mt-1">{{ directors().length }}</p>
                <p class="text-xs text-gray-400 mt-1">active on the roster</p>
              </div>

              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p class="text-sm text-gray-500 font-medium">SA IDs on file</p>
                <p class="text-xl font-bold mt-1" [class.text-gray-900]="validIdCount() === directors().length" [class.text-amber-600]="validIdCount() !== directors().length">
                  {{ validIdCount() }} / {{ directors().length }}
                </p>
                <p class="text-xs text-gray-400 mt-1">valid 13-digit IDs</p>
              </div>

              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p class="text-sm text-gray-500 font-medium">Black ownership</p>
                <p class="text-xl font-bold mt-1" [class.text-green-600]="ownership()?.blackOwnership" [class.text-gray-400]="!ownership()?.blackOwnership">
                  {{ ownership()?.blackOwnership ? 'Yes' : 'No' }}
                </p>
                <p class="text-xs text-gray-400 mt-1">{{ blackCount() }} qualifying director{{ blackCount() === 1 ? '' : 's' }}</p>
              </div>

              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p class="text-sm text-gray-500 font-medium">Black women ownership</p>
                <p class="text-xl font-bold mt-1" [class.text-green-600]="ownership()?.blackWomenOwnership" [class.text-gray-400]="!ownership()?.blackWomenOwnership">
                  {{ ownership()?.blackWomenOwnership ? 'Yes' : 'No' }}
                </p>
                <p class="text-xs text-gray-400 mt-1">{{ blackWomenCount() }} qualifying director{{ blackWomenCount() === 1 ? '' : 's' }}</p>
              </div>

              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p class="text-sm text-gray-500 font-medium">Youth owned</p>
                <p class="text-xl font-bold mt-1" [class.text-green-600]="ownership()?.youthOwned" [class.text-gray-400]="!ownership()?.youthOwned">
                  {{ ownership()?.youthOwned ? 'Yes' : 'No' }}
                </p>
                <p class="text-xs text-gray-400 mt-1">{{ youthCount() }} director{{ youthCount() === 1 ? '' : 's' }} under 40</p>
              </div>
            </div>
          </div>

          <!-- Ownership explanation -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-900">Ownership checks</h3>
              <span class="text-xs text-gray-500">Derived from race, gender and ID — not typed in</span>
            </div>
            <div class="divide-y divide-gray-100">
              <div *ngFor="let check of ownershipChecks()" class="flex items-start gap-3 px-4 py-3">
                <span
                  class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  [ngClass]="check.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                  <app-icon [name]="check.pass ? 'check' : 'x-mark'" class="text-[12px]"></app-icon>
                </span>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900">{{ check.label }}</span>
                    <span
                      class="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                      [ngClass]="check.pass ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'">
                      {{ check.pass ? 'Yes' : 'No' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">{{ check.reason }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Roster -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Roster</h3>
            <app-director-roster
              [directors]="directors()"
              (edit)="openEdit($event)"
              (remove)="confirmRemove($event)">
            </app-director-roster>
          </div>
        </ng-container>
      </div>
    </div>

    <!-- Add/Edit dialog -->
    <app-director-form-dialog
      *ngIf="showForm()"
      [director]="editing()"
      [saving]="saving()"
      (close)="closeForm()"
      (save)="save($event)">
    </app-director-form-dialog>
  `,
})
export class DirectorsPageComponent implements OnInit {
  companyId = signal(0);
  directors = signal<DirectorSummary[]>([]);
  ownership = signal<OwnershipSummary | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  showForm = signal(false);
  editing = signal<DirectorSummary | null>(null);
  saving = signal(false);

  private route = inject(ActivatedRoute);
  private capability = inject(CompanyCapabilityService);
  private toast = inject(ToastService);

  validIdCount = computed(() => this.directors().filter(d => d.idValid).length);
  blackCount = computed(() => this.directors().filter(d => d.isBlack).length);
  blackWomenCount = computed(() => this.directors().filter(d => d.isBlackWoman).length);
  youthCount = computed(() => this.directors().filter(d => d.isYouth).length);

  ownershipChecks = computed<OwnershipCheck[]>(() => {
    const ownership = this.ownership();
    if (!ownership) return [];

    return [
      { label: 'Black ownership', pass: ownership.blackOwnership, reason: ownership.blackReason },
      { label: 'Black women ownership', pass: ownership.blackWomenOwnership, reason: ownership.blackWomenReason },
      { label: 'Youth owned', pass: ownership.youthOwned, reason: ownership.youthReason },
    ];
  });

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (isNaN(id)) {
        this.error.set('Invalid company ID');
        this.loading.set(false);
        return;
      }
      this.companyId.set(id);
      this.load();
    });
  }

  load(silent = false): void {
    if (!this.companyId()) return;

    if (!silent) this.loading.set(true);
    this.error.set(null);

    this.capability.getDirectors(this.companyId()).subscribe({
      next: (result) => {
        this.directors.set(result.directors || []);
        this.ownership.set(result.ownership ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load directors');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(director: DirectorSummary): void {
    this.editing.set(director);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  save(value: DirectorFormValue): void {
    const companyId = this.companyId();
    if (!companyId) return;

    const editing = this.editing();
    this.saving.set(true);

    const request$ = editing
      ? this.capability.updateDirector(companyId, editing.directorId, value)
      : this.capability.registerDirector(companyId, {
          full_name: value.full_name,
          email: value.email ?? undefined,
          phone: value.phone ?? undefined,
          gender: value.gender ?? undefined,
          race: value.race ?? undefined,
          id_number: value.id_number,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success(editing ? 'Director updated' : 'Director added');
        this.load(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.error || 'Failed to save director');
      },
    });
  }

  confirmRemove(director: DirectorSummary): void {
    if (!confirm(`Remove ${director.fullName} from the director roster? Ownership flags will be recalculated.`)) {
      return;
    }

    this.capability.deactivateDirector(this.companyId(), director.directorId).subscribe({
      next: () => {
        this.toast.success('Director removed');
        this.load(true);
      },
      error: (err) => this.toast.error(err.error?.error || 'Failed to remove director'),
    });
  }
}
