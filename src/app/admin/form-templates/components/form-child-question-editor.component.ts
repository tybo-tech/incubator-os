import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IFormQuestion,
  QuestionType,
  MapsToField,
} from '../interfaces/form-template.interfaces';
import { FormQuestionFieldsComponent } from './form-question-fields.component';

/**
 * Renders a single conditional follow-up (child) question.
 *
 * Always shown expanded. Displays a "Show when parent =" row at the top
 * so the builder can configure the visibleIf condition, followed by the
 * full shared question form (FormQuestionFieldsComponent).
 *
 * Child questions intentionally do not have their own children section —
 * conditional nesting is kept to one level in the builder UI.
 */
@Component({
  selector: 'app-form-child-question-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, FormQuestionFieldsComponent],
  template: `
    <div class="bg-white border border-violet-200 rounded-lg p-4 space-y-3 mb-2">

      <!-- ── Header: order buttons + visibleIf + remove ─────────────── -->
      <div class="flex items-center gap-3 flex-wrap ">

        <!-- Move up / down -->
        <div class="flex flex-col gap-0.5 flex-shrink-0">
          <button
            (click)="moveUp.emit()"
            [disabled]="isFirst"
            class="p-0.5 text-gray-300 hover:text-violet-500 disabled:opacity-25 transition-colors"
            title="Move follow-up up">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <button
            (click)="moveDown.emit()"
            [disabled]="isLast"
            class="p-0.5 text-gray-300 hover:text-violet-500 disabled:opacity-25 transition-colors"
            title="Move follow-up down">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>

        <span class="text-xs text-gray-500 flex-shrink-0">Show when parent =</span>

        <!-- Boolean parent → Yes / No toggles -->
        <div *ngIf="parentQuestion.type === 'boolean'" class="flex gap-2">
          <button
            (click)="setVisibleIf(true)"
            [class]="question.visibleIf?.value === true
              ? 'px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border-2 border-green-400'
              : 'px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-500 border-2 border-transparent hover:border-gray-300'">
            Yes
          </button>
          <button
            (click)="setVisibleIf(false)"
            [class]="question.visibleIf?.value === false
              ? 'px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border-2 border-red-400'
              : 'px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-500 border-2 border-transparent hover:border-gray-300'">
            No
          </button>
        </div>

        <!-- Select parent → dropdown of parent's options -->
        <select
          *ngIf="parentQuestion.type === 'select' && question.visibleIf"
          [(ngModel)]="question.visibleIf.value"
          (ngModelChange)="dirty.emit()"
          class="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white
                 focus:ring-1 focus:ring-violet-400 focus:border-transparent">
          <option *ngFor="let opt of parentQuestion.options" [value]="opt">{{ opt }}</option>
        </select>

        <div class="flex-1"></div>

        <!-- Remove this follow-up -->
        <button
          (click)="remove.emit()"
          class="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="Remove follow-up">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── Shared question form fields ─────────────────────────────── -->
      <app-form-question-fields
        [question]="question"
        [questionTypes]="questionTypes"
        [mapsToOptions]="mapsToOptions"
        (dirty)="dirty.emit()">
      </app-form-question-fields>

    </div>
  `,
})
export class FormChildQuestionEditorComponent {
  /** The child question being edited. */
  @Input() question!: IFormQuestion;
  /** The parent question — needed for the visibleIf row. */
  @Input() parentQuestion!: IFormQuestion;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() questionTypes: { value: QuestionType; label: string }[] = [];
  @Input() mapsToOptions: { value: MapsToField; label: string }[] = [];

  @Output() dirty = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  setVisibleIf(value: boolean): void {
    this.question.visibleIf = { value };
    this.dirty.emit();
  }
}
