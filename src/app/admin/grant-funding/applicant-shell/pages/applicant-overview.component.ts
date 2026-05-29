import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GrantApplicationService } from '../../services/grant-application.service';
import {
  IGrantApplicationData,
  IUploadedDocument,
  IWorkflowStage,
} from '../../interfaces/grant-application.interfaces';
import { WorkflowService } from '../../services/workflow.service';
import { FormTemplateService } from '../../../form-templates/services/form-template.service';
import { ApplicantChecklistComponent } from './applicant-checklist.component';
import { ApplicantBankStatementsComponent } from './applicant-bank-statements.component';
import { ApplicantComplianceComponent } from './applicant-compliance.component';
import { ApplicantDocumentsComponent } from './applicant-documents.component';
import { ApplicantInterviewComponent } from './applicant-interview.component';
import { ApplicantCompanyInfoComponent } from './applicant-company-info.component';
import { ApplicantAddressComponent } from './applicant-address.component';
import { ApplicantOwnershipComponent } from './applicant-ownership.component';
import { ApplicantDirectorsComponent } from './applicant-directors.component';
import { ApplicantStageActionsComponent } from './applicant-stage-actions.component';
import { ApplicantBankStatementSummaryComponent } from './applicant-bank-statement-summary.component';
import { ApplicantIdCardComponent } from './applicant-id-card.component';
import { ApplicantEditModalComponent } from './applicant-edit-modal.component';

@Component({
  selector: 'app-applicant-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ApplicantChecklistComponent, ApplicantBankStatementsComponent,
    ApplicantComplianceComponent, ApplicantDocumentsComponent,
    ApplicantInterviewComponent, ApplicantCompanyInfoComponent,
    ApplicantAddressComponent, ApplicantOwnershipComponent,
    ApplicantDirectorsComponent, ApplicantStageActionsComponent,
    ApplicantBankStatementSummaryComponent,
    ApplicantIdCardComponent,
    ApplicantEditModalComponent,
  ],
  template: `
    <div class="p-4 sm:p-6 space-y-8">

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <ng-container *ngIf="!isLoading()">

        <!-- ── Stage Workspace Tabs ────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div class="flex overflow-x-auto border-b border-gray-100">
            <button
              *ngFor="let stage of workflow().stages"
              (click)="selectStage(stage.key)"
              [disabled]="isFutureStage(stage.key)"
              [class]="stageTabClass(stage)">
              <span class="w-2 h-2 rounded-full flex-shrink-0" [class]="dotBg(stage.color)"></span>
              {{ stage.label }}
            </button>
          </div>
          <div *ngIf="selectedStageConfig()?.instruction" class="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <p class="text-xs text-gray-500 flex items-start gap-2">
              <svg class="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              {{ selectedStageConfig()?.instruction }}
            </p>
          </div>
          <div *ngIf="selectedStage() !== currentStageKey()" class="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
            </svg>
            <p class="text-xs text-amber-700">
              {{ isFutureStage(selectedStage()) ? 'This stage has not been reached yet.' : 'Viewing historical data — this stage is locked.' }}
            </p>
          </div>
        </div>

        <!-- ── Applicant ID Card (always visible on every stage) ── -->
        <app-applicant-id-card
          [data]="data()"
          [ddAnswers]="ddAnswers()"
          [applicantId]="applicantId"
          (editClicked)="showEditModal.set(true)"
          (documentsChanged)="onDocumentsChanged($event)">
        </app-applicant-id-card>

        <!-- ── Edit Modal (globally available across all stages) ── -->
        <app-applicant-edit-modal
          *ngIf="showEditModal()"
          [applicantId]="applicantId"
          [data]="data()"
          (closed)="showEditModal.set(false)"
          (saved)="onModalSaved($event)">
        </app-applicant-edit-modal>

        <!-- ── Bank Statement Summary (always visible on every stage) ── -->
        <app-applicant-bank-statement-summary
          [applicantId]="applicantId"
          [companyName]="data().company_name">
        </app-applicant-bank-statement-summary>

        <!-- ── Status & Checklist (always visible) ────────────────────── -->
        <app-applicant-checklist
          [applicantId]="applicantId"
          [data]="data()"
          [viewingStage]="selectedStage()"
          (dataUpdated)="onChecklistDataUpdated($event)">
        </app-applicant-checklist>
<br>
        <!-- ── Applied / entry stage: Company details ──────────────────────── -->
        <ng-container *ngIf="selectedStageConfig()?.type === 'entry'">
          <app-applicant-company-info
            [applicantId]="applicantId"
            [data]="data()"
            (dataUpdated)="onSubDataUpdated($event)">
          </app-applicant-company-info>
          <app-applicant-address
            [applicantId]="applicantId"
            [data]="data()"
            (dataUpdated)="onSubDataUpdated($event)">
          </app-applicant-address>
          <app-applicant-ownership
            [applicantId]="applicantId"
            [data]="data()"
            (dataUpdated)="onSubDataUpdated($event)">
          </app-applicant-ownership>
          <app-applicant-directors
            [applicantId]="applicantId"
            [data]="data()"
            (dataUpdated)="onSubDataUpdated($event)">
          </app-applicant-directors>
        </ng-container><!-- /entry stage -->

        <!-- ── Documents (any stage with documents component) ──────────── -->
        <ng-container *ngIf="hasStageComponent('documents')">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-violet-400">
            <app-applicant-documents
              [applicantId]="applicantId"
              [data]="data()"
              (dataUpdated)="onChecklistDataUpdated($event)">
            </app-applicant-documents>
          </div>
        </ng-container>

        <!-- ── Compliance (any stage with compliance component) ─────────── -->
        <ng-container *ngIf="hasStageComponent('compliance')">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-indigo-400">
            <app-applicant-compliance [embeddedApplicantId]="applicantId"></app-applicant-compliance>
          </div>
        </ng-container>

        <!-- ── Bank Statements (any stage with bank_statements component) ──── -->
        <ng-container *ngIf="hasStageComponent('bank_statements')">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-teal-400">
            <!-- Summary bar (shows once data has been saved) -->
            <div *ngIf="data().bank_statement_months || data().bank_statement_grand_total"
                 class="flex items-center gap-6 px-5 py-3 bg-teal-50 border-b border-teal-100">
              <div class="flex items-center gap-2">
                <span class="text-xs text-teal-600 font-medium">Months captured</span>
                <span class="text-sm font-bold text-teal-800">{{ data().bank_statement_months ?? 0 }}</span>
              </div>
              <div class="w-px h-4 bg-teal-200"></div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-teal-600 font-medium">Grand total</span>
                <span class="text-sm font-bold text-teal-800">R {{ (data().bank_statement_grand_total ?? 0) | number:'1.0-2' }}</span>
              </div>
            </div>
            <app-applicant-bank-statements
              [embeddedApplicantId]="applicantId"
              (statsChanged)="onBankStatsChanged($event)">
            </app-applicant-bank-statements>
          </div>
        </ng-container>

        <!-- ── Evaluation (any stage with evaluation component) ───────────── -->
        <ng-container *ngIf="hasStageComponent('evaluation')">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-orange-400 px-5 py-10 text-center">
            <p class="text-sm font-medium text-gray-500">Demo Evaluation</p>
            <p class="text-xs text-gray-400 mt-1">Evaluation notes and scoring will appear here.</p>
          </div>
        </ng-container>

        <!-- ── Dynamic Form (any stage with dynamic_form component) ──────────── -->
        <ng-container *ngIf="hasStageComponent('dynamic_form')">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-emerald-400">
            <app-applicant-interview
              [applicantId]="applicantId"
              [templateId]="selectedStageConfig()?.form_template_id"
              [title]="selectedStageConfig()?.label ?? 'Form'"
              [companyId]="applicantCompanyId()"
              [companyName]="data().company_name"
              [applicantData]="data()">
            </app-applicant-interview>
          </div>
        </ng-container>

        <!-- ── Interview (any stage with interview component) ────────────── -->
        <ng-container *ngIf="hasStageComponent('interview')">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-violet-500">
            <app-applicant-interview
              [applicantId]="applicantId"
              [templateId]="selectedStageConfig()?.interview_template_id"
              [companyId]="applicantCompanyId()"
              [companyName]="data().company_name"
              [applicantData]="data()">
            </app-applicant-interview>
          </div>
        </ng-container>

        <!-- ── Final stages: Summary ──────────────────────────────── -->
        <ng-container *ngIf="selectedStageConfig()?.type === 'final'">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-6">
            <p class="text-sm font-semibold text-gray-700 mb-1">Application Summary</p>
            <p class="text-xs text-gray-500">This application has reached its final status. Review the history panel above for full details.</p>
          </div>
        </ng-container>

        <!-- ── Stage Actions — always at the bottom ──────────────────── -->
        <app-stage-actions
          [applicantId]="applicantId"
          [data]="data()"
          [viewingStage]="selectedStage()"
          (dataUpdated)="onChecklistDataUpdated($event)">
        </app-stage-actions>

      </ng-container>

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
export class ApplicantOverviewComponent implements OnInit {
  private readonly WORKFLOW_ID = 'grant-2026';

  applicantId = 0;
  applicantCompanyId = signal<number | null>(null);
  data = signal<IGrantApplicationData>({ company_name: '' });
  isLoading = signal(true);
  isSaving = signal(false);
  showEditModal = signal(false);
  /** Due diligence form submission answers — loaded after application data is fetched. */
  ddAnswers = signal<Record<string, any> | null>(null);

  selectedStage = signal('');

  currentStageKey = computed(() => this.data()?.status ?? this.workflowSvc.getWorkflow(this.WORKFLOW_ID).stages[0]?.key ?? 'applied');

  selectedStageConfig = computed<IWorkflowStage | null>(() => {
    const key = this.selectedStage();
    return this.workflowSvc.getWorkflow(this.WORKFLOW_ID).stages.find(s => s.key === key) ?? null;
  });

  workflow = computed(() => this.workflowSvc.getWorkflow(this.WORKFLOW_ID));

  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  constructor(
    private route: ActivatedRoute,
    private grantService: GrantApplicationService,
    private workflowSvc: WorkflowService,
    private formTemplateSvc: FormTemplateService,
  ) { }

  ngOnInit(): void {
    this.route.parent!.params.subscribe(params => {
      this.applicantId = +params['id'];
      this.workflowSvc.loadWorkflow(this.WORKFLOW_ID).subscribe(() => this.loadData());
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.grantService.getApplicationById(this.applicantId).subscribe({
      next: node => {
        this.data.set(node.data);
        this.applicantCompanyId.set(node.company_id ?? null);
        this.selectedStage.set(node.data.status ?? this.currentStageKey());
        this.isLoading.set(false);
        this.loadDueDiligenceAnswers();
      },
      error: () => this.isLoading.set(false)
    });
  }

  /** Load the due diligence form submission answers so the ID card can show live compliance status. */
  private loadDueDiligenceAnswers(): void {
    const ddStage = this.workflow().stages.find(s => s.key === 'due_diligence');
    const templateId = ddStage?.form_template_id;
    if (!templateId) return;
    const companyId = this.applicantCompanyId() ?? this.applicantId;
    this.formTemplateSvc.getSubmissionsByTemplate(companyId, templateId).subscribe({
      next: subs => {
        const latest = subs.find(s => (s.data as any)?.status === 'submitted') ?? subs[subs.length - 1] ?? null;
        this.ddAnswers.set((latest?.data as any)?.answers ?? null);
      },
      error: () => {}
    });
  }

  selectStage(key: string): void {
    if (!this.isFutureStage(key)) this.selectedStage.set(key);
  }

  isFutureStage(key: string): boolean {
    const stages = this.workflow().stages;
    return stages.findIndex(s => s.key === key) > stages.findIndex(s => s.key === this.currentStageKey());
  }

  stageTabClass(stage: IWorkflowStage): string {
    const selected = this.selectedStage() === stage.key;
    const future = this.isFutureStage(stage.key);
    const base = 'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ';
    if (future) return base + 'border-transparent text-gray-300 cursor-not-allowed';
    if (selected) return base + 'border-blue-500 text-blue-600 bg-blue-50/30';
    return base + 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer';
  }

  dotBg(color: string): string {
    const m: Record<string, string> = {
      blue: 'bg-blue-500', indigo: 'bg-indigo-500', purple: 'bg-purple-500',
      orange: 'bg-orange-500', green: 'bg-green-500', red: 'bg-red-500',
      teal: 'bg-teal-500', yellow: 'bg-yellow-400', gray: 'bg-gray-400',
    };
    return m[color] ?? 'bg-gray-400';
  }

  /** Returns true when the currently-viewed stage lists the given component key. */
  hasStageComponent(key: string): boolean {
    return this.selectedStageConfig()?.components?.includes(key) ?? false;
  }

  onChecklistDataUpdated(newData: IGrantApplicationData): void {
    const wasOnCurrentStage = this.selectedStage() === this.currentStageKey();
    this.data.set(newData);
    if (wasOnCurrentStage) {
      this.selectedStage.set(newData.status ?? 'applied');
    }
  }

  onBankStatsChanged(stats: { months: number; grandTotal: number }): void {
    this.save({
      bank_statement_months: stats.months,
      bank_statement_grand_total: stats.grandTotal,
    });
  }

  onSubDataUpdated(newData: IGrantApplicationData): void {
    this.data.set(newData);
  }

  onModalSaved(newData: IGrantApplicationData): void {
    this.data.set(newData);
    this.showEditModal.set(false);
    this.showToast('Applicant information saved', 'success');
  }

  onDocumentsChanged(docs: IUploadedDocument[]): void {
    this.data.update(d => ({ ...d, documents: docs }));
  }

  // ── Shared save ─────────────────────────────────────────────────────────────
  private save(patch: Partial<IGrantApplicationData>, onSuccess?: () => void): void {
    this.isSaving.set(true);
    this.grantService.updateApplication(this.applicantId, patch).subscribe({
      next: node => {
        this.data.set(node.data);
        this.isSaving.set(false);
        onSuccess?.();
        this.showToast('Saved successfully', 'success');
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('Failed to save. Please try again.', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

}
