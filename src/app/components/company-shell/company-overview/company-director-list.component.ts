import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyCapabilityService, DirectorSummary, RegisterDirectorRequest } from '../../../../services/company-capability.service';

@Component({
  selector: 'app-company-director-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          Directors
          <span class="text-sm font-normal text-gray-500 ml-2">({{ directors.length }})</span>
        </h3>
        <button
          (click)="showAddForm.set(true)"
          *ngIf="!showAddForm()"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Add Director
        </button>
      </div>

      <!-- Add Director Form -->
      <div *ngIf="showAddForm()" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 class="text-sm font-semibold text-blue-800 mb-3">Register New Director</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-blue-700 mb-1">Full Name *</label>
            <input
              type="text"
              [(ngModel)]="form.full_name"
              placeholder="e.g. Sibusiso Mahlangu"
              class="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
          </div>
          <div>
            <label class="block text-xs font-medium text-blue-700 mb-1">Email</label>
            <input
              type="email"
              [(ngModel)]="form.email"
              placeholder="director@example.com"
              class="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
          </div>
          <div>
            <label class="block text-xs font-medium text-blue-700 mb-1">Phone</label>
            <input
              type="text"
              [(ngModel)]="form.phone"
              placeholder="e.g. 084 089 0282"
              class="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
          </div>
          <div>
            <label class="block text-xs font-medium text-blue-700 mb-1">Gender</label>
            <select
              [(ngModel)]="form.gender"
              class="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-blue-700 mb-1">ID Number</label>
            <input
              type="text"
              [(ngModel)]="form.id_number"
              placeholder="e.g. 9012295765081"
              class="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button
            (click)="register()"
            [disabled]="isSaving() || !form.full_name.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ isSaving() ? 'Saving...' : 'Register Director' }}
          </button>
          <button
            (click)="cancelAdd()"
            class="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
        <p *ngIf="formError()" class="mt-2 text-xs text-red-600">{{ formError() }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="directors.length === 0 && !showAddForm()" class="text-center py-8 text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <p class="text-sm">No directors registered</p>
        <p class="text-xs text-gray-400 mt-1">Add a director to get started</p>
      </div>

      <!-- Director List -->
      <div *ngFor="let dir of directors; let i = index" class="py-3" [class.border-b]="i < directors.length - 1" [class.border-gray-100]="i < directors.length - 1">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="font-medium text-gray-900 truncate">{{ dir.fullName }}</span>
              <span class="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">{{ dir.role }}</span>
            </div>
            <div class="text-sm text-gray-500 space-y-0.5">
              <p *ngIf="dir.phone" class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                {{ dir.phone }}
              </p>
              <p *ngIf="dir.email" class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                {{ dir.email }}
              </p>
              <div class="flex items-center gap-3 text-xs text-gray-400 mt-1">
                <span *ngIf="dir.gender">Gender: {{ dir.gender }}</span>
                <span *ngIf="dir.idNumber">ID: {{ dir.idNumber }}</span>
              </div>
            </div>
          </div>
          <button
            (click)="confirmRemove(dir)"
            class="ml-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
            title="Remove director">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `
})
export class CompanyDirectorListComponent {
  @Input() companyId!: number;
  @Input() directors: DirectorSummary[] = [];
  @Output() directorsChanged = new EventEmitter<void>();

  showAddForm = signal(false);
  isSaving = signal(false);
  formError = signal<string | null>(null);

  form: RegisterDirectorRequest = {
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    id_number: ''
  };

  constructor(private capability: CompanyCapabilityService) {}

  register(): void {
    if (!this.form.full_name.trim()) return;

    this.isSaving.set(true);
    this.formError.set(null);

    this.capability.registerDirector(this.companyId, {
      full_name: this.form.full_name.trim(),
      email: this.form.email || undefined,
      phone: this.form.phone || undefined,
      gender: this.form.gender || undefined,
      id_number: this.form.id_number || undefined
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.resetForm();
        this.showAddForm.set(false);
        this.directorsChanged.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formError.set(err.error?.error || 'Failed to register director');
      }
    });
  }

  cancelAdd(): void {
    this.resetForm();
    this.showAddForm.set(false);
    this.formError.set(null);
  }

  confirmRemove(dir: DirectorSummary): void {
    if (!confirm(`Remove ${dir.fullName} as director?`)) return;

    this.capability.deactivateDirector(this.companyId, dir.directorId).subscribe({
      next: () => this.directorsChanged.emit(),
      error: () => alert('Failed to remove director')
    });
  }

  private resetForm(): void {
    this.form = { full_name: '', email: '', phone: '', gender: '', id_number: '' };
  }
}