import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IField } from '../../../models/schema';

@Component({
  selector: 'app-single-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SingleSelectComponent),
      multi: true
    }
  ],
  template: `
    <select 
      [id]="field.key"
      [value]="value"
      (change)="onSelectionChange($event)"
      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      [class.border-red-300]="hasError">
      <option value="">Select {{ field.label }}</option>
      <option 
        *ngFor="let option of options; trackBy: trackByOption" 
        [value]="option.value">
        {{ option.label }}
      </option>
    </select>
  `
})
export class SingleSelectComponent implements ControlValueAccessor {
  @Input() field!: IField;
  @Input() options: { label: string; value: any }[] = [];
  @Input() hasError: boolean = false;

  value: string = '';
  
  private onChange = (value: any) => {};
  private onTouched = () => {};

  trackByOption(index: number, option: { label: string; value: any }): any {
    return option.value;
  }

  onSelectionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    
    // Convert back to original type if needed
    const originalValue = this.convertToOriginalType(selectedValue);
    
    this.value = selectedValue;
    this.onChange(originalValue);
    this.onTouched();
  }

  private convertToOriginalType(value: string): any {
    if (!value) return '';
    
    // Find the original option to get the original type
    const matchingOption = this.options.find(opt => String(opt.value) === value);
    return matchingOption ? matchingOption.value : value;
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    // Convert to string for display
    this.value = value ? String(value) : '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state if needed
  }
}
