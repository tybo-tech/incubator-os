import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IForm } from '../../../../models/form-system.models';

interface FormSelectorContext {
  programId?: number;
  programName?: string;
  cohortId?: number;
  cohortName?: string;
}

interface FormGroup {
  scope: string;
  forms: IForm[];
}

@Component({
  selector: 'app-form-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full">
      <!-- Context Display -->
      <div class="flex flex-wrap gap-2 mb-4" *ngIf="context()?.programId">
        <div class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
          <i class="fas fa-folder text-blue-500 mr-2"></i>
          {{ context().programName || 'Program ' + context().programId }}
        </div>
        <div class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium" *ngIf="context()?.cohortId">
          <i class="fas fa-users text-purple-500 mr-2"></i>
          {{ context().cohortName || 'Cohort ' + context().cohortId }}
        </div>
      </div>

      <!-- Form Selector Dropdown -->
      <div class="relative w-full" [class]="isDropdownOpen() ? 'z-50' : ''">
        <button
          type="button"
          class="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          [class.border-blue-500]="isDropdownOpen()"
          [class.ring-2]="isDropdownOpen()"
          [class.ring-blue-500]="isDropdownOpen()"
          (click)="toggleDropdown()"
          [disabled]="isLoading() || availableForms().length === 0">

          <!-- Loading State -->
          <div *ngIf="isLoading()" class="flex items-center">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Loading forms...
          </div>

          <!-- No Forms Available -->
          <div *ngIf="!isLoading() && availableForms().length === 0" class="text-gray-500">
            No forms available
          </div>

          <!-- Selected Form Display -->
          <div *ngIf="!isLoading() && selectedForm()" class="flex items-center justify-between w-full">
            <div class="flex items-center">
              <span class="font-medium text-gray-900">{{ selectedForm()?.title }}</span>
              <span class="ml-2 text-sm text-gray-500" *ngIf="selectedForm()?.scope_type">
                ({{ formatScope(selectedForm()!.scope_type) }})
              </span>
            </div>
          </div>

          <!-- Default State -->
          <div *ngIf="!isLoading() && availableForms().length > 0 && !selectedForm()" class="flex items-center justify-between w-full">
            <span class="text-gray-600">Select a form</span>
          </div>

          <!-- Dropdown Arrow -->
          <i class="fas fa-chevron-down transition-transform duration-200 absolute right-3 top-1/2 transform -translate-y-1/2"
             [class.rotate-180]="isDropdownOpen()"
             *ngIf="!isLoading() && availableForms().length > 0"></i>
        </button>

        <!-- Dropdown Menu -->
        <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
             *ngIf="isDropdownOpen() && availableForms().length > 0">

          <!-- Grouped Forms -->
          <div class="p-2">
            <div *ngFor="let group of formGroups()" class="mb-4 last:mb-0">
              <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 rounded-md mb-2">
                {{ group.scope }}
              </div>

              <div class="space-y-1">
                <div *ngFor="let form of group.forms"
                     class="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150"
                     [class.bg-blue-100]="selectedFormId() === form.id"
                     [class.text-blue-800]="selectedFormId() === form.id"
                     (click)="selectForm(form)">

                  <div class="flex items-center space-x-2">
                    <span class="font-medium">{{ form.title }}</span>
                    <span class="px-2 py-1 text-xs font-medium rounded-full"
                          [class.bg-blue-100]="form.scope_type === 'client'"
                          [class.text-blue-800]="form.scope_type === 'client'"
                          [class.bg-green-100]="form.scope_type === 'program'"
                          [class.text-green-800]="form.scope_type === 'program'"
                          [class.bg-purple-100]="form.scope_type === 'cohort'"
                          [class.text-purple-800]="form.scope_type === 'cohort'"
                          [class.bg-yellow-100]="form.scope_type === 'global'"
                          [class.text-yellow-800]="form.scope_type === 'global'">
                      {{ formatScope(form.scope_type) }}
                    </span>
                  </div>

                  <i class="fas fa-check text-green-500" *ngIf="selectedFormId() === form.id"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Create New Form Option -->
          <div class="border-t border-gray-200" *ngIf="canCreateForms()">
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 rounded-b-lg transition-colors duration-150 font-medium disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              (click)="createNewForm()"
              [disabled]="!canCreateForms()">
              <i class="fas fa-plus mr-2"></i>
              Create New Form
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Minimal custom styles, relying on Tailwind for most styling */
    .space-y-1 > * + * {
      margin-top: 0.25rem;
    }

    .last\\:mb-0:last-child {
      margin-bottom: 0;
    }
  `]
})
export class FormSelectorComponent {
  // Modern Angular inputs using input() function
  context = input<FormSelectorContext>({});
  availableForms = input<IForm[]>([]);
  selectedFormId = input<number | null>(null);
  isLoading = input<boolean>(false);
  canCreateForms = input<boolean>(true);

  // Modern Angular outputs using output() function
  formSelected = output<IForm>();
  createFormRequested = output<void>();

  // Internal state
  isDropdownOpen = signal(false);

  // Computed properties
  selectedForm = computed(() => {
    const formId = this.selectedFormId();
    return this.availableForms().find(form => form.id === formId) || null;
  });

  formGroups = computed(() => {
    const forms = this.availableForms();
    const groups: { [key: string]: IForm[] } = {};

    forms.forEach(form => {
      const scope = this.formatScope(form.scope_type);
      if (!groups[scope]) {
        groups[scope] = [];
      }
      groups[scope].push(form);
    });

    return Object.entries(groups).map(([scope, forms]) => ({
      scope,
      forms
    }));
  });

  toggleDropdown(): void {
    if (!this.isLoading() && this.availableForms().length > 0) {
      this.isDropdownOpen.update(open => !open);
    }
  }

  selectForm(form: IForm): void {
    this.formSelected.emit(form);
    this.isDropdownOpen.set(false);
  }

  createNewForm(): void {
    this.createFormRequested.emit();
    this.isDropdownOpen.set(false);
  }

  formatScope(scopeType: string): string {
    switch (scopeType) {
      case 'client':
        return 'Client';
      case 'program':
        return 'Program';
      case 'cohort':
        return 'Cohort';
      case 'global':
        return 'Global';
      default:
        return scopeType || 'Unknown';
    }
  }

  getScopeBadgeClass(scopeType: string): string {
    switch (scopeType) {
      case 'client':
        return 'scope-client';
      case 'program':
        return 'scope-program';
      case 'cohort':
        return 'scope-cohort';
      case 'global':
        return 'scope-global';
      default:
        return 'scope-default';
    }
  }
}
