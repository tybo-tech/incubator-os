import {
  Component,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormTemplateService } from './services/form-template.service';
import {
  FormTemplate,
  IFormTemplateMeta,
} from './interfaces/form-template.interfaces';
import { NodeService } from '../../../services/node.service';

/** The workflow stage keys + labels fetched at runtime */
interface WorkflowStage {
  key: string;
  label: string;
}

/** Predefined roles available in the system */
const SYSTEM_ROLES = [
  'System Administrator',
  'Coordinator',
  'Judge',
  'External Judge',
  'Advisor',
  'Director',
  'Staff',
];

@Component({
  selector: 'app-form-template-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- ── Top bar ─────────────────────────────────────────────────────── -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <a [routerLink]="['/admin/form-templates', templateId]"
             class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Builder
          </a>
          <div class="h-4 w-px bg-gray-300"></div>
          <div>
            <h1 class="text-sm font-semibold text-gray-900">Form Settings</h1>
            <p *ngIf="template()" class="text-xs text-gray-400 truncate max-w-xs">
              {{ template()!.data.name }}
            </p>
          </div>
          <div class="ml-auto flex items-center gap-3">
            <span *ngIf="saveStatus()" class="text-xs text-gray-400 italic">{{ saveStatus() }}</span>
            <button (click)="save()" [disabled]="isSaving()"
              class="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg
                     hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {{ isSaving() ? 'Saving…' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Loading ─────────────────────────────────────────────────────── -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-24">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>

      <!-- ── Settings panels ──────────────────────────────────────────────── -->
      <div *ngIf="!isLoading()" class="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <!-- ── Submission mode ────────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest">Submission Mode</h2>
            <p class="text-xs text-gray-500 mt-0.5">How respondents interact with this form.</p>
          </div>
          <div class="px-6 py-5 space-y-5">

            <!-- Multi-judge toggle -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-gray-800">Multi-judge mode</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Multiple judges each submit their own copy. Admin sees per-judge scores and averages.
                </p>
              </div>
              <button type="button" (click)="meta.multi_judge = !meta.multi_judge"
                [class]="meta.multi_judge
                  ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-violet-600 transition-colors'
                  : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
                <span [class]="meta.multi_judge
                  ? 'inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform'
                  : 'inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform'">
                </span>
              </button>
            </div>

          </div>
        </div>

        <!-- ── Company / Applicant identification ──────────────────────────── -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest">Company Identification</h2>
            <p class="text-xs text-gray-500 mt-0.5">How respondents identify their company when filling this form.</p>
          </div>
          <div class="px-6 py-5 space-y-5">

            <!-- Require company selection -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-gray-800">Require company selection</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Respondents must pick their company from the registered applicant list.
                </p>
              </div>
              <button type="button" (click)="meta.require_company_selection = !meta.require_company_selection"
                [class]="meta.require_company_selection
                  ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-violet-600 transition-colors'
                  : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
                <span [class]="meta.require_company_selection
                  ? 'inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform'
                  : 'inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform'">
                </span>
              </button>
            </div>

            <!-- Stage filter (only shown when require_company_selection is on) -->
            <div *ngIf="meta.require_company_selection" class="pl-4 border-l-2 border-violet-200 space-y-3">
              <div>
                <p class="text-xs font-semibold text-gray-700 mb-2">Filter applicants by stage</p>
                <p class="text-[11px] text-gray-400 mb-3">
                  Only applicants in the selected stages will appear in the picker.
                  Leave all unchecked to show all applicants.
                </p>
                <div *ngIf="isLoadingWorkflow()" class="text-xs text-gray-400">Loading stages…</div>
                <div *ngIf="!isLoadingWorkflow()" class="flex flex-wrap gap-2">
                  <label *ngFor="let stage of workflowStages()"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                    [class.bg-violet-600]="isStageSelected(stage.key)"
                    [class.text-white]="isStageSelected(stage.key)"
                    [class.border-violet-600]="isStageSelected(stage.key)"
                    [class.bg-white]="!isStageSelected(stage.key)"
                    [class.text-gray-700]="!isStageSelected(stage.key)"
                    [class.border-gray-200]="!isStageSelected(stage.key)">
                    <input type="checkbox" class="sr-only"
                      [checked]="isStageSelected(stage.key)"
                      (change)="toggleStage(stage.key)">
                    <span class="text-xs font-medium">{{ stage.label }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Allow guest company -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-gray-800">Allow guest company</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  If the company is not in the list, respondents can type their own company name.
                </p>
              </div>
              <button type="button" (click)="meta.allow_guest_company = !meta.allow_guest_company"
                [class]="meta.allow_guest_company
                  ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-violet-600 transition-colors'
                  : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
                <span [class]="meta.allow_guest_company
                  ? 'inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform'
                  : 'inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform'">
                </span>
              </button>
            </div>

          </div>
        </div>

        <!-- ── Respondent identity ─────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest">Respondent Identity</h2>
            <p class="text-xs text-gray-500 mt-0.5">How the person filling the form identifies themselves.</p>
          </div>
          <div class="px-6 py-5 space-y-5">

            <!-- Require user selection -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-gray-800">Require user selection</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Respondents must pick their name from the registered user list instead of typing it.
                </p>
              </div>
              <button type="button" (click)="meta.require_user_selection = !meta.require_user_selection"
                [class]="meta.require_user_selection
                  ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-violet-600 transition-colors'
                  : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
                <span [class]="meta.require_user_selection
                  ? 'inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform'
                  : 'inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform'">
                </span>
              </button>
            </div>

            <!-- Role filter (only when require_user_selection is on) -->
            <div *ngIf="meta.require_user_selection" class="pl-4 border-l-2 border-violet-200 space-y-3">
              <div>
                <p class="text-xs font-semibold text-gray-700 mb-2">Limit to these roles</p>
                <p class="text-[11px] text-gray-400 mb-3">
                  Only users with the selected roles will appear in the picker.
                  Leave all unchecked to show all users.
                </p>
                <div class="flex flex-wrap gap-2">
                  <label *ngFor="let role of systemRoles"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                    [class.bg-violet-600]="isRoleSelected(role)"
                    [class.text-white]="isRoleSelected(role)"
                    [class.border-violet-600]="isRoleSelected(role)"
                    [class.bg-white]="!isRoleSelected(role)"
                    [class.text-gray-700]="!isRoleSelected(role)"
                    [class.border-gray-200]="!isRoleSelected(role)">
                    <input type="checkbox" class="sr-only"
                      [checked]="isRoleSelected(role)"
                      (change)="toggleRole(role)">
                    <span class="text-xs font-medium">{{ role }}</span>
                  </label>
                </div>
              </div>

              <!-- Allow free-text fallback -->
              <div class="flex items-start justify-between gap-4 pt-3 border-t border-gray-100">
                <div>
                  <p class="text-sm font-medium text-gray-800">Allow free-text name</p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    If the person is not in the list, they can type their own name.
                  </p>
                </div>
                <button type="button" (click)="meta.allow_guest_user = !meta.allow_guest_user"
                  [class]="meta.allow_guest_user
                    ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-violet-600 transition-colors'
                    : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
                  <span [class]="meta.allow_guest_user
                    ? 'inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform'
                    : 'inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform'">
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Decision ────────────────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 class="text-sm font-bold text-gray-800 uppercase tracking-widest">Decision Field</h2>
            <p class="text-xs text-gray-500 mt-0.5">Show a final decision selector at the bottom of the admin submission view.</p>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-gray-800">Enable decision field</p>
                <p class="text-xs text-gray-500 mt-0.5">Shows a dropdown for the interviewer to record a recommendation.</p>
              </div>
              <button type="button" (click)="toggleDecision()"
                [class]="!!meta.decision
                  ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-violet-600 transition-colors'
                  : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
                <span [class]="!!meta.decision
                  ? 'inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform'
                  : 'inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform'">
                </span>
              </button>
            </div>

            <div *ngIf="meta.decision" class="pl-4 border-l-2 border-violet-200 space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Options (one per line)</label>
                <textarea
                  [ngModel]="decisionOptionsText"
                  (ngModelChange)="onDecisionOptionsChange($event)"
                  rows="4"
                  placeholder="Recommend&#10;Hold&#10;Decline"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                         focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:outline-none">
                </textarea>
                <p class="text-[11px] text-gray-400 mt-1">Each line becomes an option in the dropdown.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class FormTemplateSettingsComponent implements OnInit {
  templateId!: number;
  isLoading = signal(true);
  isLoadingWorkflow = signal(true);
  isSaving = signal(false);
  saveStatus = signal<string | null>(null);
  template = signal<FormTemplate | null>(null);
  workflowStages = signal<WorkflowStage[]>([]);

  /** Live copy of meta being edited */
  meta: IFormTemplateMeta & {
    require_company_selection?: boolean;
    allow_guest_company?: boolean;
    require_user_selection?: boolean;
    allow_guest_user?: boolean;
    user_roles?: string[];
    applicant_stages?: string[];
  } = {};

  decisionOptionsText = '';
  readonly systemRoles = SYSTEM_ROLES;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formTemplateSvc: FormTemplateService,
    private nodeService: NodeService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || isNaN(+idParam)) { this.router.navigate(['/admin/form-templates']); return; }
    this.templateId = +idParam;
    this.loadTemplate();
    this.loadWorkflowStages();
  }

  private loadTemplate(): void {
    this.formTemplateSvc.getTemplateById(this.templateId).subscribe({
      next: (tpl) => {
        this.template.set(tpl);
        // Deep-copy meta to avoid mutating the signal directly
        this.meta = { ...(tpl.data.meta ?? {}) } as any;
        this.decisionOptionsText = (this.meta.decision?.options ?? []).join('\n');
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadWorkflowStages(): void {
    this.nodeService.getNodesByType('grant_workflow').subscribe({
      next: (nodes: any[]) => {
        if (nodes.length) {
          const stages: WorkflowStage[] = (nodes[0].data?.stages ?? [])
            .filter((s: any) => !!s)
            .map((s: any) => ({ key: s.key, label: s.label ?? s.key }));
          this.workflowStages.set(stages);
        }
        this.isLoadingWorkflow.set(false);
      },
      error: () => this.isLoadingWorkflow.set(false),
    });
  }

  // ── Stage filter helpers ───────────────────────────────────────────────────

  isStageSelected(key: string): boolean {
    return (this.meta.applicant_stages ?? []).includes(key);
  }

  toggleStage(key: string): void {
    const stages = [...(this.meta.applicant_stages ?? [])];
    const idx = stages.indexOf(key);
    if (idx === -1) { stages.push(key); } else { stages.splice(idx, 1); }
    this.meta = { ...this.meta, applicant_stages: stages };
  }

  // ── Role filter helpers ────────────────────────────────────────────────────

  isRoleSelected(role: string): boolean {
    return (this.meta.user_roles ?? []).includes(role);
  }

  toggleRole(role: string): void {
    const roles = [...(this.meta.user_roles ?? [])];
    const idx = roles.indexOf(role);
    if (idx === -1) { roles.push(role); } else { roles.splice(idx, 1); }
    this.meta = { ...this.meta, user_roles: roles };
  }

  // ── Decision helpers ───────────────────────────────────────────────────────

  toggleDecision(): void {
    if (this.meta.decision) {
      this.meta = { ...this.meta, decision: undefined };
    } else {
      this.meta = { ...this.meta, decision: { field: 'recommendation', options: ['Recommend', 'Hold', 'Decline'] } };
      this.decisionOptionsText = 'Recommend\nHold\nDecline';
    }
  }

  onDecisionOptionsChange(text: string): void {
    this.decisionOptionsText = text;
    const options = text.split('\n').map(s => s.trim()).filter(Boolean);
    this.meta = { ...this.meta, decision: { field: 'recommendation', options } };
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  save(): void {
    const tpl = this.template();
    if (!tpl) return;
    this.isSaving.set(true);
    this.saveStatus.set(null);

    const updatedData = { ...tpl.data, meta: { ...this.meta } };

    this.formTemplateSvc.updateTemplate(this.templateId, updatedData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveStatus.set('Settings saved.');
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveStatus.set('Save failed — please try again.');
      },
    });
  }
}
