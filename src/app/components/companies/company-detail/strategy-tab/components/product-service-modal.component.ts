import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { ProductService, initProductService } from '../../../../../../models/business.models';

@Component({
  selector: 'app-product-service-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ productData ? 'Edit' : 'Add' }} {{ formData.type === 'product' ? 'Product' : 'Service' }}
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form (ngSubmit)="saveProduct()" #productForm="ngForm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Left Column -->
              <div class="space-y-4">
                <!-- Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Name <span class="text-red-500">*</span>
                  </label>
                  <input
                    [(ngModel)]="formData.name"
                    name="name"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product/Service name"
                  />
                </div>

                <!-- Type -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Type <span class="text-red-500">*</span>
                  </label>
                  <select
                    [(ngModel)]="formData.type"
                    name="type"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>

                <!-- Category -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    [(ngModel)]="formData.category"
                    name="category"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Software, Consulting, Hardware"
                  />
                </div>

                <!-- Target Customers -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Target Customers
                  </label>
                  <input
                    [(ngModel)]="formData.target_customers"
                    name="target_customers"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Who is this for?"
                  />
                </div>

                <!-- Pricing Model -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Pricing Model
                  </label>
                  <input
                    [(ngModel)]="formData.pricing_model"
                    name="pricing_model"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Subscription, One-time, Per hour"
                  />
                </div>

                <!-- Revenue Contribution -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Revenue Contribution (%)
                  </label>
                  <input
                    [(ngModel)]="formData.revenue_contribution"
                    name="revenue_contribution"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Right Column -->
              <div class="space-y-4">
                <!-- Status -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Current Status <span class="text-red-500">*</span>
                  </label>
                  <select
                    [(ngModel)]="formData.current_status"
                    name="current_status"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="concept">Concept</option>
                    <option value="development">Development</option>
                    <option value="testing">Testing</option>
                    <option value="launched">Launched</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>

                <!-- Launch Date -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Launch Date
                  </label>
                  <input
                    [(ngModel)]="formData.launch_date"
                    name="launch_date"
                    type="date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <!-- End Date -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    End Date (if applicable)
                  </label>
                  <input
                    [(ngModel)]="formData.end_date"
                    name="end_date"
                    type="date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Description <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    [(ngModel)]="formData.description"
                    name="description"
                    required
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the product/service..."
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Full Width Sections -->
            <!-- Features -->
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Key Features
              </label>
              <div class="space-y-2 mb-3">
                <div *ngFor="let feature of formData.features; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.features[i]"
                    [name]="'feature-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a key feature..."
                  />
                  <button
                    type="button"
                    (click)="removeFeature(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove feature"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <button
                type="button"
                (click)="addFeature()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Feature</span>
              </button>
            </div>

            <!-- Challenges -->
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Current Challenges
              </label>
              <div class="space-y-2 mb-3">
                <div *ngFor="let challenge of formData.challenges; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.challenges[i]"
                    [name]="'challenge-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a challenge..."
                  />
                  <button
                    type="button"
                    (click)="removeChallenge(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove challenge"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <button
                type="button"
                (click)="addChallenge()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Challenge</span>
              </button>
            </div>

            <!-- Opportunities -->
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Growth Opportunities
              </label>
              <div class="space-y-2 mb-3">
                <div *ngFor="let opportunity of formData.opportunities; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.opportunities[i]"
                    [name]="'opportunity-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter an opportunity..."
                  />
                  <button
                    type="button"
                    (click)="removeOpportunity(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove opportunity"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <button
                type="button"
                (click)="addOpportunity()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Opportunity</span>
              </button>
            </div>

            <!-- Mentor Notes -->
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Mentor Notes
              </label>
              <textarea
                [(ngModel)]="formData.mentor_notes"
                name="mentor_notes"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any mentor feedback or notes..."
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            (click)="closeModal()"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            (click)="saveProduct()"
            [disabled]="!formData.name || !formData.description"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ productData ? 'Update' : 'Save' }} {{ formData.type === 'product' ? 'Product' : 'Service' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProductServiceModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() productData: INode<ProductService> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ProductService>();

  formData: ProductService = initProductService();

  ngOnInit() {
    if (this.productData) {
      this.formData = { ...this.productData.data };
    } else {
      this.formData = initProductService();
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveProduct() {
    if (!this.formData.name || !this.formData.description) {
      return;
    }

    this.save.emit(this.formData);
  }

  addFeature() {
    this.formData.features.push('');
  }

  removeFeature(index: number) {
    this.formData.features.splice(index, 1);
  }

  addChallenge() {
    this.formData.challenges.push('');
  }

  removeChallenge(index: number) {
    this.formData.challenges.splice(index, 1);
  }

  addOpportunity() {
    this.formData.opportunities.push('');
  }

  removeOpportunity(index: number) {
    this.formData.opportunities.splice(index, 1);
  }
}
