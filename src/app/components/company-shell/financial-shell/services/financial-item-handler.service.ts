import { Injectable } from '@angular/core';
import { CompanyFinancialItemService } from '../../../../../services/company-financial-item.service';
import { FinancialTableItem } from '../components/financial-items/financial-item-table.component';
import { CompanyFinancialItem, FinancialItemType } from '../../../../../models/financial.models';

export interface ExtendedFinancialTableItem extends FinancialTableItem {
  _originalItem?: CompanyFinancialItem;
}

export interface FinancialItemContext {
  companyId: number;
  year: number;
  clientId: number;
  programId: number;
  cohortId: number;
}

export interface FinancialItemHandlerCallbacks {
  trackUnsavedChange: (key: string, item: any) => void;
  removeUnsavedChange: (key: string) => void;
  refreshItemsCallback: () => void;
}

/**
 * 🔄 Financial Item Handler Service
 *
 * Centralizes all CRUD operations for financial table items across components.
 * Eliminates duplicate event handler code in Balance Sheet, Cost Structure, and other financial components.
 *
 * Features:
 * - Standardized add/update/delete operations
 * - Consistent unsaved change tracking
 * - Automatic temp key management for new items
 * - Type-safe operations with proper error handling
 */
@Injectable({
  providedIn: 'root'
})
export class FinancialItemHandlerService {

  constructor(private financialService: CompanyFinancialItemService) {}

  /**
   * 🔄 Handle item update operations
   * @param event Update event with index and item data
   * @param itemType Type of financial item (asset, liability, etc.)
   * @param context Financial context (company, year, etc.)
   * @param callbacks Callback functions for change tracking
   */
  handleItemUpdated(
    event: { index: number; item: FinancialTableItem },
    itemType: FinancialItemType,
    context: FinancialItemContext,
    callbacks: FinancialItemHandlerCallbacks
  ): void {
    console.log(`${itemType} item updated:`, event);
    console.log('Item categoryId:', event.item.categoryId);

    const { index, item } = event;
    const extendedItem = item as ExtendedFinancialTableItem;

    if (extendedItem._originalItem?.id) {
      // Existing item with ID - track for update
      const trackedItem = {
        ...extendedItem._originalItem,
        name: item.name,
        amount: item.amount,
        note: item.note,
        categoryId: item.categoryId // Use frontend field name for bulk save mapping
      };
      console.log(`Tracking existing ${itemType} with categoryId:`, trackedItem.categoryId);
      callbacks.trackUnsavedChange(`${itemType}_${extendedItem._originalItem.id}`, trackedItem);
    } else if ((item as any)._tempKey) {
      // New item with temp key - update the existing tracking entry
      const tempKey = (item as any)._tempKey;
      const trackedItem = {
        company_id: context.companyId,
        year_: context.year,
        item_type: itemType,
        name: item.name,
        amount: item.amount,
        note: item.note,
        categoryId: item.categoryId
      };
      console.log(`Updating new ${itemType} tracking with categoryId:`, trackedItem.categoryId);
      callbacks.trackUnsavedChange(tempKey, trackedItem);
    }
  }

  /**
   * ➕ Handle item addition operations
   * @param item New item to add
   * @param itemType Type of financial item
   * @param context Financial context
   * @param callbacks Callback functions for change tracking
   */
  handleItemAdded(
    item: FinancialTableItem,
    itemType: FinancialItemType,
    context: FinancialItemContext,
    callbacks: FinancialItemHandlerCallbacks
  ): void {
    console.log(`${itemType} item added:`, item);

    // For new items, track with timestamp-based key that can be updated later
    const tempKey = `${itemType}_new_${Date.now()}_${Math.random()}`;
    // Store the key on the item for later reference
    (item as any)._tempKey = tempKey;

    console.log(`Creating new ${itemType} tracking with key:`, tempKey);
    callbacks.trackUnsavedChange(tempKey, {
      company_id: context.companyId,
      year_: context.year,
      item_type: itemType,
      name: item.name,
      amount: item.amount,
      note: item.note,
      categoryId: item.categoryId
    });
  }

  /**
   * 🗑️ Handle item deletion operations
   * @param event Delete event with index and item data
   * @param itemType Type of financial item
   * @param callbacks Callback functions for change tracking and refresh
   */
  handleItemDeleted(
    event: { index: number; item: FinancialTableItem },
    itemType: FinancialItemType,
    callbacks: FinancialItemHandlerCallbacks
  ): void {
    console.log(`${itemType} item deleted:`, event);
    const { item } = event;
    const extendedItem = item as ExtendedFinancialTableItem;

    if (extendedItem._originalItem?.id) {
      // Remove from unsaved changes if it was being tracked
      callbacks.removeUnsavedChange(`${itemType}_${extendedItem._originalItem.id}`);

      // Handle deletion immediately
      if (extendedItem._originalItem.id) {
        this.financialService.deleteCompanyFinancialItem(extendedItem._originalItem.id).subscribe({
          next: () => {
            console.log(`${itemType} deleted successfully`);
            callbacks.refreshItemsCallback();
          },
          error: (err) => console.error(`Error deleting ${itemType}:`, err)
        });
      }
    }
  }

  /**
   * 📊 Handle items changed event (usually just logging)
   * @param items Array of changed items
   * @param itemType Type of financial item
   */
  handleItemsChanged(items: FinancialTableItem[], itemType: FinancialItemType): void {
    console.log(`${itemType} items changed:`, items);
    // Note: Item tracking is handled by specific add/update methods
    // This prevents duplicate tracking entries
  }

  /**
   * 🔄 Convert CompanyFinancialItem to FinancialTableItem format
   * @param items Array of domain financial items
   * @returns Array of table-compatible items
   */
  convertToTableItems(items: CompanyFinancialItem[]): ExtendedFinancialTableItem[] {
    return items.map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      note: item.note || '',
      categoryId: item.category_id || undefined,
      // Add reference to original item for updates
      _originalItem: item
    } as ExtendedFinancialTableItem));
  }

  /**
   * 📅 Generate available years for year selector
   * Always includes current year plus specified number of previous years
   * @param yearsBack Number of previous years to include (default: 4)
   * @returns Array of year numbers
   */
  generateAvailableYears(yearsBack: number = 4): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= yearsBack; i++) {
      years.push(currentYear - i);
    }
    return years;
  }

  /**
   * 🎯 Create item handler callbacks for a component
   * Helper method to create the callback object
   */
  createCallbacks(component: any): FinancialItemHandlerCallbacks {
    return {
      trackUnsavedChange: (key: string, item: any) => component.trackUnsavedChange(key, item),
      removeUnsavedChange: (key: string) => component.removeUnsavedChange(key),
      refreshItemsCallback: () => component.refreshData?.() || component.ngOnInit?.()
    };
  }
}
