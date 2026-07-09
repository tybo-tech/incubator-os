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
import { GrantApplicationApiService } from '../../services/grant-application-api.service';
import { UploadService } from '../../../../../services/UploadService';

@Component({
  selector: 'app-applicant-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900">
            Document Uploads
            <span class="ml-2 text-xs font-normal text-gray-400">
              {{ uploadedCount() }} / {{ documents().length }} uploaded
            </span>
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Upload supporting documents for this application. Required items are marked <span class="text-orange-500 font-bold">*</span>.
          </p>

          <!-- Tag filter pills -->
          <div *ngIf="usedTags().length > 0" class="flex flex-wrap gap-1.5 mt-2">
            <button
              (click)="filterTag.set(null)"
              [class]="filterTag() === null
                ? 'px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-medium'
                : 'px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'">
              All
            </button>
            <button
              *ngFor="let tag of usedTags()"
              (click)="filterTag.set(filterTag() === tag ? null : tag)"
              [class]="filterTag() === tag
                ? 'px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-medium'
                : 'px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'">
              {{ tag }}
            </button>
          </div>
        </div>
        <button
          (click)="addingRow.set(!addingRow())"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 border border-green-300
                 rounded-lg hover:bg-green-50 transition-colors flex-shrink-0 ml-3">
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
          *ngFor="let item of filteredDocuments()"
          class="px-5 py-3 hover:bg-gray-50/60 transition-colors group">

          <div class="flex items-start gap-3">
            <!-- Status indicator -->
            <span [class]="statusDot(item.doc)" class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"></span>

            <!-- Label + metadata -->
            <div class="flex-1 min-w-0">
              <!-- Editable label -->
              <div *ngIf="editingIndex() !== item.index" class="flex items-center gap-2 flex-wrap">
                <p class="text-sm text-gray-800 font-medium">
                  {{ item.doc.label }}
                  <span *ngIf="item.doc.required !== false" class="text-orange-500 font-bold ml-0.5">*</span>
                </p>
                <button
                  (click)="startEditing(item.index, item.doc.label)"
                  class="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 transition-all"
                  title="Rename document">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
              </div>

              <!-- Edit mode -->
              <div *ngIf="editingIndex() === item.index" class="flex items-center gap-2">
                <input
                  type="text"
                  [(ngModel)]="editingLabel"
                  (keyup.enter)="saveLabel(item.index)"
                  (keyup.escape)="cancelEditing()"
                  class="flex-1 px-2 py-1 text-sm border border-blue-400 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autofocus>
                <button
                  (click)="saveLabel(item.index)"
                  class="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Save">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
                <button
                  (click)="cancelEditing()"
                  class="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                  title="Cancel">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Tags display -->
              <div *ngIf="item.doc.tags && item.doc.tags.length > 0" class="flex flex-wrap gap-1 mt-1.5">
                <span
                  *ngFor="let tag of item.doc.tags"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded
                         bg-blue-50 text-blue-700 border border-blue-200">
                  {{ tag }}
                  <button
                    (click)="removeTag(item.index, tag)"
                    class="hover:text-blue-900 transition-colors"
                    title="Remove tag">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </span>
                <button
                  (click)="toggleEditTags(item.index)"
                  class="px-1.5 py-0.5 text-[10px] text-blue-600 border border-blue-200 rounded
                         hover:bg-blue-50 transition-colors">
                  + Tag
                </button>
              </div>

              <div *ngIf="!item.doc.tags || item.doc.tags.length === 0" class="mt-1.5">
                <button
                  (click)="toggleEditTags(item.index)"
                  class="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] text-gray-500
                         border border-gray-200 rounded hover:bg-gray-50 transition-all">
                  + Add tags
                </button>
              </div>

              <!-- Tag picker -->
              <div *ngIf="editingTags() === item.index" class="flex flex-wrap gap-1 mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <button
                  *ngFor="let tag of AVAILABLE_TAGS"
                  (click)="toggleTag(item.index, tag)"
                  [class]="hasTag(item.doc, tag)
                    ? 'px-2 py-1 text-xs rounded bg-blue-600 text-white font-medium'
                    : 'px-2 py-1 text-xs rounded bg-white text-gray-700 border border-gray-300 hover:border-blue-400'">
                  {{ tag }}
                  <span *ngIf="hasTag(item.doc, tag)" class="ml-1">✓</span>
                </button>
                <button
                  (click)="toggleEditTags(item.index)"
                  class="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-700">
                  Done
                </button>
              </div>

              <!-- Upload info -->
              <p *ngIf="item.doc.uploaded_at && item.doc.url" class="text-xs text-gray-400 mt-1">
                Uploaded {{ formatDate(item.doc.uploaded_at) }}
              </p>
              <p *ngIf="item.doc.note" class="text-xs text-gray-400 italic mt-1">"{{ item.doc.note }}"</p>

              <!-- Upload error -->
              <div *ngIf="uploadError() === item.index" class="flex items-start gap-1.5 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <svg class="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div class="flex-1">
                  <p class="text-xs font-medium text-red-800">Upload failed</p>
                  <p class="text-xs text-red-600 mt-0.5">{{ uploadErrorMessage() }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <!-- File link (when uploaded) -->
              <a
                *ngIf="item.doc.url"
                [href]="item.doc.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800
                       border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                title="View file">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                View
              </a>

              <!-- Upload / Replace / Retry button -->
              <button
                *ngIf="uploadError() !== item.index"
                (click)="triggerUpload(item.index)"
                [disabled]="uploading() === item.index"
                class="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors
                       border disabled:opacity-50
                       {{ item.doc.url
                         ? 'text-gray-500 border-gray-200 hover:bg-gray-100'
                         : 'text-blue-600 border-blue-200 hover:bg-blue-50' }}">
                <svg *ngIf="uploading() !== item.index" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                <svg *ngIf="uploading() === item.index" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {{ uploading() === item.index ? 'Uploading…' : (item.doc.url ? 'Replace' : 'Upload') }}
              </button>

              <!-- Retry button (when error) -->
              <button
                *ngIf="uploadError() === item.index"
                (click)="retryUpload(item.index)"
                class="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-red-600 rounded-lg
                       hover:bg-red-700 transition-colors border border-red-700">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Retry Upload
              </button>

              <!-- Remove uploaded file -->
              <button
                *ngIf="item.doc.url"
                (click)="clearFile(item.index)"
                class="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove uploaded file">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>

              <!-- Remove row (only for non-default / ad-hoc docs) -->
              <button
                *ngIf="isAdHoc(item.doc.id)"
                (click)="removeRow(item.index)"
                class="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove this document slot">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>

        </div>

        <div *ngIf="!filteredDocuments().length && documents().length > 0" class="px-5 py-8 text-center text-sm text-gray-400">
          No documents match the selected tag filter.
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
  uploadError = signal<number | null>(null);
  uploadErrorMessage = signal<string>('');
  addingRow = signal(false);
  editingIndex = signal<number | null>(null);
  editingLabel = '';
  editingTags = signal<number | null>(null);
  filterTag = signal<string | null>(null);

  newDocLabel    = '';
  newDocRequired = true;

  private pendingUploadIndex = -1;

  readonly AVAILABLE_TAGS = ['Legal', 'Financial', 'Identity', 'Compliance', 'Registration', 'Other'];

  uploadedCount = computed(() => this.documents().filter(d => !!d.url).length);

  filteredDocuments = computed(() => {
    const tag = this.filterTag();
    const docs = this.documents();
    if (!tag) return docs.map((doc, i) => ({ doc, index: i }));
    return docs
      .map((doc, i) => ({ doc, index: i }))
      .filter(({ doc }) => doc.tags?.includes(tag));
  });

  usedTags = computed(() => {
    const tags = new Set<string>();
    this.documents().forEach(d => d.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  });

  constructor(
    private api: GrantApplicationApiService,
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
    this.uploadError.set(null);
    this.uploadErrorMessage.set('');
    this.fileInputRef.nativeElement.value = '';
    this.fileInputRef.nativeElement.click();
  }

  retryUpload(index: number): void {
    this.uploadError.set(null);
    this.uploadErrorMessage.set('');
    this.triggerUpload(index);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const index = this.pendingUploadIndex;
    if (!files || files.length === 0 || index < 0) return;

    this.uploading.set(index);
    this.uploadError.set(null);
    this.uploadErrorMessage.set('');

    // Use a proxy object so UploadService can set the url on it
    const proxy: Record<string, string> = {};

    // Track if callback was called to detect failures
    let callbackCalled = false;

    try {
      this.uploadService.onUpload(
        files,
        proxy,
        'url',
        (url: string) => {
          // Success callback
          callbackCalled = true;

          if (url) {
            const updated = this.documents().map((doc, i) =>
              i === index
                ? { ...doc, url, uploaded_at: new Date().toISOString() }
                : doc
            );
            this.uploading.set(null);
            this.uploadError.set(null);
            this.save(updated);
          } else {
            // No URL returned - treat as error
            this.uploading.set(null);
            this.uploadError.set(index);
            this.uploadErrorMessage.set('Upload failed - no URL returned');
          }
        }
      );
    } catch (error: any) {
      console.error('Upload exception:', error);
      this.uploading.set(null);
      this.uploadError.set(index);
      this.uploadErrorMessage.set(
        error?.message || 'An unexpected error occurred during upload.'
      );
      return; // Exit early, don't set timeout
    }

    // Timeout to detect if callback never fired (upload failed)
    setTimeout(() => {
      if (this.uploading() === index && !callbackCalled) {
        this.uploading.set(null);
        this.uploadError.set(index);
        this.uploadErrorMessage.set('Upload failed or timed out. Please try again.');
      }
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

  // ── Rename & Tags ───────────────────────────────────────────────────────────

  startEditing(index: number, currentLabel: string): void {
    this.editingIndex.set(index);
    this.editingLabel = currentLabel;
  }

  cancelEditing(): void {
    this.editingIndex.set(null);
    this.editingLabel = '';
  }

  saveLabel(index: number): void {
    const label = this.editingLabel.trim();
    if (!label) {
      this.cancelEditing();
      return;
    }
    const updated = this.documents().map((doc, i) =>
      i === index ? { ...doc, label } : doc
    );
    this.save(updated);
    this.cancelEditing();
  }

  toggleEditTags(index: number): void {
    this.editingTags.set(this.editingTags() === index ? null : index);
  }

  toggleTag(index: number, tag: string): void {
    const updated = this.documents().map((doc, i) => {
      if (i !== index) return doc;
      const tags = doc.tags ?? [];
      const hasTag = tags.includes(tag);
      return {
        ...doc,
        tags: hasTag ? tags.filter(t => t !== tag) : [...tags, tag]
      };
    });
    this.save(updated);
  }

  hasTag(doc: IUploadedDocument, tag: string): boolean {
    return doc.tags?.includes(tag) ?? false;
  }

  removeTag(index: number, tag: string): void {
    const updated = this.documents().map((doc, i) => {
      if (i !== index) return doc;
      return { ...doc, tags: (doc.tags ?? []).filter(t => t !== tag) };
    });
    this.save(updated);
  }

  // ── Persist ─────────────────────────────────────────────────────────────────

  private save(docs: IUploadedDocument[]): void {
    this.documents.set(docs);
    this.api.updateApplication(this.applicantId, { documents: docs }).subscribe({
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
