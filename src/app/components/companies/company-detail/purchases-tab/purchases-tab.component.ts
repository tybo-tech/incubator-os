import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyPurchasesComponent } from '../../company-purchases/company-purchases.component';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-purchases-tab',
  standalone: true,
  imports: [
    CommonModule,
    CompanyPurchasesComponent
  ],
  template: `
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 flex items-center">
              <i class="fas fa-shopping-cart mr-3 text-green-600"></i>
              Company Purchases
            </h3>
            <p class="text-sm text-gray-600 mt-1">
              Track equipment, tools, and service purchases funded by the incubator program for {{ company.name }}
            </p>
          </div>
        </div>

        <!-- Company Purchases Component -->
        <app-company-purchases [companyId]="company.id"></app-company-purchases>
      </div>
    </div>
  `
})
export class PurchasesTabComponent {
  @Input() company!: ICompany;
}
