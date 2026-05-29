import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IFormQuestion,
  QuestionType,
  QUESTION_TYPE_LABELS,
  MapsToField,
  MAPS_TO_LABELS,
} from '../interfaces/form-template.interfaces';

/**
 * Renders all the editable fields for a single question:
 * label, type, required, isBlocking, rating scale, picker config
 * (mapsTo + stages/roles + allowFreeText + placeholder),
 * select options, and boolean default value.
 *
 * This is a pure "form body" — it has no collapsed state, no children
 * section, and no visibleIf row. Those concerns belong to the wrappers
 * (FormQuestionEditorComponent and FormChildQuestionEditorComponent).
 */
@Component({
  selector: 'app-form-question-fields',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">

      <!-- Label -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">
          Question Label <span class="text-red-500">*</span>
        </label>
        <textarea
          [(ngModel)]="question.label"
          (ngModelChange)="dirty.emit()"
          rows="2"
          placeholder="Type the question text…"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none
                 focus:ring-2 focus:ring-violet-400 focus:border-transparent">
        </textarea>
      </div>

      <!-- Type + Required + Blocking -->
      <div class="flex gap-4 flex-wrap">
        <div class="flex-1 min-w-[160px]">
          <label class="block text-xs font-medium text-gray-600 mb-1">Question Type</label>
          <select
            [(ngModel)]="question.type"
            (ngModelChange)="onTypeChange(); dirty.emit()"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                   focus:ring-2 focus:ring-violet-400 focus:border-transparent">
            <option *ngFor="let t of questionTypes" [value]="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="flex items-end pb-0.5 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              [(ngModel)]="question.required"
              (ngModelChange)="dirty.emit()"
              class="w-4 h-4 text-violet-600 border-gray-300 rounded">
            <span class="text-sm text-gray-700">Required</span>
          </label>
          <label
            class="flex items-center gap-2 cursor-pointer"
            title="A non-passing answer flags a risk and may block progression">
            <input
              type="checkbox"
              [(ngModel)]="question.isBlocking"
              (ngModelChange)="dirty.emit()"
              class="w-4 h-4 text-red-600 border-gray-300 rounded">
            <span class="text-sm text-gray-700">Blocking</span>
          </label>
        </div>
      </div>

      <!-- Rating scale -->
      <div *ngIf="question.type === 'rating'" class="flex items-center gap-3">
        <label class="text-xs font-medium text-gray-600 flex-shrink-0">Scale (max points)</label>
        <input
          type="number"
          [(ngModel)]="question.scale"
          (ngModelChange)="dirty.emit()"
          min="2" max="20"
          placeholder="5"
          class="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                 focus:ring-2 focus:ring-violet-400 focus:border-transparent">
      </div>

      <!-- Picker configuration (applicant_picker / user_picker) -->
      <div
        *ngIf="question.type === 'applicant_picker' || question.type === 'user_picker'"
        class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-3">

        <div class="flex items-center gap-2">
          <svg class="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span class="text-xs font-semibold text-indigo-700">Picker configuration</span>
        </div>

        <!-- mapsTo -->
        <div>
          <label class="block text-xs text-indigo-600 mb-1">Maps to node field</label>
          <select
            [(ngModel)]="question.mapsTo"
            (ngModelChange)="dirty.emit()"
            class="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white
                   focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
            <option [ngValue]="undefined">(none)</option>
            <option *ngFor="let entry of mapsToOptions" [value]="entry.value">{{ entry.label }}</option>
          </select>
          <p class="text-[10px] text-indigo-500 mt-1 leading-snug">
            The picked record's ID will be written to this field on the submission node at save time.
          </p>
        </div>

        <!-- Filter: stages (applicant_picker) -->
        <div *ngIf="question.type === 'applicant_picker'">
          <label class="block text-xs text-indigo-600 mb-1">
            Filter by stages
            <span class="font-normal text-indigo-400">(comma-separated stage keys; blank = all)</span>
          </label>
          <input
            type="text"
            [ngModel]="pickerStages"
            (ngModelChange)="setPickerStages($event)"
            placeholder="e.g. due_diligence, stage_1234"
            class="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg
                   focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
        </div>

        <!-- Filter: roles (user_picker) -->
        <div *ngIf="question.type === 'user_picker'">
          <label class="block text-xs text-indigo-600 mb-1">
            Filter by roles
            <span class="font-normal text-indigo-400">(comma-separated; blank = all)</span>
          </label>
          <input
            type="text"
            [ngModel]="pickerRoles"
            (ngModelChange)="setPickerRoles($event)"
            placeholder="e.g. Judge, Coordinator"
            class="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg
                   focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
        </div>

        <!-- Placeholder + allowFreeText -->
        <div class="flex gap-3 flex-wrap">
          <div class="flex-1 min-w-[140px]">
            <label class="block text-xs text-indigo-600 mb-1">Placeholder text</label>
            <input
              type="text"
              [ngModel]="question.pickerConfig?.placeholder ?? ''"
              (ngModelChange)="setPickerPlaceholder($event)"
              placeholder="Search…"
              class="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg
                     focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
          </div>
          <div class="flex items-end pb-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                [ngModel]="question.pickerConfig?.allowFreeText ?? false"
                (ngModelChange)="setPickerAllowFreeText($event)"
                class="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded">
              <span class="text-xs text-indigo-700">Allow free text</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Select options -->
      <div *ngIf="question.type === 'select'">
        <label class="block text-xs font-medium text-gray-600 mb-2">Options</label>
        <div class="space-y-2">
          <div
            *ngFor="let opt of question.options; let oi = index"
            class="flex items-center gap-2">
            <input
              type="text"
              [(ngModel)]="question.options![oi]"
              (ngModelChange)="dirty.emit()"
              placeholder="Option {{ oi + 1 }}"
              class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-violet-400 focus:border-transparent">
            <button
              (click)="removeOption(oi)"
              class="p-1 text-gray-400 hover:text-red-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <button
            (click)="addOption()"
            class="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Add option
          </button>
        </div>
      </div>

      <!-- Boolean default value -->
      <div *ngIf="question.type === 'boolean'" class="flex items-center gap-3">
        <span class="text-xs text-gray-500 flex-shrink-0">Default answer:</span>
        <div class="flex gap-2">
          <button
            (click)="setDefault(true)"
            [class]="question.default === true
              ? 'px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border-2 border-green-400'
              : 'px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-500 border-2 border-transparent hover:border-gray-300'">
            Yes
          </button>
          <button
            (click)="setDefault(false)"
            [class]="question.default === false
              ? 'px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border-2 border-red-400'
              : 'px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-500 border-2 border-transparent hover:border-gray-300'">
            No
          </button>
          <button
            *ngIf="question.default !== undefined"
            (click)="clearDefault()"
            class="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-400 border-2 border-transparent
                   hover:border-gray-300">
            Clear
          </button>
        </div>
      </div>

    </div>
  `,
})
export class FormQuestionFieldsComponent {
  @Input() question!: IFormQuestion;
  @Input() questionTypes: { value: QuestionType; label: string }[] = [];
  @Input() mapsToOptions: { value: MapsToField; label: string }[] = [];

  @Output() dirty = new EventEmitter<void>();

  // ── Type change ────────────────────────────────────────────────────────────

  onTypeChange(): void {
    if (this.question.type !== 'select') {
      delete this.question.options;
    } else if (!this.question.options) {
      this.question.options = ['Yes', 'No', 'N/A'];
    }
    if (this.question.type !== 'boolean' && this.question.type !== 'select') {
      this.question.children = [];
    }
    if (this.question.type !== 'applicant_picker' && this.question.type !== 'user_picker') {
      delete this.question.mapsTo;
      delete this.question.pickerConfig;
    }
    if (this.question.type !== 'rating') {
      delete this.question.scale;
    }
  }

  // ── Options (select) ───────────────────────────────────────────────────────

  addOption(): void {
    if (!this.question.options) this.question.options = [];
    this.question.options = [...this.question.options, ''];
    this.dirty.emit();
  }

  removeOption(oi: number): void {
    this.question.options = (this.question.options ?? []).filter((_, i) => i !== oi);
    this.dirty.emit();
  }

  // ── Default value (boolean) ────────────────────────────────────────────────

  setDefault(value: boolean): void {
    this.question.default = value;
    this.dirty.emit();
  }

  clearDefault(): void {
    delete this.question.default;
    this.dirty.emit();
  }

  // ── Picker config ──────────────────────────────────────────────────────────

  get pickerStages(): string {
    return (this.question.pickerConfig?.stages ?? []).join(', ');
  }

  setPickerStages(value: string): void {
    const stages = value.split(',').map(s => s.trim()).filter(Boolean);
    this.question.pickerConfig = {
      ...this.question.pickerConfig,
      stages: stages.length ? stages : undefined,
    };
    this.dirty.emit();
  }

  get pickerRoles(): string {
    return (this.question.pickerConfig?.roles ?? []).join(', ');
  }

  setPickerRoles(value: string): void {
    const roles = value.split(',').map(s => s.trim()).filter(Boolean);
    this.question.pickerConfig = {
      ...this.question.pickerConfig,
      roles: roles.length ? roles : undefined,
    };
    this.dirty.emit();
  }

  setPickerPlaceholder(value: string): void {
    this.question.pickerConfig = {
      ...this.question.pickerConfig,
      placeholder: value || undefined,
    };
    this.dirty.emit();
  }

  setPickerAllowFreeText(value: boolean): void {
    this.question.pickerConfig = {
      ...this.question.pickerConfig,
      allowFreeText: value || undefined,
    };
    this.dirty.emit();
  }
}
