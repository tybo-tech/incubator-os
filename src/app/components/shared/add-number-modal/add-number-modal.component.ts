import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-number-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center"
      (click)="onBackdropClick($event)">

      <!-- Animated Backdrop -->
      <div
        class="absolute inset-0 bg-black transition-opacity duration-300"
        [class.opacity-50]="isAnimating()"
        [class.opacity-0]="!isAnimating()">
      </div>

      <!-- Modal Container -->
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300"
        [class.scale-100]="isAnimating()"
        [class.opacity-100]="isAnimating()"
        [class.scale-95]="!isAnimating()"
        [class.opacity-0]="!isAnimating()"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ label }}
            </h3>
            <button
              (click)="close()"
              class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <form (ngSubmit)="onSubmit()" #form="ngForm">
          <div class="px-6 py-4">
            <div class="space-y-4">
              <!-- Description Display -->
              <div *ngIf="description" class="text-sm text-gray-600">
                {{ description }}
              </div>

              <!-- Number Input -->
              <div>
                <label for="numberInput" class="block text-sm font-medium text-gray-700 mb-2">
                  {{ inputLabel }}
                </label>
                <input
                  #numberInput
                  id="numberInput"
                  type="number"
                  [(ngModel)]="currentValue"
                  name="numberInput"
                  required
                  [min]="minValue"
                  [max]="maxValue"
                  [step]="step"
                  [placeholder]="placeholder"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  [class.border-red-300]="hasError()"
                  [class.focus:ring-red-500]="hasError()"
                  [class.focus:border-red-500]="hasError()"
                  (input)="onInputChange()"
                  autofocus />
              </div>

              <!-- Error Message -->
              <div *ngIf="hasError()" class="text-sm text-red-600 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                {{ errorMessage() }}
              </div>

              <!-- Success Message -->
              <div *ngIf="hasSuccess()" class="text-sm text-green-600 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Value is valid and ready to submit
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              (click)="close()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="!isValid() || isSubmitting()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <svg
                *ngIf="isSubmitting()"
                class="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ actionLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    /* Custom animations */
    .animate-modal-in {
      animation: modalIn 0.3s ease-out forwards;
    }

    .animate-modal-out {
      animation: modalOut 0.2s ease-in forwards;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes modalOut {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
    }
  `]
})
export class AddNumberModalComponent {
  // Input properties (regular @Input, converted to signals internally)
  @Input() label = 'Add Number';
  @Input() inputLabel = 'Enter Value';
  @Input() description = '';
  @Input() actionLabel = 'Add';
  @Input() placeholder = '0';
  @Input() minValue = 1;
  @Input() maxValue = 9999;
  @Input() step = 1;
  @Input() defaultValue: number | null = null;
  @Input() existingValues: number[] = [];
  @Input() customValidator: ((value: number) => string | null) | null = null;

  // Output events
  @Output() numberAdded = new EventEmitter<number>();
  @Output() modalClosed = new EventEmitter<void>();

  // Internal state signals
  protected isOpen = signal(false);
  protected isAnimating = signal(false);
  protected isSubmitting = signal(false);
  protected errorMessage = signal('');
  protected hasError = signal(false);
  protected hasSuccess = signal(false);

  // Form value
  currentValue: number | null = null;

  // Public API methods
  open(): void {
    this.isOpen.set(true);
    this.reset();

    // Trigger animation after DOM update
    setTimeout(() => {
      this.isAnimating.set(true);
    }, 10);
  }

  close(): void {
    this.isAnimating.set(false);

    // Wait for animation to complete before hiding
    setTimeout(() => {
      this.isOpen.set(false);
      this.modalClosed.emit();
    }, 200);
  }

  // Form validation
  protected isValid(): boolean {
    if (this.currentValue === null || this.currentValue === undefined) {
      return false;
    }

    const value = this.currentValue;

    // Range validation
    if (value < this.minValue || value > this.maxValue) {
      return false;
    }

    // Duplicate validation
    if (this.existingValues.includes(value)) {
      return false;
    }

    // Custom validation
    if (this.customValidator && this.customValidator(value)) {
      return false;
    }

    return true;
  }

  protected onInputChange(): void {
    this.validateInput();
  }

  private validateInput(): void {
    if (this.currentValue === null || this.currentValue === undefined) {
      this.setError('Please enter a value');
      return;
    }

    const value = this.currentValue;

    // Range validation
    if (value < this.minValue || value > this.maxValue) {
      this.setError(`Value must be between ${this.minValue} and ${this.maxValue}`);
      return;
    }

    // Duplicate validation
    if (this.existingValues.includes(value)) {
      this.setError(`${value} already exists. Please choose a different value.`);
      return;
    }

    // Custom validation
    if (this.customValidator) {
      const customError = this.customValidator(value);
      if (customError) {
        this.setError(customError);
        return;
      }
    }

    // All validations passed
    this.clearError();
    this.hasSuccess.set(true);
  }

  private setError(message: string): void {
    this.errorMessage.set(message);
    this.hasError.set(true);
    this.hasSuccess.set(false);
  }

  private clearError(): void {
    this.errorMessage.set('');
    this.hasError.set(false);
  }

  protected onSubmit(): void {
    if (!this.isValid()) return;

    this.isSubmitting.set(true);

    // Simulate brief processing time for better UX
    setTimeout(() => {
      this.numberAdded.emit(this.currentValue!);
      this.isSubmitting.set(false);
      this.close();
    }, 300);
  }

  protected onBackdropClick(event: Event): void {
    event.stopPropagation();
    this.close();
  }

  private reset(): void {
    this.currentValue = this.defaultValue;
    this.clearError();
    this.hasSuccess.set(false);
    this.isSubmitting.set(false);
  }
}
