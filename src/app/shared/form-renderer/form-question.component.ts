import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IFormQuestion } from '../../admin/form-templates/interfaces/form-template.interfaces';
import { ApplicantPickerComponent, ApplicantPickerValue } from './applicant-picker.component';
import { UserPickerComponent, UserPickerValue } from './user-picker.component';

/**
 * 'admin'  → compact admin-panel style (radio for boolean, <select> dropdown, currency support)
 * 'public' → public-facing card style (pill buttons for boolean/select, card wrapper)
 */
export type QuestionVariant = 'admin' | 'public';

/**
 * Reusable form question renderer.
 *
 * Handles all question types (text, textarea, number, date, boolean, select,
 * rating, currency) and recursively renders conditional children.
 *
 * Usage:
 *   <app-form-question
 *     [question]="q"
 *     [answers]="answers"
 *     variant="admin"
 *     (answerChange)="onAnswerChange($event)">
 *   </app-form-question>
 *
 * Text-like inputs (text, textarea, number, date, currency) mutate `answers`
 * directly via [(ngModel)].  Click-based inputs (boolean, select, rating)
 * emit (answerChange) so the parent can update its own state consistently.
 */
@Component({
  selector: 'app-form-question',
  standalone: true,
  // forwardRef allows the component to import itself for recursive child rendering
  imports: [CommonModule, FormsModule, forwardRef(() => FormQuestionComponent),
            ApplicantPickerComponent, UserPickerComponent],
  template: `
    <!-- ── Outer wrapper ──────────────────────────────────────────────── -->
    <div [class]="variant === 'public'
           ? 'bg-white rounded-xl border border-gray-200 p-5 shadow-sm'
           : 'space-y-1'">

      <!-- Label -->
      <label [class]="variant === 'public'
               ? 'block text-sm font-medium text-gray-800 mb-3 leading-relaxed'
               : 'block text-xs font-medium text-gray-700'">
        {{ question.label }}
        <span *ngIf="question.required" class="text-red-500 ml-0.5">*</span>
      </label>

      <!-- ── text ──────────────────────────────────────────────────────── -->
      <input *ngIf="question.type === 'text'" type="text"
        [(ngModel)]="answers[question.id]"
        [placeholder]="question.label"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
               focus:ring-2 focus:ring-violet-400 focus:border-transparent
               focus:outline-none">

      <!-- ── textarea ──────────────────────────────────────────────────── -->
      <textarea *ngIf="question.type === 'textarea'"
        [(ngModel)]="answers[question.id]"
        [placeholder]="question.label"
        rows="3"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
               focus:ring-2 focus:ring-violet-400 focus:border-transparent
               focus:outline-none">
      </textarea>

      <!-- ── number ────────────────────────────────────────────────────── -->
      <input *ngIf="question.type === 'number'" type="number"
        [(ngModel)]="answers[question.id]"
        class="w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg
               focus:ring-2 focus:ring-violet-400 focus:border-transparent
               focus:outline-none">

      <!-- ── date ──────────────────────────────────────────────────────── -->
      <input *ngIf="question.type === 'date'" type="date"
        [(ngModel)]="answers[question.id]"
        class="w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg
               focus:ring-2 focus:ring-violet-400 focus:border-transparent
               focus:outline-none">

      <!-- ── boolean ───────────────────────────────────────────────────── -->
      <ng-container *ngIf="question.type === 'boolean'">

        <!-- Admin: radio inputs -->
        <div *ngIf="variant === 'admin'" class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="radio" [name]="'bool_' + question.id" [value]="true"
              [ngModel]="answers[question.id]"
              (ngModelChange)="setAnswer(question.id, $event)"
              class="w-4 h-4 text-violet-600 border-gray-300">
            Yes
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="radio" [name]="'bool_' + question.id" [value]="false"
              [ngModel]="answers[question.id]"
              (ngModelChange)="setAnswer(question.id, $event)"
              class="w-4 h-4 text-violet-600 border-gray-300">
            No
          </label>
        </div>

        <!-- Public: pill buttons -->
        <div *ngIf="variant === 'public'" class="flex gap-3">
          <button type="button" (click)="setAnswer(question.id, true)"
            class="flex-1 py-2.5 text-sm font-medium border rounded-lg transition-colors hover:border-violet-400"
            [class.bg-violet-600]="answers[question.id] === true"
            [class.text-white]="answers[question.id] === true"
            [class.border-violet-600]="answers[question.id] === true"
            [class.bg-white]="answers[question.id] !== true"
            [class.text-gray-700]="answers[question.id] !== true">Yes</button>
          <button type="button" (click)="setAnswer(question.id, false)"
            class="flex-1 py-2.5 text-sm font-medium border rounded-lg transition-colors hover:border-violet-400"
            [class.bg-violet-600]="answers[question.id] === false"
            [class.text-white]="answers[question.id] === false"
            [class.border-violet-600]="answers[question.id] === false"
            [class.bg-white]="answers[question.id] !== false"
            [class.text-gray-700]="answers[question.id] !== false">No</button>
        </div>

      </ng-container>

      <!-- ── select ────────────────────────────────────────────────────── -->
      <ng-container *ngIf="question.type === 'select' && question.options">

        <!-- Admin: native <select> -->
        <select *ngIf="variant === 'admin'"
          [ngModel]="answers[question.id]"
          (ngModelChange)="setAnswer(question.id, $event)"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                 focus:ring-2 focus:ring-violet-400 focus:border-transparent
                 focus:outline-none">
          <option value="">— select —</option>
          <option *ngFor="let opt of question.options" [value]="opt">{{ opt }}</option>
        </select>

        <!-- Public: pill buttons -->
        <div *ngIf="variant === 'public'" class="flex flex-wrap gap-2">
          <button *ngFor="let opt of question.options" type="button"
            (click)="setAnswer(question.id, opt)"
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-colors hover:border-violet-400"
            [class.bg-violet-600]="answers[question.id] === opt"
            [class.text-white]="answers[question.id] === opt"
            [class.border-violet-600]="answers[question.id] === opt"
            [class.bg-white]="answers[question.id] !== opt"
            [class.text-gray-700]="answers[question.id] !== opt">
            {{ opt }}
          </button>
        </div>

      </ng-container>

      <!-- ── rating ────────────────────────────────────────────────────── -->
      <div *ngIf="question.type === 'rating'" class="flex items-center gap-1.5 flex-wrap">
        <button *ngFor="let n of ratingScale" type="button"
          (click)="setAnswer(question.id, n)"
          class="text-sm font-semibold border-2 transition-all"
          [class.rounded-lg]="variant === 'admin'"
          [class.rounded-xl]="variant === 'public'"
          [class.w-9]="variant === 'admin'" [class.h-9]="variant === 'admin'"
          [class.w-10]="variant === 'public'" [class.h-10]="variant === 'public'"
          [class.bg-violet-600]="answers[question.id] === n"
          [class.text-white]="answers[question.id] === n"
          [class.border-violet-600]="answers[question.id] === n"
          [class.bg-white]="answers[question.id] !== n"
          [class.text-gray-500]="answers[question.id] !== n"
          [class.border-gray-200]="answers[question.id] !== n">
          {{ n }}
        </button>
        <span *ngIf="answers[question.id]" class="ml-1 text-xs text-gray-400">
          / {{ question.scale ?? 5 }}
        </span>
      </div>

      <!-- ── currency (admin only) ──────────────────────────────────────── -->
      <div *ngIf="question.type === 'currency'" class="flex items-center w-56">
        <span class="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg
                     text-sm text-gray-500 font-medium">R</span>
        <input type="number" min="0"
          [(ngModel)]="answers[question.id]"
          class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg
                 focus:ring-2 focus:ring-violet-400 focus:border-transparent
                 focus:outline-none">
      </div>
      <!-- ── applicant_picker ───────────────────────────────────── -->
      <app-applicant-picker
        *ngIf="question.type === 'applicant_picker'"
        [config]="question.pickerConfig"
        [value]="answers[question.id]"
        (valueChange)="setAnswer(question.id, $event)">
      </app-applicant-picker>

      <!-- ── user_picker ──────────────────────────────────────── -->
      <app-user-picker
        *ngIf="question.type === 'user_picker'"
        [config]="question.pickerConfig"
        [value]="answers[question.id]"
        (valueChange)="setAnswer(question.id, $event)">
      </app-user-picker>
      <!-- ── Conditional children (recursive) ──────────────────────────── -->
      <ng-container *ngIf="question.children?.length">
        <ng-container *ngFor="let child of question.children">
          <div *ngIf="isChildVisible(child)"
               [class]="variant === 'admin'
                 ? 'ml-5 pl-4 border-l-2 border-violet-200 mt-2'
                 : 'mt-4 pt-4 border-t border-gray-100'">
            <app-form-question
              [question]="child"
              [answers]="answers"
              [variant]="variant"
              (answerChange)="answerChange.emit($event)">
            </app-form-question>
          </div>
        </ng-container>
      </ng-container>

    </div>
    <div class="mb-4"></div>
  `,
})
export class FormQuestionComponent {
  @Input() question!: IFormQuestion;
  /** Shared answer map — text/number/date inputs mutate it directly via [(ngModel)];
   *  click-based inputs emit (answerChange) so the parent controls immutability. */
  @Input() answers: Record<string, any> = {};
  @Input() variant: QuestionVariant = 'admin';
  @Output() answerChange = new EventEmitter<{ id: string; value: any }>();

  get ratingScale(): number[] {
    return Array.from({ length: this.question.scale ?? 5 }, (_, i) => i + 1);
  }

  setAnswer(id: string, value: any): void {
    this.answerChange.emit({ id, value });
  }

  /** Child is visible when the parent question's current answer matches child.visibleIf.value */
  isChildVisible(child: IFormQuestion): boolean {
    if (!child.visibleIf) return true;
    return this.answers[this.question.id] === child.visibleIf.value;
  }
}
