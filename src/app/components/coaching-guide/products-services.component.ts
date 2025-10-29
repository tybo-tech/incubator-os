import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductServiceItem {
  id: number;
  name: string;
  type: 'Product' | 'Service';
  unitPrice: number;
  avgMonthlySales: number;
  revenue: number;
  notes?: string;
}

@Component({
  selector: 'app-products-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <!-- Header Section -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-boxes text-blue-600 mr-3"></i>
            Products & Services
          </h2>
          <p class="text-gray-600 mt-1">
            Define your product and service offerings with pricing and sales projections
          </p>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-500">Total Monthly Revenue</div>
          <div class="text-2xl font-bold text-green-600">
            R {{ getTotalMonthlyRevenue() | number:'1.0-0' }}
          </div>
        </div>
      </div>

      <!-- Add New Button -->
      <div class="mb-6">
        <button
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add New Item
        </button>
      </div>

      <!-- Items Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-tag mr-2"></i>Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-layer-group mr-2"></i>Type
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-dollar-sign mr-2"></i>Unit Price
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-chart-line mr-2"></i>Avg Monthly Sales
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-calculator mr-2"></i>Monthly Revenue
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-sticky-note mr-2"></i>Notes
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-cog mr-2"></i>Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              *ngFor="let item of items; trackBy: trackByFn"
              class="hover:bg-gray-50 transition-colors"
              [class.border-l-4]="item.id === editingId"
              [class.border-blue-500]="item.id === editingId">

              <!-- Name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  [(ngModel)]="item.name"
                  (ngModelChange)="onItemChange(item)"
                  (focus)="setEditing(item.id)"
                  placeholder="Enter product/service name"
                />
              </td>

              <!-- Type -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  [(ngModel)]="item.type"
                  (ngModelChange)="onItemChange(item)"
                  (focus)="setEditing(item.id)"
                >
                  <option value="Product">Product</option>
                  <option value="Service">Service</option>
                </select>
              </td>

              <!-- Unit Price -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    class="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    [(ngModel)]="item.unitPrice"
                    (ngModelChange)="onItemChange(item)"
                    (focus)="setEditing(item.id)"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </td>

              <!-- Avg Monthly Sales -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <input
                  type="number"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  [(ngModel)]="item.avgMonthlySales"
                  (ngModelChange)="onItemChange(item)"
                  (focus)="setEditing(item.id)"
                  min="0"
                  step="0.1"
                  placeholder="0"
                />
              </td>

              <!-- Monthly Revenue (calculated) -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-lg font-semibold text-green-600">
                  R {{ item.revenue | number:'1.0-0' }}
                </div>
              </td>

              <!-- Notes -->
              <td class="px-6 py-4">
                <textarea
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  [(ngModel)]="item.notes"
                  (focus)="setEditing(item.id)"
                  placeholder="Add notes..."
                  rows="2"
                ></textarea>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    class="inline-flex items-center px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
                    (click)="onDelete(item)"
                    title="Delete item"
                  >
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="items.length === 0" class="text-center py-12">
        <i class="fas fa-boxes text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No products or services yet</h3>
        <p class="text-gray-500 mb-4">Get started by adding your first product or service offering</p>
        <button
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add Your First Item
        </button>
      </div>

      <!-- Summary Stats -->
      <div *ngIf="items.length > 0" class="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ items.length }}</div>
            <div class="text-sm text-gray-500">Total Items</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ getProductCount() }}</div>
            <div class="text-sm text-gray-500">Products</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">{{ getServiceCount() }}</div>
            <div class="text-sm text-gray-500">Services</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">R {{ getTotalMonthlyRevenue() | number:'1.0-0' }}</div>
            <div class="text-sm text-gray-500">Monthly Revenue</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom scrollbar for table */
    .overflow-x-auto::-webkit-scrollbar {
      height: 8px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class ProductsServicesComponent implements OnInit {
  items: ProductServiceItem[] = [];
  editingId: number | null = null;
  private nextId = 1;

  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    this.items = [
      {
        id: this.nextId++,
        name: 'Basic Website Build',
        type: 'Service',
        unitPrice: 15000,
        avgMonthlySales: 2,
        revenue: 0,
        notes: 'Entry-level web development service including responsive design and basic SEO'
      },
      {
        id: this.nextId++,
        name: 'Monthly SEO Retainer',
        type: 'Service',
        unitPrice: 3500,
        avgMonthlySales: 5,
        revenue: 0,
        notes: 'Ongoing monthly SEO optimization and content strategy'
      },
      {
        id: this.nextId++,
        name: 'E-commerce Platform Setup',
        type: 'Service',
        unitPrice: 25000,
        avgMonthlySales: 1,
        revenue: 0,
        notes: 'Complete e-commerce solution with payment integration'
      },
      {
        id: this.nextId++,
        name: 'Digital Marketing Course',
        type: 'Product',
        unitPrice: 1200,
        avgMonthlySales: 15,
        revenue: 0,
        notes: 'Online course covering social media marketing and advertising'
      },
      {
        id: this.nextId++,
        name: 'Business Consultation',
        type: 'Service',
        unitPrice: 800,
        avgMonthlySales: 8,
        revenue: 0,
        notes: 'One-on-one business strategy consultation sessions'
      }
    ];

    // Calculate initial revenue for all items
    this.items.forEach(item => this.updateRevenue(item));
  }

  onItemChange(item: ProductServiceItem): void {
    this.updateRevenue(item);
  }

  updateRevenue(item: ProductServiceItem): void {
    item.revenue = (item.unitPrice || 0) * (item.avgMonthlySales || 0);
  }

  setEditing(id: number): void {
    this.editingId = id;
  }

  onAddNew(): void {
    const newItem: ProductServiceItem = {
      id: this.nextId++,
      name: '',
      type: 'Product',
      unitPrice: 0,
      avgMonthlySales: 0,
      revenue: 0,
      notes: ''
    };

    this.items.unshift(newItem);
    this.setEditing(newItem.id);
  }

  onDelete(item: ProductServiceItem): void {
    const confirmed = confirm(`Are you sure you want to delete "${item.name || 'this item'}"?`);
    if (confirmed) {
      this.items = this.items.filter(i => i.id !== item.id);
      if (this.editingId === item.id) {
        this.editingId = null;
      }
    }
  }

  getTotalMonthlyRevenue(): number {
    return this.items.reduce((total, item) => total + item.revenue, 0);
  }

  getProductCount(): number {
    return this.items.filter(item => item.type === 'Product').length;
  }

  getServiceCount(): number {
    return this.items.filter(item => item.type === 'Service').length;
  }

  trackByFn(index: number, item: ProductServiceItem): number {
    return item.id;
  }
}
