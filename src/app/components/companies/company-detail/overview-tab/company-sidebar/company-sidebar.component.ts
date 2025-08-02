import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { Company } from '../../../../../../models/business.models';

@Component({
  selector: 'app-company-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Quick Stats -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Estimated Turnover</span>
            <span class="text-sm font-medium text-gray-900">
              {{ formatCurrency(company.data.turnover_estimated || 0) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Permanent Employees</span>
            <span class="text-sm font-medium text-gray-900">{{ company.data.permanent_employees || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Temporary Employees</span>
            <span class="text-sm font-medium text-gray-900">{{ company.data.temporary_employees || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Ownership -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Ownership Profile</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Black Ownership</span>
            <div class="flex items-center space-x-2">
              <div [class]="'w-3 h-3 rounded-full ' + (company.data.black_ownership === 'Yes' ? 'bg-green-500' : 'bg-gray-400')"></div>
              <span class="text-sm text-gray-900">{{ company.data.black_ownership || 'N/A' }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Black Women Ownership</span>
            <div class="flex items-center space-x-2">
              <div [class]="'w-3 h-3 rounded-full ' + (company.data.black_women_ownership === 'Yes' ? 'bg-green-500' : 'bg-gray-400')"></div>
              <span class="text-sm text-gray-900">{{ company.data.black_women_ownership || 'N/A' }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Youth Owned</span>
            <div class="flex items-center space-x-2">
              <div [class]="'w-3 h-3 rounded-full ' + (company.data.youth_owned === 'Yes' ? 'bg-green-500' : 'bg-gray-400')"></div>
              <span class="text-sm text-gray-900">{{ company.data.youth_owned || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompanySidebarComponent {
  @Input() company!: INode<Company>;

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
