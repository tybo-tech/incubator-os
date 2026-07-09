import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IGrantApplicationData,
  IDirector,
  SA_PROVINCES,
  SA_RACES,
  SA_MUNICIPALITIES,
  RESIDENTIAL_AREAS,
  NOK_RELATIONSHIP_OPTIONS,
} from '../../interfaces/grant-application.interfaces';
import { GrantApplicationApiService } from '../../services/grant-application-api.service';
import { IndustryPickerComponent, IndustrySelection } from './industry-picker.component';

type ModalTab = 'company' | 'address' | 'ownership' | 'directors';

@Component({
  selector: 'app-applicant-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IndustryPickerComponent],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-16">

      <!-- Modal panel -->
      <div class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden mb-16">

        <!-- ── Modal header ──────────────────────────────────────────── -->
        <div class="flex items-center justify-between px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-blue-900">Edit Applicant</p>
              <p class="text-xs text-blue-500 truncate max-w-xs">{{ draft.company_name || '—' }}</p>
            </div>
          </div>
          <button (click)="close()"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- ── Tabs ──────────────────────────────────────────────────── -->
        <div class="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <button *ngFor="let tab of tabs"
                  (click)="activeTab.set(tab.key)"
                  [class]="tabClass(tab.key)">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" [attr.d]="tab.icon"/>
            </svg>
            {{ tab.label }}
          </button>
        </div>

        <!-- ── Tab content ───────────────────────────────────────────── -->
        <div class="px-6 py-5 max-h-[60vh] overflow-y-auto">

          <!-- Company Info -->
          <ng-container *ngIf="activeTab() === 'company'">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Company Details</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">
                  Company Name <span class="text-red-500">*</span>
                </label>
                <input type="text" [(ngModel)]="draft.company_name" placeholder="Enter company name"
                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Trade Name</label>
                <input type="text" [(ngModel)]="draft.trade_name" placeholder="Trading as (if different)"
                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Registration Number</label>
                <input type="text" [(ngModel)]="draft.registration_number" placeholder="e.g. 2023/123456/07"
                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Industry / Sector</label>
                <app-industry-picker
                  [industryId]="draft.industry_id"
                  [industryName]="draft.industry_name"
                  (industryChanged)="onIndustryChanged($event)">
                </app-industry-picker>
              </div>
            </div>
          </ng-container>

          <!-- Address -->
          <ng-container *ngIf="activeTab() === 'address'">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Business Address</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="sm:col-span-2 lg:col-span-2">
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
                <input type="text" [(ngModel)]="draft.district" placeholder="District / Municipality"
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
          </ng-container>

          <!-- Ownership -->
          <ng-container *ngIf="activeTab() === 'ownership'">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Ownership Flags</p>
            <p class="text-xs text-gray-500 mb-5">
              These flags are used to determine B-BBEE eligibility and funding priority.
            </p>
            <div class="space-y-4">
              <label class="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
                <input type="checkbox" [(ngModel)]="draft.youth_owned"
                       class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded">
                <div>
                  <p class="text-sm font-medium text-gray-800">Youth Owned</p>
                  <p class="text-xs text-gray-500 mt-0.5">Majority owner(s) are 18–35 years of age</p>
                </div>
              </label>
              <label class="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
                <input type="checkbox" [(ngModel)]="draft.black_owned"
                       class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded">
                <div>
                  <p class="text-sm font-medium text-gray-800">Black Ownership</p>
                  <p class="text-xs text-gray-500 mt-0.5">≥ 51% owned by Black African, Coloured, or Indian people</p>
                </div>
              </label>
              <label class="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
                <input type="checkbox" [(ngModel)]="draft.black_women_owned"
                       class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded">
                <div>
                  <p class="text-sm font-medium text-gray-800">Black Women Ownership</p>
                  <p class="text-xs text-gray-500 mt-0.5">≥ 30% owned by Black African, Coloured, or Indian women</p>
                </div>
              </label>
            </div>
          </ng-container>

          <!-- Directors -->
          <ng-container *ngIf="activeTab() === 'directors'">
            <div class="flex items-center justify-between mb-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Directors ({{ directors().length }})
              </p>
              <button (click)="openAddDirector()"
                      class="px-3 py-1.5 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add Director
              </button>
            </div>

            <!-- Director list -->
            <div class="space-y-2 mb-4">
              <ng-container *ngFor="let d of directors(); let i = index">
                <div class="border border-gray-200 rounded-xl overflow-hidden">
                  <!-- Director row -->
                  <div class="flex items-center gap-3 px-4 py-3 bg-white">
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full
                                flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {{ d.name.charAt(0) }}{{ d.surname.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900">{{ d.name }} {{ d.surname }}</p>
                      <p class="text-xs text-gray-500 truncate">
                        <span *ngIf="d.race">{{ raceLabel(d.race) }}</span>
                        <span *ngIf="d.race && d.gender"> · </span>
                        <span *ngIf="d.gender">{{ genderLabel(d.gender) }}</span>
                        <span *ngIf="(d.race || d.gender) && d.id_number"> · </span>
                        <span *ngIf="d.id_number">ID: {{ d.id_number }}</span>
                        <span *ngIf="(d.race || d.gender || d.id_number) && d.cell_phone"> · </span>
                        <span *ngIf="d.cell_phone">{{ d.cell_phone }}</span>
                      </p>
                    </div>
                    <div class="flex items-center gap-1">
                      <button (click)="openEditDirector(i)"
                              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button (click)="removeDirector(i)"
                              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Inline edit form -->
                  <div *ngIf="editingDirectorIndex() === i"
                       class="border-t border-blue-100 bg-blue-50/30 px-4 py-4">
                    <ng-container *ngTemplateOutlet="directorForm; context: { $implicit: editDraft, idErr: editIdError(), onIdChange: onEditIdChange.bind(this) }"></ng-container>
                    <div class="flex gap-2 mt-4">
                      <button (click)="cancelEditDirector()"
                              class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                        Cancel
                      </button>
                      <button (click)="saveEditDirector(i)"
                              class="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Save Director
                      </button>
                    </div>
                  </div>
                </div>
              </ng-container>

              <div *ngIf="!directors().length" class="text-center py-8 text-sm text-gray-400">
                No directors added yet.
              </div>
            </div>

            <!-- Add director form -->
            <div *ngIf="isAddingDirector()" class="border border-green-200 rounded-xl px-4 py-4 bg-green-50/30">
              <p class="text-xs font-semibold text-gray-600 mb-4">New Director</p>
              <ng-container *ngTemplateOutlet="directorForm; context: { $implicit: newDraft, idErr: newIdError(), onIdChange: onNewIdChange.bind(this) }"></ng-container>
              <div class="flex gap-2 mt-4">
                <button (click)="cancelAddDirector()"
                        class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <button (click)="confirmAddDirector()"
                        class="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Add Director
                </button>
              </div>
            </div>
          </ng-container>

        </div>

        <!-- ── Footer ─────────────────────────────────────────────────── -->
        <div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p *ngIf="saveError()" class="text-xs text-red-600">{{ saveError() }}</p>
          <p *ngIf="!saveError()" class="text-xs text-gray-400">Changes are saved to all stages when you click Save.</p>
          <div class="flex gap-2">
            <button (click)="close()"
                    class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button (click)="saveAll()" [disabled]="isSaving()"
                    class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              <svg *ngIf="isSaving()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ isSaving() ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Shared director form template ──────────────────────────────── -->
    <ng-template #directorForm let-d let-idErr="idErr" let-onIdChange="onIdChange">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs text-gray-600 mb-1">First Name <span class="text-red-500">*</span></label>
          <input type="text" [(ngModel)]="d.name" placeholder="First name"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Surname <span class="text-red-500">*</span></label>
          <input type="text" [(ngModel)]="d.surname" placeholder="Surname"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Gender</label>
          <select [(ngModel)]="d.gender"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
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
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Select</option>
            <option *ngFor="let r of races" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">ID Number</label>
          <input type="text" [(ngModel)]="d.id_number" (ngModelChange)="onIdChange($event)"
                 placeholder="13-digit SA ID" maxlength="13"
                 [class]="'w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent ' +
                   (idErr ? 'border-red-400 focus:ring-red-400' :
                    d.id_number?.length === 13 ? 'border-green-400 focus:ring-green-400' :
                    'border-gray-300 focus:ring-blue-500')">
          <p *ngIf="idErr" class="mt-1 text-xs text-red-600">{{ idErr }}</p>
          <p *ngIf="!idErr && d.id_number?.length === 13" class="mt-1 text-xs text-green-600">Valid — DOB &amp; gender auto-filled</p>
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Date of Birth</label>
          <input type="date" [(ngModel)]="d.date_of_birth"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Cell Phone</label>
          <input type="tel" [(ngModel)]="d.cell_phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Email</label>
          <input type="email" [(ngModel)]="d.email" placeholder="email@example.com"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Relationship</label>
          <select [(ngModel)]="d.kin_relationship"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Select relationship</option>
            <option *ngFor="let r of nokRelationships" [value]="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Phone</label>
          <input type="tel" [(ngModel)]="d.kin_phone" placeholder="+27 XX XXX XXXX"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Suburb</label>
          <input type="text" [(ngModel)]="d.suburb" placeholder="Suburb"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">City</label>
          <input type="text" [(ngModel)]="d.city" placeholder="City"
                 class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Province</label>
          <select [(ngModel)]="d.province"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Select province</option>
            <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
          </select>
        </div>
      </div>
    </ng-template>
  `
})
export class ApplicantEditModalComponent implements OnInit {
  @Input() applicantId = 0;
  @Input() data: IGrantApplicationData = { company_name: '' };
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<IGrantApplicationData>();

  activeTab = signal<ModalTab>('company');
  isSaving = signal(false);
  saveError = signal<string | null>(null);

  draft: Partial<IGrantApplicationData> = {};
  directors = signal<IDirector[]>([]);

  editingDirectorIndex = signal<number | null>(null);
  editDraft: Partial<IDirector> = {};
  editIdError = signal<string | null>(null);

  isAddingDirector = signal(false);
  newDraft: Partial<IDirector> = {};
  newIdError = signal<string | null>(null);

  provinces = SA_PROVINCES;
  races = SA_RACES;
  nokRelationships = NOK_RELATIONSHIP_OPTIONS;
  municipalities = SA_MUNICIPALITIES;
  residentialAreas = RESIDENTIAL_AREAS;

  readonly tabs: { key: ModalTab; label: string; icon: string }[] = [
    {
      key: 'company', label: 'Company Info',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
    {
      key: 'address', label: 'Address',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      key: 'ownership', label: 'Ownership',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    },
    {
      key: 'directors', label: 'Directors',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
  ];

  constructor(private api: GrantApplicationApiService) {}

  ngOnInit(): void {
    this.draft = { ...this.data };
    this.directors.set((this.data.directors ?? []).map(d => ({ ...d })));
  }

  tabClass(key: ModalTab): string {
    const selected = this.activeTab() === key;
    const base = 'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ';
    return selected
      ? base + 'border-blue-500 text-blue-600 bg-blue-50/40'
      : base + 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer';
  }

  onIndustryChanged(sel: IndustrySelection | null): void {
    this.draft.industry_id = sel?.id ?? null;
    this.draft.industry_name = sel?.name ?? null;
  }

  // ── Director helpers ─────────────────────────────────────────────────────────
  openAddDirector(): void {
    this.newDraft = {};
    this.newIdError.set(null);
    this.editingDirectorIndex.set(null);
    this.isAddingDirector.set(true);
  }
  cancelAddDirector(): void { this.isAddingDirector.set(false); }
  confirmAddDirector(): void {
    if (!this.newDraft.name?.trim() || !this.newDraft.surname?.trim()) return;
    this.directors.update(list => [...list, this.newDraft as IDirector]);
    this.isAddingDirector.set(false);
    this.newDraft = {};
  }

  openEditDirector(index: number): void {
    this.editDraft = { ...this.directors()[index] };
    this.editIdError.set(null);
    this.editingDirectorIndex.set(index);
    this.isAddingDirector.set(false);
  }
  cancelEditDirector(): void { this.editingDirectorIndex.set(null); }
  saveEditDirector(index: number): void {
    if (!this.editDraft.name?.trim() || !this.editDraft.surname?.trim()) return;
    this.directors.update(list => {
      const updated = [...list];
      updated[index] = this.editDraft as IDirector;
      return updated;
    });
    this.editingDirectorIndex.set(null);
  }
  removeDirector(index: number): void {
    this.directors.update(list => list.filter((_, i) => i !== index));
  }

  // ── SA ID auto-fill ──────────────────────────────────────────────────────────
  onEditIdChange(id: string): void {
    this.editIdError.set(null);
    if (!id || id.length < 13) return;
    const r = this.parseSAID(id);
    if (r.valid) { this.editDraft.date_of_birth = r.dob; this.editDraft.gender = r.gender; }
    else { this.editIdError.set(r.error); }
  }

  onNewIdChange(id: string): void {
    this.newIdError.set(null);
    if (!id || id.length < 13) return;
    const r = this.parseSAID(id);
    if (r.valid) { this.newDraft.date_of_birth = r.dob; this.newDraft.gender = r.gender; }
    else { this.newIdError.set(r.error); }
  }

  private parseSAID(id: string): { valid: true; dob: string; gender: 'male' | 'female' } | { valid: false; error: string } {
    if (!/^\d{13}$/.test(id)) return { valid: false, error: 'ID must be exactly 13 digits' };
    const yy = parseInt(id.substring(0, 2), 10);
    const mm = parseInt(id.substring(2, 4), 10);
    const dd = parseInt(id.substring(4, 6), 10);
    if (mm < 1 || mm > 12) return { valid: false, error: 'ID contains an invalid month' };
    const century = yy <= (new Date().getFullYear() - 2000) ? 2000 : 1900;
    const fullYear = century + yy;
    const dob = new Date(fullYear, mm - 1, dd);
    if (dob.getMonth() !== mm - 1 || dob.getDate() !== dd) return { valid: false, error: 'ID contains an invalid date' };
    if (dob > new Date()) return { valid: false, error: 'Date of birth cannot be in the future' };
    let odd = 0, evenStr = '';
    for (let i = 0; i < 13; i++) {
      if (i % 2 === 0) odd += parseInt(id[i], 10);
      else evenStr += id[i];
    }
    let evenSum = 0;
    for (const ch of (parseInt(evenStr, 10) * 2).toString()) evenSum += parseInt(ch, 10);
    if ((odd + evenSum) % 10 !== 0) return { valid: false, error: 'ID failed checksum validation' };
    const gender = parseInt(id.substring(6, 10), 10) >= 5000 ? 'male' : 'female';
    const dobStr = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return { valid: true, dob: dobStr, gender };
  }

  // ── Labels ───────────────────────────────────────────────────────────────────
  genderLabel(gender?: string): string {
    const m: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'N/A' };
    return gender ? (m[gender] ?? gender) : '';
  }
  raceLabel(race?: string): string {
    return SA_RACES.find(r => r.value === race)?.label ?? (race ?? '');
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  saveAll(): void {
    if (!this.draft.company_name?.trim()) {
      this.activeTab.set('company');
      this.saveError.set('Company name is required.');
      return;
    }
    this.saveError.set(null);
    this.isSaving.set(true);
    const patch: Partial<IGrantApplicationData> = {
      company_name: this.draft.company_name,
      trade_name: this.draft.trade_name,
      registration_number: this.draft.registration_number,
      industry_id: this.draft.industry_id,
      industry_name: this.draft.industry_name,
      address_line1: this.draft.address_line1,
      address_line2: this.draft.address_line2,
      suburb: this.draft.suburb,
      city: this.draft.city,
      district: this.draft.district,
      municipality: this.draft.municipality,
      residential_area: this.draft.residential_area,
      province: this.draft.province,
      youth_owned: this.draft.youth_owned,
      black_owned: this.draft.black_owned,
      black_women_owned: this.draft.black_women_owned,
      directors: this.directors(),
    };
    this.api.updateApplication(this.applicantId, patch).subscribe({
      next: node => {
        this.isSaving.set(false);
        this.saved.emit(node.data);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('Save failed. Please try again.');
      },
    });
  }

  close(): void { this.closed.emit(); }
}
