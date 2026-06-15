import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IWorkflow,
  IWorkflowAction,
  IWorkflowStage,
  GRANT_WORKFLOW_2026,
} from './interfaces/grant-application.interfaces';
import { WorkflowService } from './services/workflow.service';
import { ToastService } from '../../services/toast.service';
import { FormTemplateService } from '../form-templates/services/form-template.service';
import { FormTemplate } from '../form-templates/interfaces/form-template.interfaces';

@Component({
  selector: 'app-workflow-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ng-container *ngIf="isOpen">

      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40 bg-black/40"
        (click)="close()">
      </div>

      <!-- Slide-over drawer -->
      <div class="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">

        <!-- ── Header ── -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <i class="fas fa-sliders text-blue-600 text-sm"></i>
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">Workflow Settings</h2>
              <p class="text-xs text-gray-400 font-mono">{{ draft.id }}</p>
            </div>
          </div>
          <button
            type="button"
            (click)="close()"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
                   hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>

        <!-- ── Loading state ── -->
        <div *ngIf="isLoading" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <i class="fas fa-circle-notch fa-spin text-blue-500 text-3xl mb-3"></i>
            <p class="text-sm text-gray-500">Loading workflow…</p>
          </div>
        </div>

        <!-- ── Body ── -->
        <div *ngIf="!isLoading" class="flex-1 overflow-y-auto">

          <!-- Workflow meta -->
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Workflow Name
                </label>
                <input
                  type="text"
                  [(ngModel)]="draft.name"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div class="w-36">
                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  ID
                </label>
                <input
                  type="text"
                  [value]="draft.id"
                  readonly
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                         bg-gray-100 text-gray-400 font-mono cursor-default">
              </div>
            </div>
          </div>

          <!-- Stages list -->
          <div class="px-6 py-5 space-y-2.5">
            <div class="flex items-center justify-between mb-1">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Stages
                <span class="ml-1.5 text-gray-400 font-normal normal-case">
                  ({{ draft.stages.length }})
                </span>
              </p>
              <p class="text-xs text-gray-400">Click a stage row to expand</p>
            </div>

            <!-- Stage card -->
            <div
              *ngFor="let stage of draft.stages; let i = index; trackBy: trackByKey"
              class="border border-gray-200 rounded-xl overflow-hidden bg-white
                     shadow-sm hover:shadow transition-shadow">

              <!-- Stage header row -->
              <div
                class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                (click)="toggleExpand(i)">

                <!-- Position number -->
                <span
                  class="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold
                         flex items-center justify-center flex-shrink-0">
                  {{ i + 1 }}
                </span>

                <!-- Color dot -->
                <span
                  class="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  [class]="dotBg(stage.color)">
                </span>

                <!-- Label input (stops click from propagating) -->
                <input
                  type="text"
                  [(ngModel)]="stage.label"
                  (click)="$event.stopPropagation()"
                  placeholder="Stage name"
                  class="flex-1 min-w-0 text-sm font-medium text-gray-800 bg-transparent border-0
                         outline-none rounded px-1 hover:bg-gray-100 focus:bg-white
                         focus:ring-1 focus:ring-blue-400 focus:px-2 transition-all">

                <!-- Type pill -->
                <select
                  [(ngModel)]="stage.type"
                  (click)="$event.stopPropagation()"
                  class="hidden sm:block text-xs border border-gray-200 rounded-full px-2.5 py-0.5
                         bg-white text-gray-500 focus:ring-1 focus:ring-blue-400 cursor-pointer">
                  <option value="entry">Entry</option>
                  <option value="validation">Validation</option>
                  <option value="review">Review</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="final">Final</option>
                </select>

                <!-- Action count -->
                <span class="text-xs text-gray-400 hidden md:block flex-shrink-0">
                  {{ stage.actions?.length || 0 }}
                  {{ (stage.actions?.length || 0) === 1 ? 'action' : 'actions' }}
                </span>

                <!-- Move up / down -->
                <div class="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    (click)="moveStage(i, -1); $event.stopPropagation()"
                    [disabled]="i === 0"
                    title="Move up"
                    class="w-5 h-5 flex items-center justify-center rounded text-gray-300
                           hover:text-blue-500 hover:bg-blue-50 transition-colors
                           disabled:opacity-20 disabled:pointer-events-none">
                    <i class="fas fa-chevron-up text-xs" style="font-size:9px"></i>
                  </button>
                  <button
                    type="button"
                    (click)="moveStage(i, 1); $event.stopPropagation()"
                    [disabled]="i === draft.stages.length - 1"
                    title="Move down"
                    class="w-5 h-5 flex items-center justify-center rounded text-gray-300
                           hover:text-blue-500 hover:bg-blue-50 transition-colors
                           disabled:opacity-20 disabled:pointer-events-none">
                    <i class="fas fa-chevron-down text-xs" style="font-size:9px"></i>
                  </button>
                </div>

                <!-- Delete stage -->
                <button
                  type="button"
                  (click)="removeStage(i); $event.stopPropagation()"
                  [disabled]="draft.stages.length <= 1"
                  title="Remove stage"
                  class="w-7 h-7 flex items-center justify-center rounded text-gray-300
                         hover:text-red-500 hover:bg-red-50 transition-colors
                         disabled:opacity-25 disabled:pointer-events-none flex-shrink-0">
                  <i class="fas fa-trash-alt text-xs"></i>
                </button>

                <!-- Chevron -->
                <i
                  class="fas text-gray-300 text-xs flex-shrink-0"
                  [class.fa-chevron-down]="!expandedStages[i]"
                  [class.fa-chevron-up]="expandedStages[i]">
                </i>
              </div>

              <!-- ── Expanded section ── -->
              <div *ngIf="expandedStages[i]" class="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-5">

                <!-- Row: Key + Color + Checklist gate -->
                <div class="flex flex-wrap gap-5 items-start">

                  <!-- Stage key -->
                  <div>
                    <label class="block text-xs text-gray-500 mb-1.5 font-medium">Stage Key</label>
                    <input
                      type="text"
                      [(ngModel)]="stage.key"
                      placeholder="e.g. due_diligence"
                      class="w-40 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono">
                  </div>

                  <!-- Color picker -->
                  <div>
                    <label class="block text-xs text-gray-500 mb-1.5 font-medium">Color</label>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <button
                        *ngFor="let c of COLORS"
                        type="button"
                        (click)="stage.color = c"
                        [title]="c"
                        [class]="colorBtnClass(c, stage.color)">
                      </button>
                    </div>
                  </div>

                  <!-- Stage type (mobile fallback) -->
                  <div class="sm:hidden">
                    <label class="block text-xs text-gray-500 mb-1.5 font-medium">Type</label>
                    <select
                      [(ngModel)]="stage.type"
                      class="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white
                             focus:ring-2 focus:ring-blue-500">
                      <option value="entry">Entry</option>
                      <option value="validation">Validation</option>
                      <option value="review">Review</option>
                      <option value="evaluation">Evaluation</option>
                      <option value="final">Final</option>
                    </select>
                  </div>

                  <!-- Checklist gate -->
                  <div class="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      [id]="'rc_' + i"
                      [(ngModel)]="stage.requires_checklist"
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer">
                    <label [for]="'rc_' + i" class="text-xs text-gray-600 cursor-pointer select-none">
                      Requires checklist to proceed
                    </label>
                  </div>
                </div>

                <!-- Stage instruction -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Stage Instruction</label>
                  <input
                    type="text"
                    [(ngModel)]="stage.instruction"
                    placeholder="What should the reviewer do at this stage?"
                    class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Visible components -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-2">
                    Visible Components
                  </label>
                  <div class="flex flex-wrap gap-5">
                    <label *ngFor="let comp of AVAILABLE_COMPONENTS" class="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        [checked]="hasComponent(stage, comp.key)"
                        (change)="toggleComponent(stage, comp.key, $event)"
                        class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded">
                      {{ comp.label }}
                    </label>
                  </div>

                  <!-- Interview template picker (only when interview is enabled) -->
                  <div *ngIf="hasComponent(stage, 'interview')" class="mt-3 flex items-center gap-3">
                    <label class="text-xs text-gray-500 whitespace-nowrap font-medium">Interview template:</label>
                    <select
                      [(ngModel)]="stage.interview_template_id"
                      class="flex-1 px-2.5 py-1.5 text-xs border border-violet-300 rounded-lg
                             focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white">
                      <option [ngValue]="undefined">— pick a template —</option>
                      <option *ngFor="let tpl of formTemplates()" [ngValue]="tpl.id">
                        {{ tpl.data.name }}
                      </option>
                    </select>
                    <span *ngIf="!formTemplates().length" class="text-xs text-gray-400 italic">
                      No form templates found — create one in Form Templates.
                    </span>
                  </div>

                  <!-- Dynamic form template picker (only when dynamic_form is enabled) -->
                  <div *ngIf="hasComponent(stage, 'dynamic_form')" class="mt-3 flex items-center gap-3">
                    <label class="text-xs text-gray-500 whitespace-nowrap font-medium">Dynamic form template:</label>
                    <select
                      [(ngModel)]="stage.form_template_id"
                      class="flex-1 px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                      <option [ngValue]="undefined">— pick a template —</option>
                      <option *ngFor="let tpl of formTemplates()" [ngValue]="tpl.id">
                        {{ tpl.data.name }}
                      </option>
                    </select>
                    <span *ngIf="!formTemplates().length" class="text-xs text-gray-400 italic">
                      No form templates found — create one in Form Templates.
                    </span>
                  </div>
                </div>

                <!-- Actions -->
                <div>
                  <div class="flex items-center justify-between mb-2.5">
                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </label>
                    <button
                      type="button"
                      (click)="addAction(i)"
                      class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors font-medium">
                      <i class="fas fa-plus text-xs"></i> Add Action
                    </button>
                  </div>

                  <p *ngIf="!stage.actions?.length" class="text-xs text-gray-400 italic py-1.5">
                    No actions — this is a terminal stage.
                  </p>

                  <div class="space-y-2">
                    <div
                      *ngFor="let action of stage.actions; let j = index"
                      class="p-3 bg-white border border-gray-200 rounded-lg space-y-2">

                      <!-- Row 1: colour strip + label + button style + delete -->
                      <div class="flex items-center gap-2">
                        <!-- Variant colour strip -->
                        <div
                          class="w-1 self-stretch rounded-full flex-shrink-0 min-h-[1.5rem]"
                          [class]="variantStrip(action.variant)">
                        </div>

                        <!-- Button label -->
                        <input
                          type="text"
                          [(ngModel)]="action.label"
                          placeholder="Button label (e.g. Start Interview)"
                          title="Label shown on the button"
                          class="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md
                                 focus:ring-1 focus:ring-blue-400 focus:border-transparent min-w-0">

                        <!-- Variant -->
                        <select
                          [(ngModel)]="action.variant"
                          title="Button style"
                          class="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white
                                 focus:ring-1 focus:ring-blue-400 flex-shrink-0">
                          <option value="primary">Primary</option>
                          <option value="danger">Danger</option>
                          <option value="secondary">Secondary</option>
                        </select>

                        <!-- Delete action -->
                        <button
                          type="button"
                          (click)="removeAction(i, j)"
                          title="Remove action"
                          class="w-6 h-6 flex items-center justify-center rounded text-gray-300
                                 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                          <i class="fas fa-times text-xs"></i>
                        </button>
                      </div>

                      <!-- Row 2: target stage (full width, readable) -->
                      <div class="flex items-center gap-2 pl-3">
                        <span class="text-xs text-gray-400 whitespace-nowrap">Move to:</span>
                        <select
                          [(ngModel)]="action.target"
                          title="Which stage this button transitions to"
                          class="flex-1 px-2.5 py-1.5 text-xs border border-blue-200 rounded-md bg-blue-50
                                 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-blue-800 font-medium">
                          <option value="next">→ next stage (in sequence)</option>
                          <option value="previous">↩ previous stage</option>
                          <optgroup label="── Specific stage ──">
                            <option *ngFor="let s of draft.stages" [value]="s.key">
                              {{ s.label || s.key }}
                            </option>
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Stage -->
            <button
              type="button"
              (click)="addStage()"
              class="w-full mt-1 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm
                     text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50
                     transition-colors flex items-center justify-center gap-2">
              <i class="fas fa-plus"></i>
              Add Stage
            </button>
          </div>
        </div>

        <!-- ── Footer ── -->
        <!-- Hidden file input for JSON import -->
        <input
          #importFileInput
          type="file"
          accept=".json,application/json"
          class="hidden"
          (change)="onImportFile($event)">

        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <!-- Left: reset + export + import -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="resetToDefaults()"
              class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
              <i class="fas fa-rotate-left text-xs"></i>
              Reset
            </button>

            <span class="text-gray-300 select-none">|</span>

            <!-- Export -->
            <button
              type="button"
              (click)="exportJson()"
              class="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 transition-colors font-medium">
              <i class="fas fa-file-export text-xs"></i>
              Export JSON
            </button>

            <!-- Import -->
            <button
              type="button"
              (click)="importFileInput.click()"
              class="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1.5 transition-colors font-medium">
              <i class="fas fa-file-import text-xs"></i>
              Import JSON
            </button>
          </div>

          <!-- Right: cancel + save -->
          <div class="flex gap-2">
            <button
              type="button"
              (click)="close()"
              class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
                     hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              (click)="save()"
              [disabled]="isSaving()"
              class="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700
                     disabled:opacity-50 flex items-center gap-2 transition-colors font-medium">
              <i *ngIf="isSaving()" class="fas fa-circle-notch fa-spin text-xs"></i>
              <i *ngIf="!isSaving()" class="fas fa-floppy-disk text-xs"></i>
              {{ isSaving() ? 'Saving…' : 'Save Workflow' }}
            </button>
          </div>
        </div>

      </div>
    </ng-container>
  `
})
export class WorkflowSettingsComponent implements OnChanges {
  @Input() workflowId = 'grant-2026';
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();

  isSaving = signal(false);
  isLoading = false;

  draft: IWorkflow = { id: '', name: '', stages: [] };
  expandedStages: boolean[] = [];
  formTemplates = signal<FormTemplate[]>([]);

  private readonly formTemplateSvc = inject(FormTemplateService);

  readonly COLORS = [
    'blue', 'indigo', 'purple', 'pink',
    'green', 'teal', 'orange', 'yellow',
    'red', 'gray',
  ];

  constructor(
    private workflowSvc: WorkflowService,
    private toast: ToastService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadDraft();
    }
  }

  private loadDraft(): void {
    this.isLoading = true;
    // Load templates in parallel so the picker is ready
    this.formTemplateSvc.getAllTemplates().subscribe({
      next: (tpls) => this.formTemplates.set(tpls),
    });
    this.workflowSvc.loadWorkflowFromDB(this.workflowId).subscribe(() => {
      this.applyDraft();
    });
  }

  private applyDraft(): void {
    this.draft = JSON.parse(JSON.stringify(this.workflowSvc.getWorkflow(this.workflowId)));
    this.expandedStages = this.draft.stages.map(() => false);
    this.isLoading = false;
  }

  close(): void {
    this.closePanel.emit();
  }

  toggleExpand(i: number): void {
    this.expandedStages[i] = !this.expandedStages[i];
  }

  addStage(): void {
    this.draft.stages = [
      ...this.draft.stages,
      {
        key: `stage_${Date.now()}`,
        label: 'New Stage',
        color: 'gray',
        type: 'review',
        actions: [],
      },
    ];
    this.expandedStages = [...this.expandedStages, true];
  }

  removeStage(i: number): void {
    this.draft.stages = this.draft.stages.filter((_, idx) => idx !== i);
    this.expandedStages = this.expandedStages.filter((_, idx) => idx !== i);
  }

  moveStage(i: number, direction: -1 | 1): void {
    const j = i + direction;
    if (j < 0 || j >= this.draft.stages.length) return;
    const stages = [...this.draft.stages];
    [stages[i], stages[j]] = [stages[j], stages[i]];
    this.draft.stages = stages;
    const expanded = [...this.expandedStages];
    [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
    this.expandedStages = expanded;
  }

  addAction(si: number): void {
    const stage = this.draft.stages[si];
    stage.actions = [
      ...(stage.actions ?? []),
      { key: `action_${Date.now()}`, label: 'New Action', target: '', variant: 'primary' },
    ];
  }

  removeAction(si: number, ai: number): void {
    const stage = this.draft.stages[si];
    stage.actions = (stage.actions ?? []).filter((_, j) => j !== ai);
  }

  readonly AVAILABLE_COMPONENTS = [
    { key: 'checklist',       label: 'Checklist' },
    { key: 'compliance',      label: 'Compliance' },
    { key: 'bank_statements', label: 'Bank Statements' },
    { key: 'evaluation',      label: 'Evaluation' },
    { key: 'documents',       label: 'Documents' },
    { key: 'interview',       label: 'Interview' },
    { key: 'dynamic_form',    label: 'Dynamic Form' },
    { key: 'business_process', label: 'Business Process' },
  ];

  hasComponent(stage: IWorkflowStage, key: string): boolean {
    return stage.components?.includes(key) ?? false;
  }

  toggleComponent(stage: IWorkflowStage, key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = stage.components ?? [];
    stage.components = checked ? [...current, key] : current.filter(c => c !== key);
  }

  save(): void {
    this.isSaving.set(true);
    this.workflowSvc.saveWorkflowToDB(this.draft).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.show('Workflow saved successfully.', 'success');
        this.close();
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.show('Failed to save workflow. Please try again.', 'error');
      },
    });
  }

  resetToDefaults(): void {
    this.draft = JSON.parse(JSON.stringify(GRANT_WORKFLOW_2026));
    this.expandedStages = this.draft.stages.map(() => false);
  }

  exportJson(): void {
    const json = JSON.stringify(this.draft, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${this.draft.id || 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed: IWorkflow = JSON.parse(e.target?.result as string);
        if (!parsed.id || !Array.isArray(parsed.stages)) {
          this.toast.show('Invalid workflow file — missing id or stages.', 'error');
          return;
        }
        this.draft = parsed;
        this.expandedStages = this.draft.stages.map(() => false);
        this.toast.show('Workflow imported — review and save to apply.', 'success');
      } catch {
        this.toast.show('Could not parse file. Make sure it is a valid JSON workflow.', 'error');
      } finally {
        // Reset so the same file can be re-imported if needed
        (event.target as HTMLInputElement).value = '';
      }
    };
    reader.readAsText(file);
  }

  // ── View helpers ─────────────────────────────────────────────────────────────

  trackByKey(_: number, s: IWorkflowStage): string {
    return s.key;
  }

  dotBg(color: string): string {
    const m: Record<string, string> = {
      blue:   'bg-blue-500',
      indigo: 'bg-indigo-500',
      purple: 'bg-purple-500',
      pink:   'bg-pink-500',
      green:  'bg-green-500',
      teal:   'bg-teal-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-400',
      red:    'bg-red-500',
      gray:   'bg-gray-400',
    };
    return m[color] ?? 'bg-gray-400';
  }

  colorBtnClass(c: string, selected: string): string {
    const base = 'w-5 h-5 rounded-full transition-transform hover:scale-125 ';
    const ring = c === selected ? 'ring-2 ring-offset-2 ring-gray-500 ' : '';
    return base + ring + this.dotBg(c);
  }

  variantStrip(variant?: string): string {
    if (variant === 'danger')    return 'bg-red-400';
    if (variant === 'secondary') return 'bg-yellow-400';
    return 'bg-blue-400';
  }
}
