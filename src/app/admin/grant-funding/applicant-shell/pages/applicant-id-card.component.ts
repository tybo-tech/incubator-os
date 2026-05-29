import { Component, Input, Output, EventEmitter, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IGrantApplicationData,
  IUploadedDocument,
  SA_RACES,
} from '../../interfaces/grant-application.interfaces';
import { GrantApplicationService } from '../../services/grant-application.service';
import { UploadService } from '../../../../../services/UploadService';

type SnapshotStatus = 'ok' | 'warning' | 'error' | 'pending';

/**
 * Sticky applicant identity card — shown at the very top of every stage.
 * Mirrors the paper "Judge Evaluation Sheet" header used in S32 pitch events:
 *   Company name / reg number · Primary director · Gender · Ownership flags ·
 *   Industry / sector · Bank statements count · Key compliance checklist pills.
 */
@Component({
  selector: 'app-applicant-id-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-blue-500 mb-4">

      <!-- ── Header bar ─────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Company icon -->
          <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <span class="text-sm font-bold text-blue-900 truncate">{{ data.company_name || '—' }}</span>
          <span *ngIf="data.trade_name"
                class="text-xs text-blue-600 font-medium hidden sm:inline">
            t/a {{ data.trade_name }}
          </span>
          <span *ngIf="data.registration_number"
                class="text-xs text-blue-500 font-mono hidden sm:inline">
            Reg: {{ data.registration_number }}
          </span>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Edit button -->
          <button
            (click)="editClicked.emit()"
            title="Edit applicant information"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-white rounded-lg hover:bg-blue-50 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit
          </button>
          <!-- Presentations / uploads button -->
          <button
            (click)="uploadsOpen.set(true)"
            title="View / upload presentations & documents"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-violet-600 border border-violet-200 bg-white rounded-lg hover:bg-violet-50 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            Presentations
            <span *ngIf="presentationDocs().length > 0"
                  class="ml-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {{ presentationDocs().length }}
            </span>
          </button>
          <!-- Overall checklist status pill -->
          <span [class]="overallStatusClass()">{{ overallStatusLabel() }}</span>
          <!-- Collapse toggle -->
          <button
            (click)="collapsed.set(!collapsed())"
            class="p-1 text-blue-400 hover:text-blue-700 transition-colors"
            [title]="collapsed() ? 'Expand' : 'Collapse'">
            <svg class="w-4 h-4 transition-transform" [class.rotate-180]="collapsed()"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Body ───────────────────────────────────────────────────── -->
      <div *ngIf="!collapsed()">

        <!-- Director details -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-gray-100 border-b border-gray-100">

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Director</span>
            <span class="text-sm font-semibold text-gray-900 truncate">{{ primaryDirectorName() }}</span>
            <span *ngIf="primaryDirectorId()" class="text-[11px] text-gray-400 font-mono truncate">{{ primaryDirectorId() }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Gender</span>
            <span [class]="fc(primaryDirectorGenderValue())">{{ ft(primaryDirectorGenderValue()) }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Race</span>
            <span [class]="fc(primaryDirectorRace())">{{ ft(primaryDirectorRace()) }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Age</span>
            <span [class]="directorAge() !== null ? 'text-sm font-semibold text-gray-900' : 'text-sm font-medium text-red-500'">
              {{ directorAge() !== null ? (directorAge() + ' yrs') : 'Not set' }}
            </span>
            <span *ngIf="directorAge() !== null"
                  [class]="isYouth() ? 'text-[11px] text-green-600 font-medium' : 'text-[11px] text-gray-400'">
              {{ isYouth() ? 'Youth (18–35)' : 'Not youth' }}
            </span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Industry / Sector</span>
            <span [class]="fc(data.industry_name)">{{ ft(data.industry_name) }}</span>
          </div>

        </div>

        <!-- Location -->
        <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-100 border-b border-gray-100">

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Residential Area</span>
            <span [class]="fc(data.residential_area)">{{ residentialAreaLabel() }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Municipality</span>
            <span [class]="fc(data.municipality)">{{ ft(data.municipality) }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">City / Town</span>
            <span [class]="fc(data.city)">{{ ft(data.city) }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Province</span>
            <span [class]="fc(data.province)">{{ ft(data.province) }}</span>
          </div>

        </div>

        <!-- Ownership -->
        <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Ownership</span>
          <span [class]="ownershipChipClass(isYouth())">
            Youth{{ directorAge() !== null ? ' (' + directorAge() + ' yrs)' : '' }}
          </span>
          <span [class]="ownershipChipClass(data.black_owned)">Black Owned (B/MO)</span>
          <span [class]="ownershipChipClass(data.black_women_owned)">Black Women Owned (B/WO)</span>
        </div>

        <!-- Financials -->
        <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-100 border-b border-gray-100">

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Turnover ≤ R1M</span>
            <span [class]="turnoverStatusClass()">{{ turnoverStatusLabel() }}</span>
            <span *ngIf="data.bank_statement_grand_total" class="text-[11px] text-gray-400">
              R {{ data.bank_statement_grand_total | number:'1.0-0' }}
            </span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Bank Stmts Submitted</span>
            <span [class]="(data.bank_statement_months ?? 0) > 0 ? 'text-sm font-semibold text-teal-700' : 'text-sm font-medium text-red-500'">
              {{ (data.bank_statement_months ?? 0) > 0 ? 'Yes' : 'No' }}
            </span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Months Captured</span>
            <span class="text-sm font-bold text-gray-900">{{ data.bank_statement_months ?? 0 }}</span>
          </div>

          <div class="px-4 py-3 flex flex-col gap-0.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Annual Total</span>
            <span class="text-sm font-bold text-gray-900">
              {{ data.bank_statement_grand_total ? ('R ' + (data.bank_statement_grand_total | number:'1.0-0')) : '—' }}
            </span>
          </div>

        </div>

        <!-- Compliance status pills -->
        <div class="flex flex-wrap items-center gap-2 px-4 py-3">
          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Compliance</span>
          <span *ngIf="_ddAnswers()" class="text-[10px] text-indigo-500 font-medium mr-1 italic">Due Diligence</span>
          <ng-container *ngFor="let item of complianceSnapshot()">
            <div class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border"
                 [class]="snapshotClass(item.snapshotStatus)">
              <svg *ngIf="item.snapshotStatus === 'ok'" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              <svg *ngIf="item.snapshotStatus === 'warning'" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
              </svg>
              <svg *ngIf="item.snapshotStatus === 'error'" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <svg *ngIf="item.snapshotStatus === 'pending'" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/>
              </svg>
              <span class="text-[10px] font-semibold whitespace-nowrap">{{ item.label }}</span>
              <span *ngIf="item.detail" class="text-[10px] opacity-70">{{ item.detail }}</span>
            </div>
          </ng-container>
          <span *ngIf="!_ddAnswers()" class="text-[10px] text-gray-400 italic">DD not yet submitted</span>
        </div>

      </div>
    </div>

    <!-- ── Presentations / Uploads popup ─────────────────────────────────── -->
    <div *ngIf="uploadsOpen()"
         class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         (click)="uploadsOpen.set(false)">

      <div class="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md"
           (click)="$event.stopPropagation()">

        <!-- Popup header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-violet-50/60">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            <div>
              <p class="text-sm font-bold text-gray-900">Presentations &amp; Documents</p>
              <p class="text-[11px] text-gray-500 truncate">{{ data.company_name }}</p>
            </div>
          </div>
          <button (click)="uploadsOpen.set(false)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- File list -->
        <div class="px-5 py-4 max-h-64 overflow-y-auto">
          <div *ngIf="presentationDocs().length === 0"
               class="flex flex-col items-center justify-center py-8 text-center">
            <svg class="w-10 h-10 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm text-gray-400">No presentations uploaded yet.</p>
            <p class="text-xs text-gray-300 mt-0.5">Upload a PowerPoint or PDF below.</p>
          </div>

          <div *ngFor="let doc of presentationDocs(); let last = last"
               [class]="'flex items-center gap-3 py-2.5' + (last ? '' : ' border-b border-gray-100')">
            <!-- File icon -->
            <div [class]="docIconClass(doc.url)" class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg *ngIf="docFileType(doc.url) === 'pdf'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clip-rule="evenodd"/>
              </svg>
              <svg *ngIf="docFileType(doc.url) === 'pptx'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v1H4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-3V4a2 2 0 00-2-2H9zM8 4a1 1 0 011-1h2a1 1 0 011 1v1H8V4zm-4 5h12v7H4V9z"/>
              </svg>
              <svg *ngIf="docFileType(doc.url) === 'file'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <!-- Doc info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ doc.label }}</p>
              <p *ngIf="doc.uploaded_at" class="text-[11px] text-gray-400">
                {{ doc.uploaded_at | date:'d MMM yyyy, HH:mm' }}
              </p>
            </div>
            <!-- Open link -->
            <a *ngIf="doc.url"
               [href]="doc.url"
               target="_blank"
               rel="noopener noreferrer"
               class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors flex-shrink-0">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Open
            </a>
          </div>
        </div>

        <!-- Upload new file section -->
        <div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Upload New File</p>
          <div class="flex items-center gap-2">
            <input
              type="text"
              [(ngModel)]="newDocLabel"
              placeholder="Name (e.g. Pitch Deck)"
              class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"/>
            <button
              (click)="fileInput.click()"
              [disabled]="uploading()"
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0">
              <svg *ngIf="!uploading()" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <svg *ngIf="uploading()" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              {{ uploading() ? 'Uploading…' : 'Upload' }}
            </button>
            <input
              #fileInput
              type="file"
              accept=".ppt,.pptx,.pdf"
              class="hidden"
              (change)="onFileSelected($event, fileInput)"/>
          </div>
          <p class="text-[11px] text-gray-400 mt-2">Accepted: PowerPoint (.ppt, .pptx) and PDF (.pdf)</p>
          <p *ngIf="uploadError()" class="mt-1.5 text-xs text-red-500">{{ uploadError() }}</p>
          <div *ngIf="uploadSuccess()"
               class="mt-2 flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            {{ uploadSuccess() }}
          </div>
        </div>

      </div>
    </div>
  `
})
export class ApplicantIdCardComponent {

  // Keep a backing signal for `data` so computed()s re-evaluate when it changes.
  private _dataValue: IGrantApplicationData = { company_name: '' };
  private _docs = signal<IUploadedDocument[]>([]);

  get data(): IGrantApplicationData { return this._dataValue; }

  @Input() set data(v: IGrantApplicationData) {
    this._dataValue = v;
    this._docs.set(v.documents ?? []);
  }

  @Input() applicantId: number = 0;
  @Output() editClicked = new EventEmitter<void>();
  @Output() documentsChanged = new EventEmitter<IUploadedDocument[]>();

  /** Due diligence form submission answers passed from the parent. */
  protected readonly _ddAnswers = signal<Record<string, any> | null>(null);
  @Input() set ddAnswers(v: Record<string, any> | null) { this._ddAnswers.set(v ?? null); }

  private grantService = inject(GrantApplicationService);
  private uploadService = inject(UploadService);

  collapsed = signal(false);

  // ── Uploads / presentations ───────────────────────────────────────────────
  uploadsOpen    = signal(false);
  uploading      = signal(false);
  uploadError    = signal<string | null>(null);
  uploadSuccess  = signal<string | null>(null);
  newDocLabel    = '';

  /** Reactively tracks the document list — updates on both @Input changes and uploads. */
  presentationDocs = computed((): IUploadedDocument[] => this._docs());

  onFileSelected(event: Event, fileInput: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const label = this.newDocLabel.trim() || file.name.replace(/\.[^.]+$/, '');
    const id = 'upload_' + Date.now();
    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);
    // Use the local API upload endpoint (remote upload server may not be reachable)
    this.uploadService.uploadDocument(file, (url: string) => {
      const doc: IUploadedDocument = { id, label, url, uploaded_at: new Date().toISOString() };
      const docs = [...(this._dataValue.documents ?? []), doc];
      const finish = () => {
        this._docs.set(docs);
        this._dataValue = { ...this._dataValue, documents: docs };
        this.newDocLabel = '';
        fileInput.value = '';
        this.uploading.set(false);
        this.uploadSuccess.set(`"${label}" uploaded successfully`);
        setTimeout(() => this.uploadSuccess.set(null), 4000);
        this.documentsChanged.emit(docs);
      };
      if (this.applicantId) {
        this.grantService.updateApplication(this.applicantId, { documents: docs }).subscribe({
          next: finish,
          error: () => {
            this.uploadError.set('Failed to save. Please try again.');
            this.uploading.set(false);
          },
        });
      } else {
        finish();
      }
    });
  }

  docFileType(url: string | undefined): 'pdf' | 'pptx' | 'file' {
    if (!url) return 'file';
    if (/\.pdf$/i.test(url))   return 'pdf';
    if (/\.pptx?$/i.test(url)) return 'pptx';
    return 'file';
  }

  docIconClass(url: string | undefined): string {
    switch (this.docFileType(url)) {
      case 'pdf':  return 'bg-red-100 text-red-600';
      case 'pptx': return 'bg-orange-100 text-orange-600';
      default:     return 'bg-gray-100 text-gray-500';
    }
  }

  // ── Director helpers ──────────────────────────────────────────────────────

  primaryDirectorName = computed(() => {
    const d = this.data.directors?.[0];
    if (!d) return '—';
    return [d.name, d.surname].filter(Boolean).join(' ');
  });

  primaryDirectorId = computed(() => this.data.directors?.[0]?.id_number ?? null);

  primaryDirectorGenderValue = computed((): string | null => {
    const g = this.data.directors?.[0]?.gender;
    if (!g || g === 'prefer_not_to_say') return null;
    const map: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };
    return map[g] ?? g;
  });

  primaryDirectorRace = computed((): string | null => {
    const race = this.data.directors?.[0]?.race;
    if (!race) return null;
    return SA_RACES.find(r => r.value === race)?.label ?? race;
  });

  directorAge = computed((): number | null => {
    const dob = this.data.directors?.[0]?.date_of_birth;
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  });

  isYouth = computed(() => {
    const age = this.directorAge();
    if (age !== null) return age >= 18 && age <= 35;
    return this.data.youth_owned ?? false;
  });

  // ── Location ────────────────────────────────────────────────

  residentialAreaLabel = computed((): string | null => {
    const m: Record<string, string> = { township: 'Township', rural: 'Rural', urban: 'Urban' };
    return this.data.residential_area ? (m[this.data.residential_area] ?? this.data.residential_area) : null;
  });

  // ── Turnover ───────────────────────────────────────────────

  turnoverStatusLabel = computed(() => {
    const total = this.data.bank_statement_grand_total;
    if (total === undefined || total === null) return 'No data';
    return total <= 1000000 ? 'Yes (≤ R1M)' : 'No (> R1M)';
  });

  turnoverStatusClass = computed(() => {
    const total = this.data.bank_statement_grand_total;
    if (total === undefined || total === null) return 'text-sm font-medium text-red-500';
    return total <= 1000000 ? 'text-sm font-semibold text-teal-700' : 'text-sm font-semibold text-amber-600';
  });

  // ── Field helpers ────────────────────────────────────────────

  fc(value: string | null | undefined): string {
    return value ? 'text-sm font-semibold text-gray-900 truncate' : 'text-sm font-medium text-red-500';
  }

  ft(value: string | null | undefined, missing = 'Not set'): string {
    return value || missing;
  }

  // ── Ownership chips ───────────────────────────────────────────────────────

  ownershipChipClass(active: boolean | undefined): string {
    if (active) return 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200';
    return 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200';
  }

  // ── Compliance snapshot (DD answers when available, checklist fallback) ────

  private readonly PILL_IDS: { id: string; label: string }[] = [
    { id: 'bbbee_certificate', label: 'B-BBEE Level 1' },
    { id: 'tax_clearance',     label: 'Tax Clearance' },
    { id: 'proof_of_address',  label: 'Proof of Address' },
    { id: 'certified_id',      label: 'Certified ID' },
    { id: 'cipc_documents',    label: 'CIPC Docs' },
  ];

  /**
   * Unified compliance snapshot.
   * Builds pills from due diligence answers when available, otherwise falls back
   * to the static application checklist items.
   */
  complianceSnapshot = computed(() => {
    const dd = this._ddAnswers();
    if (dd) {
      return [
        this.ddStatusPill('B-BBEE Level 1',    dd['bbbee_status'],        dd['bbbee_expiry']),
        this.ddStatusPill('Tax Clearance',      dd['tax_clearance_status']),
        this.ddStatusPill('CIPC Registration',  dd['cipc_status']),
        this.ddBoolPill('SARS Registered',      dd['sars_registered']),
        this.ddBoolPill('Proof of Address',     dd['proof_of_address']),
        this.ddBoolPill('Tax & PIN',            dd['tax_pin']),
        this.ddBoolPill('Business Profile',     dd['business_profile']),
      ];
    }
    return this.PILL_IDS.map(p => {
      const found = (this.data.checklist ?? []).find(c => c.id === p.id);
      const st = found?.status ?? 'not_checked';
      return {
        label: p.label,
        snapshotStatus: (st === 'received' ? 'ok' : st === 'partially_received' ? 'warning' : 'error') as SnapshotStatus,
        detail: undefined as string | undefined,
      };
    });
  });

  private ddStatusPill(label: string, status: string | undefined, expiry?: string) {
    if (!status) return { label, snapshotStatus: 'pending' as SnapshotStatus, detail: undefined as string | undefined };
    const ok = status === 'Valid';
    return {
      label,
      snapshotStatus: (ok ? 'ok' : 'error') as SnapshotStatus,
      detail: (ok && expiry ? 'Exp: ' + expiry : !ok ? status : undefined) as string | undefined,
    };
  }

  private ddBoolPill(label: string, value: boolean | undefined) {
    if (value === undefined || value === null)
      return { label, snapshotStatus: 'pending' as SnapshotStatus, detail: undefined as string | undefined };
    return { label, snapshotStatus: (value ? 'ok' : 'error') as SnapshotStatus, detail: undefined as string | undefined };
  }

  snapshotClass(status: SnapshotStatus): string {
    switch (status) {
      case 'ok':      return 'bg-teal-50 border-teal-200 text-teal-700';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'error':   return 'bg-red-50 border-red-200 text-red-600';
      default:        return 'bg-gray-50 border-gray-200 text-gray-400';
    }
  }

  // ── Overall checklist status ──────────────────────────────────────────────

  overallStatusLabel = computed(() => {
    const pills = this.complianceSnapshot();
    const ok = pills.filter(p => p.snapshotStatus === 'ok').length;
    if (ok === pills.length) return 'Complete';
    if (ok > 0)              return `${ok}/${pills.length} OK`;
    return 'Incomplete';
  });

  overallStatusClass = computed(() => {
    const pills = this.complianceSnapshot();
    const ok = pills.filter(p => p.snapshotStatus === 'ok').length;
    const base = 'text-[10px] font-semibold px-2 py-0.5 rounded-full ';
    if (ok === pills.length) return base + 'bg-teal-100 text-teal-700';
    if (ok > 0)              return base + 'bg-amber-100 text-amber-700';
    return                          base + 'bg-red-100 text-red-600';
  });
}
