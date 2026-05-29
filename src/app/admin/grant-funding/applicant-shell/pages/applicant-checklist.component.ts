import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IGrantApplicationData,
  IChecklistItem,
  ChecklistItemStatus,
  IStatusHistoryEntry,
  IWorkflowStage,
  DEFAULT_CHECKLIST_ITEMS,
} from '../../interfaces/grant-application.interfaces';
import { GrantApplicationService } from '../../services/grant-application.service';
import { WorkflowService } from '../../services/workflow.service';

@Component({
  selector: 'app-applicant-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">

      <!-- ── Stage progress bar ───────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold text-gray-900">Application Status</h2>
          <div class="flex items-center gap-3">
            <span [class]="statusBadgeClass()">{{ currentStageLabel() }}</span>
            <button
              (click)="showHistory.set(!showHistory())"
              class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              History ({{ statusHistory().length }})
            </button>
          </div>
        </div>

        <!-- Stage stepper -->
        <div class="flex items-center overflow-x-auto pb-1">
          <ng-container *ngFor="let stage of progressStages(); let i = index; let last = last">
            <div class="flex flex-col items-center flex-shrink-0">
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                [class]="stepDotClass(stage)">
                <svg *ngIf="isCompleted(stage)" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
                <span *ngIf="!isCompleted(stage)">{{ i + 1 }}</span>
              </div>
              <span
                class="mt-1 text-xs text-center max-w-[72px] leading-tight"
                [class]="isCurrent(stage) ? 'font-semibold text-gray-800'
                       : (isTerminated(stage) ? 'text-gray-300' : 'text-gray-400')">
                {{ stage.label }}
              </span>
            </div>
            <div
              *ngIf="!last"
              class="flex-1 min-w-[12px] h-0.5 mb-4 mx-1"
              [class]="isCompleted(stage) ? 'bg-green-400' : 'bg-gray-200'">
            </div>
          </ng-container>
        </div>

        <!-- Declined banner -->
        <div
          *ngIf="currentStatus() === 'declined'"
          class="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
          This application was declined. You can reopen it using the button below.
        </div>

        <!-- Unknown stage fallback -->
        <div
          *ngIf="!currentStage()"
          class="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
          Status <strong>{{ currentStatus() }}</strong> is not in the active workflow.
          Use "Resume Application" to return it to the pipeline.
        </div>

        <!-- History timeline -->
        <div *ngIf="showHistory()" class="mt-3 border-t border-gray-100 pt-3">
          <div *ngIf="statusHistoryDesc().length" class="space-y-2.5">
            <div *ngFor="let entry of statusHistoryDesc()" class="flex items-start gap-3">
              <div class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0 bg-gray-400"></div>
              <div>
                <span class="text-xs font-medium text-gray-700">{{ stageLabel(entry.status) }}</span>
                <span class="text-xs text-gray-400 ml-2">{{ formatDate(entry.timestamp) }}</span>
                <span *ngIf="entry.reviewed_by" class="text-xs text-blue-500 ml-2">by {{ entry.reviewed_by }}</span>
                <p *ngIf="entry.note" class="text-xs text-gray-500 italic mt-0.5">"{{ entry.note }}"</p>
              </div>
            </div>
          </div>
          <p *ngIf="!statusHistoryDesc().length" class="text-xs text-gray-400">
            No history recorded yet.
          </p>
        </div>
      </div>

      <!-- ── Checklist card ─────────────────────────────────────────────────── -->
      <div *ngIf="showChecklistItems()" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 class="text-base font-semibold text-gray-900">
              Application Checklist
              <span
                *ngIf="currentStage()?.requires_checklist"
                class="ml-2 text-xs font-normal text-orange-600">Required at this stage</span>
            </h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ checkedCount() }} / {{ checklist().length }} items received
            </p>
          </div>
          <div *ngIf="!editingChecklist()">
            <button
              (click)="startEditChecklist()"
              class="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
              Edit Items
            </button>
          </div>
          <div *ngIf="editingChecklist()" class="flex gap-2">
            <button
              (click)="cancelEditChecklist()"
              class="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50">
              Cancel
            </button>
            <button
              (click)="saveEditedChecklist()"
              [disabled]="isSaving()"
              class="text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1 hover:bg-blue-700 disabled:opacity-50">
              {{ isSaving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>

        <!-- View mode -->
        <div *ngIf="!editingChecklist() && showChecklistItems()" class="divide-y divide-gray-50">
          <div
            *ngFor="let item of checklist(); let i = index"
            class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3">
              <span [class]="statusDotClass(item.status)"></span>
              <span
                class="text-sm"
                [class]="item.status === 'received' ? 'text-gray-400 line-through' : 'text-gray-800'">
                {{ item.label }}
                <span
                  *ngIf="item.required !== false"
                  title="Required document"
                  class="ml-1 text-orange-500 font-bold">*</span>
              </span>
            </div>
            <select
              [ngModel]="item.status"
              (ngModelChange)="setItemStatus(i, $event)"
              class="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
              [class]="statusSelectClass(item.status)">
              <option value="not_checked">Not Checked</option>
              <option value="not_received">Not Received</option>
              <option value="partially_received">Partial</option>
              <option value="received">Received</option>
            </select>
          </div>

          <div *ngIf="!checklist().length" class="px-5 py-8 text-center text-sm text-gray-400">
            No checklist items. Click "Edit Items" to add some.
          </div>
        </div>

        <!-- Edit mode -->
        <div *ngIf="editingChecklist()" class="divide-y divide-gray-50">
          <div
            *ngFor="let item of editDraft; let i = index"
            class="flex items-center gap-3 px-5 py-2.5">
            <input
              type="text"
              [(ngModel)]="editDraft[i].label"
              class="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <button
              (click)="removeEditItem(i)"
              class="text-gray-400 hover:text-red-500 p-1 transition-colors"
              title="Remove item">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <!-- Add new item row -->
          <div class="flex items-center gap-2 px-5 py-3">
            <input
              type="text"
              [(ngModel)]="newItemLabel"
              placeholder="New checklist item…"
              (keyup.enter)="addNewItem()"
              class="flex-1 px-2.5 py-1.5 text-sm border border-dashed border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-green-500 focus:border-transparent">
            <button
              (click)="addNewItem()"
              [disabled]="!newItemLabel.trim()"
              class="px-3 py-1.5 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              Add
            </button>
          </div>
        </div>

      </div>

    </div>
  `
})
export class ApplicantChecklistComponent implements OnInit {
  @Input() applicantId!: number;

  @Input() set data(val: IGrantApplicationData) {
    this._data = val;
    this.initFromData(val);
  }
  get data(): IGrantApplicationData { return this._data; }

  /** The stage key the user is currently VIEWING (may differ from current application status). */
  @Input() set viewingStage(val: string) { this._viewingStage.set(val ?? ''); }

  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  private _data!: IGrantApplicationData;
  private _viewingStage = signal('');

  checklist        = signal<IChecklistItem[]>([]);
  statusHistory    = signal<IStatusHistoryEntry[]>([]);
  currentStatus    = signal<string>('applied');
  showHistory      = signal(false);
  editingChecklist = signal(false);
  isSaving         = signal(false);

  editDraft: IChecklistItem[] = [];
  newItemLabel = '';

  checkedCount      = computed(() => this.checklist().filter(i => i.status === 'received').length);
  allChecked        = computed(() => this.checklist().length > 0 && this.checkedCount() === this.checklist().length);
  statusHistoryDesc = computed(() => [...this.statusHistory()].reverse());

  requiredItemCount    = computed(() => this.checklist().filter(i => i.required ?? true).length);
  requiredCheckedCount = computed(() => this.checklist().filter(i => (i.required ?? true) && i.status === 'received').length);

  /** Show checklist items only when the VIEWED stage has 'checklist' in its components. */
  showChecklistItems = computed(() => {
    const viewKey = this._viewingStage();
    if (!viewKey) return false;
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    const stage = this.workflowSvc.getStage(wf, viewKey);
    return stage?.components?.includes('checklist') ?? false;
  });

  currentStage = computed<IWorkflowStage | null>(() => {
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    return this.workflowSvc.getStage(wf, this.currentStatus());
  });

  progressStages = computed(() => {
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    return this.workflowSvc.getProgressStages(wf);
  });

  constructor(
    private grantService: GrantApplicationService,
    public workflowSvc: WorkflowService,
  ) {}

  ngOnInit(): void {
    // Load workflow from assets config; silently falls back to built-in constant.
    const wfId = this._data?.workflow_id ?? 'grant-2026';
    this.workflowSvc.loadWorkflow(wfId).subscribe();
  }

  private initFromData(data: IGrantApplicationData): void {
    const rawList: any[] = data.checklist?.length
      ? data.checklist
      : DEFAULT_CHECKLIST_ITEMS.map(d => ({ ...d }));
    const list: IChecklistItem[] = rawList.map(item => {
      if (item.status) return item as IChecklistItem;
      // Legacy migration: checked boolean → status
      return { ...item, status: item.checked ? 'received' : 'not_checked' } as IChecklistItem;
    });
    this.checklist.set(list);
    this.statusHistory.set(data.status_history ?? []);
    this.currentStatus.set(data.status ?? 'applied');
  }

  // ── Checklist ───────────────────────────────────────────────────────────────
  setItemStatus(index: number, status: ChecklistItemStatus): void {
    const updated = this.checklist().map((item, idx) =>
      idx === index ? { ...item, status } : item
    );
    this.save({ checklist: updated }, () => this.checklist.set(updated));
  }

  startEditChecklist(): void {
    this.editDraft = this.checklist().map(i => ({ ...i }));
    this.newItemLabel = '';
    this.editingChecklist.set(true);
  }
  cancelEditChecklist(): void { this.editingChecklist.set(false); }

  removeEditItem(i: number): void { this.editDraft.splice(i, 1); }

  addNewItem(): void {
    if (!this.newItemLabel.trim()) return;
    this.editDraft.push({ id: `item_${Date.now()}`, label: this.newItemLabel.trim(), status: 'not_checked' });
    this.newItemLabel = '';
  }

  saveEditedChecklist(): void {
    const list = this.editDraft.filter(i => i.label.trim());
    this.save({ checklist: list }, () => {
      this.checklist.set(list);
      this.editingChecklist.set(false);
    });
  }

  // ── Shared save ─────────────────────────────────────────────────────────────
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

  // ── View helpers ─────────────────────────────────────────────────────────────
  isCurrent(stage: IWorkflowStage): boolean {
    return stage.key === this.currentStatus();
  }

  isCompleted(stage: IWorkflowStage): boolean {
    if (this.currentStatus() === 'declined') {
      // When declined, mark any stage that appeared in history as completed
      return this.statusHistory().some(h => h.status === stage.key);
    }
    const stages    = this.progressStages();
    const currentIdx = stages.findIndex(s => s.key === this.currentStatus());
    const stageIdx   = stages.findIndex(s => s.key === stage.key);
    return currentIdx > stageIdx && currentIdx !== -1;
  }

  /** True for stages that were NOT reached before decline — shows them as cancelled. */
  isTerminated(stage: IWorkflowStage): boolean {
    if (this.currentStatus() !== 'declined') return false;
    return !this.isCompleted(stage) && !this.isCurrent(stage);
  }

  stepDotClass(stage: IWorkflowStage): string {
    if (this.isCompleted(stage))  return 'bg-green-500 text-white';
    if (this.isCurrent(stage))    return this.colorClass(stage.color, true);
    if (this.isTerminated(stage)) return 'bg-gray-100 text-gray-300'; // cancelled by decline
    return 'bg-gray-100 text-gray-400';
  }

  colorClass(color: string, filled: boolean): string {
    const m: Record<string, string> = {
      blue:   filled ? 'bg-blue-600 text-white'   : 'bg-blue-100 text-blue-700',
      orange: filled ? 'bg-orange-500 text-white'  : 'bg-orange-100 text-orange-700',
      purple: filled ? 'bg-purple-600 text-white'  : 'bg-purple-100 text-purple-700',
      indigo: filled ? 'bg-indigo-600 text-white'  : 'bg-indigo-100 text-indigo-700',
      green:  filled ? 'bg-green-600 text-white'   : 'bg-green-100 text-green-700',
      red:    filled ? 'bg-red-600 text-white'     : 'bg-red-100 text-red-700',
      gray:   filled ? 'bg-gray-500 text-white'    : 'bg-gray-100 text-gray-600',
    };
    return m[color] ?? m['gray']!;
  }

  statusBadgeClass(): string {
    const stage = this.currentStage();
    if (!stage) return 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600';
    return `px-2.5 py-0.5 text-xs font-semibold rounded-full ${this.colorClass(stage.color, false)}`;
  }

  currentStageLabel(): string {
    return this.currentStage()?.label ?? this.currentStatus();
  }

  stageLabel(key: string): string {
    const wf = this.workflowSvc.getWorkflow(this._data?.workflow_id ?? 'grant-2026');
    return this.workflowSvc.getStage(wf, key)?.label ?? key;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  statusDotClass(status: ChecklistItemStatus): string {
    const m: Record<ChecklistItemStatus, string> = {
      not_checked:        'w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-300',
      not_received:       'w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-500',
      partially_received: 'w-2.5 h-2.5 rounded-full flex-shrink-0 bg-yellow-400',
      received:           'w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-500',
    };
    return m[status] ?? m['not_checked'];
  }

  statusSelectClass(status: ChecklistItemStatus): string {
    const m: Record<ChecklistItemStatus, string> = {
      not_checked:        'text-gray-500',
      not_received:       'text-red-600',
      partially_received: 'text-yellow-700',
      received:           'text-green-700',
    };
    return m[status] ?? 'text-gray-500';
  }
}
