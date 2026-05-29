import {
  Component, OnInit, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormTemplateService } from './services/form-template.service';
import {
  IFormTemplateData,
  IFormSection,
  IFormQuestion,
  QuestionType,
  QUESTION_TYPE_LABELS,
  MapsToField,
  MAPS_TO_LABELS,
} from './interfaces/form-template.interfaces';
import { FormQuestionEditorComponent } from './components/form-question-editor.component';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyQuestion(): IFormQuestion {
  return { id: uid(), label: '', type: 'text', required: false, children: [] };
}

function emptySection(order: number): IFormSection {
  return { id: uid(), title: '', order, questions: [] };
}

@Component({
  selector: 'app-form-template-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, FormQuestionEditorComponent],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- ── Sticky Header ─────────────────────────────────────────────── -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div class="px-6 py-4 flex items-center justify-between gap-4">

          <!-- Back + title -->
          <div class="flex items-center gap-3 min-w-0">
            <button
              (click)="goBack()"
              class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <div class="min-w-0">
              <input
                type="text"
                [(ngModel)]="draft.name"
                placeholder="Template name…"
                class="text-base font-semibold text-gray-900 bg-transparent border-0 outline-none
                       focus:bg-white focus:border focus:border-violet-300 focus:ring-0
                       rounded-lg px-2 py-1 w-full max-w-md transition-all
                       placeholder:font-normal placeholder:text-gray-400">
              <p class="text-xs text-gray-400 mt-0.5 px-2">
                {{ isNew ? 'New template' : 'Editing · v' + draft.version }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Settings link (only for saved templates) -->
            <button
              *ngIf="!isNew"
              (click)="viewSettings()"
              title="Form settings"
              class="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                     text-gray-600 border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Settings
            </button>

            <!-- Responses link (only for saved templates) -->
            <button
              *ngIf="!isNew"
              (click)="viewResponses()"
              title="View public responses"
              class="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                     text-violet-700 bg-violet-50 border border-violet-200 rounded-lg
                     hover:bg-violet-100 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Responses
            </button>
            <!-- Share link -->
            <button
              *ngIf="!isNew"
              (click)="copyShareLink()"
              title="Copy shareable form link"
              class="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                     text-gray-600 border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              {{ linkCopied() ? 'Copied!' : 'Share' }}
            </button>

            <!-- Export JSON -->
            <button
              (click)="exportTemplate()"
              title="Export template as JSON"
              class="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                     text-gray-600 border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Export
            </button>

            <!-- Import JSON (hidden file input) -->
            <label
              title="Import template from JSON"
              class="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                     text-gray-600 border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Import
              <input
                #importInput
                type="file"
                accept=".json,application/json"
                class="sr-only"
                (change)="importTemplate($event)">
            </label>

            <span *ngIf="isDirty()" class="text-xs text-amber-600 font-medium hidden sm:block">Unsaved changes</span>
            <button
              (click)="goBack()"
              class="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
                     hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              (click)="save()"
              [disabled]="isSaving()"
              class="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg
                     hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              <svg *ngIf="isSaving()" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
              </svg>
              {{ isSaving() ? 'Saving…' : 'Save Template' }}
            </button>
          </div>

        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────────────────────── -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-24">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>

      <div *ngIf="!isLoading()" class="max-w-3xl mx-auto px-4 py-8 space-y-4">

        <!-- Template meta -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Template Info</h2>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea
              [(ngModel)]="draft.description"
              rows="2"
              placeholder="Briefly describe what this form is used for…"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none
                     focus:ring-2 focus:ring-violet-400 focus:border-transparent"></textarea>
          </div>

          <!-- Multi-judge toggle -->
          <div class="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p class="text-xs font-medium text-gray-700">Multi-judge mode</p>
              <p class="text-xs text-gray-400 mt-0.5">
                Allow multiple judges to submit their own evaluation. Scores are averaged automatically.
                A shareable judge link is generated on each applicant's stage panel.
              </p>
            </div>
            <button
              type="button"
              (click)="toggleMultiJudge()"
              [class]="isMultiJudge()
                ? 'relative inline-flex w-10 h-5 rounded-full bg-violet-600 transition-colors flex-shrink-0'
                : 'relative inline-flex w-10 h-5 rounded-full bg-gray-200 transition-colors flex-shrink-0'">
              <span
                [class]="isMultiJudge()
                  ? 'inline-block w-4 h-4 rounded-full bg-white shadow translate-x-5 mt-0.5 transition-transform'
                  : 'inline-block w-4 h-4 rounded-full bg-white shadow translate-x-0.5 mt-0.5 transition-transform'">
              </span>
            </button>
          </div>
        </div>

        <!-- ── Sections ─────────────────────────────────────────────────── -->
        <div
          *ngFor="let section of draft.sections; let si = index"
          class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <!-- Section header -->
          <div class="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">

            <!-- Drag handle placeholder / order buttons -->
            <div class="flex flex-col gap-0.5">
              <button
                (click)="moveSectionUp(si)"
                [disabled]="si === 0"
                class="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25 transition-colors"
                title="Move up">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
              </button>
              <button
                (click)="moveSectionDown(si)"
                [disabled]="si === draft.sections.length - 1"
                class="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25 transition-colors"
                title="Move down">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>

            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest w-6 text-center">
              {{ si + 1 }}
            </span>

            <input
              type="text"
              [(ngModel)]="section.title"
              (ngModelChange)="markDirty()"
              placeholder="Section title…"
              class="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 outline-none
                     focus:bg-white focus:border focus:border-violet-300 focus:ring-0
                     rounded-lg px-2 py-1 placeholder:font-normal placeholder:text-gray-400">

            <button
              (click)="removeSection(si)"
              class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete section">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
              </svg>
            </button>
          </div>

          <!-- Questions list -->
          <div class="divide-y divide-gray-100">

            <!-- Empty state -->
            <div *ngIf="section.questions.length === 0"
                 class="px-5 py-6 text-center text-sm text-gray-400">
              No questions yet — add one below.
            </div>

            <!-- Question rows (each managed by the reusable editor component) -->
            <app-form-question-editor
              *ngFor="let q of section.questions; let qi = index"
              [question]="q"
              [isFirst]="qi === 0"
              [isLast]="qi === section.questions.length - 1"
              [questionTypes]="questionTypes"
              [mapsToOptions]="mapsToOptions"
              (dirty)="markDirty()"
              (remove)="removeQuestion(section, qi)"
              (moveUp)="moveQuestionUp(section, qi)"
              (moveDown)="moveQuestionDown(section, qi)">
            </app-form-question-editor>

          </div>

          <!-- Add question button -->
          <div class="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              (click)="addQuestion(section)"
              class="text-sm text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1.5 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Question
            </button>
          </div>

        </div>

        <!-- ── Add Section button ────────────────────────────────────────── -->
        <button
          (click)="addSection()"
          class="w-full py-3 text-sm font-medium text-violet-600 border-2 border-dashed border-violet-300
                 rounded-xl hover:bg-violet-50 transition-colors flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Add Section
        </button>

      </div>

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
export class FormTemplateBuilderComponent implements OnInit {

  isNew = true;
  templateId: number | null = null;

  isLoading = signal(true);
  isSaving = signal(false);
  isDirty = signal(false);
  linkCopied = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  readonly mapsToOptions: { value: MapsToField; label: string }[] =
    (Object.entries(MAPS_TO_LABELS) as [MapsToField, string][])
      .map(([value, label]) => ({ value, label }));

  draft: IFormTemplateData = {
    name: '',
    description: '',
    version: 1,
    sections: [],
  };

  readonly questionTypes: { value: QuestionType; label: string }[] =
    (Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(
      ([value, label]) => ({ value, label })
    );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formTemplateService: FormTemplateService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isNew = false;
      this.templateId = +idParam;
      this.loadTemplate(this.templateId);
    } else {
      this.isNew = true;
      this.isLoading.set(false);
    }
  }

  private loadTemplate(id: number): void {
    this.formTemplateService.getTemplateById(id).subscribe({
      next: (tpl) => {
        this.draft = JSON.parse(JSON.stringify(tpl.data)); // deep clone
        this.isLoading.set(false);
      },
      error: () => {
        this.showToast('Failed to load template', 'error');
        this.isLoading.set(false);
      }
    });
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  addSection(): void {
    this.draft.sections = [
      ...this.draft.sections,
      emptySection(this.draft.sections.length + 1)
    ];
    this.markDirty();
  }

  removeSection(index: number): void {
    if (!confirm('Remove this section and all its questions?')) return;
    this.draft.sections = this.draft.sections.filter((_, i) => i !== index);
    this.reorderSections();
    this.markDirty();
  }

  moveSectionUp(index: number): void {
    if (index === 0) return;
    const s = [...this.draft.sections];
    [s[index - 1], s[index]] = [s[index], s[index - 1]];
    this.draft.sections = s;
    this.reorderSections();
    this.markDirty();
  }

  moveSectionDown(index: number): void {
    if (index === this.draft.sections.length - 1) return;
    const s = [...this.draft.sections];
    [s[index], s[index + 1]] = [s[index + 1], s[index]];
    this.draft.sections = s;
    this.reorderSections();
    this.markDirty();
  }

  private reorderSections(): void {
    this.draft.sections.forEach((s, i) => (s.order = i + 1));
  }

  // ── Questions ────────────────────────────────────────────────────────────────

  addQuestion(section: IFormSection): void {
    section.questions = [...section.questions, emptyQuestion()];
    this.markDirty();
  }

  removeQuestion(section: IFormSection, qi: number): void {
    section.questions = section.questions.filter((_, i) => i !== qi);
    this.markDirty();
  }

  moveQuestionUp(section: IFormSection, qi: number): void {
    if (qi === 0) return;
    const q = [...section.questions];
    [q[qi - 1], q[qi]] = [q[qi], q[qi - 1]];
    section.questions = q;
    this.markDirty();
  }

  moveQuestionDown(section: IFormSection, qi: number): void {
    if (qi === section.questions.length - 1) return;
    const q = [...section.questions];
    [q[qi], q[qi + 1]] = [q[qi + 1], q[qi]];
    section.questions = q;
    this.markDirty();
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  markDirty(): void {
    this.isDirty.set(true);
  }

  save(): void {
    if (!this.draft.name.trim()) {
      this.showToast('Please enter a template name', 'error');
      return;
    }
    this.isSaving.set(true);

    const data: IFormTemplateData = {
      ...this.draft,
      version: this.isNew ? 1 : this.draft.version,
    };

    const op = this.isNew
      ? this.formTemplateService.createTemplate(data)
      : this.formTemplateService.updateTemplate(this.templateId!, data);

    op.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.isDirty.set(false);
        if (this.isNew) {
          this.isNew = false;
          this.templateId = saved.id!;
          // Replace URL without full reload
          this.router.navigate(['/admin/form-templates', saved.id], { replaceUrl: true });
        }
        this.showToast('Template saved', 'success');
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('Failed to save template', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/form-templates']);
  }

  viewResponses(): void {
    if (this.templateId) {
      this.router.navigate(['/admin/form-templates', this.templateId, 'responses']);
    }
  }

  viewSettings(): void {
    if (this.templateId) {
      this.router.navigate(['/admin/form-templates', this.templateId, 'settings']);
    }
  }

  copyShareLink(): void {
    if (!this.templateId) return;
    const url = `${window.location.origin}/f/${this.templateId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      this.showToast('Share link copied to clipboard', 'success');
      setTimeout(() => this.linkCopied.set(false), 3000);
    });
  }

  exportTemplate(): void {
    const payload: IFormTemplateData = JSON.parse(JSON.stringify(this.draft));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (payload.name || 'form-template').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importTemplate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as IFormTemplateData;

        // Basic structural validation
        if (
          typeof parsed !== 'object' || parsed === null ||
          typeof parsed.name !== 'string' ||
          !Array.isArray(parsed.sections)
        ) {
          this.showToast('Invalid template file — missing required fields', 'error');
          return;
        }

        // Deep clone into draft; keep the existing id/version intact for updates
        this.draft = {
          ...JSON.parse(JSON.stringify(parsed)),
          version: this.isNew ? (parsed.version ?? 1) : this.draft.version,
        };
        this.markDirty();
        this.showToast('Template imported — review and save to apply', 'success');
      } catch {
        this.showToast('Could not parse file — make sure it is valid JSON', 'error');
      } finally {
        // Reset input so the same file can be re-imported if needed
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  // ── Display helpers ──────────────────────────────────────────────────────────

  isMultiJudge = computed(() => !!(this.draft.meta?.multi_judge));

  toggleMultiJudge(): void {
    this.draft = {
      ...this.draft,
      meta: {
        ...this.draft.meta,
        multi_judge: !this.draft.meta?.multi_judge,
      },
    };
    this.markDirty();
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
