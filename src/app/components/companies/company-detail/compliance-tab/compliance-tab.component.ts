import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceQuestionnaireComponent } from './compliance-questionnaire/compliance-questionnaire.component';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-compliance-tab',
  standalone: true,
  imports: [CommonModule, ComplianceQuestionnaireComponent],
  template: `
    <div class="space-y-8">
      <!-- Compliance Overview -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-6">Compliance Overview</h3>

        <!-- Compliance Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- SARS Registration -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-medium text-gray-900">SARS Registration</h4>
              <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.is_sars_registered || false)"></div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium">{{ company.tax_valid_status || 'N/A' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Tax Pin Expiry:</span>
                <span class="font-medium">{{ company.tax_pin_expiry_date || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- Tax Clearance -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-medium text-gray-900">Tax Clearance</h4>
                <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.has_tax_clearance || false)"></div>
              </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium">{{ company.tax_valid_status || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- CIPC Registration -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-medium text-gray-900">CIPC Registration</h4>
              <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.has_cipc_registration || false)"></div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium">{{ company.cipc_status || 'N/A' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Registration No:</span>
                <span class="font-medium">{{ company.registration_no }}</span>
              </div>
            </div>
          </div>

          <!-- BBBEE Certificate -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-medium text-gray-900">BBBEE Certificate</h4>
              <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.has_valid_bbbbee || false)"></div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Level:</span>
                <span [class]="'px-2 py-1 rounded text-xs font-medium text-white ' + getBbbeeColor(company.bbbee_level || '')">
                  {{ company.bbbee_level || 'N/A' }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Expiry Date:</span>
                <span class="font-medium">{{ company.bbbee_expiry_date || 'N/A' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Valid Status:</span>
                <span class="font-medium">{{ company.bbbee_valid_status || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Compliance Notes -->
        <!-- <div class="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-2">Compliance Notes</h4>
          <p class="text-sm text-gray-700">{{ company.notes || 'No additional compliance notes available.' }}</p>
        </div> -->
      </div>

      <!-- Compliance Questionnaire -->
      <app-compliance-questionnaire
        [company]="company">
      </app-compliance-questionnaire>
    </div>
  `
})
export class ComplianceTabComponent {
  @Input() company!: ICompany;

  getComplianceColor(isCompliant: boolean): string {
    return isCompliant ? 'bg-green-500' : 'bg-red-500';
  }

  getBbbeeColor(level: string): string {
    const levelMap: { [key: string]: string } = {
      'Level 1': 'bg-green-600',
      'Level 2': 'bg-green-500',
      'Level 3': 'bg-yellow-500',
      'Level 4': 'bg-yellow-600',
      'Level 5': 'bg-orange-500',
      'Level 6': 'bg-orange-600',
      'Level 7': 'bg-red-500',
      'Level 8': 'bg-red-600',
      'Non-compliant': 'bg-gray-500'
    };
    return levelMap[level] || 'bg-gray-400';
  }
}
