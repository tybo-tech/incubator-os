import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GrantItem {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  dateReceived: string;
  supplier: string;
  notes: string;
}

@Component({
  selector: 'app-grant-funding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Page Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-gift text-purple-600 text-xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Grant Funding</h2>
              <p class="text-gray-600">Equipment and resources provided through grant programs</p>
            </div>
          </div>
          <button
            (click)="openAddModal()"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-plus"></i>
            Add Item
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-purple-600 font-medium">Total Items</p>
                <p class="text-2xl font-bold text-purple-900">{{ grantItems().length }}</p>
              </div>
              <i class="fas fa-boxes text-purple-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-green-600 font-medium">Total Value</p>
                <p class="text-2xl font-bold text-green-900">R {{ getTotalValue() | number:'1.0-0' }}</p>
              </div>
              <i class="fas fa-coins text-green-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-blue-600 font-medium">Categories</p>
                <p class="text-2xl font-bold text-blue-900">{{ getUniqueCategories().length }}</p>
              </div>
              <i class="fas fa-layer-group text-blue-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-amber-600 font-medium">Avg Item Value</p>
                <p class="text-2xl font-bold text-amber-900">R {{ getAverageValue() | number:'1.0-0' }}</p>
              </div>
              <i class="fas fa-chart-line text-amber-400 text-3xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Value
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Received
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let item of grantItems()" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <i [class]="getCategoryIcon(item.category) + ' text-purple-600'"></i>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ item.itemName }}</div>
                    <div class="text-xs text-gray-500" *ngIf="item.notes">{{ item.notes }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [class]="getCategoryBadgeClass(item.category)">
                  {{ item.category }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.quantity }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                R {{ item.unitValue | number:'1.0-0' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-semibold text-green-600">
                  R {{ item.totalValue | number:'1.0-0' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.dateReceived }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.supplier }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  (click)="editItem(item)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                  title="Edit item"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  (click)="deleteItem(item.id)"
                  class="text-red-600 hover:text-red-900"
                  title="Delete item"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50">
            <tr>
              <td colspan="4" class="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                Grand Total:
              </td>
              <td class="px-6 py-4 text-sm font-bold text-green-600">
                R {{ getTotalValue() | number:'1.0-0' }}
              </td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Category Breakdown -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div *ngFor="let category of getUniqueCategories()"
             class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i [class]="getCategoryIcon(category) + ' text-purple-600'"></i>
              <h4 class="font-semibold text-gray-900">{{ category }}</h4>
            </div>
            <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {{ getCategoryItemCount(category) }} items
            </span>
          </div>
          <div class="text-2xl font-bold text-purple-600">
            R {{ getCategoryTotal(category) | number:'1.0-0' }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ ((getCategoryTotal(category) / getTotalValue()) * 100) | number:'1.0-1' }}% of total
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div *ngIf="showModal()"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         (click)="closeModal()">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6"
           (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-gray-900">
            {{ editingItem() ? 'Edit Grant Item' : 'Add Grant Item' }}
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
              <input
                [(ngModel)]="formData.itemName"
                name="itemName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Dell Laptop"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                [(ngModel)]="formData.category"
                name="category"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                <option value="Office Equipment">Office Equipment</option>
                <option value="IT Equipment">IT Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Software">Software</option>
                <option value="Tools">Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
              <input
                [(ngModel)]="formData.quantity"
                name="quantity"
                type="number"
                min="1"
                required
                (input)="calculateTotal()"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Unit Value (R) *</label>
              <input
                [(ngModel)]="formData.unitValue"
                name="unitValue"
                type="number"
                min="0"
                step="0.01"
                required
                (input)="calculateTotal()"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date Received *</label>
              <input
                [(ngModel)]="formData.dateReceived"
                name="dateReceived"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
              <input
                [(ngModel)]="formData.supplier"
                name="supplier"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Tech Suppliers Inc."
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              [(ngModel)]="formData.notes"
              name="notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Additional information about this item..."
            ></textarea>
          </div>

          <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Total Value:</span>
              <span class="text-2xl font-bold text-purple-600">
                R {{ formData.totalValue | number:'1.0-0' }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <i class="fas fa-save"></i>
              {{ editingItem() ? 'Update Item' : 'Add Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class GrantFundingComponent {
  // Mock data for grant items
  grantItems = signal<GrantItem[]>([
    {
      id: 1,
      itemName: 'Dell Latitude Laptops',
      category: 'IT Equipment',
      quantity: 5,
      unitValue: 12000,
      totalValue: 60000,
      dateReceived: '2025-01-15',
      supplier: 'Dell South Africa',
      notes: 'Core i7, 16GB RAM, 512GB SSD'
    },
    {
      id: 2,
      itemName: 'Office Chairs (Ergonomic)',
      category: 'Furniture',
      quantity: 10,
      unitValue: 2500,
      totalValue: 25000,
      dateReceived: '2025-01-20',
      supplier: 'Office Furniture Pro',
      notes: 'Adjustable height and lumbar support'
    },
    {
      id: 3,
      itemName: 'Standing Desks',
      category: 'Furniture',
      quantity: 5,
      unitValue: 4500,
      totalValue: 22500,
      dateReceived: '2025-01-20',
      supplier: 'Office Furniture Pro',
      notes: 'Electric height adjustment'
    },
    {
      id: 4,
      itemName: 'HP LaserJet Printers',
      category: 'Office Equipment',
      quantity: 2,
      unitValue: 8000,
      totalValue: 16000,
      dateReceived: '2025-02-01',
      supplier: 'HP Direct',
      notes: 'Network-enabled, color printing'
    },
    {
      id: 5,
      itemName: 'Microsoft 365 Licenses',
      category: 'Software',
      quantity: 15,
      unitValue: 1200,
      totalValue: 18000,
      dateReceived: '2025-02-05',
      supplier: 'Microsoft SA',
      notes: 'Annual business subscription'
    },
    {
      id: 6,
      itemName: 'Conference Room Projector',
      category: 'Office Equipment',
      quantity: 1,
      unitValue: 15000,
      totalValue: 15000,
      dateReceived: '2025-02-10',
      supplier: 'AV Solutions',
      notes: '4K resolution, wireless connectivity'
    },
    {
      id: 7,
      itemName: 'Filing Cabinets',
      category: 'Furniture',
      quantity: 3,
      unitValue: 3000,
      totalValue: 9000,
      dateReceived: '2025-02-12',
      supplier: 'Office Furniture Pro',
      notes: '4-drawer, lockable'
    },
    {
      id: 8,
      itemName: 'Whiteboard (Large)',
      category: 'Office Equipment',
      quantity: 4,
      unitValue: 1500,
      totalValue: 6000,
      dateReceived: '2025-02-14',
      supplier: 'Office Supplies SA',
      notes: 'Magnetic, with accessories'
    }
  ]);

  showModal = signal(false);
  editingItem = signal<GrantItem | null>(null);

  formData: Partial<GrantItem> = {
    itemName: '',
    category: '',
    quantity: 1,
    unitValue: 0,
    totalValue: 0,
    dateReceived: new Date().toISOString().split('T')[0],
    supplier: '',
    notes: ''
  };

  getTotalValue(): number {
    return this.grantItems().reduce((sum, item) => sum + item.totalValue, 0);
  }

  getAverageValue(): number {
    const items = this.grantItems();
    return items.length > 0 ? this.getTotalValue() / items.length : 0;
  }

  getUniqueCategories(): string[] {
    const categories = this.grantItems().map(item => item.category);
    return [...new Set(categories)];
  }

  getCategoryItemCount(category: string): number {
    return this.grantItems().filter(item => item.category === category).length;
  }

  getCategoryTotal(category: string): number {
    return this.grantItems()
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + item.totalValue, 0);
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'IT Equipment': 'fas fa-laptop',
      'Furniture': 'fas fa-chair',
      'Office Equipment': 'fas fa-print',
      'Software': 'fas fa-code',
      'Tools': 'fas fa-tools',
      'Other': 'fas fa-box'
    };
    return icons[category] || 'fas fa-box';
  }

  getCategoryBadgeClass(category: string): string {
    const classes: { [key: string]: string } = {
      'IT Equipment': 'bg-blue-100 text-blue-800',
      'Furniture': 'bg-green-100 text-green-800',
      'Office Equipment': 'bg-purple-100 text-purple-800',
      'Software': 'bg-indigo-100 text-indigo-800',
      'Tools': 'bg-orange-100 text-orange-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return classes[category] || 'bg-gray-100 text-gray-800';
  }

  openAddModal(): void {
    this.editingItem.set(null);
    this.formData = {
      itemName: '',
      category: '',
      quantity: 1,
      unitValue: 0,
      totalValue: 0,
      dateReceived: new Date().toISOString().split('T')[0],
      supplier: '',
      notes: ''
    };
    this.showModal.set(true);
  }

  editItem(item: GrantItem): void {
    this.editingItem.set(item);
    this.formData = { ...item };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingItem.set(null);
  }

  calculateTotal(): void {
    const quantity = this.formData.quantity || 0;
    const unitValue = this.formData.unitValue || 0;
    this.formData.totalValue = quantity * unitValue;
  }

  saveItem(): void {
    if (!this.formData.itemName || !this.formData.category) {
      return;
    }

    const editingItemValue = this.editingItem();
    if (editingItemValue) {
      // Update existing item
      const items = this.grantItems();
      const index = items.findIndex(i => i.id === editingItemValue.id);
      if (index !== -1) {
        items[index] = { ...items[index], ...this.formData as GrantItem };
        this.grantItems.set([...items]);
      }
    } else {
      // Add new item
      const newId = Math.max(...this.grantItems().map(i => i.id)) + 1;
      const newItem: GrantItem = {
        ...(this.formData as Omit<GrantItem, 'id'>),
        id: newId
      };
      this.grantItems.set([...this.grantItems(), newItem]);
    }

    this.closeModal();
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this item?')) {
      this.grantItems.set(this.grantItems().filter(item => item.id !== id));
    }
  }
}
