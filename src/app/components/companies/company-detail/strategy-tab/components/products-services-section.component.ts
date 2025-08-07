import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { ProductService } from '../../../../../../models/business.models';

@Component({
  selector: 'app-products-services-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border my-4">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <i class="fas fa-box mr-2 text-green-600"></i>
            Products & Services
          </h3>
          <p class="text-sm text-gray-600">Catalog your current and planned offerings</p>
        </div>
        <button
          (click)="addProduct.emit()"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <i class="fas fa-plus"></i>
          <span>Add Product/Service</span>
        </button>
      </div>

      <div class="p-6">
        <div *ngIf="productsServices.length === 0" class="text-center text-gray-500 py-8">
          <i class="fas fa-box text-4xl mb-4"></i>
          <h4 class="text-lg font-medium mb-2">No Products or Services Yet</h4>
          <p class="mb-4">Add your products and services to build your offering catalog.</p>
          <button
            (click)="addProduct.emit()"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Add First Product/Service
          </button>
        </div>

        <div *ngIf="productsServices.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue %</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of productsServices" class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">{{ item.data.name }}</div>
                  <div class="text-sm text-gray-600 max-w-xs">{{ item.data.description | slice:0:100 }}{{ item.data.description.length > 100 ? '...' : '' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="item.data.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
                    <i [ngClass]="item.data.type === 'product' ? 'fas fa-cube' : 'fas fa-handshake'" class="mr-1"></i>
                    {{ item.data.type | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="getStatusClass(item.data.current_status)">
                    {{ getStatusDisplay(item.data.current_status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-900">{{ item.data.category }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-900">{{ item.data.revenue_contribution || 0 }}%</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <button (click)="editProduct.emit(item)" class="text-blue-600 hover:text-blue-700" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button (click)="deleteProduct.emit(item)" class="text-red-600 hover:text-red-700" title="Delete">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ProductsServicesSectionComponent {
  @Input() productsServices: INode<ProductService>[] = [];
  @Output() addProduct = new EventEmitter<void>();
  @Output() editProduct = new EventEmitter<INode<ProductService>>();
  @Output() deleteProduct = new EventEmitter<INode<ProductService>>();

  getStatusClass(status: string): string {
    switch (status) {
      case 'concept': return 'bg-gray-100 text-gray-800';
      case 'development': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'launched': return 'bg-green-100 text-green-800';
      case 'discontinued': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDisplay(status: string): string {
    return status.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
