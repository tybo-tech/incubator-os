import {
  Component,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormTemplateService } from '../../admin/form-templates/services/form-template.service';
import {
  FormTemplate,
  IFormSection,
  IFormResponseRespondent,
  IFormSubmissionData,
  MapsToField,
} from '../../admin/form-templates/interfaces/form-template.interfaces';
import { FormQuestionComponent } from '../../shared/form-renderer/form-question.component';
import { ApplicantIdCardComponent } from '../../admin/grant-funding/applicant-shell/pages/applicant-id-card.component';
import { ApplicantBankStatementSummaryComponent } from '../../admin/grant-funding/applicant-shell/pages/applicant-bank-statement-summary.component';
import { GrantApplicationService } from '../../admin/grant-funding/services/grant-application.service';
import { IGrantApplicationData } from '../../admin/grant-funding/interfaces/grant-application.interfaces';


type PageState = 'loading' | 'not-found' | 'form' | 'submitted';
type FormMode = 'public' | 'judge';

@Component({
  selector: 'app-public-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FormQuestionComponent, ApplicantIdCardComponent, ApplicantBankStatementSummaryComponent],
  template: `
    <div *ngIf="mode === 'judge' && alreadySubmitted()"
         class="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-6">
      <div class="text-center max-w-sm">
        <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Already submitted</h2>
        <p class="text-sm text-gray-600">
          <strong>{{ judgeName }}</strong>, your evaluation for
          <strong>{{ applicantLabel }}</strong> has already been recorded.
        </p>
        <p class="text-xs text-gray-400 mt-2">Contact the organiser if you need to make changes.</p>
      </div>
    </div>

    <div *ngIf="!(mode === 'judge' && alreadySubmitted())"
         class="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex flex-col">

      <div *ngIf="state() === 'loading'" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-3"></div>
          <p class="text-sm text-gray-500">Loading form...</p>
        </div>
      </div>

      <div *ngIf="state() === 'not-found'" class="flex-1 flex items-center justify-center p-6">
        <div class="text-center max-w-sm">
          <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-base font-semibold text-gray-900 mb-1">Form not found</h2>
          <p class="text-sm text-gray-500">This form link may be invalid or has been removed.</p>
        </div>
      </div>

      <div *ngIf="state() === 'submitted'" class="flex-1 flex items-center justify-center p-6">
        <div class="text-center max-w-sm">
          <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
          <ng-container *ngIf="mode === 'judge'">
            <p class="text-sm text-gray-600 mb-1">Your evaluation for <strong>{{ applicantLabel }}</strong> has been submitted.</p>
            <p class="text-xs text-gray-400">Judge: {{ judgeName }}</p>
          </ng-container>
          <ng-container *ngIf="mode === 'public'">
            <p class="text-sm text-gray-600 mb-1">Your response has been recorded, <strong>{{ respondent.director_name }}</strong>.</p>
            <p class="text-sm text-gray-500">Our team will be in touch with <strong>{{ respondent.company_name }}</strong> soon.</p>
          </ng-container>
        </div>
      </div>

      <ng-container *ngIf="state() === 'form' && template()">

        <div class="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div class="max-w-2xl mx-auto px-4 py-3">
            <div class="flex items-center gap-2 mb-0.5">
              <span *ngIf="mode === 'judge'"
                    class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                Judge Evaluation
              </span>
              <h1 class="text-sm font-semibold text-gray-900 truncate">{{ template()!.data.name }}</h1>
              <button *ngIf="hasDraft()" type="button" (click)="startOver()"
                class="ml-auto text-[10px] text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors flex-shrink-0">
                Start over
              </button>
            </div>
            <p *ngIf="mode === 'judge' && applicantLabel" class="text-xs text-gray-500 mb-1">
              Evaluating: <strong class="text-gray-700">{{ applicantLabel }}</strong>
            </p>
            <div class="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-violet-500 rounded-full transition-all duration-300" [style.width.%]="progressPercent()"></div>
            </div>
            <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Step {{ currentStep() + 1 }} of {{ totalSteps() }}</span>
              <span>{{ progressPercent() | number:'1.0-0' }}% complete</span>
            </div>
          </div>
        </div>

        <div class="flex-1 w-full px-4 py-8">

          <!-- ── Judge: applicant info panels (full-width) ── -->
          <ng-container *ngIf="mode === 'judge' && judgeApplicantId && judgeApplicantData()">
            <app-applicant-id-card
              [data]="judgeApplicantData()!"
              [ddAnswers]="null">
            </app-applicant-id-card>
            <app-applicant-bank-statement-summary
              [applicantId]="judgeApplicantId"
              [companyName]="applicantLabel || judgeApplicantData()!.company_name">
            </app-applicant-bank-statement-summary>
          </ng-container>

          <!-- Form questions — constrained width ── -->
          <div [class]="mode === 'judge' ? 'max-w-2xl mx-auto' : 'max-w-2xl mx-auto'">
            <div *ngIf="currentSection()">
              <div class="mb-6">
                <span class="text-xs font-bold uppercase tracking-widest text-violet-500">
                  Section {{ currentStep() + 1 }} of {{ template()!.data.sections.length }}
                </span>
                <h2 class="text-xl font-bold text-gray-900 mt-1">{{ currentSection()!.title }}</h2>
              </div>
              <div class="space-y-6">
                <ng-container *ngFor="let question of currentSection()!.questions">
                  <app-form-question
                    [question]="question"
                    [answers]="answers"
                    variant="public"
                    (answerChange)="setAnswer($event.id, $event.value)">
                  </app-form-question>
                </ng-container>
              </div>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white border-t border-gray-200 shadow-md">
          <div class="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button *ngIf="currentStep() > 0" type="button" (click)="prevStep()"
              class="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Back
            </button>
            <div *ngIf="currentStep() === 0"></div>
            <div class="flex-1 text-center">
              <span *ngIf="isSaving()" class="text-xs text-gray-400">Saving...</span>
              <span *ngIf="!isSaving() && draftSaved()" class="text-xs text-green-600">Draft saved</span>
            </div>
            <button *ngIf="!isLastStep()" type="button" (click)="nextStep()" [disabled]="isSaving()"
              class="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
              Next
            </button>
            <button *ngIf="isLastStep()" type="button" (click)="submit()" [disabled]="isSaving()"
              class="px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {{ isSaving() ? 'Submitting...' : (mode === 'judge' ? 'Submit Evaluation' : 'Submit') }}
            </button>
          </div>
        </div>

      </ng-container>

    </div>
  `,
})
export class PublicFormComponent implements OnInit {
  state = signal<PageState>('loading');
  template = signal<FormTemplate | null>(null);
  alreadySubmitted = signal(false);

  mode: FormMode = 'public';
  judgeName = '';
  applicantLabel = '';
  judgeApplicantId: number | null = null;
  judgeApplicantData = signal<IGrantApplicationData | null>(null);

  /** Company id/label locked from the URL — never cleared on startOver. */
  private urlCompanyId: number | null = null;
  private urlApplicantLabel = '';

  // ── localStorage draft key (set once templateId is known) ────────────────
  private draftKey = '';

  private saveDraftToStorage(): void {
    if (!this.draftKey) return;
    try {
      localStorage.setItem(this.draftKey, JSON.stringify({
        step: this.currentStep(),
        answers: this.answers,
        judgeName: this.judgeName,
        applicantLabel: this.applicantLabel,
        judgeApplicantId: this.judgeApplicantId,
        respondent: this.respondent,
        draftSubmissionId: this.draftSubmissionId,
      }));
    } catch { /* storage full — silently ignore */ }
  }

  private restoreDraftFromStorage(): void {
    if (!this.draftKey) return;
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.answers)          this.answers          = draft.answers;
      if (draft.judgeName)        this.judgeName        = draft.judgeName;
      if (draft.applicantLabel)   this.applicantLabel   = draft.applicantLabel;
      if (draft.judgeApplicantId) this.judgeApplicantId = draft.judgeApplicantId;
      if (draft.respondent)       this.respondent       = { ...this.respondent, ...draft.respondent };
      if (draft.draftSubmissionId) this.draftSubmissionId = draft.draftSubmissionId;
      if (typeof draft.step === 'number' && draft.step > 0) {
        this.currentStep.set(draft.step);
      }
      this.hasDraft.set(true);
    } catch { localStorage.removeItem(this.draftKey); }
  }

  private clearDraftFromStorage(): void {
    if (this.draftKey) localStorage.removeItem(this.draftKey);
    this.hasDraft.set(false);
  }

  startOver(): void {
    this.clearDraftFromStorage();
    this.answers = {};
    this.judgeName = '';
    this.draftSubmissionId = null;
    this.respondent = { director_name: '', email: '', company_name: '', registration_number: '' };
    // If the company was pre-set from the URL, keep it locked and re-populate its answer
    if (this.urlCompanyId) {
      this.judgeApplicantId = this.urlCompanyId;
      this.applicantLabel = this.urlApplicantLabel;
      const tpl = this.template();
      if (tpl) this.autoPopulateMapsToAnswers(tpl);
    } else {
      this.applicantLabel = '';
      this.judgeApplicantId = null;
    }
    this.currentStep.set(0);
  }

  currentStep = signal(0);
  totalSteps = computed(() => {
    const tpl = this.template();
    if (!tpl) return 1;
    return tpl.data.sections.length;
  });
  progressPercent = computed(() =>
    Math.round((this.currentStep() / Math.max(this.totalSteps() - 1, 1)) * 100)
  );
  isLastStep = computed(() => this.currentStep() === this.totalSteps() - 1);
  currentSection = computed((): IFormSection | null => {
    const tpl = this.template();
    if (!tpl) return null;
    const sorted = [...tpl.data.sections].sort((a, b) => a.order - b.order);
    return sorted[this.currentStep()] ?? null;
  });

  respondent: IFormResponseRespondent = {
    director_name: '',
    email: '',
    company_name: '',
    registration_number: '',
  };

  answers: Record<string, any> = {};
  isSaving = signal(false);
  draftSaved = signal(false);
  hasDraft = signal(false); // true when localStorage has a saved draft for this form

  private templateId!: number;
  private draftSubmissionId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private formTemplateService: FormTemplateService,
    private grantService: GrantApplicationService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || isNaN(+idParam)) { this.state.set('not-found'); return; }
    this.templateId = +idParam;

    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('mode') === 'judge') {
      this.mode = 'judge';
      this.applicantLabel = qp.get('applicantLabel') ?? '';
      const cid = qp.get('companyId');
      this.judgeApplicantId = cid ? +cid : null;
      this.urlCompanyId = this.judgeApplicantId;
      this.urlApplicantLabel = this.applicantLabel;
      this.judgeName = qp.get('judge') ?? '';
    }

    // Scope draft key to this form + mode + optional company so multiple
    // simultaneous judge evaluations don't overwrite each other.
    const cid = this.judgeApplicantId ?? 0;
    this.draftKey = `pf_draft_${this.templateId}_${this.mode}_${cid}`;

    // Load applicant data in parallel for the judge info panels
    if (this.mode === 'judge' && this.judgeApplicantId) {
      this.grantService.getApplicationById(this.judgeApplicantId).subscribe({
        next: node => this.judgeApplicantData.set(node.data),
        error: () => {},
      });
    }
    this.formTemplateService.getTemplateById(this.templateId).subscribe({
      next: (tpl) => {
        this.template.set(tpl);
        // Restore persisted draft BEFORE submitting check so step/answers are ready
        this.restoreDraftFromStorage();
        // Auto-populate any mapsTo:'company_id' answer when companyId came from the URL.
        // This ensures resolveNodeOverrides() returns the correct company_id on submission
        // and any applicant_picker rendered inside a section shows the pre-selected value.
        if (this.judgeApplicantId) {
          this.autoPopulateMapsToAnswers(tpl);
        }
        if (this.mode === 'judge' && this.judgeName) {
          this.answers['judge_name'] = this.answers['judge_name'] ?? this.judgeName;
        }
        this.state.set('form');
        // Background check: guard against duplicate submission if judge+company pre-known from URL
        if (this.mode === 'judge' && this.judgeName && this.judgeApplicantId) {
          this.checkAlreadySubmitted();
        }
      },
      error: () => this.state.set('not-found'),
    });
  }

  private checkAlreadySubmitted(): void {
    if (!this.judgeName || !this.judgeApplicantId) { this.state.set('form'); return; }
    this.formTemplateService.getSubmissionsByName(this.templateId, this.judgeName).subscribe({
      next: (subs) => {
        const submitted = subs.some(s => s.company_id === this.judgeApplicantId && (s.data as any)?.status === 'submitted');
        this.alreadySubmitted.set(submitted);
        this.state.set('form');
      },
      error: () => this.state.set('form'),
    });
  }

  setAnswer(questionId: string, value: any): void {
    this.answers = { ...this.answers, [questionId]: value };
    if (this.mode === 'judge') {
      // Keep judgeName in sync when judge_name picker answer changes
      if (questionId === 'judge_name') {
        this.judgeName = typeof value === 'object' ? (value?.full_name ?? '') : String(value ?? '');
      }
      // Keep applicant info in sync when a company_id-mapped picker answer changes
      if (typeof value === 'object' && value?.id && value?.company_name) {
        const q = this.template()?.data.sections.flatMap(s => s.questions).find(q => q.id === questionId);
        if (q?.mapsTo === 'company_id') {
          this.judgeApplicantId = value.id;
          this.applicantLabel = value.company_name;
        }
      }
    }
    this.saveDraftToStorage();
  }

  nextStep(): void {
    if (this.mode !== 'judge') this.saveDraft();
    this.currentStep.update(s => s + 1);
    this.saveDraftToStorage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep(): void {
    this.currentStep.update(s => s - 1);
    this.saveDraftToStorage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submit(): void {
    this.isSaving.set(true);
    if (this.mode === 'judge') { this.submitJudgeEvaluation(); } else { this.submitPublicResponse(); }
  }

  private submitJudgeEvaluation(): void {
    const tpl = this.template()!;
    const nodeOverrides = this.resolveNodeOverrides(tpl);
    const companyId = (nodeOverrides['company_id'] as number | undefined) ?? this.judgeApplicantId!;
    const createdBy  = nodeOverrides['created_by'] as number | undefined;
    const data: IFormSubmissionData = {
      form_template_id: tpl.id!,
      form_template_name: tpl.data.name,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      answers: { ...this.answers },
      applicant_label: this.applicantLabel || undefined,
      meta: { interviewer_notes: '' },
    };
    this.formTemplateService.createSubmission(this.templateId, companyId, data, this.judgeName, createdBy).subscribe({
      next: () => { this.isSaving.set(false); this.clearDraftFromStorage(); this.state.set('submitted'); },
      error: () => { this.isSaving.set(false); alert('Something went wrong. Please try again.'); },
    });
  }

  /**
   * After the template loads, pre-fill answers for any question with mapsTo:'company_id'
   * using the companyId from the URL. This lets resolveNodeOverrides() return the correct
   * company_id on submission, and shows the applicant as pre-selected in picker UI.
   * Only fills if the answer is not already set (e.g. restored from draft).
   */
  private autoPopulateMapsToAnswers(tpl: FormTemplate): void {
    for (const section of tpl.data.sections) {
      for (const q of section.questions) {
        if (q.mapsTo === 'company_id' && this.judgeApplicantId && !this.answers[q.id]) {
          // Shape matches ApplicantPickerValue so the picker renders a pre-selected chip
          this.answers[q.id] = {
            id: this.judgeApplicantId,
            company_name: this.applicantLabel || String(this.judgeApplicantId),
            registration_number: '',
            status: 'active',
          };
        }
      }
    }
  }

  /**
   * Scans all questions in the template for `mapsTo` fields.
   * For each one, reads the stored answer (expected to be a picker value object with `.id`)
   * and returns a map of node-level field → numeric id.
   */
  private resolveNodeOverrides(tpl: FormTemplate): Partial<Record<MapsToField, number>> {
    const overrides: Partial<Record<MapsToField, number>> = {};
    for (const section of tpl.data.sections) {
      for (const q of section.questions) {
        if (!q.mapsTo) continue;
        const answer = this.answers[q.id];
        if (answer == null) continue;
        const id = typeof answer === 'object' ? answer.id : +answer;
        if (!isNaN(id) && id > 0) overrides[q.mapsTo] = id;
      }
    }
    return overrides;
  }

  private submitPublicResponse(): void {
    const data = this.buildSubmissionData('submitted');
    const rawOverrides = this.resolveNodeOverrides(this.template()!);
    const nodeOverrides = { company_id: rawOverrides['company_id'] ?? null, created_by: rawOverrides['created_by'] ?? null };
    const obs$ = this.draftSubmissionId
      ? this.formTemplateService.updateSubmission(this.draftSubmissionId, data, nodeOverrides)
      : this.formTemplateService.createSubmission(this.templateId, null, data, undefined, undefined, nodeOverrides);
    obs$.subscribe({
      next: () => { this.isSaving.set(false); this.clearDraftFromStorage(); this.state.set('submitted'); },
      error: () => { this.isSaving.set(false); alert('Something went wrong. Please try again.'); },
    });
  }

  private buildSubmissionData(status: 'draft' | 'submitted'): IFormSubmissionData {
    const tpl = this.template()!;
    return {
      form_template_id: tpl.id!,
      form_template_name: tpl.data.name,
      respondent: { ...this.respondent },
      answers: { ...this.answers },
      submitted_at: new Date().toISOString(),
      status,
    };
  }

  private async saveDraft(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.isSaving.set(true);
      this.draftSaved.set(false);
      const data = this.buildSubmissionData('draft');
      const rawOverrides = this.resolveNodeOverrides(this.template()!);
      const nodeOverrides = { company_id: rawOverrides['company_id'] ?? null, created_by: rawOverrides['created_by'] ?? null };
      const obs$ = this.draftSubmissionId
        ? this.formTemplateService.updateSubmission(this.draftSubmissionId, data, nodeOverrides)
        : this.formTemplateService.createSubmission(this.templateId, null, data, undefined, undefined, nodeOverrides);
      obs$.subscribe({
        next: (saved) => {
          if (!this.draftSubmissionId) this.draftSubmissionId = saved.id ?? null;
          this.saveDraftToStorage(); // persist draftSubmissionId so resume skips re-create
          this.isSaving.set(false); this.draftSaved.set(true); resolve();
        },
        error: () => { this.isSaving.set(false); resolve(); },
      });
    });
  }
}
