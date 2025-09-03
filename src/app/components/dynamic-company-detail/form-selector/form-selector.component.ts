import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IForm } from '../../../../models/form-system.models';

interface FormSelectorContext {
  programId?: number;
  programName?: string;
  cohortId?: number;
  cohortName?: string;
  clientId?: number;
  clientName?: string;
}

interface ContextItem {
  id: number;
  name: string;
  type: 'client' | 'program' | 'cohort';
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
      <!-- Context Navigation Breadcrumb -->
      <div class="bg-gray-50 border-b rounded-t-lg" *ngIf="contextBreadcrumb().length > 0">
        <div class="px-4 py-3">
          <nav class="flex items-center space-x-2 text-sm">
            <!-- Context Label -->
            <span class="text-gray-500 font-medium">Context:</span>

            <!-- Back to Overview Button -->
            <button
              (click)="onNavigateToOverview()"
              class="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Overview
            </button>

            <!-- Breadcrumb Items -->
            <div *ngFor="let item of contextBreadcrumb(); let isLast = last" class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>

              <div class="flex items-center space-x-2">
                <!-- Context Type Icon -->
                <div [class]="getContextIconClass(item.type)">
                  <svg *ngIf="item.type === 'client'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                  </svg>
                  <svg *ngIf="item.type === 'program'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <svg *ngIf="item.type === 'cohort'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"></path>
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clip-rule="evenodd"></path>
                  </svg>
                </div>

                <!-- Context Item Name -->
                <button
                  (click)="onNavigateToContext(item)"
                  [class]="getContextTextClass(item.type)"
                  type="button">
                  {{ item.name }}
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      <!-- Form Selector Dropdown -->
      <div class="relative w-full" [class]="isDropdownOpen() ? 'z-50' : ''">
        <button
          type="button"
          class="w-full px-4 py-3 text-left bg-white border border-gray-300 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          [class.rounded-lg]="contextBreadcrumb().length === 0"
          [class.rounded-b-lg]="contextBreadcrumb().length > 0"
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
                     class="flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150"
                     [class.bg-blue-100]="selectedFormId() === form.id"
                     [class.text-blue-800]="selectedFormId() === form.id">

                  <!-- Form Info (Clickable to select) -->
                  <div class="flex items-center space-x-2 flex-1 cursor-pointer hover:text-blue-700"
                       (click)="selectForm(form)">
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

                  <!-- Action Buttons -->
                  <div class="flex items-center space-x-2">
                    <!-- Edit Button -->
                    <button
                      type="button"
                      class="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-150"
                      (click)="editForm(form); $event.stopPropagation()"
                      title="Edit form">
                      <i class="fas fa-edit text-sm"></i>
                    </button>

                    <!-- Selected Indicator -->
                    <i class="fas fa-check text-green-500" *ngIf="selectedFormId() === form.id"></i>
                  </div>
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
  editFormRequested = output<IForm>();
  navigateToContext = output<ContextItem>();
  navigateToOverview = output<void>();

  // Internal state
  isDropdownOpen = signal(false);

  // Computed properties
  selectedForm = computed(() => {
    const formId = this.selectedFormId();
    return this.availableForms().find(form => form.id === formId) || null;
  });

  contextBreadcrumb = computed(() => {
    const ctx = this.context();
    const breadcrumb: ContextItem[] = [];

    if (ctx.clientId) {
      breadcrumb.push({
        id: ctx.clientId,
        name: ctx.clientName || `Client ${ctx.clientId}`,
        type: 'client'
      });
    }

    if (ctx.programId) {
      breadcrumb.push({
        id: ctx.programId,
        name: ctx.programName || `Program ${ctx.programId}`,
        type: 'program'
      });
    }

    if (ctx.cohortId) {
      breadcrumb.push({
        id: ctx.cohortId,
        name: ctx.cohortName || `Cohort ${ctx.cohortId}`,
        type: 'cohort'
      });
    }

    return breadcrumb;
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

  editForm(form: IForm): void {
    this.editFormRequested.emit(form);
    // Don't close dropdown immediately to allow for edit modal interaction
  }

  createNewForm(): void {
    this.createFormRequested.emit();
    this.isDropdownOpen.set(false);
  }

  onNavigateToContext(item: ContextItem): void {
    this.navigateToContext.emit(item);
  }

  onNavigateToOverview(): void {
    this.navigateToOverview.emit();
  }

  getContextIconClass(type: string): string {
    const baseClass = 'w-3 h-3 rounded-sm flex items-center justify-center text-white';
    switch (type) {
      case 'client': return `${baseClass} bg-purple-500`;
      case 'program': return `${baseClass} bg-green-500`;
      case 'cohort': return `${baseClass} bg-orange-500`;
      default: return `${baseClass} bg-gray-500`;
    }
  }

  getContextTextClass(type: string): string {
    const baseClass = 'hover:underline transition-colors font-medium';
    switch (type) {
      case 'client': return `${baseClass} text-purple-600 hover:text-purple-800`;
      case 'program': return `${baseClass} text-green-600 hover:text-green-800`;
      case 'cohort': return `${baseClass} text-orange-600 hover:text-orange-800`;
      default: return `${baseClass} text-gray-600 hover:text-gray-800`;
    }
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
