import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormTemplateService } from '../../../form-templates/services/form-template.service';
import {
  FormTemplate,
  FormSubmission,
  IFormSubmissionData,
  IFormSection,
  IFormQuestion,
} from '../../../form-templates/interfaces/form-template.interfaces';
import { FormQuestionComponent } from '../../../../shared/form-renderer/form-question.component';
import { GrantApplicationService } from '../../services/grant-application.service';
import { GrantBankStatement, IGrantApplicationData } from '../../interfaces/grant-application.interfaces';
import {
  ApplicantExportService,
  BankSummaryRow,
  IInterviewExportPayload,
} from '../../services/applicant-export.service';
import {
  JudgeAnswerDialogComponent,
  JudgeAnswerRow,
} from './judge-answer-dialog.component';

type PanelState = 'loading' | 'no-template' | 'error' | 'ready';
type InterviewTab = 'form' | 'scorecard';

/** Per-judge row shown in the scorecard */
interface JudgeRow {
  name: string;
  submissionId: number;
  scores: Record<string, number>;
  answers: Record<string, any>;
  total: number;
  submittedAt: string;
}

@Component({
  selector: 'app-applicant-interview',
  standalone: true,
  imports: [CommonModule, FormsModule, FormQuestionComponent, JudgeAnswerDialogComponent],
  template: `
    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <i class="fas fa-comments text-violet-600 text-sm"></i>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">{{ title }}</h3>
          <p class="text-xs text-gray-400">
            {{ template()?.data?.name ?? 'Interview questionnaire' }}
          </p>
        </div>
      </div>

      <!-- Right side: status badge + export + invite button -->
      <div class="flex items-center gap-2 flex-shrink-0">

        <!-- Export buttons (visible when template is loaded) -->
        <ng-container *ngIf="panelState() === 'ready'">
          <button
            (click)="exportToExcel()"
            [disabled]="isExporting()"
            title="Export to Excel"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                   text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg
                   hover:bg-emerald-100 transition-colors disabled:opacity-50">
            <i class="fas fa-file-excel text-xs"></i>
            <span class="hidden sm:inline">{{ isExporting() === 'excel' ? 'Exporting...' : 'Excel' }}</span>
          </button>
          <button
            (click)="exportToPdf()"
            [disabled]="isExporting()"
            title="Export to PDF"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                   text-red-700 bg-red-50 border border-red-200 rounded-lg
                   hover:bg-red-100 transition-colors disabled:opacity-50">
            <i class="fas fa-file-pdf text-xs"></i>
            <span class="hidden sm:inline">{{ isExporting() === 'pdf' ? 'Exporting...' : 'PDF' }}</span>
          </button>
        </ng-container>

        <!-- Submission status badge (standard form mode only) -->
        <ng-container *ngIf="submission() && !isMultiJudge()">
          <span
            [class]="submission()!.data.status === 'submitted'
              ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'
              : 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700'">
            <i [class]="submission()!.data.status === 'submitted' ? 'fas fa-circle-check text-xs' : 'fas fa-pen text-xs'"></i>
            {{ submission()!.data.status === 'submitted' ? 'Submitted' : 'Draft' }}
          </span>
        </ng-container>
      </div>
    </div>

    <!-- ── Body ─────────────────────────────────────────────────────────────── -->

    <!-- Loading -->
    <div *ngIf="panelState() === 'loading'" class="px-5 py-10 text-center">
      <i class="fas fa-circle-notch fa-spin text-violet-400 text-2xl"></i>
    </div>

    <!-- No template configured -->
    <div *ngIf="panelState() === 'no-template'" class="px-5 py-10 text-center">
      <i class="fas fa-link-slash text-gray-300 text-3xl mb-3"></i>
      <p class="text-sm font-medium text-gray-500">No interview template selected</p>
      <p class="text-xs text-gray-400 mt-1">
        Go to <strong>Grant Applications &#x2192; Workflow Settings</strong>, expand this stage,
        enable the <em>Interview</em> component and pick a form template.
      </p>
    </div>

    <!-- Error -->
    <div *ngIf="panelState() === 'error'" class="px-5 py-10 text-center">
      <i class="fas fa-triangle-exclamation text-red-300 text-3xl mb-3"></i>
      <p class="text-sm text-red-500">Failed to load the interview template.</p>
    </div>

    <!-- ═══ MULTI-JUDGE MODE: judge link disclosure + scorecard only ═══════ -->
    <ng-container *ngIf="panelState() === 'ready' && template() && isMultiJudge()">

      <!-- Judge link disclosure banner -->
      <div class="mx-5 mt-5 mb-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-4">
        <p class="text-xs font-bold text-violet-800 mb-1 uppercase tracking-wide">
          This form is filled in by judges via a shared link
        </p>
        <p class="text-xs text-violet-600 mb-3">
          To cast a vote, copy the link below and open it in a new tab. Each judge submits their own evaluation independently.
        </p>
        <div class="flex gap-2 items-center">
          <input type="text" readonly [value]="judgeLink()"
                 class="flex-1 px-3 py-2 text-xs bg-white border border-violet-300 rounded-lg
                        text-gray-700 font-mono focus:outline-none min-w-0">
          <button (click)="copyJudgeLink()"
                  class="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg
                         hover:bg-violet-700 transition-colors flex items-center gap-1.5 flex-shrink-0">
            <i class="fas fa-copy text-xs"></i>
            {{ linkCopied() ? 'Copied!' : 'Copy Link' }}
          </button>
          <a [href]="judgeLink()" target="_blank" rel="noopener"
             class="px-4 py-2 text-xs font-semibold text-violet-700 bg-white border border-violet-300
                    rounded-lg hover:bg-violet-50 transition-colors flex items-center gap-1.5 flex-shrink-0">
            <i class="fas fa-arrow-up-right-from-square text-xs"></i>
            Open
          </a>
        </div>
      </div>

      <!-- ── Panel Scorecard ────────────────────────────────────────────────── -->
      <div class="border border-gray-200 rounded-xl overflow-hidden mx-5 mb-5">

        <!-- Scorecard header with big refresh -->
        <div class="flex items-center justify-between px-5 py-3 bg-violet-600">
          <div class="flex items-center gap-2">
            <i class="fas fa-table text-violet-200 text-xs"></i>
            <span class="text-xs font-bold uppercase tracking-widest text-white">Panel Scorecard</span>
            <span *ngIf="judgeSubmissions().length > 0"
                  class="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
              {{ judgeSubmissions().length }} judge{{ judgeSubmissions().length !== 1 ? 's' : '' }}
            </span>
          </div>
          <button (click)="loadJudgeSubmissions()" [disabled]="isLoadingJudges()"
                  class="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold
                         bg-white text-violet-700 rounded-lg
                         hover:bg-violet-50 transition-colors disabled:opacity-40">
            <i class="fas fa-rotate-right text-xs" [class.fa-spin]="isLoadingJudges()"></i>
            {{ isLoadingJudges() ? 'Refreshing...' : 'Refresh Scores' }}
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoadingJudges()" class="py-10 text-center">
          <i class="fas fa-circle-notch fa-spin text-violet-400 text-xl"></i>
          <p class="text-xs text-gray-400 mt-2">Loading judge scores...</p>
        </div>

        <!-- No submissions yet -->
        <div *ngIf="!isLoadingJudges() && judgeSubmissions().length === 0"
             class="px-5 py-10 text-center">
          <i class="fas fa-clipboard-list text-gray-200 text-3xl mb-2"></i>
          <p class="text-sm font-medium text-gray-400">No evaluations submitted yet</p>
          <p class="text-xs text-gray-300 mt-1">Judges must open the link above and submit their scores.</p>
        </div>

        <!-- Scorecard data -->
        <ng-container *ngIf="!isLoadingJudges() && judgeSubmissions().length > 0">

          <!-- Summary banner -->
          <div class="grid grid-cols-3 divide-x divide-gray-100 bg-white border-b border-gray-100">
            <div class="px-5 py-3">
              <p class="text-[10px] font-bold uppercase tracking-widest text-violet-400">Panel Average</p>
              <p class="text-2xl font-bold text-violet-700">{{ judgeAverage() | number:'1.1-1' }}</p>
              <p class="text-[10px] text-gray-400">out of {{ judgeMaxTotal() }}</p>
            </div>
            <div class="px-5 py-3">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Score %</p>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-violet-500 rounded-full transition-all"
                     [style.width.%]="judgeMaxTotal() ? (judgeAverage() / judgeMaxTotal() * 100) : 0"></div>
              </div>
              <p class="text-[10px] text-gray-500 font-semibold mt-1">
                {{ judgeMaxTotal() ? (judgeAverage() / judgeMaxTotal() * 100 | number:'1.0-0') : 0 }}%
              </p>
            </div>
            <div class="px-5 py-3">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Evaluations</p>
              <p class="text-2xl font-bold text-gray-700">{{ judgeSubmissions().length }}</p>
              <p class="text-[10px] text-gray-400">submitted</p>
            </div>
          </div>

          <!-- Scoring matrix table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="bg-violet-600 text-white">
                  <th class="px-3 py-2.5 text-center font-semibold text-[11px] border-r border-violet-500 w-8">#</th>
                  <th class="px-3 py-2.5 text-left font-semibold text-[11px] border-r border-violet-500">Criterion</th>
                  <th *ngFor="let row of judgeRows()"
                      class="px-3 py-2.5 text-center font-semibold text-[11px] border-r border-violet-500"
                      style="min-width:72px">
                    <div class="flex flex-col items-center gap-0.5">
                      <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center
                                  text-white font-bold text-[10px]">
                        {{ (row.name || '?').charAt(0) }}
                      </div>
                      <span class="truncate text-[10px]" style="max-width:64px" [title]="row.name">
                        {{ row.name.split(' ')[0] }}
                      </span>
                    </div>
                  </th>
                  <th class="px-3 py-2.5 text-center font-semibold text-[11px] bg-violet-800" style="min-width:56px">Avg</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of criteriaList(); let i = index; let even = even"
                    [class]="even ? 'bg-gray-50' : 'bg-white'">
                  <td class="px-3 py-2 text-gray-400 text-center border-r border-gray-100">{{ i + 1 }}</td>
                  <td class="px-3 py-2 text-gray-700 leading-snug border-r border-gray-100">{{ c.label }}</td>
                  <td *ngFor="let row of judgeRows()"
                      class="px-3 py-2 text-center font-bold border-r border-gray-100"
                      [class.text-green-600]="(row.scores[c.id] || 0) >= c.max"
                      [class.text-amber-600]="(row.scores[c.id] || 0) > 0 && (row.scores[c.id] || 0) < c.max"
                      [class.text-gray-300]="!(row.scores[c.id])">
                    {{ row.scores[c.id] != null ? row.scores[c.id] : '-' }}
                  </td>
                  <td class="px-3 py-2 text-center font-bold text-violet-700 bg-violet-50">
                    {{ (criteriaAverages()[c.id] || 0) | number:'1.1-1' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-violet-200 bg-violet-50">
                  <td colspan="2" class="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                    Total
                  </td>
                  <td *ngFor="let row of judgeRows()"
                      class="px-3 py-2.5 text-center border-r border-gray-200">
                    <span class="font-bold text-violet-700">{{ row.total }}</span>
                    <span class="text-[10px] text-gray-400 font-normal">/{{ judgeMaxTotal() }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-center font-bold text-violet-800 bg-violet-100">
                    {{ judgeAverage() | number:'1.1-1' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Per-judge timestamp strip -->
          <div class="divide-y divide-gray-100">
            <div *ngFor="let row of judgeRows()"
                 class="flex items-center justify-between px-5 py-2.5 text-[11px]">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center
                            text-violet-700 font-bold text-[9px] flex-shrink-0">
                  {{ (row.name || '?').charAt(0) }}
                </div>
                <!-- Clickable name → opens answer detail dialog -->
                <button (click)="openJudgeDialog(row)"
                        class="font-medium text-gray-700 hover:text-violet-700 hover:underline
                               transition-colors flex items-center gap-1 cursor-pointer">
                  {{ row.name }}
                  <i class="fas fa-arrow-up-right-from-square text-[9px] text-gray-400"></i>
                </button>
                <span class="font-bold text-violet-600 ml-1">{{ row.total }}/{{ judgeMaxTotal() }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-gray-400">{{ row.submittedAt | date:'d MMM y, HH:mm' }}</span>
                <!-- Delete: two-step confirm -->
                <ng-container *ngIf="confirmDeleteId() !== row.submissionId">
                  <button (click)="confirmDeleteId.set(row.submissionId)"
                          class="text-gray-300 hover:text-red-400 transition-colors"
                          title="Delete this evaluation">
                    <i class="fas fa-trash-can text-[10px]"></i>
                  </button>
                </ng-container>
                <ng-container *ngIf="confirmDeleteId() === row.submissionId">
                  <span class="text-red-500 font-semibold">Delete?</span>
                  <button (click)="deleteJudgeSubmission(row.submissionId)"
                          [disabled]="isDeletingId() === row.submissionId"
                          class="px-2 py-0.5 rounded bg-red-500 text-white font-bold
                                 hover:bg-red-600 disabled:opacity-50 transition-colors">
                    <i *ngIf="isDeletingId() === row.submissionId"
                       class="fas fa-circle-notch fa-spin mr-0.5"></i>
                    Yes
                  </button>
                  <button (click)="confirmDeleteId.set(null)"
                          class="px-2 py-0.5 rounded bg-gray-100 text-gray-600
                                 hover:bg-gray-200 transition-colors font-medium">
                    No
                  </button>
                </ng-container>
              </div>
            </div>
          </div>

        </ng-container>
      </div>

    </ng-container>
    <!-- ═══ END MULTI-JUDGE MODE ════════════════════════════════════════════ -->

    <!-- Judge answer detail dialog -->
    <app-judge-answer-dialog
      *ngIf="selectedJudge() && template()"
      [judge]="judgeAnswerRow(selectedJudge()!)"
      [template]="template()!"
      [maxTotal]="judgeMaxTotal()"
      (closed)="selectedJudge.set(null)">
    </app-judge-answer-dialog>

    <!-- ═══ STANDARD FORM MODE ══════════════════════════════════════════════ -->
    <ng-container *ngIf="panelState() === 'ready' && template() && !isMultiJudge()">

      <!-- Interviewer notes -->
      <div class="px-5 pt-4 pb-2">
        <label class="block text-xs font-medium text-gray-500 mb-1.5">Interviewer Notes</label>
        <textarea
          [(ngModel)]="interviewerNotes"
          rows="2"
          placeholder="Optional internal notes for the interviewer..."
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                 focus:ring-2 focus:ring-violet-400 focus:border-transparent">
        </textarea>
      </div>

      <!-- Progress bar -->
      <div *ngIf="totalQuestions() > 0" class="px-5 pb-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-gray-400">Answered</span>
          <span class="text-xs font-medium text-violet-600">
            {{ answeredCount() }} / {{ totalQuestions() }}
          </span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-violet-500 rounded-full transition-all duration-300"
            [style.width.%]="progressPercent()">
          </div>
        </div>
      </div>

      <!-- Sections -->
      <div class="px-5 pb-5 space-y-6">
        <div
          *ngFor="let section of template()!.data.sections; trackBy: trackById"
          class="border border-gray-200 rounded-xl overflow-hidden shadow-sm">

          <!-- Section header -->
          <div
            class="flex items-center justify-between px-4 py-3 bg-violet-600 cursor-pointer"
            (click)="toggleSection(section.id)">
            <p class="text-xs font-bold text-white uppercase tracking-widest">
              {{ section.title }}
            </p>
            <i
              class="fas text-violet-200 text-xs"
              [class.fa-chevron-down]="!expandedSections[section.id]"
              [class.fa-chevron-up]="expandedSections[section.id]">
            </i>
          </div>

          <!-- Questions -->
          <div *ngIf="expandedSections[section.id]" class="px-4 py-3 space-y-4">
            <ng-container *ngFor="let question of section.questions; trackBy: trackById">
              <app-form-question
                [question]="question"
                [answers]="answers"
                variant="admin"
                (answerChange)="onAnswerChange($event)">
              </app-form-question>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Save / Submit bar -->
      <div class="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
        <span *ngIf="saveStatus()" class="text-xs text-gray-400 italic">{{ saveStatus() }}</span>

        <!-- Decision selector (only when template defines one) -->
        <ng-container *ngIf="template()?.data?.meta?.decision as dec">
          <div class="flex items-center gap-2 flex-shrink-0">
            <label class="text-xs font-medium text-gray-500 whitespace-nowrap">Decision:</label>
            <select
              [(ngModel)]="decisionValue"
              class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white
                     focus:ring-2 focus:ring-violet-400 focus:border-transparent">
              <option value="">- select -</option>
              <option *ngFor="let opt of dec.options" [value]="opt">{{ opt }}</option>
            </select>
          </div>
        </ng-container>

        <div class="flex items-center gap-2 ml-auto">
          <button
            type="button"
            (click)="saveDraft()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg
                   hover:bg-gray-50 transition-colors disabled:opacity-50">
            <i *ngIf="isSaving()" class="fas fa-circle-notch fa-spin text-xs mr-1"></i>
            Save Draft
          </button>
          <button
            type="button"
            (click)="submitInterview()"
            [disabled]="isSaving() || submission()?.data?.status === 'submitted'"
            class="px-5 py-2 text-sm text-white bg-violet-600 rounded-lg hover:bg-violet-700
                   transition-colors disabled:opacity-50 font-medium">
            {{ submission()?.data?.status === 'submitted' ? 'Submitted' : 'Submit' }}
          </button>
        </div>
      </div>

    </ng-container>
    <!-- ═══ END STANDARD FORM MODE ══════════════════════════════════════════ -->

  `,
})
export class ApplicantInterviewComponent implements OnChanges {
  @Input() applicantId!: number;
  @Input() templateId: number | undefined;
  /** Section title shown in the card header */
  @Input() title = 'Interview';
  /** company_id of the grant applicant — used to scope submissions per company */
  @Input() companyId: number | null | undefined;
  /** Human-readable label (e.g. company name) stored on the submission for display */
  @Input() companyName: string | undefined;
  /** Full applicant data — used to populate the export profile sheet. */
  @Input() applicantData: IGrantApplicationData | null = null;

  private readonly formTemplateSvc = inject(FormTemplateService);
  private readonly grantSvc = inject(GrantApplicationService);
  private readonly exportSvc = inject(ApplicantExportService);

  // ── State ──────────────────────────────────────────────────────────────────

  panelState = signal<PanelState>('loading');
  template = signal<FormTemplate | null>(null);
  submission = signal<FormSubmission | null>(null);

  answers: Record<string, any> = {};
  interviewerNotes = '';
  decisionValue = '';
  expandedSections: Record<string, boolean> = {};

  isSaving = signal(false);
  saveStatus = signal<string | null>(null);
  isExporting = signal<'excel' | 'pdf' | false>(false);

  // ── Multi-judge state ──────────────────────────────────────────────────────
  showInvitePanel = signal(false);
  activeTab = signal<InterviewTab>('form');
  linkCopied = signal(false);
  judgeSubmissions = signal<FormSubmission[]>([]);
  isLoadingJudges = signal(false);
  confirmDeleteId = signal<number | null>(null);
  isDeletingId = signal<number | null>(null);
  selectedJudge = signal<JudgeRow | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────

  totalQuestions = computed<number>(() => {
    const tpl = this.template();
    if (!tpl) return 0;
    return tpl.data.sections.reduce(
      (sum: number, s: IFormSection) => sum + s.questions.length,
      0
    );
  });

  answeredCount = computed<number>(() => {
    return Object.values(this.answers).filter(
      (v: unknown) => v !== null && v !== undefined && v !== ''
    ).length;
  });

  progressPercent = computed<number>(() => {
    const total = this.totalQuestions();
    return total === 0 ? 0 : Math.round((this.answeredCount() / total) * 100);
  });

  // ── Multi-judge computed ───────────────────────────────────────────────────

  isMultiJudge = computed<boolean>(() =>
    !!(this.template()?.data?.meta?.multi_judge)
  );

  judgeLink = computed<string>(() => {
    if (!this.templateId || !this.effectiveCompanyId) return '';
    const base = window.location.origin;
    const label = encodeURIComponent(this.companyName ?? '');
    return `${base}/f/${this.templateId}?mode=judge&companyId=${this.effectiveCompanyId}&applicantLabel=${label}`;
  });

  judgeMaxTotal = computed<number>(() => {
    const tpl = this.template();
    if (!tpl) return 0;
    let max = 0;
    for (const section of tpl.data.sections) {
      for (const q of section.questions) {
        if (q.type === 'rating') max += (q.scale ?? 5);
      }
    }
    return max;
  });

  judgeRows = computed<JudgeRow[]>(() =>
    this.judgeSubmissions().map(sub => {
      const answers: Record<string, any> = (sub.data as any).answers ?? {};
      const tpl = this.template();
      let total = 0;
      const scores: Record<string, number> = {};
      if (tpl) {
        for (const section of tpl.data.sections) {
          for (const q of section.questions) {
            if (q.type === 'rating' && answers[q.id] != null) {
              scores[q.id] = +answers[q.id];
              total += scores[q.id];
            }
          }
        }
      }
      const jn = answers['judge_name'];
      const nameFromAnswer = jn && typeof jn === 'object'
        ? (jn as any).full_name
        : (typeof jn === 'string' ? jn : null);
      return {
        name: (sub as any).submitted_by_name ?? nameFromAnswer ?? 'Unknown',
        submissionId: sub.id!,
        scores,
        answers,   // ← full answers for all question types
        total,
        submittedAt: (sub.data as any).submitted_at ?? sub.updated_at ?? '',
      };
    })
  );

  judgeAverage = computed<number>(() => {
    const rows = this.judgeRows();
    if (!rows.length) return 0;
    return rows.reduce((s, r) => s + r.total, 0) / rows.length;
  });

  /** All rating questions in template order — drives the scoring matrix rows. */
  criteriaList = computed<{ id: string; label: string; max: number }[]>(() => {
    const tpl = this.template();
    if (!tpl) return [];
    const list: { id: string; label: string; max: number }[] = [];
    for (const section of tpl.data.sections) {
      for (const q of section.questions) {
        if (q.type === 'rating') {
          list.push({
            id: q.id,
            label: q.label.replace(/^\d+\.\s+/, '').split('—')[0].trim(),
            max: q.scale ?? 5,
          });
        }
      }
    }
    return list;
  });

  /** Average score per criterion across all submitted judge evaluations. */
  criteriaAverages = computed<Record<string, number>>(() => {
    const rows = this.judgeRows();
    const criteria = this.criteriaList();
    if (!rows.length) return {};
    const result: Record<string, number> = {};
    for (const c of criteria) {
      const vals = rows.map(r => r.scores[c.id] ?? 0);
      result[c.id] = vals.reduce((a, b) => a + b, 0) / rows.length;
    }
    return result;
  });

  ratingEntries(row: JudgeRow): { label: string; score: number; max: number }[] {
    const tpl = this.template();
    if (!tpl) return [];
    const entries: { label: string; score: number; max: number }[] = [];
    for (const section of tpl.data.sections) {
      for (const q of section.questions) {
        if (q.type === 'rating') {
          entries.push({
            label: q.label.replace(/^\d+\.\s+/, '').split('—')[0].trim(),
            score: row.scores[q.id] ?? 0,
            max: q.scale ?? 5,
          });
        }
      }
    }
    return entries;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Always-valid scoping key for form_submission nodes.
   * Uses the formal company_id if set; falls back to applicantId so the
   * query always includes ?companyId=... and never returns all-companies data.
   */
  private get effectiveCompanyId(): number {
    return this.companyId ?? this.applicantId;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    // Reload on template or applicant change only.
    // companyId is a refinement — effectiveCompanyId handles the null case.
    if (changes['templateId'] || changes['applicantId']) {
      this.load();
    }
  }

  onAnswerChange(ev: { id: string; value: any }): void {
    this.answers[ev.id] = ev.value;
  }

  /** Pre-populate answers map with each question's `default` value (if set). */
  private seedDefaults(sections: IFormSection[]): void {
    const seed = (questions: IFormQuestion[]) => {
      for (const q of questions) {
        if (q.default !== undefined && q.default !== null) {
          this.answers[q.id] = q.default;
        }
        if (q.children?.length) seed(q.children);
      }
    };
    sections.forEach(s => seed(s.questions));
  }

  private load(): void {
    if (!this.templateId) {
      this.panelState.set('no-template');
      return;
    }

    this.panelState.set('loading');
    this.template.set(null);
    this.submission.set(null);
    this.answers = {};

    this.formTemplateSvc.getTemplateById(this.templateId).subscribe({
      next: (tpl: FormTemplate) => {
        this.template.set(tpl);
        // Default all sections expanded
        this.expandedSections = {};
        tpl.data.sections.forEach(s => (this.expandedSections[s.id] = true));
        // Seed default answers (only used when no existing submission exists)
        this.seedDefaults(tpl.data.sections);
        this.loadExistingSubmission();
        // Auto-load judge scores as soon as template is known
        if (tpl.data.meta?.multi_judge) {
          this.loadJudgeSubmissions();
        }
      },
      error: () => this.panelState.set('error'),
    });
  }

  private loadExistingSubmission(): void {
    if (!this.applicantId || !this.templateId) {
      this.panelState.set('ready');
      return;
    }
    // Multi-judge forms are filled by judges via the public link — there is no
    // single admin submission to load. Skip to avoid polluting this.answers
    // with the first judge's submission data.
    if (this.isMultiJudge()) {
      this.panelState.set('ready');
      return;
    }
    this.formTemplateSvc
      .getSubmissionsByTemplate(this.effectiveCompanyId, this.templateId)
      .subscribe({
        next: (list: FormSubmission[]) => {
          if (list.length > 0) {
            const sub = list[0];
            this.submission.set(sub);
            this.answers = { ...sub.data.answers };
            this.interviewerNotes = sub.data.meta?.interviewer_notes ?? '';
            this.decisionValue = sub.data.meta?.decision ?? '';
          }
          this.panelState.set('ready');
        },
        error: () => this.panelState.set('ready'),
      });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  saveDraft(): void {
    this.persist('draft');
  }

  submitInterview(): void {
    this.persist('submitted');
  }

  private persist(status: 'draft' | 'submitted'): void {
    const tpl = this.template();
    if (!tpl || !this.applicantId || !this.templateId) return;

    this.isSaving.set(true);
    this.saveStatus.set(null);

    const data: IFormSubmissionData = {
      form_template_id: this.templateId,
      form_template_name: tpl.data.name,
      submitted_at: new Date().toISOString(),
      status,
      answers: { ...this.answers },
      applicant_label: this.companyName,
      meta: {
        interviewer_notes: this.interviewerNotes,
        decision: this.decisionValue || undefined,
      },
    };

    const existing = this.submission();

    const op$ = existing?.id
      ? this.formTemplateSvc.updateSubmission(existing.id, data)
      : this.formTemplateSvc.createSubmission(this.templateId, this.effectiveCompanyId, data);

    op$.subscribe({
      next: (saved: FormSubmission) => {
        this.submission.set(saved);
        this.isSaving.set(false);
        this.saveStatus.set(
          status === 'submitted' ? 'Interview submitted.' : 'Draft saved.'
        );
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveStatus.set('Save failed — please try again.');
      },
    });
  }

  // ── View helpers ───────────────────────────────────────────────────────────

  toggleSection(id: string): void {
    this.expandedSections[id] = !this.expandedSections[id];
  }

  copyJudgeLink(): void {
    navigator.clipboard.writeText(this.judgeLink()).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    });
  }

  loadJudgeSubmissions(): void {
    if (!this.templateId) return;
    this.isLoadingJudges.set(true);
    this.formTemplateSvc
      .getAllSubmissionsForTemplate(this.templateId)
      .subscribe({
        next: (subs) => {
          // Filter to only this applicant's submissions
          const companyId = this.effectiveCompanyId;
          this.judgeSubmissions.set(
            subs.filter(s => s.company_id === companyId && (s.data as any)?.status === 'submitted')
          );
          this.isLoadingJudges.set(false);
        },
        error: () => this.isLoadingJudges.set(false),
      });
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  exportToExcel(): void {
    this._runExport('excel');
  }

  exportToPdf(): void {
    this._runExport('pdf');
  }

  private _runExport(format: 'excel' | 'pdf'): void {
    const tpl = this.template();
    if (!tpl) return;
    this.isExporting.set(format);

    this.grantSvc.getBankStatements(this.applicantId).subscribe({
      next: (statements: GrantBankStatement[]) => {
        const bankRows: BankSummaryRow[] = statements.map(node => {
          const d = node.data;
          const months: (number | undefined)[] = [
            d.m1, d.m2, d.m3, d.m4, d.m5, d.m6,
            d.m7, d.m8, d.m9, d.m10, d.m11, d.m12,
          ];
          return {
            financial_year_name: d.financial_year_name,
            months,
            total: d.total_amount ?? 0,
            activeMonths: months.filter(v => v != null && v > 0).length,
            capturedMonths: months.filter(v => v != null).length,
          };
        });

        const payload: IInterviewExportPayload = {
          applicantData: this.applicantData ?? { company_name: this.companyName ?? '' },
          companyName: this.companyName ?? this.applicantData?.company_name ?? 'Applicant',
          stageName: this.title,
          template: tpl,
          answers: { ...this.answers },
          interviewerNotes: this.interviewerNotes || undefined,
          decisionValue: this.decisionValue || undefined,
          submissionStatus: this.submission()?.data?.status,
          isMultiJudge: this.isMultiJudge(),
          judgeRows: this.judgeRows(),
          criteriaList: this.criteriaList(),
          criteriaAverages: this.criteriaAverages(),
          judgeMaxTotal: this.judgeMaxTotal(),
          judgeAverage: this.judgeAverage(),
          bankStatementRows: bankRows,
        };

        if (format === 'excel') {
          this.exportSvc.exportInterviewExcel(payload)
            .finally(() => this.isExporting.set(false));
        } else {
          this.exportSvc.exportInterviewPdf(payload);
          this.isExporting.set(false);
        }
      },
      error: () => this.isExporting.set(false),
    });
  }

  deleteJudgeSubmission(id: number): void {
    this.isDeletingId.set(id);
    this.formTemplateSvc.deleteSubmission(id).subscribe({
      next: () => {
        this.judgeSubmissions.update(list => list.filter(s => s.id !== id));
        this.confirmDeleteId.set(null);
        this.isDeletingId.set(null);
      },
      error: () => {
        this.isDeletingId.set(null);
        this.confirmDeleteId.set(null);
      },
    });
  }

  openJudgeDialog(row: JudgeRow): void {
    this.selectedJudge.set(row);
  }

  judgeAnswerRow(row: JudgeRow): JudgeAnswerRow {
    return row as JudgeAnswerRow;
  }

  trackById(_: number, item: IFormSection | IFormQuestion): string {
    return item.id;
  }
}
