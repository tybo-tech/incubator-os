import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../../models/simple.schema';

@Component({
  selector: 'app-contact-information',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
      <div class="grid grid-cols-2 gap-6">
        <div>
          <label class="text-sm font-medium text-gray-500">Contact Person</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.contact_person || 'N/A' }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">Phone Number</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.contact_number || 'N/A' }}</p>
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium text-gray-500">Email Address</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.email_address || 'N/A' }}</p>
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium text-gray-500">Address</label>
          <p class="text-sm text-gray-900 mt-1">
            {{ company.address || company.business_location || company.city || 'N/A' }}
          </p>
        </div>
      </div>
    </div>
  `
})
export class ContactInformationComponent {
  @Input() company!: ICompany;
}
