import {
  Component, Input, Output, EventEmitter, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IFormQuestion,
  QuestionType,
  QUESTION_TYPE_LABELS,
  MapsToField,
} from '../interfaces/form-template.interfaces';
import { FormQuestionFieldsComponent } from './form-question-fields.component';
import { FormChildQuestionEditorComponent } from './form-child-question-editor.component';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Reusable top-level question editor for the form template builder.
 *
 * Collapsed state → shows type badge, label preview and move/edit/delete actions.
 * Expanded state  → renders the full FormQuestionFieldsComponent for all question
 *                   properties, plus a "Conditional Follow-ups" section for boolean
 *                   and select questions that uses FormChildQuestionEditorComponent
 *                   so every follow-up gets the same rich editing experience.
 *
 * New questions (empty label) open in expanded mode automatically.
 */
@Component({
  selector: 'app-form-question-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FormQuestionFieldsComponent, FormChildQuestionEditorComponent],
  template: `

    <!-- ── Collapsed row ─────────────────────────────────────────────── -->
    <div
      *ngIf="!expanded"
      class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">

      <!-- Move up / down -->
      <div class="flex flex-col gap-0.5">
        <button
          (click)="moveUp.emit()"
          [disabled]="isFirst"
          class="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-25"
          title="Move up">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
        <button
          (click)="moveDown.emit()"
          [disabled]="isLast"
          class="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-25"
          title="Move down">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- Type badge -->
      <span
        [class]="typeBadgeClass(question.type)"
        class="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">
        {{ typeLabel(question.type) }}
      </span>

      <!-- Label preview -->
      <span class="flex-1 text-sm text-gray-800 truncate">
        {{ question.label || '(no label)' }}
        <span *ngIf="question.required" class="text-red-500 ml-0.5">*</span>
      </span>

      <!-- Child count badge -->
      <span
        *ngIf="question.children && question.children.length > 0"
        class="text-xs text-violet-600 bg-violet-50 rounded px-2 py-0.5 flex-shrink-0">
        {{ question.children.length }} follow-up{{ question.children.length !== 1 ? 's' : '' }}
      </span>

      <!-- Edit / Delete -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <button
          (click)="expanded = true"
          class="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          title="Edit">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button
          (click)="remove.emit()"
          class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Expanded editor ────────────────────────────────────────────── -->
    <div
      *ngIf="expanded"
      class="px-5 py-4 bg-violet-50/40 border-l-4 border-violet-400 space-y-4">

      <!-- All question fields (shared component) -->
      <app-form-question-fields
        [question]="question"
        [questionTypes]="questionTypes"
        [mapsToOptions]="mapsToOptions"
        (dirty)="dirty.emit()">
      </app-form-question-fields>

      <!-- ── Conditional follow-ups (boolean / select types only) ────── -->
      <div *ngIf="question.type === 'boolean' || question.type === 'select'">

        <div class="flex items-center gap-2 mb-3 mt-2">
          <div class="flex-1 border-t border-violet-200"></div>
          <span class="text-xs font-semibold text-violet-600 uppercase tracking-wide px-2">
            Conditional Follow-ups
          </span>
          <div class="flex-1 border-t border-violet-200"></div>
        </div>

        <div class="space-y-3">

          <!-- Each child uses the full child editor → same richness as top-level -->
          <app-form-child-question-editor
            *ngFor="let child of question.children; let ci = index"
            [question]="child"
            [parentQuestion]="question"
            [isFirst]="ci === 0"
            [isLast]="ci === (question.children?.length ?? 0) - 1"
            [questionTypes]="questionTypes"
            [mapsToOptions]="mapsToOptions"
            (dirty)="dirty.emit()"
            (remove)="removeChild(ci)"
            (moveUp)="moveChildUp(ci)"
            (moveDown)="moveChildDown(ci)">
          </app-form-child-question-editor>

          <button
            (click)="addChild()"
            class="w-full py-2 text-xs font-medium text-violet-600 border border-dashed
                   border-violet-300 rounded-lg hover:bg-violet-50 transition-colors
                   flex items-center justify-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Add conditional follow-up
          </button>

        </div>
      </div>

      <!-- Done -->
      <div class="flex justify-end pt-1 pb-2">
        <button
          (click)="expanded = false"
          class="px-4 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg
                 hover:bg-violet-700 transition-colors">
          Done
        </button>
      </div>

    </div>
  `,
})
export class FormQuestionEditorComponent implements OnInit {
  @Input() question!: IFormQuestion;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() questionTypes: { value: QuestionType; label: string }[] = [];
  @Input() mapsToOptions: { value: MapsToField; label: string }[] = [];

  @Output() dirty = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  expanded = false;

  ngOnInit(): void {
    // Auto-expand freshly-added questions (no label yet)
    if (!this.question.label) {
      this.expanded = true;
    }
  }

  // ── Children ───────────────────────────────────────────────────────────────

  addChild(): void {
    if (!this.question.children) this.question.children = [];
    const defaultValue = this.question.type === 'boolean'
      ? true
      : (this.question.options?.[0] ?? '');
    this.question.children = [
      ...this.question.children,
      {
        id: uid(),
        label: '',
        type: 'text',
        required: false,
        children: [],
        visibleIf: { value: defaultValue },
      },
    ];
    this.dirty.emit();
  }

  removeChild(ci: number): void {
    this.question.children = (this.question.children ?? []).filter((_, i) => i !== ci);
    this.dirty.emit();
  }

  moveChildUp(ci: number): void {
    if (ci === 0) return;
    const c = [...(this.question.children ?? [])];
    [c[ci - 1], c[ci]] = [c[ci], c[ci - 1]];
    this.question.children = c;
    this.dirty.emit();
  }

  moveChildDown(ci: number): void {
    const children = this.question.children ?? [];
    if (ci === children.length - 1) return;
    const c = [...children];
    [c[ci], c[ci + 1]] = [c[ci + 1], c[ci]];
    this.question.children = c;
    this.dirty.emit();
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  typeLabel(type: QuestionType): string {
    return QUESTION_TYPE_LABELS[type] ?? type;
  }

  typeBadgeClass(type: QuestionType): string {
    const map: Record<QuestionType, string> = {
      text:             'bg-gray-100 text-gray-600',
      textarea:         'bg-blue-50 text-blue-600',
      boolean:          'bg-green-50 text-green-700',
      number:           'bg-amber-50 text-amber-700',
      select:           'bg-violet-50 text-violet-700',
      date:             'bg-teal-50 text-teal-700',
      rating:           'bg-purple-50 text-purple-700',
      currency:         'bg-yellow-50 text-yellow-700',
      applicant_picker: 'bg-indigo-50 text-indigo-700',
      user_picker:      'bg-rose-50 text-rose-700',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600';
  }
}
