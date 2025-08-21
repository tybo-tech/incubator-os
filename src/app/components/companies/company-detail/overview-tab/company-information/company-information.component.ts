import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../../models/simple.schema';

@Component({
  selector: 'app-company-information',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
      <div class="grid grid-cols-2 gap-6">
        <div>
          <label class="text-sm font-medium text-gray-500">Legal Name</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.name }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">Trading Name</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.trading_name || 'N/A' }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">Registration Number</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.registration_no }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">Industry</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.sector_name }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">VAT Number</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.vat_number || 'N/A' }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">CIPC Status</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.cipc_status || 'N/A' }}</p>
        </div>
      </div>
    </div>
  `
})
export class CompanyInformationComponent {
  @Input() company!: ICompany;
}
