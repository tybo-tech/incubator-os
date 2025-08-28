import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type CreateModalType = 'client' | 'program' | 'cohort';

export interface CreateCategoryForm {
  name: string;
  description: string;
}

@Component({
  selector: 'app-create-category-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (show) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
          <div class="p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">
              Create New {{ modalType | titlecase }}
            </h2>

            <form (ngSubmit)="onSubmit()" #form="ngForm">
              <div class="space-y-4">
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                    Name <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    [(ngModel)]="formData.name"
                    name="name"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    [placeholder]="getNamePlaceholder()"
                  />
                </div>

                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    [(ngModel)]="formData.description"
                    name="description"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    [placeholder]="getDescriptionPlaceholder()"
                  ></textarea>
                </div>
              </div>

              <div class="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  (click)="onCancel()"
                  class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  [disabled]="isCreating"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  [disabled]="form.invalid || isCreating"
                >
                  @if (isCreating) {
                    <span class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  } @else {
                    Create {{ modalType | titlecase }}
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `
})
export class CreateCategoryModalComponent {
  @Input() show = false;
  @Input() modalType: CreateModalType = 'client';
  @Input() isCreating = false;
  @Input() formData: CreateCategoryForm = { name: '', description: '' };

  @Output() submit = new EventEmitter<CreateCategoryForm>();
  @Output() cancel = new EventEmitter<void>();

  onSubmit(): void {
    if (this.formData.name.trim()) {
      this.submit.emit({
        name: this.formData.name.trim(),
        description: this.formData.description.trim()
      });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  getNamePlaceholder(): string {
    switch (this.modalType) {
      case 'client':
        return 'Enter client name';
      case 'program':
        return 'Enter program name';
      case 'cohort':
        return 'Enter cohort name';
      default:
        return 'Enter name';
    }
  }

  getDescriptionPlaceholder(): string {
    switch (this.modalType) {
      case 'client':
        return 'Brief description of the client organization';
      case 'program':
        return 'Brief description of the training program';
      case 'cohort':
        return 'Brief description of this cohort group';
      default:
        return 'Enter description';
    }
  }
}
