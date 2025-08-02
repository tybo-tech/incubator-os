import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IField, IGroup } from '../../../models/schema';
import { DynamicFormService } from '../../services/dynamic-form.service';
import { MultiSelectComponent } from '../multi-select/multi-select.component';

@Component({
  selector: 'app-form-group-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MultiSelectComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormGroupRendererComponent),
      multi: true
    }
  ],
  template: `
    <div class="bg-gray-50 rounded-lg p-6" [formGroup]="formGroup">
      <!-- Group Header -->
      <div class="mb-4" *ngIf="group">
        <h4 class="text-md font-semibold text-gray-800">
          {{ group.name }}
        </h4>
        <p *ngIf="group.description" class="text-sm text-gray-600 mt-1">
          {{ group.description }}
        </p>
      </div>

      <!-- Group Fields -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          *ngFor="let field of fields"
          [class.md:col-span-2]="field.type === 'textarea' || field.type === 'json'"
          class="space-y-1"
        >
          <!-- Field Label -->
          <label
            [for]="field.key"
            class="block text-sm font-medium text-gray-700"
          >
            {{ field.label }}
            <span *ngIf="field.required" class="text-red-500 ml-1">*</span>
          </label>

          <!-- Field Input based on type -->
          <ng-container [ngSwitch]="field.type">
            <!-- Text Input -->
            <input
              *ngSwitchCase="'text'"
              [id]="field.key"
              [formControlName]="field.key"
              type="text"
              [placeholder]="field.placeholder || ''"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              [class.border-red-300]="isFieldInvalid(field.key)"
            />

            <!-- Textarea -->
            <textarea
              *ngSwitchCase="'textarea'"
              [id]="field.key"
              [formControlName]="field.key"
              rows="3"
              [placeholder]="field.placeholder || ''"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              [class.border-red-300]="isFieldInvalid(field.key)"
            >
            </textarea>

            <!-- Number Input -->
            <input
              *ngSwitchCase="'number'"
              [id]="field.key"
              [formControlName]="field.key"
              type="number"
              [placeholder]="field.placeholder || ''"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              [class.border-red-300]="isFieldInvalid(field.key)"
            />

            <!-- Date Input -->
            <input
              *ngSwitchCase="'date'"
              [id]="field.key"
              [formControlName]="field.key"
              type="date"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              [class.border-red-300]="isFieldInvalid(field.key)"
            />

            <!-- Select Dropdown -->
            <div *ngSwitchCase="'select'">
              <!-- Single Select -->
              <select
                *ngIf="!field.multiple"
                [id]="field.key"
                [formControlName]="field.key"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                [class.border-red-300]="isFieldInvalid(field.key)"
              >
                <option value="">Select {{ field.label }}</option>
                <option
                  *ngFor="let option of getFieldOptions(field); trackBy: trackByOption"
                  [value]="option.value"
                >
                  {{ option.label }}
                </option>
              </select>

              <!-- Multi Select -->
              <app-multi-select
                *ngIf="field.multiple"
                [sourceCollectionId]="field.sourceCollectionId"
                [labelField]="field.labelField || 'name'"
                [placeholder]="'Select ' + field.label"
                [formControlName]="field.key"
              >
              </app-multi-select>
            </div>

            <!-- Checkbox -->
            <div *ngSwitchCase="'checkbox'" class="flex items-center">
              <input
                [id]="field.key"
                [formControlName]="field.key"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label [for]="field.key" class="ml-2 block text-sm text-gray-900">
                {{ field.placeholder || 'Yes' }}
              </label>
            </div>

            <!-- JSON Input -->
            <textarea
              *ngSwitchCase="'json'"
              [id]="field.key"
              [formControlName]="field.key"
              rows="4"
              [placeholder]="field.placeholder || 'Enter valid JSON'"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono text-xs"
              [class.border-red-300]="isFieldInvalid(field.key)"
            >
            </textarea>
          </ng-container>

          <!-- Field Error Message -->
          <div *ngIf="isFieldInvalid(field.key)" class="text-red-600 text-xs mt-1">
            <span *ngIf="formGroup.get(field.key)?.errors?.['required']">
              {{ field.label }} is required
            </span>
            <span *ngIf="formGroup.get(field.key)?.errors?.['invalidJson']">
              Invalid JSON format
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FormGroupRendererComponent implements ControlValueAccessor {
  @Input() group: IGroup | null = null;
  @Input() fields: IField[] = [];
  @Input() formGroup!: FormGroup;
  @Input() collectionOptions: { [fieldKey: string]: { label: string; value: any }[] } = {};

  constructor(private dynamicFormService: DynamicFormService) {}

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value && this.formGroup) {
      this.formGroup.patchValue(value);
    }
  }

  registerOnChange(fn: any): void {
    this.formGroup.valueChanges.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    // Implement if needed
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.formGroup.disable();
    } else {
      this.formGroup.enable();
    }
  }

  // Helper methods
  isFieldInvalid(fieldKey: string): boolean {
    return this.dynamicFormService.isFieldInvalid(this.formGroup, fieldKey);
  }

  getFieldOptions(field: IField): { label: string; value: any }[] {
    return this.dynamicFormService.getFieldOptions(field, this.collectionOptions);
  }

  trackByOption(index: number, option: { label: string; value: any }): any {
    return this.dynamicFormService.trackByOption(index, option);
  }
}
