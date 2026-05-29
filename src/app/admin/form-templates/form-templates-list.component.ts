import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormTemplateService } from './services/form-template.service';
import { FormTemplate, IFormTemplateData } from './interfaces/form-template.interfaces';
import { BUILT_IN_TEMPLATES, BuiltInTemplate } from './built-in-templates';

@Component({
  selector: 'app-form-templates-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg
                        flex items-center justify-center text-white flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                </path>
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-semibold text-gray-900">Form Templates</h1>
              <p class="text-sm text-gray-500">Build reusable interview questionnaires and dynamic forms</p>
            </div>
          </div>
          <button
            (click)="createNew()"
            class="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg
                   hover:bg-violet-700 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Blank Template
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-8">

        <!-- ── Built-in Starter Templates ───────────────────────────────── -->
        <div>
          <!-- Section header (clickable toggle) -->
          <button
            type="button"
            (click)="builtInsExpanded.set(!builtInsExpanded())"
            class="w-full flex items-center gap-3 mb-4 group">
            <h2 class="text-sm font-semibold text-gray-700 group-hover:text-violet-700 transition-colors">
              Start from a built-in template
            </h2>
            <span class="text-[10px] font-bold uppercase tracking-widest text-violet-600
                         bg-violet-50 border border-violet-200 rounded px-2 py-0.5">
              {{ builtInTemplates.length }} available
            </span>
            <i class="fas ml-auto text-gray-400 text-xs transition-transform"
               [class.fa-chevron-down]="!builtInsExpanded()"
               [class.fa-chevron-up]="builtInsExpanded()">
            </i>
          </button>

          <div *ngIf="builtInsExpanded()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              *ngFor="let tpl of builtInTemplates"
              class="bg-white rounded-xl border-2 transition-all group"
              [class.border-dashed]="!savedCopyOf(tpl.key)"
              [class.border-violet-200]="!savedCopyOf(tpl.key)"
              [class.hover:border-violet-400]="!savedCopyOf(tpl.key)"
              [class.border-solid]="!!savedCopyOf(tpl.key)"
              [class.border-green-300]="!!savedCopyOf(tpl.key)"
              [class.hover:shadow-md]="true">

              <!-- Card body -->
              <div class="p-5">
                <!-- Icon + badge row -->
                <div class="flex items-start justify-between mb-3">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                       [class.bg-gradient-to-br]="true"
                       [class.from-violet-400]="!savedCopyOf(tpl.key)"
                       [class.to-purple-500]="!savedCopyOf(tpl.key)"
                       [class.from-green-400]="!!savedCopyOf(tpl.key)"
                       [class.to-emerald-500]="!!savedCopyOf(tpl.key)">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z">
                      </path>
                    </svg>
                  </div>
                  <!-- Saved badge OR built-in badge -->
                  <span *ngIf="savedCopyOf(tpl.key); else builtInBadge"
                        class="text-[10px] font-bold uppercase tracking-widest text-green-700
                               bg-green-50 border border-green-200 rounded px-2 py-0.5">
                    Saved
                  </span>
                  <ng-template #builtInBadge>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-purple-600
                                 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">
                      Built-in
                    </span>
                  </ng-template>
                </div>

                <!-- Name -->
                <h3 class="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-violet-700
                           transition-colors leading-snug">
                  {{ tpl.name }}
                </h3>
                <p class="text-xs text-gray-500 leading-relaxed mb-4">
                  {{ tpl.description }}
                </p>

                <!-- Stats pills -->
                <div class="flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase
                               tracking-wide text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path>
                    </svg>
                    {{ tpl.data.sections.length }} sections
                  </span>
                  <span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase
                               tracking-wide text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                      </path>
                    </svg>
                    {{ countQuestions(tpl.data) }} questions
                  </span>
                </div>
              </div>

              <!-- Card footer -->
              <div class="px-5 py-3 border-t rounded-b-xl"
                   [class.bg-green-50]="!!savedCopyOf(tpl.key)"
                   [class.border-green-100]="!!savedCopyOf(tpl.key)"
                   [class.bg-violet-50]="!savedCopyOf(tpl.key)"
                   [class.border-violet-100]="!savedCopyOf(tpl.key)">

                <!-- Already saved: open copy + create another -->
                <ng-container *ngIf="savedCopyOf(tpl.key) as saved">
                  <div class="flex gap-2">
                    <button
                      (click)="openBuilder(saved)"
                      class="flex-1 py-2 text-xs font-semibold text-green-700 bg-white border border-green-300
                             rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600
                             transition-all flex items-center justify-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                        </path>
                      </svg>
                      Open saved copy
                    </button>
                    <button
                      (click)="createFromBuiltIn(tpl)"
                      [disabled]="creatingKey() === tpl.key"
                      title="Create another copy"
                      class="px-3 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200
                             rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50">
                      <svg *ngIf="creatingKey() === tpl.key" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                        </path>
                      </svg>
                      <svg *ngIf="creatingKey() !== tpl.key" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                    </button>
                  </div>
                </ng-container>

                <!-- Not yet saved: use template -->
                <button
                  *ngIf="!savedCopyOf(tpl.key)"
                  (click)="createFromBuiltIn(tpl)"
                  [disabled]="creatingKey() === tpl.key"
                  class="w-full py-2 text-xs font-semibold text-violet-700 bg-white border border-violet-300
                         rounded-lg hover:bg-violet-600 hover:text-white hover:border-violet-600
                         disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <svg *ngIf="creatingKey() === tpl.key"
                       class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                    </path>
                  </svg>
                  <svg *ngIf="creatingKey() !== tpl.key"
                       class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  {{ creatingKey() === tpl.key ? 'Creating…' : 'Use this template' }}
                </button>

              </div>

            </div>
          </div>
        </div>

        <!-- ── Divider ───────────────────────────────────────────────────── -->
        <div class="flex items-center gap-4">
          <div class="flex-1 border-t border-gray-200"></div>
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your saved templates</span>
          <div class="flex-1 border-t border-gray-200"></div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-16">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>

        <!-- Empty state (no saved templates) -->
        <div *ngIf="!isLoading() && templates().length === 0"
             class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <p class="text-sm text-gray-400">
            No saved templates yet. Use a built-in template above or create a blank one.
          </p>
        </div>

        <!-- Saved templates grid -->
        <div *ngIf="!isLoading() && templates().length > 0"
             class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let tpl of templates()"
            class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-300
                   transition-all cursor-pointer group"
            (click)="openBuilder(tpl)">
            <div class="p-5">

              <!-- Card header -->
              <div class="flex items-start justify-between mb-3">
                <div class="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                    </path>
                  </svg>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap justify-end">
                  <!-- Built-in source badge -->
                  <span *ngIf="tpl.data.built_in_key"
                        class="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200
                               rounded px-2 py-0.5 uppercase tracking-widest">
                    From built-in
                  </span>
                  <span class="text-[10px] font-semibold uppercase tracking-widest text-violet-500
                               bg-violet-50 border border-violet-200 rounded px-2 py-0.5">
                    v{{ tpl.data.version }}
                  </span>
                </div>
              </div>

              <!-- Name + description -->
              <h3 class="text-sm font-semibold text-gray-900 mb-1 group-hover:text-violet-700 transition-colors
                         line-clamp-2 leading-snug">
                {{ tpl.data.name }}
              </h3>
              <p *ngIf="tpl.data.description" class="text-xs text-gray-500 line-clamp-2 mb-3">
                {{ tpl.data.description }}
              </p>

              <!-- Stats row -->
              <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h7"></path>
                  </svg>
                  {{ tpl.data.sections.length }} section{{ tpl.data.sections.length !== 1 ? 's' : '' }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                    </path>
                  </svg>
                  {{ countQuestions(tpl.data) }} question{{ countQuestions(tpl.data) !== 1 ? 's' : '' }}
                </span>
                <span *ngIf="tpl.updated_at" class="ml-auto text-gray-400">
                  {{ formatDate(tpl.updated_at) }}
                </span>
              </div>

            </div>

            <!-- Card footer actions -->
            <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl
                        flex items-center justify-end gap-2">
              <button
                (click)="openBuilder(tpl); $event.stopPropagation()"
                class="px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 rounded-lg transition-colors">
                Edit
              </button>
              <button
                (click)="deleteTemplate(tpl); $event.stopPropagation()"
                class="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Delete
              </button>
            </div>

          </div>
        </div>

      </div>

      <!-- Toast -->
      <div *ngIf="toast()"
           class="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm z-50 transition-all"
           [class.bg-green-600]="toast()!.type === 'success'"
           [class.bg-red-600]="toast()!.type === 'error'">
        {{ toast()!.message }}
      </div>

    </div>
  `
})
export class FormTemplatesListComponent implements OnInit {
  isLoading = signal(true);
  templates = signal<FormTemplate[]>([]);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  /** Collapsed by default when there are many built-in templates. */
  builtInsExpanded = signal(false);
  /** Key of the built-in template currently being created (null = idle). */
  creatingKey = signal<string | null>(null);

  readonly builtInTemplates: BuiltInTemplate[] = BUILT_IN_TEMPLATES;

  /**
   * Returns the saved FormTemplate that was created from the given built-in key,
   * or null if no saved copy exists yet. Only returns the first match (most recent).
   */
  savedCopyOf(key: string): FormTemplate | null {
    return this.templates().find(t => t.data.built_in_key === key) ?? null;
  }

  constructor(
    private router: Router,
    private formTemplateService: FormTemplateService
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.formTemplateService.getAllTemplates().subscribe({
      next: (templates) => {
        const sorted = [...templates].sort((a, b) => {
          const aDate = a.updated_at ?? a.created_at ?? '';
          const bDate = b.updated_at ?? b.created_at ?? '';
          return bDate.localeCompare(aDate);
        });
        this.templates.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Failed to load templates', 'error');
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/form-templates/new']);
  }

  createFromBuiltIn(tpl: BuiltInTemplate): void {
    this.creatingKey.set(tpl.key);
    // Deep-clone so the built-in definition is never mutated
    const data: IFormTemplateData = JSON.parse(JSON.stringify(tpl.data));
    // Track origin so the list can link saved copies back to their built-in source
    data.built_in_key = tpl.key;
    this.formTemplateService.createTemplate(data).subscribe({
      next: (saved) => {
        this.creatingKey.set(null);
        this.router.navigate(['/admin/form-templates', saved.id]);
      },
      error: () => {
        this.creatingKey.set(null);
        this.showToast('Failed to create template', 'error');
      }
    });
  }

  openBuilder(tpl: FormTemplate): void {
    this.router.navigate(['/admin/form-templates', tpl.id]);
  }

  deleteTemplate(tpl: FormTemplate): void {
    if (!confirm(`Delete "${tpl.data.name}"? This cannot be undone.`)) return;
    this.formTemplateService.deleteTemplate(tpl.id!).subscribe({
      next: () => {
        this.templates.update(list => list.filter(t => t.id !== tpl.id));
        this.showToast('Template deleted', 'success');
      },
      error: () => this.showToast('Failed to delete template', 'error')
    });
  }

  countQuestions(data: IFormTemplateData): number {
    return data.sections.reduce((sum, s) => sum + this.countSectionQuestions(s.questions), 0);
  }

  private countSectionQuestions(questions: any[]): number {
    return questions.reduce((sum, q) => {
      return sum + 1 + (q.children ? this.countSectionQuestions(q.children) : 0);
    }, 0);
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
