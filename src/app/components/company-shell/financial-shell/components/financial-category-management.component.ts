import { Component, OnInit, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinancialCategoryService, IFinancialCategoryColorUpdate } from '../../../../../services/financial-category.service';
import {
  FinancialCategory,
  FinancialItemType,
  CategoryManagementState
} from '../../../../../models/financial.models';

@Component({
  selector: 'app-financial-category-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <i class="fas fa-tags text-blue-600"></i>
            Financial Category Management
          </h2>
          <p class="text-gray-600 mt-1">Manage categories and customize colors for charts</p>
        </div>
        <button
          (click)="openAddCategoryModal()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <i class="fas fa-plus"></i>
          Add Category
        </button>
      </div>

      <!-- Item Type Filter -->
      <div class="mb-6">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-gray-700">Filter by type:</span>
          <button
            (click)="setItemTypeFilter(null)"
            [class]="selectedItemType() === null ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'"
            class="px-3 py-1 text-xs rounded-full border transition-colors">
            All Types
          </button>
          <button
            *ngFor="let type of itemTypes"
            (click)="setItemTypeFilter(type)"
            [class]="selectedItemType() === type ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'"
            class="px-3 py-1 text-xs rounded-full border transition-colors">
            {{ formatItemType(type) }}
          </button>
        </div>
      </div>



      <!-- Loading State -->
      <div *ngIf="loading()" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Categories Table -->
      <div *ngIf="!loading()" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Colors</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let category of filteredCategories()" class="hover:bg-gray-50">
              <!-- Category Name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div
                    class="w-4 h-4 rounded-full mr-3 border border-gray-300"
                    [style.background-color]="category.bg_color">
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ category.name }}</div>
                    <div class="text-xs text-gray-500">ID: {{ category.id }}</div>
                  </div>
                </div>
              </td>

              <!-- Item Type -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  [ngClass]="getItemTypeClass(category.item_type)">
                  {{ formatItemType(category.item_type) }}
                </span>
              </td>

              <!-- Description -->
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 max-w-xs truncate">
                  {{ category.description || 'No description' }}
                </div>
              </td>

              <!-- Colors -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded border border-gray-300 cursor-pointer relative group"
                    [style.background-color]="category.bg_color"
                    (click)="openColorPicker(category.id!)">
                    <div
                      class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      [style.color]="category.text_color">
                      <i class="fas fa-edit text-xs"></i>
                    </div>
                  </div>
                  <div class="text-xs">
                    <div class="text-gray-600">BG: {{ category.bg_color }}</div>
                    <div class="text-gray-600">Text: {{ category.text_color }}</div>
                  </div>
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  [ngClass]="category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ category.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2">
                  <button
                    (click)="editCategory(category)"
                    class="text-blue-600 hover:text-blue-900 transition-colors">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    (click)="toggleCategoryStatus(category)"
                    [class]="category.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'"
                    class="transition-colors">
                    <i [class]="category.is_active ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                  <button
                    (click)="deleteCategory(category)"
                    class="text-red-600 hover:text-red-900 transition-colors">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && filteredCategories().length === 0" class="text-center py-12">
        <i class="fas fa-tags text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Categories Found</h3>
        <p class="text-gray-500 mb-4">
          {{ selectedItemType() ? 'No categories found for the selected type' : 'No categories have been created yet' }}
        </p>
        <button
          (click)="openAddCategoryModal()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Create First Category
        </button>
      </div>
    </div>

    <!-- Color Picker Modal -->
    <div
      *ngIf="colorPickerOpen() !== null"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      (click)="closeColorPicker()">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" (click)="$event.stopPropagation()">
        <h3 class="text-lg font-semibold mb-4">Update Colors</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
            <div class="flex items-center gap-2">
              <input
                type="color"
                [(ngModel)]="selectedBgColor"
                class="w-12 h-10 rounded border border-gray-300">
              <input
                type="text"
                [(ngModel)]="selectedBgColor"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#16a085">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
            <div class="flex items-center gap-2">
              <input
                type="color"
                [(ngModel)]="selectedTextColor"
                class="w-12 h-10 rounded border border-gray-300">
              <input
                type="text"
                [(ngModel)]="selectedTextColor"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#ecf0f1">
            </div>
          </div>
          <!-- Quick Color Suggestions -->
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Quick Colors</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                *ngFor="let colorSuggestion of colorSuggestions"
                (click)="applyQuickColor(colorSuggestion)"
                class="h-10 rounded border-2 border-gray-200 hover:border-gray-400 transition-all flex items-center justify-center text-xs font-medium"
                [style.background-color]="colorSuggestion.bg_color"
                [style.color]="colorSuggestion.text_color"
                [title]="colorSuggestion.name">
                {{ colorSuggestion.name }}
              </button>
            </div>
          </div>

          <!-- Preview -->
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div
              class="px-4 py-2 rounded text-center font-medium"
              [style.background-color]="selectedBgColor"
              [style.color]="selectedTextColor">
              Sample Category Text
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button
            (click)="closeColorPicker()"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            (click)="saveColors()"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Save Colors
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FinancialCategoryManagementComponent implements OnInit {
  @Input() initialFilterType: FinancialItemType | null = null;
  @Output() categoryUpdated = new EventEmitter<FinancialCategory>();
  @Output() modalCloseRequested = new EventEmitter<void>();

  // Signals for reactive state management
  categories = signal<FinancialCategory[]>([]);
  loading = signal(false);
  selectedItemType = signal<FinancialItemType | null>(null);
  colorPickerOpen = signal<number | null>(null);

  // Color picker state
  selectedBgColor = '#16a085';
  selectedTextColor = '#ecf0f1';

  // Static data
  itemTypes: FinancialItemType[] = ['direct_cost', 'operational_cost', 'asset', 'liability', 'equity'];

  // Color suggestions as a static property to avoid repeated function calls
  colorSuggestions = [
    { name: 'Blue', bg_color: '#3498db', text_color: '#ffffff' },
    { name: 'Green', bg_color: '#27ae60', text_color: '#ffffff' },
    { name: 'Orange', bg_color: '#f39c12', text_color: '#ffffff' },
    { name: 'Red', bg_color: '#e74c3c', text_color: '#ffffff' },
    { name: 'Purple', bg_color: '#8e44ad', text_color: '#ffffff' },
    { name: 'Teal', bg_color: '#16a085', text_color: '#ffffff' },
    { name: 'Navy', bg_color: '#2c3e50', text_color: '#ffffff' },
    { name: 'Gray', bg_color: '#95a5a6', text_color: '#ffffff' },
    { name: 'Cyan', bg_color: '#1abc9c', text_color: '#ffffff' },
    { name: 'Indigo', bg_color: '#6c5ce7', text_color: '#ffffff' },
    { name: 'Pink', bg_color: '#e84393', text_color: '#ffffff' },
    { name: 'Amber', bg_color: '#f1c40f', text_color: '#2c3e50' }
  ];

  // Computed properties
  filteredCategories = computed(() => {
    const cats = this.categories();
    const filter = this.selectedItemType();
    return filter ? cats.filter(cat => cat.item_type === filter) : cats;
  });

  constructor(
    private categoryService: FinancialCategoryService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    // Apply initial filter if provided
    if (this.initialFilterType) {
      this.selectedItemType.set(this.initialFilterType);
    }
    this.loadCategories();
  }

  /* =========================================================================
     DATA MANAGEMENT
     ========================================================================= */

  async loadCategories() {
    this.loading.set(true);
    try {
      this.categoryService.listAllFinancialCategories().subscribe({
        next: (categories: FinancialCategory[]) => {
          this.categories.set(categories);
          this.loading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading categories:', error);
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error loading categories:', error);
      this.loading.set(false);
    }
  }

  /* =========================================================================
     UI INTERACTIONS
     ========================================================================= */

  setItemTypeFilter(type: FinancialItemType | null) {
    this.selectedItemType.set(type);
  }

  openAddCategoryModal() {
    // TODO: Implement add category modal
    console.log('Open add category modal');
  }

  editCategory(category: FinancialCategory) {
    // TODO: Implement edit category functionality
    console.log('Edit category:', category);
  }

  deleteCategory(category: FinancialCategory) {
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      this.categoryService.deleteFinancialCategory(category.id!).subscribe({
        next: () => {
          this.loadCategories();
          this.categoryUpdated.emit(category);
        },
        error: (error: any) => {
          console.error('Error deleting category:', error);
        }
      });
    }
  }

  toggleCategoryStatus(category: FinancialCategory) {
    const newStatus = !category.is_active;
    this.categoryService.toggleCategoryStatus(category.id!, newStatus).subscribe({
      next: (updatedCategory) => {
        this.loadCategories();
        this.categoryUpdated.emit(updatedCategory);
      },
      error: (error: any) => {
        console.error('Error updating category status:', error);
      }
    });
  }

  /* =========================================================================
     COLOR MANAGEMENT
     ========================================================================= */

  openColorPicker(categoryId: number) {
    const category = this.categories().find(cat => cat.id === categoryId);
    if (category) {
      this.selectedBgColor = category.bg_color || '#16a085';
      this.selectedTextColor = category.text_color || '#ecf0f1';
      this.colorPickerOpen.set(categoryId);
    }
  }

  closeColorPicker() {
    this.colorPickerOpen.set(null);
  }

  saveColors() {
    const categoryId = this.colorPickerOpen();
    if (categoryId) {
      this.categoryService.updateCategoryColors(categoryId, this.selectedBgColor, this.selectedTextColor).subscribe({
        next: (updatedCategory) => {
          this.loadCategories();
          this.closeColorPicker();
          this.categoryUpdated.emit(updatedCategory);
        },
        error: (error: any) => {
          console.error('Error updating colors:', error);
        }
      });
    }
  }

  applyQuickColor(colorSuggestion: { name: string; bg_color: string; text_color: string }) {
    this.selectedBgColor = colorSuggestion.bg_color;
    this.selectedTextColor = colorSuggestion.text_color;
  }

  /* =========================================================================
     UTILITY METHODS
     ========================================================================= */

  formatItemType(itemType: FinancialItemType): string {
    const formats: Record<FinancialItemType, string> = {
      direct_cost: 'Direct Cost',
      operational_cost: 'Operational Cost',
      asset: 'Asset',
      liability: 'Liability',
      equity: 'Equity'
    };
    return formats[itemType] || itemType;
  }

  getItemTypeClass(itemType: FinancialItemType): string {
    const classes: Record<FinancialItemType, string> = {
      direct_cost: 'bg-red-100 text-red-800',
      operational_cost: 'bg-orange-100 text-orange-800',
      asset: 'bg-green-100 text-green-800',
      liability: 'bg-purple-100 text-purple-800',
      equity: 'bg-blue-100 text-blue-800'
    };
    return classes[itemType] || 'bg-gray-100 text-gray-800';
  }
}
