import {
  Component,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormTemplateService } from './services/form-template.service';
import {
  FormTemplate,
  FormSubmission,
  IFormQuestion,
} from './interfaces/form-template.interfaces';

/** Normalised row for unified display (public response OR internal submission) */
interface NormalizedEntry {
  id: number;
  source: 'public' | 'internal';
  label: string;
  subLabel: string;
  status: 'draft' | 'submitted';
  date: string;
  answers: Record<string, any>;
  interviewerNotes?: string;
}

@Component({
  selector: 'app-form-template-responses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          (click)="backToBuilder()"
          class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-base font-semibold text-gray-900 truncate">
            {{ template()?.data?.name ?? 'Loading...' }}
          </h1>
          <p class="text-xs text-gray-500">All responses</p>
        </div>
        <button
          *ngIf="template()"
          (click)="copyLink()"
          title="Copy shareable link"
          class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-violet-700
                 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          {{ linkCopied() ? 'Link copied!' : 'Copy form link' }}
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 max-w-5xl mx-auto">

        <div *ngIf="isLoading()" class="flex justify-center py-16">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>

        <!-- Stats bar -->
        <div *ngIf="!isLoading()" class="flex flex-wrap gap-4 mb-6">

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center gap-3">
            <div class="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ totalCount() }}</p>
              <p class="text-xs text-gray-500">Total responses</p>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center gap-3">
            <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ submittedCount() }}</p>
              <p class="text-xs text-gray-500">Submitted</p>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center gap-3">
            <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ draftCount() }}</p>
              <p class="text-xs text-gray-500">In progress</p>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ publicCount() }}</p>
              <p class="text-xs text-gray-500">Via public link</p>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center gap-3">
            <div class="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ internalCount() }}</p>
              <p class="text-xs text-gray-500">Via interview</p>
            </div>
          </div>

        </div>

        <!-- Empty state -->
        <div *ngIf="!isLoading() && allEntries().length === 0"
             class="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <div class="w-14 h-14 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">No responses yet</h3>
          <p class="text-sm text-gray-400 mb-4">Share the form link to collect public responses, or use the interview workflow.</p>
          <button
            (click)="copyLink()"
            class="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            Copy form link
          </button>
        </div>

        <!-- Unified entries list -->
        <div *ngIf="!isLoading() && allEntries().length > 0" class="space-y-4">

          <div
            *ngFor="let entry of allEntries()"
            class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            <!-- Card header -->
            <div class="px-5 py-4 flex items-start justify-between gap-4 border-b border-gray-100">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 class="text-sm font-semibold text-gray-900 truncate">
                    {{ entry.label || '(unnamed)' }}
                  </h3>
                  <span
                    [class]="entry.source === 'public'
                      ? 'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200'
                      : 'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-violet-50 text-violet-600 border-violet-200'">
                    {{ entry.source === 'public' ? 'Public' : 'Interview' }}
                  </span>
                  <span
                    [class.bg-green-50]="entry.status === 'submitted'"
                    [class.text-green-700]="entry.status === 'submitted'"
                    [class.border-green-200]="entry.status === 'submitted'"
                    [class.bg-amber-50]="entry.status === 'draft'"
                    [class.text-amber-700]="entry.status === 'draft'"
                    [class.border-amber-200]="entry.status === 'draft'"
                    class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border">
                    {{ entry.status }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5">{{ entry.subLabel }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xs text-gray-400">{{ formatDate(entry.date) }}</p>
                <button
                  (click)="toggleExpand(entry.id)"
                  class="mt-1 text-xs text-violet-600 hover:underline font-medium">
                  {{ expandedId() === entry.id ? 'Hide answers' : 'View answers' }}
                </button>
              </div>
            </div>

            <!-- Answers panel (expanded) -->
            <div *ngIf="expandedId() === entry.id" class="px-5 py-4 bg-gray-50 space-y-4">
              <div *ngIf="entry.source === 'internal' && entry.interviewerNotes"
                   class="p-3 bg-violet-50 rounded-lg border border-violet-100">
                <p class="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Interviewer Notes</p>
                <p class="text-xs text-violet-800 leading-relaxed">{{ entry.interviewerNotes }}</p>
              </div>
              <ng-container *ngFor="let section of template()?.data?.sections">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {{ section.title }}
                  </p>
                  <div class="space-y-2">
                    <ng-container *ngFor="let q of flatQuestions(section.questions)">
                      <div *ngIf="entry.answers[q.id] !== undefined && entry.answers[q.id] !== null
                                  && entry.answers[q.id] !== ''"
                           class="flex gap-3">
                        <span class="text-xs text-gray-500 w-48 flex-shrink-0 leading-relaxed">
                          {{ q.label }}
                        </span>
                        <span class="text-xs font-medium text-gray-800 flex-1 leading-relaxed">
                          {{ formatAnswer(entry.answers[q.id]) }}
                        </span>
                      </div>
                    </ng-container>
                  </div>
                </div>
              </ng-container>
            </div>

          </div>
        </div>

      </div>

      <!-- Toast -->
      <div *ngIf="toast()"
           class="fixed bottom-4 right-4 px-4 py-3 bg-gray-900 text-white text-sm
                  rounded-lg shadow-lg z-50">
        {{ toast() }}
      </div>

    </div>
  `,
})
export class FormTemplateResponsesComponent implements OnInit {
  isLoading    = signal(true);
  template     = signal<FormTemplate | null>(null);
  expandedId   = signal<number | null>(null);
  linkCopied   = signal(false);
  toast        = signal<string | null>(null);

  private allSubmissions = signal<FormSubmission[]>([]);

  allEntries = computed<NormalizedEntry[]>(() => {
    return this.allSubmissions().map(s => {
      const isPublic = !!s.data.respondent;
      return {
        id: s.id!,
        source: (isPublic ? 'public' : 'internal') as 'public' | 'internal',
        label: isPublic
          ? (s.data.respondent!.director_name || s.data.respondent!.company_name || '(unnamed)')
          : (s.data.applicant_label || s.data.form_template_name || '(interview)'),
        subLabel: isPublic
          ? [s.data.respondent!.email, s.data.respondent!.company_name].filter(Boolean).join(' - ')
          : (s.data.meta?.interviewer_notes
              ? ('Interviewer: ' + s.data.meta.interviewer_notes.slice(0, 80) + '...')
              : 'Internal interview submission'),
        status: s.data.status,
        date: s.data.submitted_at,
        answers: s.data.answers,
        interviewerNotes: s.data.meta?.interviewer_notes,
      };
    }).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  });

  totalCount    = computed(() => this.allEntries().length);
  submittedCount = computed(() => this.allEntries().filter(e => e.status === 'submitted').length);
  draftCount    = computed(() => this.allEntries().filter(e => e.status === 'draft').length);
  publicCount   = computed(() => this.allEntries().filter(e => e.source === 'public').length);
  internalCount = computed(() => this.allEntries().filter(e => e.source === 'internal').length);

  private templateId!: number;
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private formTemplateService = inject(FormTemplateService);

  constructor() {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || isNaN(+idParam)) return;
    this.templateId = +idParam;

    this.formTemplateService.getTemplateById(this.templateId).subscribe({
      next: (tpl: FormTemplate) => this.template.set(tpl),
    });

    this.formTemplateService.getAllSubmissionsForTemplate(this.templateId).subscribe({
      next: (submissions) => {
        this.allSubmissions.set(submissions);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  backToBuilder(): void {
    this.router.navigate(['/admin/form-templates', this.templateId]);
  }

  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  copyLink(): void {
    const url = window.location.origin + '/f/' + this.templateId;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      this.showToast('Link copied: ' + url);
      setTimeout(() => this.linkCopied.set(false), 3000);
    });
  }

  flatQuestions(questions: IFormQuestion[]): IFormQuestion[] {
    const result: IFormQuestion[] = [];
    for (const q of questions) {
      result.push(q);
      if (q.children?.length) {
        result.push(...this.flatQuestions(q.children));
      }
    }
    return result;
  }

  formatAnswer(value: any): string {
    if (value === true)  return 'Yes';
    if (value === false) return 'No';
    return String(value);
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3500);
  }
}
