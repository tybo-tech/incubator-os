import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Company, Compliance } from '../../../../models/business.models';
import { INode } from '../../../../models/schema';
import { NodeService } from '../../../../services';

@Component({
  selector: 'app-company-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <!-- Modal Header -->
        <div class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ editMode ? 'Edit Company' : 'Add New Company' }}
          </h2>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <form #companyForm="ngForm" (ngSubmit)="onSave()">
            <!-- Basic Information -->
            <div class="space-y-6">
              <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      [(ngModel)]="formData.name"
                      name="name"
                      required
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number <span class="text-red-500">*</span>
                    </label>
                    <input
                      [(ngModel)]="formData.registration_no"
                      name="registration_no"
                      required
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2023/123456/07"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Trading Name
                    </label>
                    <input
                      [(ngModel)]="formData.trading_name"
                      name="trading_name"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Trading name (if different)"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Industry <span class="text-red-500">*</span>
                    </label>
                    <select
                      [(ngModel)]="formData.industry"
                      name="industry"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Industry</option>
                      <option value="Technology">Technology</option>
                      <option value="Construction">Construction</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Retail">Retail</option>
                      <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Professional Services">Professional Services</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      VAT Number
                    </label>
                    <input
                      [(ngModel)]="formData.vat_number"
                      name="vat_number"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="VAT number"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      BBBEE Level
                    </label>
                    <select
                      [(ngModel)]="formData.bbbee_level"
                      name="bbbee_level"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select BBBEE Level</option>
                      <option value="EME">EME (Exempted Micro Enterprise)</option>
                      <option value="QSE">QSE (Qualifying Small Enterprise)</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                      <option value="Level 4">Level 4</option>
                      <option value="Level 5">Level 5</option>
                      <option value="Level 6">Level 6</option>
                      <option value="Level 7">Level 7</option>
                      <option value="Level 8">Level 8</option>
                      <option value="Non-Compliant">Non-Compliant</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Contact Information -->
              <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      [(ngModel)]="formData.contact_person"
                      name="contact_person"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Primary contact person"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      [(ngModel)]="formData.contact_number"
                      name="contact_number"
                      type="tel"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      [(ngModel)]="formData.email_address"
                      name="email_address"
                      type="email"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="company@example.com"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Director ID Number
                    </label>
                    <input
                      [(ngModel)]="formData.director_id_number"
                      name="director_id_number"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Director's ID number"
                    />
                  </div>
                </div>
              </div>

              <!-- Address Information -->
              <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      [(ngModel)]="formData.address"
                      name="address"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Suburb
                    </label>
                    <input
                      [(ngModel)]="formData.suburb"
                      name="suburb"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Suburb"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      [(ngModel)]="formData.city"
                      name="city"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      [(ngModel)]="formData.postal_code"
                      name="postal_code"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Postal code"
                    />
                  </div>
                </div>
              </div>

              <!-- Business Information -->
              <div class="border-b pb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Annual Turnover (R)
                    </label>
                    <input
                      [(ngModel)]="formData.turnover_estimated"
                      name="turnover_estimated"
                      type="number"
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Actual Annual Turnover (R)
                    </label>
                    <input
                      [(ngModel)]="formData.turnover_actual"
                      name="turnover_actual"
                      type="number"
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Permanent Employees
                    </label>
                    <input
                      [(ngModel)]="formData.permanent_employees"
                      name="permanent_employees"
                      type="number"
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Temporary Employees
                    </label>
                    <input
                      [(ngModel)]="formData.temporary_employees"
                      name="temporary_employees"
                      type="number"
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Service Offering
                    </label>
                    <textarea
                      [(ngModel)]="formData.service_offering"
                      name="service_offering"
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the services or products offered"
                    ></textarea>
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      [(ngModel)]="formData.description"
                      name="description"
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional company description"
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- Compliance Information -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Compliance Status</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-center">
                    <input
                      [(ngModel)]="formData.compliance!.is_sars_registered"
                      name="is_sars_registered"
                      type="checkbox"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label class="ml-2 text-sm text-gray-700">SARS Registered</label>
                  </div>

                  <div class="flex items-center">
                    <input
                      [(ngModel)]="formData.compliance!.has_tax_clearance"
                      name="has_tax_clearance"
                      type="checkbox"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label class="ml-2 text-sm text-gray-700">Has Tax Clearance</label>
                  </div>

                  <div class="flex items-center">
                    <input
                      [(ngModel)]="formData.compliance!.has_cipc_registration"
                      name="has_cipc_registration"
                      type="checkbox"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label class="ml-2 text-sm text-gray-700">CIPC Registered</label>
                  </div>

                  <div class="flex items-center">
                    <input
                      [(ngModel)]="formData.compliance!.has_valid_bbbbee"
                      name="has_valid_bbbbee"
                      type="checkbox"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label class="ml-2 text-sm text-gray-700">Valid BBBEE Certificate</label>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            type="button"
            (click)="onClose()"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="onSave()"
            [disabled]="saving || !isFormValid()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center"
          >
            <i *ngIf="saving" class="fas fa-spinner fa-spin mr-2"></i>
            {{ saving ? 'Saving...' : (editMode ? 'Update Company' : 'Create Company') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class CompanyFormModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() editMode = false;
  @Input() company: INode<Company> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() companySaved = new EventEmitter<INode<Company>>();

  formData: Company = this.initCompany();
  saving = false;

  constructor(private nodeService: NodeService<Company>) {}

  ngOnInit() {
    this.resetForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['company'] || changes['isOpen']) {
      this.resetForm();
    }
  }

  initCompany(): Company {
    return {
      name: '',
      registration_no: '',
      industry: '',
      trading_name: '',
      vat_number: '',
      bbbee_level: '',
      contact_person: '',
      contact_number: '',
      email_address: '',
      director_id_number: '',
      address: '',
      suburb: '',
      city: '',
      postal_code: '',
      turnover_estimated: 0,
      turnover_actual: 0,
      permanent_employees: 0,
      temporary_employees: 0,
      service_offering: '',
      description: '',
      cipc_status: 'IN BUSINESS',
      compliance: {
        is_sars_registered: false,
        has_tax_clearance: false,
        has_cipc_registration: false,
        has_valid_bbbbee: false,
        notes: ''
      }
    };
  }

  resetForm() {
    if (this.editMode && this.company) {
      this.formData = { ...this.company.data };
      // Ensure compliance object exists
      if (!this.formData.compliance) {
        this.formData.compliance = {
          is_sars_registered: false,
          has_tax_clearance: false,
          has_cipc_registration: false,
          has_valid_bbbbee: false,
          notes: ''
        };
      }
    } else {
      this.formData = this.initCompany();
    }
  }

  isFormValid(): boolean {
    return !!(this.formData.name && this.formData.registration_no && this.formData.industry);
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
  }

  async onSave() {
    if (!this.isFormValid() || this.saving) {
      return;
    }

    this.saving = true;

    try {
      let savedCompany: INode<Company>;

      if (this.editMode && this.company) {
        // Update existing company
        const updatedCompany: INode<Company> = {
          ...this.company,
          data: this.formData
        };
        savedCompany = await this.nodeService.updateNode(updatedCompany).toPromise() || updatedCompany;
      } else {
        // Create new company
        const newCompany: INode<Company> = {
          id: 0, // Will be set by backend
          company_id: 0,
          type: 'company',
          data: this.formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        savedCompany = await this.nodeService.addNode(newCompany).toPromise() || newCompany;
      }

      this.companySaved.emit(savedCompany);
      this.onClose();
    } catch (error) {
      console.error('Error saving company:', error);
      // You could add a toast notification here
    } finally {
      this.saving = false;
    }
  }
}
