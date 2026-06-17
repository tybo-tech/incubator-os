import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../../services/node.service';
import { SupplierService } from './supplier.service';
import { Supplier, DEFAULT_SUPPLIER } from './supplier.models';
import { GrantProcessExportService, CompanyInfo } from '../services/grant-process-export.service';
import { IGrantApplicationData } from '../interfaces/grant-application.interfaces';

@Component({
  selector: 'app-supplier-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="fas fa-truck text-blue-600 text-xl mr-3"></i>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                Supplier Management
              </h2>
            </div>
          </div>
          <button
            (click)="addSupplier()"
            class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <i class="fas fa-plus mr-1"></i>
            Add Supplier
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Loading suppliers...</span>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading()" class="p-6">
        <!-- Suppliers Table -->
        <div class="border rounded-xl p-4 mb-6 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-3 py-2 font-medium text-gray-700">Supplier Name</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-700">CIPC Registration</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-700">VAT Number</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-700">Contact</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-700">Status</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let supplier of suppliers(); let i = index" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-3 py-2 font-medium text-gray-900">
                    {{ supplier.name || 'Unnamed Supplier' }}
                  </td>
                  <td class="px-3 py-2">
                    {{ supplier.cipc_registration || '-' }}
                  </td>
                  <td class="px-3 py-2">
                    {{ supplier.vat_number || '-' }}
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-xs">
                      <div *ngIf="supplier.contact_details?.phone">Phone: {{ supplier.contact_details.phone }}</div>
                      <div *ngIf="supplier.contact_details?.email">Email: {{ supplier.contact_details.email }}</div>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                      {{ supplier.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }}">
                      {{ supplier.approved ? 'Approved' : 'Pending' }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex space-x-1">
                      <button
                        (click)="editSupplier(i)"
                        class="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                        Edit
                      </button>
                      <button
                        (click)="deleteSupplier(i)"
                        class="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="suppliers().length === 0">
                  <td colspan="6" class="px-3 py-4 text-center text-gray-400 text-sm">
                    <i class="fas fa-truck text-lg mb-1 block"></i>
                    <p>No suppliers added yet. Click "Add Supplier" to get started.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end space-x-2">
          <button
            (click)="exportToPdf()"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <i class="fas fa-file-pdf mr-1"></i>
            Export
          </button>
          <button
            (click)="saveSuppliers()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center">
            <i class="fas fa-save mr-1"></i>
            {{ isSaving() ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <!-- Status Message -->
        <div *ngIf="saveStatus()" class="mt-4 p-3 rounded-lg text-sm"
             [class]="saveStatus()!.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
          <div class="flex">
            <i class="fas text-base mt-0.5 mr-2"
               [class]="saveStatus()!.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'"></i>
            <div>
              <p>{{ saveStatus()!.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for Adding/Editing Supplier -->
    <div *ngIf="showModal()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-900">
            {{ editingSupplierIndex() !== null ? 'Edit Supplier' : 'Add Supplier' }}
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-500">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input
                type="text"
                [(ngModel)]="currentSupplier().name"
                placeholder="Enter supplier name"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">CIPC Registration</label>
              <input
                type="text"
                [(ngModel)]="currentSupplier().cipc_registration"
                placeholder="Enter CIPC registration"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">VAT Number</label>
              <input
                type="text"
                [(ngModel)]="currentSupplier().vat_number"
                placeholder="Enter VAT number"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Approved</label>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  [(ngModel)]="currentSupplier().approved"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label class="ml-2 text-xs text-gray-700">Approved Supplier</label>
              </div>
            </div>
          </div>

          <!-- Contact Details -->
          <div class="border rounded-lg p-3 mb-3">
            <h5 class="font-medium text-gray-900 mb-2 text-sm">Contact Details</h5>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  [(ngModel)]="currentSupplier().contact_details.phone"
                  placeholder="Enter phone number"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  [(ngModel)]="currentSupplier().contact_details.email"
                  placeholder="Enter email address"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  [(ngModel)]="currentSupplier().contact_details.address"
                  placeholder="Enter address"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Contact Details Verified</label>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  [(ngModel)]="currentSupplier().contact_details.verified"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label class="ml-2 text-xs text-gray-700">Verified</label>
              </div>
            </div>
          </div>

          <!-- Verification Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">CIPC Verified</label>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  [(ngModel)]="currentSupplier().cipc_verified"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label class="ml-2 text-xs text-gray-700">Verified</label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">VAT Verified</label>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  [(ngModel)]="currentSupplier().vat_verified"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label class="ml-2 text-xs text-gray-700">Verified</label>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex justify-end pt-3 space-x-2">
            <button
              (click)="closeModal()"
              class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
            <button
              (click)="saveSupplier()"
              class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              {{ editingSupplierIndex() !== null ? 'Update' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SupplierManagementComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantData!: IGrantApplicationData;

  isLoading = signal(true);
  isSaving = signal(false);
  saveStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  suppliers = signal<Supplier[]>([]);
  supplierCollectionNode = signal<any>(null);

  // Modal state
  showModal = signal(false);
  currentSupplier = signal<Supplier>({ ...DEFAULT_SUPPLIER });
  editingSupplierIndex = signal<number | null>(null);

  constructor(
    @Inject(NodeService) private nodeService: NodeService,
    @Inject(SupplierService) private supplierService: SupplierService,
    @Inject(GrantProcessExportService) private exportService: GrantProcessExportService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.isLoading.set(true);
    this.supplierService.loadSuppliers(this.companyId).subscribe({
      next: (supplierCollection) => {
        this.suppliers.set(supplierCollection.suppliers);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  saveSuppliers(): void {
    this.isSaving.set(true);
    this.saveStatus.set(null);

    this.supplierService.saveSuppliers(this.companyId, { suppliers: this.suppliers() }).subscribe({
      next: (response: any) => {
        this.isSaving.set(false);
        this.supplierCollectionNode.set(response);
        this.saveStatus.set({ message: 'Suppliers saved successfully!', type: 'success' });
        // Clear status message after 3 seconds
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.saveStatus.set({ message: 'Failed to save suppliers. Please try again.', type: 'error' });
        console.error('Error saving suppliers:', error);
      }
    });
  }

  addSupplier(): void {
    this.currentSupplier.set({ ...DEFAULT_SUPPLIER });
    this.editingSupplierIndex.set(null);
    this.showModal.set(true);
  }

  editSupplier(index: number): void {
    this.currentSupplier.set({ ...this.suppliers()[index] });
    this.editingSupplierIndex.set(index);
    this.showModal.set(true);
  }

  saveSupplier(): void {
    const supplier = this.currentSupplier();
    
    if (!supplier.name) {
      this.saveStatus.set({ message: 'Supplier name is required.', type: 'error' });
      return;
    }

    if (this.editingSupplierIndex() !== null) {
      // Update existing supplier
      const index = this.editingSupplierIndex()!;
      this.suppliers.update(suppliers => {
        const updated = [...suppliers];
        updated[index] = {
          ...updated[index],
          ...supplier,
          updated_date: new Date().toISOString()
        };
        return updated;
      });
    } else {
      // Add new supplier
      this.suppliers.update(suppliers => [
        ...suppliers,
        {
          ...supplier,
          id: `s_${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        }
      ]);
    }

    this.closeModal();
  }

  deleteSupplier(index: number): void {
    if (confirm('Are you sure you want to delete this supplier?')) {
      this.suppliers.update(suppliers => suppliers.filter((_, i) => i !== index));
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingSupplierIndex.set(null);
    this.currentSupplier.set({ ...DEFAULT_SUPPLIER });
  }

  exportToPdf(): void {
    // Get primary director information
    const primaryDirector = this.applicantData.directors?.[0];
    const directorName = primaryDirector 
      ? [primaryDirector.name, primaryDirector.surname].filter(Boolean).join(' ') 
      : '';
    
    // Get contact number (cell phone or phone)
    const contactNumber = primaryDirector 
      ? (primaryDirector.cell_phone || primaryDirector.phone || '') 
      : '';

    const companyInfo: CompanyInfo = {
      companyName: this.applicantData.company_name || '',
      directorName: directorName,
      contactNumber: contactNumber,
      registrationNumber: this.applicantData.registration_number || ''
    };

    this.exportService.exportSuppliers(
      this.suppliers(),
      companyInfo
    );
  }
}