import {
  Component, Input, Output, EventEmitter, OnInit,
  signal, computed, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IGrantApplicationData,
  IUploadedDocument,
  DEFAULT_UPLOAD_REQUIREMENTS,
} from '../../interfaces/grant-application.interfaces';
import { GrantApplicationService } from '../../services/grant-application.service';
import { UploadService } from '../../../../../services/UploadService';

@Component({
  selector: 'app-applicant-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 class="text-base font-semibold text-gray-900">
            Document Uploads
            <span class="ml-2 text-xs font-normal text-gray-400">
              {{ uploadedCount() }} / {{ documents().length }} uploaded
            </span>
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Upload supporting documents for this application. Required items are marked <span class="text-orange-500 font-bold">*</span>.
          </p>
        </div>
        <button
          (click)="addingRow.set(!addingRow())"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 border border-green-300
                 rounded-lg hover:bg-green-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Document
        </button>
      </div>

      <!-- Add new document row -->
      <div *ngIf="addingRow()" class="flex items-center gap-2 px-5 py-3 bg-green-50 border-b border-green-100">
        <input
          type="text"
          [(ngModel)]="newDocLabel"
          placeholder="Document name / type…"
          (keyup.enter)="confirmAddRow()"
          class="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg
                 focus:ring-2 focus:ring-green-500 focus:border-transparent">
        <label class="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" [(ngModel)]="newDocRequired" class="w-3.5 h-3.5 accent-orange-500">
          Required
        </label>
        <button
          (click)="confirmAddRow()"
          [disabled]="!newDocLabel.trim()"
          class="px-3 py-1.5 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700
                 disabled:opacity-50 transition-colors">
          Add
        </button>
        <button
          (click)="addingRow.set(false)"
          class="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>

      <!-- Document list -->
      <div class="divide-y divide-gray-50">
        <div
          *ngFor="let doc of documents(); let i = index"
          class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group">

          <!-- Status indicator -->
          <span [class]="statusDot(doc)" class="w-2.5 h-2.5 rounded-full flex-shrink-0"></span>

          <!-- Label + optional note -->
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800 truncate">
              {{ doc.label }}
              <span *ngIf="doc.required !== false" class="text-orange-500 font-bold ml-0.5">*</span>
            </p>
            <p *ngIf="doc.uploaded_at && doc.url" class="text-xs text-gray-400 mt-0.5">
              Uploaded {{ formatDate(doc.uploaded_at) }}
            </p>
            <p *ngIf="doc.note" class="text-xs text-gray-400 italic mt-0.5">"{{ doc.note }}"</p>
          </div>

          <!-- File link (when uploaded) -->
          <a
            *ngIf="doc.url"
            [href]="doc.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline truncate max-w-[140px]"
            title="{{ doc.url }}">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            View file
          </a>

          <!-- Actions -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <!-- Upload / Replace button -->
            <button
              (click)="triggerUpload(i)"
              [disabled]="uploading() === i"
              class="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors
                     border disabled:opacity-50
                     {{ doc.url
                       ? 'text-gray-500 border-gray-200 hover:bg-gray-100'
                       : 'text-blue-600 border-blue-200 hover:bg-blue-50' }}">
              <svg *ngIf="uploading() !== i" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <svg *ngIf="uploading() === i" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {{ uploading() === i ? 'Uploading…' : (doc.url ? 'Replace' : 'Upload') }}
            </button>

            <!-- Remove uploaded file -->
            <button
              *ngIf="doc.url"
              (click)="clearFile(i)"
              class="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Remove uploaded file">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <!-- Remove row (only for non-default / ad-hoc docs) -->
            <button
              *ngIf="isAdHoc(doc.id)"
              (click)="removeRow(i)"
              class="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Remove this document slot">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div *ngIf="!documents().length" class="px-5 py-8 text-center text-sm text-gray-400">
          No document slots. Click "Add Document" to create one.
        </div>
      </div>

      <!-- Hidden file inputs — one per slot index -->
      <input
        #fileInput
        type="file"
        class="hidden"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        (change)="onFileSelected($event)">

    </div>
  `
})
export class ApplicantDocumentsComponent implements OnInit {
  @Input() applicantId!: number;

  @Input() set data(val: IGrantApplicationData) {
    this._data = val;
    this.initFromData(val);
  }
  get data(): IGrantApplicationData { return this._data; }

  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private _data!: IGrantApplicationData;
  private readonly DEFAULT_IDS = new Set(DEFAULT_UPLOAD_REQUIREMENTS.map(d => d.id));

  documents = signal<IUploadedDocument[]>([]);
  uploading = signal<number | null>(null);
  addingRow = signal(false);

  newDocLabel    = '';
  newDocRequired = true;

  private pendingUploadIndex = -1;

  uploadedCount = computed(() => this.documents().filter(d => !!d.url).length);

  constructor(
    private grantService: GrantApplicationService,
    private uploadService: UploadService,
  ) {}

  ngOnInit(): void {}

  private initFromData(data: IGrantApplicationData): void {
    if (data.documents?.length) {
      // Merge: keep saved docs, fill in any missing defaults at the end
      const saved = data.documents;
      const savedIds = new Set(saved.map(d => d.id));
      const missing = DEFAULT_UPLOAD_REQUIREMENTS
        .filter(d => !savedIds.has(d.id))
        .map(d => ({ ...d } as IUploadedDocument));
      this.documents.set([...saved, ...missing]);
    } else {
      // First time — populate from defaults
      this.documents.set(
        DEFAULT_UPLOAD_REQUIREMENTS.map(d => ({ ...d } as IUploadedDocument))
      );
    }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  triggerUpload(index: number): void {
    this.pendingUploadIndex = index;
    this.fileInputRef.nativeElement.value = '';
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const index = this.pendingUploadIndex;
    if (!files || files.length === 0 || index < 0) return;

    this.uploading.set(index);

    // Use a proxy object so UploadService can set the url on it
    const proxy: Record<string, string> = {};

    this.uploadService.onUpload(files, proxy, 'url', (url: string) => {
      const updated = this.documents().map((doc, i) =>
        i === index
          ? { ...doc, url, uploaded_at: new Date().toISOString() }
          : doc
      );
      this.uploading.set(null);
      this.save(updated);
    });

    // If onUpload returns synchronously with nothing (e.g. empty file guard),
    // clear the uploading state after a short window.
    setTimeout(() => {
      if (this.uploading() === index) this.uploading.set(null);
    }, 30000);
  }

  // ── Manage rows ─────────────────────────────────────────────────────────────

  confirmAddRow(): void {
    const label = this.newDocLabel.trim();
    if (!label) return;
    const newDoc: IUploadedDocument = {
      id: `adhoc_${Date.now()}`,
      label,
      required: this.newDocRequired,
    };
    const updated = [...this.documents(), newDoc];
    this.save(updated);
    this.newDocLabel = '';
    this.newDocRequired = true;
    this.addingRow.set(false);
  }

  clearFile(index: number): void {
    const updated = this.documents().map((doc, i) =>
      i === index ? { ...doc, url: undefined, uploaded_at: undefined } : doc
    );
    this.save(updated);
  }

  removeRow(index: number): void {
    const updated = this.documents().filter((_, i) => i !== index);
    this.save(updated);
  }

  isAdHoc(id: string): boolean {
    return !this.DEFAULT_IDS.has(id);
  }

  // ── Persist ─────────────────────────────────────────────────────────────────

  private save(docs: IUploadedDocument[]): void {
    this.documents.set(docs);
    this.grantService.updateApplication(this.applicantId, { documents: docs }).subscribe({
      next: node => this.dataUpdated.emit(node.data),
    });
  }

  // ── View helpers ─────────────────────────────────────────────────────────────

  statusDot(doc: IUploadedDocument): string {
    if (doc.url) return 'bg-green-500';
    if (doc.required !== false) return 'bg-orange-400';
    return 'bg-gray-300';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
