import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-year-modal',
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
              <i class="fas fa-calendar-plus text-green-600 mr-2"></i>
              Add Revenue Year
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
          <div class="px-6 py-4 space-y-4">

            <!-- Year Input -->
            <div>
              <label for="year" class="block text-sm font-medium text-gray-700 mb-2">
                Select Year
              </label>
              <input
                id="year"
                name="year"
                type="number"
                [(ngModel)]="selectedYear"
                required
                #yearInput="ngModel"
                [min]="minYear"
                [max]="maxYear"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g. 2024"
                autocomplete="off"
              />

              <!-- Validation Error -->
              <div *ngIf="yearInput.invalid && yearInput.touched" class="mt-1 text-sm text-red-600">
                <div *ngIf="yearInput.errors?.['required']">Year is required</div>
                <div *ngIf="yearInput.errors?.['min']">Year must be {{ minYear }} or later</div>
                <div *ngIf="yearInput.errors?.['max']">Year must be {{ maxYear }} or earlier</div>
              </div>

              <!-- Year exists error -->
              <div *ngIf="yearExistsError" class="mt-1 text-sm text-red-600">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                Year {{ selectedYear }} already exists
              </div>
            </div>

            <!-- Quick Year Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Quick Select
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  *ngFor="let year of suggestedYears"
                  type="button"
                  (click)="selectYear(year)"
                  [disabled]="existingYears.includes(year)"
                  [class]="'px-3 py-2 text-sm font-medium rounded-md transition-colors ' +
                          (selectedYear === year ? 'bg-green-600 text-white' :
                           existingYears.includes(year) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                           'bg-gray-50 text-gray-700 hover:bg-gray-100')">
                  {{ year }}
                  <i *ngIf="existingYears.includes(year)" class="fas fa-check ml-1 text-xs"></i>
                </button>
              </div>
            </div>

            <!-- Info Message -->
            <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div class="flex">
                <div class="flex-shrink-0">
                  <i class="fas fa-info-circle text-blue-400"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    Adding a year will create entries in both Revenue and Export Revenue sections.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              (click)="close()"
              class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || yearExistsError || selectedYear === null"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <i class="fas fa-plus mr-2"></i>
              Add Year
            </button>
          </div>
        </form>

      </div>
    </div>
  `
})
export class YearModalComponent {
  @Input() existingYears: number[] = [];
  @Output() yearSelected = new EventEmitter<number>();
  @Output() modalClosed = new EventEmitter<void>();

  // Modal state
  private _isOpen = signal(false);
  private _isAnimating = signal(false);

  isOpen = computed(() => this._isOpen());
  isAnimating = computed(() => this._isAnimating());

  // Form data
  selectedYear: number | null = null;
  yearExistsError = false;

  // Year constraints
  currentYear = new Date().getFullYear();
  minYear = this.currentYear - 10;
  maxYear = this.currentYear + 5;

  // Suggested years based on current year
  get suggestedYears(): number[] {
    const suggestions = [];
    for (let i = -2; i <= 3; i++) {
      suggestions.push(this.currentYear + i);
    }
    return suggestions;
  }

  open() {
    this._isOpen.set(true);
    // Set default year to current year if available
    const defaultYear = this.existingYears.includes(this.currentYear)
      ? this.currentYear + 1
      : this.currentYear;
    this.selectedYear = defaultYear;
    this.yearExistsError = false;

    // Trigger animation after a short delay
    setTimeout(() => {
      this._isAnimating.set(true);
    }, 10);
  }

  close() {
    this._isAnimating.set(false);
    setTimeout(() => {
      this._isOpen.set(false);
      this.selectedYear = null;
      this.yearExistsError = false;
      this.modalClosed.emit();
    }, 300);
  }

  selectYear(year: number) {
    if (!this.existingYears.includes(year)) {
      this.selectedYear = year;
      this.checkYearExists();
    }
  }

  checkYearExists() {
    this.yearExistsError = this.selectedYear !== null && this.existingYears.includes(this.selectedYear);
  }

  onSubmit() {
    if (this.selectedYear !== null && !this.yearExistsError) {
      this.yearSelected.emit(this.selectedYear);
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
