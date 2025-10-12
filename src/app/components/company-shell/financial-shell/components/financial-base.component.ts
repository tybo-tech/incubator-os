import { Component, Input, signal, OnInit } from '@angular/core';
import { CompanyFinancialItemService } from '../../../../../services/company-financial-item.service';
import { FinancialCalculationService } from '../../../../../services/financial-calculation.service';
import { CompanyFinancialItem, FinancialItemType } from '../../../../../models/financial.models';
import { Constants } from '../../../../../services';

/**
 * 🏗️ Abstract Financial Base Component
 *
 * This is the foundational class that all financial domain components extend.
 * It provides:
 * - Common data loading patterns
 * - Shared loading states
 * - Standard error handling
 * - Consistent service injection
 *
 * Perfect for: CostStructureComponent, BalanceSheetComponent,
 * ProfitLossComponent, CashFlowComponent, etc.
 *
 * 🎯 Enterprise Pattern: Abstract base eliminates boilerplate
 * and ensures consistency across all financial components.
 */
@Component({
  template: '', // Abstract - no template
  standalone: true
})
export abstract class FinancialBaseComponent implements OnInit {
  @Input() companyId!: number;
  @Input() year!: number;

  // Standard currency from constants
  currency = Constants.Currency;

  // Common loading states - all financial components need these
  isLoading = signal(false);
  hasError = signal(false);
  errorMessage = signal('');

  // 🔄 Unsaved changes tracking
  unsavedChanges = signal<Map<string, any>>(new Map());
  hasUnsavedChanges = signal(false);
  isSaving = signal(false);

  // Shared data signals - can be specialized by extending components
  items = signal<CompanyFinancialItem[]>([]);

  constructor(
    protected financialService: CompanyFinancialItemService,
    protected calculationService: FinancialCalculationService
  ) {}

  abstract ngOnInit(): void;

  /**
   * 🎯 Lifecycle hook for child components to transform or post-process data
   * Called after items are successfully loaded from backend
   */
  protected afterItemsLoaded?(itemType: FinancialItemType, items: CompanyFinancialItem[]): void;

  /**
   * 🎯 Lifecycle hook called before persisting items to backend
   * Allows child components to validate or transform data before save
   */
  protected beforeItemsPersisted?(items: any[], itemType: FinancialItemType): any[];

  /**
   * 🎯 Lifecycle hook called after successful persistence
   * Perfect for triggering additional calculations or refreshes
   */
  protected afterItemsPersisted?(itemType: FinancialItemType): void;

  /**
   * 🚀 Standardized data loader for any financial item type
   * Eliminates duplicate loading logic across components
   */
  protected loadItemsByType(
    itemType: FinancialItemType,
    targetSignal?: ReturnType<typeof signal<CompanyFinancialItem[]>>
  ): void {
    const signal = targetSignal || this.items;

    this.isLoading.set(true);
    this.hasError.set(false);

    this.financialService
      .listFinancialItemsByYearAndType(this.companyId, this.year, itemType)
      .subscribe({
        next: (data) => {
          const items = Array.isArray(data) ? data : [];
          signal.set(items);

          // 🎯 Call lifecycle hook for child components to transform/post-process data
          this.afterItemsLoaded?.(itemType, items);

          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(`Error loading ${itemType} items:`, err);
          this.handleError(`Failed to load ${itemType} data`, signal);
        },
      });
  }

  /**
   * 🛡️ Standardized error handling
   */
  protected handleError(message: string, targetSignal?: ReturnType<typeof signal<CompanyFinancialItem[]>>): void {
    const signal = targetSignal || this.items;

    this.hasError.set(true);
    this.errorMessage.set(message);
    signal.set([]);
    this.isLoading.set(false);
  }

  /**
   * 🔄 Standardized refresh method
   */
  protected refreshData(): void {
    // To be implemented by extending components
    this.ngOnInit();
  }

  /**
   * 📊 Helper method for profit summary refresh
   * Keeps all financial calculations in sync
   */
  protected refreshProfitSummary(): void {
    this.financialService.refreshCompanyYearSummary(this.companyId, this.year).subscribe({
      next: () => console.log('Profit summary refreshed'),
      error: (err) => console.error('Error refreshing profit summary:', err)
    });
  }

  /**
   * 🔄 Track unsaved changes for an item
   */
  protected trackUnsavedChange(itemKey: string, item: any): void {
    const changes = this.unsavedChanges();
    changes.set(itemKey, item);
    this.unsavedChanges.set(new Map(changes));
    this.hasUnsavedChanges.set(changes.size > 0);
  }

  /**
   * 🗑️ Remove item from unsaved changes
   */
  protected removeUnsavedChange(itemKey: string): void {
    const changes = this.unsavedChanges();
    changes.delete(itemKey);
    this.unsavedChanges.set(new Map(changes));
    this.hasUnsavedChanges.set(changes.size > 0);
  }

  /**
   * 🧹 Clear all unsaved changes
   */
  protected clearUnsavedChanges(): void {
    this.unsavedChanges.set(new Map());
    this.hasUnsavedChanges.set(false);
  }

  /**
   * 💾 Bulk save all unsaved changes
   */
  protected async bulkSaveChanges(): Promise<void> {
    const changes = this.unsavedChanges();
    if (changes.size === 0) return;

    this.isSaving.set(true);

    try {
      const itemsToUpdate: any[] = [];
      const itemsToCreate: any[] = [];

      // Separate new items from existing items
      Array.from(changes.entries()).forEach(([key, item]) => {
        if (key.includes('_new_')) {
          // New item - needs to be created
          itemsToCreate.push(item);
        } else {
          // Existing item - needs to be updated
          itemsToUpdate.push(item);
        }
      });

      // Handle updates using bulk update API
      if (itemsToUpdate.length > 0) {
        await this.financialService.bulkUpdateFinancialItems(itemsToUpdate).toPromise();
        console.log(`✅ Successfully updated ${itemsToUpdate.length} items`);
      }

      // Handle creates individually (bulk create not implemented yet)
      if (itemsToCreate.length > 0) {
        const createPromises = itemsToCreate.map(item =>
          this.financialService.addCompanyFinancialItem(item).toPromise()
        );
        await Promise.all(createPromises);
        console.log(`✅ Successfully created ${itemsToCreate.length} items`);
      }

      // Clear unsaved changes after successful save
      this.clearUnsavedChanges();

      // Refresh data
      this.refreshData();

      const totalSaved = itemsToUpdate.length + itemsToCreate.length;
      console.log(`✅ Successfully saved ${totalSaved} items (${itemsToUpdate.length} updated, ${itemsToCreate.length} created)`);

    } catch (error) {
      console.error('Error bulk saving changes:', error);
      this.handleError('Failed to save changes');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * 🎯 Common method for handling item persistence
   * Can be overridden by specialized components
   */
  protected async persistItemChanges(
    items: any[],
    itemType: FinancialItemType,
    refreshCallback?: () => void
  ): Promise<void> {
    try {
      // 🎯 Call lifecycle hook for pre-persistence validation/transformation
      const processedItems = this.beforeItemsPersisted?.(items, itemType) || items;

      const promises = processedItems.map(item => {
        if (item.id) {
          // Update existing
          return this.financialService.updateCompanyFinancialItem(item.id, item).toPromise();
        } else {
          // Create new
          const newItem = { ...item, company_id: this.companyId, year_: this.year, item_type: itemType };
          return this.financialService.addCompanyFinancialItem(newItem).toPromise();
        }
      });

      await Promise.all(promises);

      // 🎯 Call lifecycle hook after successful persistence
      this.afterItemsPersisted?.(itemType);

      if (refreshCallback) {
        refreshCallback();
      }

      this.refreshProfitSummary();
    } catch (error) {
      console.error(`Error persisting ${itemType} changes:`, error);
      this.handleError(`Failed to save ${itemType} changes`);
    }
  }
}
