import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../services/node.service';
import { IHydratedNode } from '../../../models/schema';

interface ChipItem {
  id: number | string;
  label: string;
}

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="multi-select-container">
      <!-- Chip Display Area -->
      <div class="chips-container" *ngIf="selectedChips.length > 0">
        <div class="chip" *ngFor="let chip of selectedChips; let i = index">
          <span class="chip-label">{{ chip.label }}</span>
          <button 
            type="button" 
            class="chip-remove" 
            (click)="removeChip(i)"
            [attr.aria-label]="'Remove ' + chip.label">
            ×
          </button>
        </div>
      </div>
      
      <!-- Dropdown Selection -->
      <div class="select-container">
        <select 
          class="form-control" 
          [value]="''" 
          (change)="onSelectionChange($event)"
          [disabled]="disabled">
          <option value="" disabled>{{ placeholder || 'Select items...' }}</option>
          <option 
            *ngFor="let option of availableOptions" 
            [value]="option.id">
            {{ option.label }}
          </option>
        </select>
      </div>
      
      <!-- Empty State -->
      <div class="empty-state" *ngIf="selectedChips.length === 0">
        <span class="empty-text">{{ emptyText || 'No items selected' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .multi-select-container {
      width: 100%;
    }
    
    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      min-height: 32px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #f8f9fa;
    }
    
    .chip {
      display: inline-flex;
      align-items: center;
      background-color: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 0.875rem;
      max-width: 200px;
    }
    
    .chip-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 6px;
    }
    
    .chip-remove {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2rem;
      line-height: 1;
      padding: 0;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .chip-remove:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .select-container {
      margin-bottom: 8px;
    }
    
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    .form-control:disabled {
      background-color: #e9ecef;
      opacity: 0.6;
    }
    
    .empty-state {
      padding: 12px;
      color: #6c757d;
      font-style: italic;
      text-align: center;
      border: 2px dashed #dee2e6;
      border-radius: 4px;
      background-color: #f8f9fa;
    }
    
    .empty-text {
      font-size: 0.875rem;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectComponent),
      multi: true
    }
  ]
})
export class MultiSelectComponent implements OnInit, ControlValueAccessor {
  @Input() sourceCollectionId?: number;
  @Input() labelField?: string;
  @Input() placeholder?: string;
  @Input() emptyText?: string;
  @Input() disabled: boolean = false;
  
  @Output() selectionChange = new EventEmitter<any[]>();
  
  selectedChips: ChipItem[] = [];
  availableOptions: ChipItem[] = [];
  allOptions: ChipItem[] = [];
  
  private value: any[] = [];
  private onChange = (value: any[]) => {};
  private onTouched = () => {};

  constructor(private nodeService: NodeService) {}

  ngOnInit() {
    this.loadOptions();
  }

  private async loadOptions() {
    if (!this.sourceCollectionId) return;

    try {
      this.nodeService.getNodesByType(String(this.sourceCollectionId)).subscribe({
        next: (nodes: IHydratedNode[]) => {
          this.allOptions = nodes.map(node => ({
            id: node.id!,
            label: this.extractLabel(node)
          }));
          this.updateAvailableOptions();
        },
        error: (error) => {
          console.error('Error loading multi-select options:', error);
        }
      });
    } catch (error) {
      console.error('Error in loadOptions:', error);
    }
  }

  private extractLabel(node: IHydratedNode): string {
    return this.nodeService.getDisplayValue(this.labelField || '', node.data);
  }

  private updateAvailableOptions() {
    const selectedIds = this.selectedChips.map(chip => chip.id);
    this.availableOptions = this.allOptions.filter(option => 
      !selectedIds.includes(option.id)
    );
  }

  onSelectionChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedId = selectElement.value;
    
    if (!selectedId) return;

    const selectedOption = this.allOptions.find(option => 
      String(option.id) === selectedId
    );
    
    if (selectedOption && !this.selectedChips.find(chip => chip.id === selectedOption.id)) {
      this.selectedChips.push(selectedOption);
      this.updateValue();
      this.updateAvailableOptions();
      
      // Reset dropdown selection
      selectElement.value = '';
    }
  }

  removeChip(index: number) {
    this.selectedChips.splice(index, 1);
    this.updateValue();
    this.updateAvailableOptions();
  }

  private updateValue() {
    this.value = this.selectedChips.map(chip => chip.id);
    // Always ensure we emit an array, even if empty
    const arrayValue = Array.isArray(this.value) ? this.value : (this.value ? [this.value] : []);
    this.onChange(arrayValue);
    this.selectionChange.emit(arrayValue);
  }

  // ControlValueAccessor implementation
  writeValue(value: any[]): void {
    // Always ensure we work with arrays
    if (value === null || value === undefined) {
      this.value = [];
    } else if (Array.isArray(value)) {
      this.value = value;
    } else {
      // Convert single value to array
      this.value = [value];
    }
    this.updateChipsFromValue();
  }

  registerOnChange(fn: (value: any[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private updateChipsFromValue() {
    if (!this.value || !Array.isArray(this.value)) {
      this.selectedChips = [];
      return;
    }

    // Wait for options to load if they haven't yet
    if (this.allOptions.length === 0 && this.sourceCollectionId) {
      setTimeout(() => this.updateChipsFromValue(), 100);
      return;
    }

    this.selectedChips = this.value
      .map(id => this.allOptions.find(option => String(option.id) === String(id)))
      .filter(option => option !== undefined) as ChipItem[];
    
    this.updateAvailableOptions();
  }
}
