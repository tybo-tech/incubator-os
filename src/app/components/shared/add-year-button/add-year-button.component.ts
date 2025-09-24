import { Component, Input, Output, EventEmitter, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddNumberModalComponent } from '../add-number-modal/add-number-modal.component';

@Component({
  selector: 'app-add-year-button',
  standalone: true,
  imports: [CommonModule, AddNumberModalComponent],
  template: `
    <!-- Smart Add Year Button -->
    <button
      (click)="openModal()"
      [class]="buttonClasses()"
      [disabled]="disabled">

      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>

      <span>{{ buttonText }}</span>

      <!-- Loading indicator -->
      <svg
        *ngIf="isLoading"
        class="w-4 h-4 animate-spin ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
    </button>

    <!-- Smart Modal -->
    <app-add-number-modal
      #modal
      [label]="modalTitle"
      [inputLabel]="inputLabel"
      [description]="modalDescription()"
      [actionLabel]="actionLabel"
      [placeholder]="placeholder"
      [minValue]="minYear"
      [maxValue]="maxYear"
      [step]="1"
      [defaultValue]="defaultYear"
      [existingValues]="existingYears"
      [customValidator]="yearValidatorFn"
      (numberAdded)="onYearAdded($event)"
      (modalClosed)="onModalClosed()">
    </app-add-number-modal>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class AddYearButtonComponent {
  @ViewChild('modal') modal!: AddNumberModalComponent;

  // Configuration inputs
  @Input() metricTypeName = 'Metric';
  @Input() buttonText = 'Add Year';
  @Input() buttonClass = 'primary'; // 'primary' | 'secondary' | 'success'
  @Input() size = 'md'; // 'sm' | 'md' | 'lg'
  @Input() disabled = false;
  @Input() isLoading = false;

  // Year-specific configuration
  @Input() minYear = 2000;
  @Input() maxYear = 2100;
  @Input() existingYears: number[] = [];
  @Input() defaultYear: number | null = null;

  // Labels and text
  @Input() modalTitle = 'Add New Year';
  @Input() inputLabel = 'Year';
  @Input() actionLabel = 'Create Year';
  @Input() placeholder = '2025';

  // Output events
  @Output() yearAdded = new EventEmitter<number>();

  constructor() {
    // Set smart defaults based on current date
    const currentYear = new Date().getFullYear();
    this.defaultYear = currentYear;
    this.placeholder = currentYear.toString();
  }

  // Computed properties
  protected modalDescription = signal('');

  protected buttonClasses = signal('');

  protected yearValidatorFn: ((year: number) => string | null) | null = null;

  ngOnInit() {
    // Set up reactive computed values
    this.setupComputedValues();
  }

  private setupComputedValues(): void {
    // Dynamic modal description
    this.modalDescription.set(`Enter the year for the new ${this.metricTypeName} record. This will create a new row in your metrics table.`);

    // Dynamic button classes based on configuration
    this.buttonClasses.set(this.getButtonClasses());

    // Custom year validator
    this.yearValidatorFn = (year: number): string | null => {
      // Business rule: Don't allow future years beyond next year
      const currentYear = new Date().getFullYear();
      const maxAllowedYear = currentYear + 1;

      if (year > maxAllowedYear) {
        return `Cannot add years beyond ${maxAllowedYear}. Please enter a current or past year.`;
      }

      return null; // Valid
    };
  }

  private getButtonClasses(): string {
    const baseClasses = 'flex items-center gap-2 font-medium rounded-md transition-all duration-200 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Size classes
    const sizeClasses = {
      'sm': 'px-3 py-1.5 text-sm',
      'md': 'px-4 py-2 text-sm',
      'lg': 'px-6 py-3 text-base'
    };

    // Color classes
    const colorClasses = {
      'primary': 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      'secondary': 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      'success': 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
    };

    return `${baseClasses} ${sizeClasses[this.size as keyof typeof sizeClasses]} ${colorClasses[this.buttonClass as keyof typeof colorClasses]}`;
  }

  // Public API
  openModal(): void {
    if (this.disabled || this.isLoading) return;

    // Update dynamic values before opening
    this.setupComputedValues();
    this.modal.open();
  }

  // Event handlers
  protected onYearAdded(year: number): void {
    this.yearAdded.emit(year);
  }

  protected onModalClosed(): void {
    // Optional: Handle modal close events
  }
}
