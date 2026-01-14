import { Component, input, output, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Form field configuration interface
 */
export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select' | 'currency' | 'percentage';
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[]; // For select/dropdown fields
  rows?: number; // For textarea
  min?: number; // For number inputs
  max?: number; // For number inputs
  step?: number; // For number inputs
}

/**
 * Option for select/dropdown fields
 */
export interface FormFieldOption {
  label: string;
  value: string | number;
}

/**
 * Dynamic Form Component
 *
 * A simple, reusable form component that:
 * - Takes an array of field configurations
 * - Renders appropriate input types
 * - Uses ngModel for two-way binding
 * - Emits form data to parent on submit
 * - Handles Enter key natively
 *
 * @example
 * <app-dynamic-form
 *   [fields]="formFields"
 *   [submitButtonText]="'Save'"
 *   (formSubmit)="handleSubmit($event)"
 * />
 */
@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="onSubmit()" #formElement="ngForm" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @for (field of fields(); track field.key) {
          <div
            class="space-y-2"
            [class.md:col-span-2]="field.type === 'textarea'"
          >
            <!-- Field Label -->
            <label
              [for]="field.key"
              class="block text-sm font-semibold text-gray-700"
            >
              {{ field.label }}
              @if (field.required) {
                <span class="text-red-600 ml-0.5">*</span>
              }
            </label>

            <!-- Text Input -->
            @if (field.type === 'text' || field.type === 'email' || field.type === 'tel') {
              <input
                [id]="field.key"
                [name]="field.key"
                [type]="field.type"
                [(ngModel)]="formData()[field.key]"
                [placeholder]="field.placeholder || ''"
                [required]="field.required || false"
                class="block w-full rounded-lg border border-gray-300 shadow-sm text-sm px-4 py-2.5 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
              />
            }

            <!-- Number Input -->
            @if (field.type === 'number') {
              <input
                [id]="field.key"
                [name]="field.key"
                type="number"
                [(ngModel)]="formData()[field.key]"
                [placeholder]="field.placeholder || '0'"
                [required]="field.required || false"
                [min]="field.min || 0"
                [max]="field.max || null"
                [step]="field.step || 1"
                class="block w-full rounded-lg border border-gray-300 shadow-sm text-sm px-4 py-2.5 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
              />
            }

            <!-- Currency Input -->
            @if (field.type === 'currency') {
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span class="text-gray-600 text-sm font-semibold">R</span>
                </div>
                <input
                  [id]="field.key"
                  [name]="field.key"
                  type="number"
                  [(ngModel)]="formData()[field.key]"
                  [placeholder]="field.placeholder || '0.00'"
                  [required]="field.required || false"
                  [step]="field.step || 0.01"
                  class="block w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 shadow-sm text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
                />
              </div>
            }

            <!-- Percentage Input -->
            @if (field.type === 'percentage') {
              <div class="relative">
                <input
                  [id]="field.key"
                  [name]="field.key"
                  type="number"
                  [(ngModel)]="formData()[field.key]"
                  [placeholder]="field.placeholder || '0'"
                  [required]="field.required || false"
                  [min]="field.min || 0"
                  [max]="field.max || 100"
                  [step]="field.step || 0.1"
                  class="block w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-300 shadow-sm text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
                />
                <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span class="text-gray-600 text-sm font-semibold">%</span>
                </div>
              </div>
            }

            <!-- Date Input -->
            @if (field.type === 'date') {
              <input
                [id]="field.key"
                [name]="field.key"
                type="date"
                [(ngModel)]="formData()[field.key]"
                [required]="field.required || false"
                class="block w-full rounded-lg border border-gray-300 shadow-sm text-sm px-4 py-2.5 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
              />
            }

            <!-- Textarea -->
            @if (field.type === 'textarea') {
              <textarea
                [id]="field.key"
                [name]="field.key"
                [(ngModel)]="formData()[field.key]"
                [placeholder]="field.placeholder || ''"
                [required]="field.required || false"
                [rows]="field.rows || 3"
                class="block w-full rounded-lg border border-gray-300 shadow-sm text-sm px-4 py-2.5 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
              ></textarea>
            }

            <!-- Select Dropdown -->
            @if (field.type === 'select') {
              <select
                [id]="field.key"
                [name]="field.key"
                [(ngModel)]="formData()[field.key]"
                [required]="field.required || false"
                class="block w-full rounded-lg border border-gray-300 shadow-sm text-sm px-4 py-2.5 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400"
              >
                <option value="">Select {{ field.label }}</option>
                @for (option of field.options; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            }
          </div>
        }
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          [disabled]="!formElement.valid"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg shadow-sm transition-all hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i class="fas fa-check mr-2"></i>
          {{ submitButtonText() }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DynamicFormComponent {
  // Inputs
  fields = input.required<FormField[]>();
  submitButtonText = input<string>('Submit');
  initialData = input<Record<string, any>>({});

  // Outputs
  formSubmit = output<Record<string, any>>();

  // Internal state
  formData = signal<Record<string, any>>({});

  constructor() {
    // Initialize form data when fields or initialData changes
    effect(() => {
      const data: Record<string, any> = {};
      const initial = this.initialData();

      this.fields().forEach(field => {
        // Use initial data if provided, otherwise set appropriate default
        if (initial && initial[field.key] !== undefined) {
          data[field.key] = this.cleanValueForInput(initial[field.key], field.type);
        } else {
          data[field.key] = this.getDefaultValue(field.type);
        }
      });

      this.formData.set(data);
      console.log('📋 [DYNAMIC-FORM] Initialized with data:', data);
    });
  }

  /**
   * Clean value for HTML input (e.g., remove timestamp from dates)
   */
  private cleanValueForInput(value: any, type: FormField['type']): any {
    if (value === null || value === undefined) {
      return '';
    }

    // Clean date values - extract just YYYY-MM-DD
    if (type === 'date' && typeof value === 'string') {
      return value.split('T')[0].split(' ')[0];
    }

    return value;
  }

  /**
   * Get default value based on field type
   */
  private getDefaultValue(type: FormField['type']): any {
    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage':
        return null;
      case 'date':
      case 'text':
      case 'email':
      case 'tel':
      case 'textarea':
      case 'select':
      default:
        return '';
    }
  }

  /**
   * Handle form submission
   * Emits only fields with values (excludes empty strings, null, undefined)
   */
  onSubmit(): void {
    console.log('📤 [DYNAMIC-FORM] Form submitted');
    console.log('📤 [DYNAMIC-FORM] Raw form data:', this.formData());

    const cleanData: Record<string, any> = {};

    // Only include fields that have values
    this.fields().forEach(field => {
      const value = this.formData()[field.key];

      // Include if not empty
      if (value !== '' && value !== null && value !== undefined) {
        cleanData[field.key] = value;
      }
    });

    console.log('✨ [DYNAMIC-FORM] Emitting cleaned data:', cleanData);
    this.formSubmit.emit(cleanData);
  }
}
