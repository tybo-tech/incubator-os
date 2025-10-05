import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CreateModalField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'tel';
  placeholder?: string;
  required?: boolean;
  rows?: number; // for textarea
  options?: { value: string; label: string }[]; // for select
}

export interface CreateModalConfig {
  title: string;
  fields: CreateModalField[];
  submitLabel?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

@Component({
  selector: 'app-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="show"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
         (click)="onBackdropClick($event)">
      <div [class]="getModalClasses()" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ config.title }}</h3>
        </div>

        <div class="px-6 py-4 max-h-96 overflow-y-auto">
          <div [class]="getFormLayoutClasses()">
            <div *ngFor="let field of config.fields" [class]="getFieldLayoutClasses()">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ field.label }}
                <span *ngIf="field.required" class="text-red-500">*</span>
              </label>

              <!-- Text/Email/Tel/Number Input -->
              <input
                *ngIf="field.type === 'text' || field.type === 'email' || field.type === 'number' || field.type === 'tel'"
                [type]="field.type"
                [(ngModel)]="formData[field.key]"
                [placeholder]="field.placeholder || ''"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">

              <!-- Select -->
              <select
                *ngIf="field.type === 'select'"
                [(ngModel)]="formData[field.key]"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">{{ field.placeholder || 'Select an option' }}</option>
                <option *ngFor="let option of field.options" [value]="option.value">
                  {{ option.label }}
                </option>
              </select>

              <!-- Textarea -->
              <textarea
                *ngIf="field.type === 'textarea'"
                [(ngModel)]="formData[field.key]"
                [placeholder]="field.placeholder || ''"
                [rows]="field.rows || 3"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </textarea>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            (click)="onCancel()"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            (click)="onSubmit()"
            [disabled]="isSubmitting() || !isFormValid()"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
            {{ isSubmitting() ? 'Creating...' : (config.submitLabel || 'Create') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class CreateModalComponent {
  @Input() show = false;
  @Input() config!: CreateModalConfig;
  @Input() isSubmitting = signal(false);

  @Output() cancel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  formData: { [key: string]: any } = {};

  ngOnInit(): void {
    this.resetForm();
  }

  ngOnChanges(): void {
    if (this.show) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.formData = {};
    this.config?.fields?.forEach(field => {
      this.formData[field.key] = '';
    });
  }

  getModalClasses(): string {
    const maxWidths = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    };

    const maxWidth = maxWidths[this.config.maxWidth || 'md'];
    return `bg-white rounded-lg shadow-xl ${maxWidth} w-full`;
  }

  getFormLayoutClasses(): string {
    const fieldCount = this.config.fields.length;

    // Use grid layout for forms with many fields
    if (fieldCount > 6) {
      return 'grid grid-cols-1 md:grid-cols-2 gap-4';
    }

    return 'space-y-4';
  }

  getFieldLayoutClasses(): string {
    const fieldCount = this.config.fields.length;

    // Span full width for certain field types or small forms
    if (fieldCount <= 6) {
      return '';
    }

    return '';
  }

  isFormValid(): boolean {
    return this.config.fields
      .filter(field => field.required)
      .every(field => {
        const value = this.formData[field.key];
        return value && value.toString().trim().length > 0;
      });
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    // Clean up form data (trim strings, etc.)
    const cleanedData: { [key: string]: any } = {};
    Object.keys(this.formData).forEach(key => {
      const value = this.formData[key];
      cleanedData[key] = typeof value === 'string' ? value.trim() : value;
    });

    this.submit.emit(cleanedData);
  }
}
