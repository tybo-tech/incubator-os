import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IGrantApplicationData,
  IChecklistItem,
  IStatusHistoryEntry,
  IWorkflowStage,
  IWorkflowAction,
} from '../../interfaces/grant-application.interfaces';
import { GrantApplicationService } from '../../services/grant-application.service';
import { WorkflowService } from '../../services/workflow.service';

@Component({
  selector: 'app-stage-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="showActions()" class="rounded-xl overflow-hidden bg-gray-900 shadow-lg">

      <!-- Checklist blocking warning -->
      <div
        *ngIf="checklistBlocking()"
        class="px-5 py-3 bg-orange-500/20 border-b border-orange-400/30 flex items-center gap-2">
        <svg class="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p class="text-xs text-orange-300">
          All required checklist items must be received before proceeding.
          <span class="font-semibold">({{ requiredCheckedCount() }}/{{ requiredItemCount() }} done)</span>
        </p>
      </div>

      <!-- Confirm panel -->
      <div *ngIf="confirmAction()" class="px-5 py-4">
        <p class="text-sm font-semibold text-white mb-1">Confirm: {{ confirmActionObj()?.label }}?</p>
        <p class="text-xs text-gray-400 mb-3">Add a reviewer name and optional note to record with this change.</p>
        <div class="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            [(ngModel)]="reviewedBy"
            placeholder="Reviewed by (name or email)…"
            class="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                   rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <input
            type="text"
            [(ngModel)]="actionNote"
            placeholder="Optional note…"
            class="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                   rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div class="flex gap-2">
          <button
            (click)="confirmAction.set(null)"
            class="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            (click)="executeTransition()"
            [disabled]="isSaving()"
            [class]="confirmActionObj()?.variant === 'danger'
              ? 'px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors'
              : 'px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'">
            {{ isSaving() ? 'Saving…' : 'Confirm' }}
          </button>
        </div>
      </div>

      <!-- Main action row -->
      <div *ngIf="!confirmAction() && !confirmReset()" class="px-5 py-4 flex flex-wrap items-center justify-between gap-3">

        <!-- Stage label -->
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Stage Actions</p>
          <p class="text-sm font-semibold text-white">
            {{ currentStage()?.label ?? currentStatus() }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2 ml-auto items-center">
          <!-- Unknown stage: resume -->
          <button
            *ngIf="!currentStage()"
            (click)="requestTransition('reopen')"
            class="px-4 py-2 text-sm text-yellow-300 border border-yellow-600 rounded-lg hover:bg-yellow-900/40 transition-colors">
            Resume Application
          </button>

          <!-- Dynamic action buttons -->
          <ng-container *ngFor="let action of stageActions()">
            <button
              *ngIf="workflowSvc.isDangerAction(action)"
              (click)="requestTransition(action.key)"
              class="px-4 py-2 text-sm text-red-400 border border-red-700 rounded-lg hover:bg-red-900/40 transition-colors">
              {{ action.label }}
            </button>
            <button
              *ngIf="workflowSvc.isSecondaryAction(action)"
              (click)="requestTransition(action.key)"
              class="px-4 py-2 text-sm text-yellow-300 border border-yellow-700 rounded-lg hover:bg-yellow-900/40 transition-colors">
              {{ action.label }}
            </button>
            <button
              *ngIf="workflowSvc.isPrimaryAction(action)"
              (click)="requestTransition(action.key)"
              [disabled]="checklistBlocking()"
              class="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500
                     transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {{ action.label }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          </ng-container>

          <!-- Reset (subtle) -->
          <button
            (click)="confirmReset.set(true)"
            title="Reset status back to the first stage and clear history"
            class="px-3 py-2 text-xs text-gray-600 hover:text-red-400 border border-gray-700
                   hover:border-red-700 rounded-lg transition-colors flex items-center gap-1.5">
            <i class="fas fa-rotate-left text-xs"></i>
            Reset
          </button>
        </div>
      </div>

      <!-- Reset confirm panel -->
      <div *ngIf="confirmReset()" class="px-5 py-4">
        <p class="text-sm font-semibold text-red-400 mb-1">Reset application status?</p>
        <p class="text-xs text-gray-400 mb-3">
          Moves back to <strong class="text-gray-200">{{ firstStageName() }}</strong>
          and clears all status history. Cannot be undone.
        </p>
        <div class="flex gap-2">
          <button
            (click)="confirmReset.set(false)"
            class="px-3 py-1.5 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800">
            Cancel
          </button>
          <button
            (click)="executeReset()"
            [disabled]="isSaving()"
            class="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {{ isSaving() ? 'Resetting…' : 'Yes, Reset' }}
          </button>
        </div>
      </div>

    </div>
  `
})
export class ApplicantStageActionsComponent {
  @Input() applicantId!: number;

  @Input() set data(val: IGrantApplicationData) {
    this._data = val;
    this.currentStatus.set(val.status ?? 'applied');
    this.statusHistory.set(val.status_history ?? []);
    const rawList: any[] = val.checklist ?? [];
    this.checklist.set(rawList.map(item => {
      if (item.status) return item as IChecklistItem;
      return { ...item, status: item.checked ? 'received' : 'not_checked' } as IChecklistItem;
    }));
  }
  get data(): IGrantApplicationData { return this._data; }

  @Input() set viewingStage(val: string) { this._viewingStage.set(val ?? ''); }

  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  private _data!: IGrantApplicationData;
  private _viewingStage = signal('');

  currentStatus  = signal<string>('applied');
  statusHistory  = signal<IStatusHistoryEntry[]>([]);
  checklist      = signal<IChecklistItem[]>([]);
  confirmAction  = signal<string | null>(null);
  confirmReset   = signal(false);
  isSaving       = signal(false);

  actionNote = '';
  reviewedBy = '';

  showActions = computed(() => {
    const viewKey = this._viewingStage();
    return !viewKey || viewKey === this.currentStatus();
  });

  currentStage = computed<IWorkflowStage | null>(() => {
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    return this.workflowSvc.getStage(wf, this.currentStatus());
  });

  stageActions = computed<IWorkflowAction[]>(() => this.currentStage()?.actions ?? []);

  requiredItemCount    = computed(() => this.checklist().filter(i => i.required ?? true).length);
  requiredCheckedCount = computed(() => this.checklist().filter(i => (i.required ?? true) && i.status === 'received').length);

  checklistBlocking = computed(() => {
    const stage = this.currentStage();
    if (!stage?.requires_checklist) return false;
    return this.checklist().some(i => (i.required ?? true) && i.status !== 'received');
  });

  confirmActionObj = computed<IWorkflowAction | null>(() => {
    const key = this.confirmAction();
    if (!key) return null;
    return this.currentStage()?.actions?.find(a => a.key === key) ?? null;
  });

  firstStageName = computed<string>(() => {
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    return wf.stages[0]?.label ?? 'first stage';
  });

  constructor(
    private grantService: GrantApplicationService,
    public workflowSvc: WorkflowService,
  ) {}

  requestTransition(actionKey: string): void {
    this.actionNote = '';
    this.reviewedBy = '';
    this.confirmAction.set(actionKey);
  }

  executeTransition(): void {
    const actionKey = this.confirmAction()!;
    const previousStatus = this.currentStatus();

    let targetKey: string | null = null;

    const stage = this.currentStage();
    if (stage) {
      const action = this.workflowSvc.getActionFromStage(stage, actionKey);
      if (!action) { this.confirmAction.set(null); return; }
      targetKey = this.workflowSvc.resolveActionTarget(
        action,
        this._data?.previous_status,
        this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026'),
        this.currentStatus(),
      );
    } else {
      if (actionKey === 'reopen') {
        targetKey = this._data?.previous_status ?? 'applied';
      } else {
        this.confirmAction.set(null);
        return;
      }
    }

    if (!targetKey) { this.confirmAction.set(null); return; }

    const entry: IStatusHistoryEntry = {
      status: targetKey,
      timestamp: new Date().toISOString(),
      note: this.actionNote.trim() || undefined,
      reviewed_by: this.reviewedBy.trim() || undefined,
    };
    const history = [...this.statusHistory(), entry];
    this.save({ status: targetKey, status_history: history, previous_status: previousStatus }, () => {
      this._data = { ...this._data, previous_status: previousStatus };
      this.currentStatus.set(targetKey!);
      this.statusHistory.set(history);
      this.confirmAction.set(null);
      this.actionNote = '';
      this.reviewedBy = '';
    });
  }

  executeReset(): void {
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    const firstKey = wf.stages[0]?.key ?? 'applied';
    this.save({ status: firstKey, status_history: [], previous_status: undefined }, () => {
      this.currentStatus.set(firstKey);
      this.statusHistory.set([]);
      this.confirmReset.set(false);
    });
  }

  private save(patch: Partial<IGrantApplicationData>, onSuccess?: () => void): void {
    this.isSaving.set(true);
    this.grantService.updateApplication(this.applicantId, patch).subscribe({
      next: node => {
        this.isSaving.set(false);
        this.dataUpdated.emit(node.data);
        onSuccess?.();
      },
      error: () => this.isSaving.set(false),
    });
  }
}
