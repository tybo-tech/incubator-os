import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplianceColumnConfig } from './compliance-base.component';
import { ComplianceRecord } from '../../../models/ComplianceRecord';

/**
 * Form configuration interface for the compliance form component
 */
export interface ComplianceFormConfig {
  title: string;
  fields: ComplianceColumnConfig[];
  submitButtonText?: string;
  cancelButtonText?: string;
  submitButtonColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
  mode?: 'create' | 'edit';
  showRequiredIndicator?: boolean;
}

/**
 * Smart, reusable compliance form component
 * Accepts configuration and automatically generates form fields, handles validation, and emits data
 */
@Component({
  selector: 'app-compliance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white">
      <!-- Form Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ config.title }}
        </h3>
        <p class="text-sm text-gray-600 mt-1" *ngIf="getFieldCount() > 0">
          {{ getRequiredFieldCount() }} required field{{ getRequiredFieldCount() !== 1 ? 's' : '' }}
          of {{ getFieldCount() }} total
        </p>
      </div>

      <!-- Dynamic Form Fields -->
      <form (ngSubmit)="onSubmit()" class="px-6 py-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            *ngFor="let field of config.fields; trackBy: trackByField"
            class="space-y-2"
            [class.md:col-span-2]="isFullWidthField(field)"
          >
            <!-- Field Label -->
            <label class="block text-sm font-semibold text-gray-700">
              {{ field.label }}
              <span
                *ngIf="isFieldRequired(field) && config.showRequiredIndicator !== false"
                class="text-red-600 ml-0.5"
              >*</span>
            </label>

            <!-- Text Input -->
            <input
              *ngIf="field.type === 'text' || !field.type"
              [(ngModel)]="formData[field.key]"
              [name]="field.key"
              [placeholder]="getFieldPlaceholder(field)"
              [required]="isFieldRequired(field)"
              [class]="getInputClasses(field)"
            />

            <!-- Date Input -->
            <input
              *ngIf="field.type === 'date'"
              type="date"
              [(ngModel)]="formData[field.key]"
              [name]="field.key"
              [required]="isFieldRequired(field)"
              [class]="getInputClasses(field)"
            />

            <!-- Number Input -->
            <input
              *ngIf="field.type === 'number'"
              type="number"
              [(ngModel)]="formData[field.key]"
              [name]="field.key"
              [placeholder]="getFieldPlaceholder(field)"
              [step]="getInputStep(field)"
              [required]="isFieldRequired(field)"
              [class]="getInputClasses(field)"
            />

            <!-- Currency Input -->
            <div *ngIf="field.type === 'currency'" class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="text-gray-600 text-sm font-semibold">R</span>
              </div>
              <input
                type="number"
                [(ngModel)]="formData[field.key]"
                [name]="field.key"
                [placeholder]="getFieldPlaceholder(field)"
                [step]="getInputStep(field)"
                [required]="isFieldRequired(field)"
                class="block w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 text-sm transition-colors"
              />
            </div>

            <!-- Percentage Input -->
            <div *ngIf="field.type === 'percentage'" class="relative">
              <input
                type="number"
                [(ngModel)]="formData[field.key]"
                [name]="field.key"
                [placeholder]="getFieldPlaceholder(field)"
                [step]="getInputStep(field)"
                min="0"
                max="100"
                [required]="isFieldRequired(field)"
                class="block w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none hover:border-gray-400 text-sm transition-colors"
              />
              <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span class="text-gray-600 text-sm font-semibold">%</span>
              </div>
            </div>

            <!-- Select Dropdown -->
            <select
              *ngIf="field.type === 'select'"
              [(ngModel)]="formData[field.key]"
              [name]="field.key"
              [required]="isFieldRequired(field)"
              [class]="getInputClasses(field)"
            >
              <option value="">Select {{ field.label }}</option>
              <option
                *ngFor="let option of getFieldOptions(field); trackBy: trackByOption"
                [value]="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <!-- Textarea -->
            <textarea
              *ngIf="field.type === 'textarea'"
              [(ngModel)]="formData[field.key]"
              [name]="field.key"
              [placeholder]="getFieldPlaceholder(field)"
              [rows]="getTextareaRows(field)"
              [required]="isFieldRequired(field)"
              [class]="getInputClasses(field)"
            ></textarea>

            <!-- Field Validation Message -->
            <p
              *ngIf="hasFieldError(field)"
              class="text-sm text-red-600 mt-1"
            >
              {{ getFieldError(field) }}
            </p>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            (click)="onCancel()"
            class="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            {{ config.cancelButtonText || 'Cancel' }}
          </button>
          <button
            type="submit"
            [disabled]="!isFormValid()"
            [class]="getSubmitButtonClasses()"
          >
            <i class="fas fa-check mr-2" *ngIf="!loading"></i>
            <i class="fas fa-spinner fa-spin mr-2" *ngIf="loading"></i>
            {{ config.submitButtonText || (config.mode === 'edit' ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ComplianceFormComponent implements OnInit, OnChanges {
  @Input() config!: ComplianceFormConfig;
  @Input() initialData?: Partial<ComplianceRecord>;
  @Input() loading = false;

  @Output() formSubmit = new EventEmitter<Partial<ComplianceRecord>>();
  @Output() formCancel = new EventEmitter<void>();

  formData: any = {};
  fieldErrors: { [key: string]: string } = {};

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only re-initialize if this is the first change or if we're switching between records
    if (changes['initialData'] && changes['initialData'].currentValue) {
      const previousId = changes['initialData'].previousValue?.id;
      const currentId = changes['initialData'].currentValue?.id;

      // Only reinitialize if ID changed or this is first time
      if (previousId !== currentId) {
        console.log('🔄 [CHANGE] initialData changed, re-initializing form');
        this.initializeForm();
      }
    } else if (changes['config'] && !changes['initialData']) {
      this.initializeForm();
    }
  }

  /**
   * Initialize form data with default values
   * ✅ SIMPLIFIED: Only process fields in the config, clean dates for HTML inputs
   */
  private initializeForm(): void {
    console.log('\n🎬 ========== FORM INITIALIZATION ==========');
    console.log('📥 [INIT] Received initialData:', this.initialData);
    console.log('📥 [INIT] Form config mode:', this.config?.mode);

    this.formData = {};
    this.fieldErrors = {};

    // Only initialize fields that are in the config
    this.config?.fields?.forEach(field => {
      let value = this.initialData?.[field.key as keyof ComplianceRecord];

      // Clean up date values - remove timestamp for HTML date inputs
      if (field.type === 'date' && value && typeof value === 'string') {
        value = value.split('T')[0].split(' ')[0]; // Get just YYYY-MM-DD
      }

      // Set the value (null/undefined becomes empty string for inputs)
      this.formData[field.key] = value ?? '';
      console.log(`  ✅ [INIT] "${field.key}" =`, this.formData[field.key]);
    });

    console.log('✨ [INIT] Final formData:', {...this.formData});
    console.log('🎬 ========== FORM INITIALIZATION COMPLETE ==========\n');
  }

  /**
   * Track by function for fields
   */
  trackByField(index: number, field: ComplianceColumnConfig): string {
    return field.key as string;
  }

  /**
   * Track by function for options
   */
  trackByOption(index: number, option: { value: string; label: string }): string {
    return option.value;
  }



  /**
   * Check if field is required
   */
  isFieldRequired(field: ComplianceColumnConfig): boolean {
    return field.required || false;
  }

  /**
   * Check if field should take full width
   */
  isFullWidthField(field: ComplianceColumnConfig): boolean {
    return field.type === 'textarea';
  }

  /**
   * Get field placeholder
   */
  getFieldPlaceholder(field: ComplianceColumnConfig): string {
    if (field.placeholder) {
      return field.placeholder;
    }

    switch (field.type) {
      case 'currency':
        return '0.00';
      case 'percentage':
        return '0.0';
      case 'number':
        return '0';
      case 'date':
        return 'Select date';
      case 'textarea':
        return `Enter ${field.label.toLowerCase()}...`;
      default:
        return `Enter ${field.label.toLowerCase()}`;
    }
  }

  /**
   * Get input step for number fields
   */
  getInputStep(field: ComplianceColumnConfig): string {
    if (field.step) {
      return field.step.toString();
    }

    switch (field.type) {
      case 'currency':
        return '0.01';
      case 'percentage':
        return '0.1';
      default:
        return '1';
    }
  }

  /**
   * Get textarea rows
   */
  getTextareaRows(field: ComplianceColumnConfig): number {
    return field.rows || 3;
  }

  /**
   * Get field options for select fields
   */
  getFieldOptions(field: ComplianceColumnConfig): { value: string; label: string }[] {
    return field.options || [];
  }

  /**
   * Get CSS classes for input fields
   */
  getInputClasses(field: ComplianceColumnConfig): string {
    const baseClasses = 'block w-full rounded-lg border border-gray-300 shadow-sm text-sm px-4 py-2.5 transition-colors';
    const focusClasses = 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none';
    const errorClasses = this.hasFieldError(field) ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : '';
    const hoverClasses = 'hover:border-gray-400';

    return `${baseClasses} ${focusClasses} ${errorClasses} ${hoverClasses}`.trim();
  }

  /**
   * Get CSS classes for submit button
   */
  getSubmitButtonClasses(): string {
    const color = this.config.submitButtonColor || 'blue';
    const baseClasses = 'px-5 py-2.5 text-sm font-semibold text-white border border-transparent rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm';

    const colorClasses = {
      blue: 'bg-blue-600 hover:bg-blue-700 hover:shadow-md focus:ring-blue-500',
      green: 'bg-green-600 hover:bg-green-700 hover:shadow-md focus:ring-green-500',
      purple: 'bg-purple-600 hover:bg-purple-700 hover:shadow-md focus:ring-purple-500',
      red: 'bg-red-600 hover:bg-red-700 hover:shadow-md focus:ring-red-500',
      yellow: 'bg-yellow-600 hover:bg-yellow-700 hover:shadow-md focus:ring-yellow-500'
    };

    const disabledClasses = !this.isFormValid() ? 'opacity-50 cursor-not-allowed hover:bg-blue-600 hover:shadow-sm' : '';

    return `${baseClasses} ${colorClasses[color]} ${disabledClasses}`.trim();
  }

  /**
   * Check if field has validation error
   */
  hasFieldError(field: ComplianceColumnConfig): boolean {
    return !!this.fieldErrors[field.key as string];
  }

  /**
   * Get field error message
   */
  getFieldError(field: ComplianceColumnConfig): string {
    return this.fieldErrors[field.key as string] || '';
  }

  /**
   * Validate form and return validation status
   */
  isFormValid(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    this.config.fields.forEach(field => {
      if (this.isFieldRequired(field)) {
        const value = this.formData[field.key];
        if (value === '' || value === null || value === undefined) {
          this.fieldErrors[field.key as string] = `${field.label} is required`;
          isValid = false;
        }
      }
    });

    return isValid && !this.loading;
  }

  /**
   * Get count of total fields
   */
  getFieldCount(): number {
    return this.config.fields?.length || 0;
  }

  /**
   * Get count of required fields
   */
  getRequiredFieldCount(): number {
    return this.config.fields?.filter(field => this.isFieldRequired(field)).length || 0;
  }

  /**
   * Handle form submission
   * ✅ SIMPLIFIED: Only include fields that are in the column config
   * ✅ Keeps the values as-is from ngModel (no conversion needed)
   */
  onSubmit(): void {
    console.log('\n📤 ========== FORM SUBMISSION START ==========');
    console.log('📋 [FORM] Raw formData:', {...this.formData});
    console.log('📋 [FORM] Form mode:', this.config.mode);

    if (this.isFormValid()) {
      // Only send fields that are in the config (exclude extra fields like id, created_at, etc. unless in config)
      const cleanData: any = {};

      this.config.fields.forEach(field => {
        const value = this.formData[field.key];

        // Include the field if it has a value (not null, not undefined, not empty string)
        if (value !== null && value !== undefined && value !== '') {
          cleanData[field.key as string] = value;
          console.log(`  ✅ [FORM] Including "${field.key}":`, value);
        } else {
          console.log(`  ⏭️  [FORM] Skipping "${field.key}" (empty)`);
        }
      });

      console.log('\n✨ [FORM] Final data to emit:', cleanData);
      console.log('📤 ========== FORM SUBMISSION END ==========\n');
      this.formSubmit.emit(cleanData);
    } else {
      console.log('❌ [FORM] Form validation failed');
    }
  }

  /**
   * Handle form cancellation
   */
  onCancel(): void {
    this.formCancel.emit();
  }
}
