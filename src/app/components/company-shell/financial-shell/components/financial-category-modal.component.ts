import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialCategoryManagementComponent } from './financial-category-management.component';
import { FinancialItemType } from '../../../../../models/financial.models';

@Component({
  selector: 'app-financial-category-modal',
  standalone: true,
  imports: [CommonModule, FinancialCategoryManagementComponent],
  template: `
    <!-- Modal Backdrop -->
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      (click)="closeModal()">

      <!-- Modal Content -->
      <div
        class="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        (click)="$event.stopPropagation()">

        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <i class="fas fa-tags text-blue-600 text-2xl"></i>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">
                {{ getModalTitle() }}
              </h2>
              <p class="text-gray-600">
                {{ getModalDescription() }}
              </p>
            </div>
          </div>

          <button
            (click)="closeModal()"
            class="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="overflow-y-auto max-h-[calc(90vh-140px)]">
          <app-financial-category-management
            [initialFilterType]="filterType"
            (categoryUpdated)="onCategoryUpdated($event)"
            (modalCloseRequested)="closeModal()">
          </app-financial-category-management>
        </div>

      </div>
    </div>
  `
})
export class FinancialCategoryModalComponent implements OnInit {
  @Input() filterType: FinancialItemType | null = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() categoriesChanged = new EventEmitter<void>();

  isOpen = signal(false);

  ngOnInit() {
    // Prevent body scroll when modal is open
    document.body.style.overflow = this.isOpen() ? 'hidden' : 'auto';
  }

  openModal(itemType?: FinancialItemType) {
    this.filterType = itemType || null;
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.isOpen.set(false);
    document.body.style.overflow = 'auto';
    this.modalClosed.emit();
  }

  onCategoryUpdated(category: any) {
    this.categoriesChanged.emit();
  }

  getModalTitle(): string {
    if (!this.filterType) {
      return 'Financial Category Management';
    }

    const titles = {
      direct_cost: 'Direct Cost Categories',
      operational_cost: 'Operational Cost Categories',
      asset: 'Asset Categories',
      liability: 'Liability Categories',
      equity: 'Equity Categories'
    };

    return `Manage ${titles[this.filterType]}`;
  }

  getModalDescription(): string {
    if (!this.filterType) {
      return 'Manage all financial categories and their colors for chart visualization';
    }

    const descriptions = {
      direct_cost: 'Manage direct cost categories like materials, labor, and supplies',
      operational_cost: 'Manage operational categories like personnel, marketing, and facilities',
      asset: 'Manage asset categories like cash, equipment, and inventory',
      liability: 'Manage liability categories like loans, accounts payable, and credit lines',
      equity: 'Manage equity categories like share capital and retained earnings'
    };

    return descriptions[this.filterType];
  }
}
