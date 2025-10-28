import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ComplianceQuestionnaireComponent } from './compliance-questionnaire/compliance-questionnaire.component';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyService } from '../../../../../services';

@Component({
  selector: 'app-compliance-tab',
  standalone: true,
  imports: [CommonModule, ComplianceQuestionnaireComponent],
  template: `
    <div class="space-y-8 p-8">
      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Content -->
      <div *ngIf="!loading && company">
        <!-- Compliance Overview -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Compliance Overview</h3>
              <p class="text-sm text-gray-600 mt-1">{{ company.name }}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-gray-900">{{ getComplianceScore() }}%</div>
              <div class="text-sm text-gray-500">Compliance Score</div>
            </div>
          </div>

          <!-- Compliance Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <!-- SARS Registration -->
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <span class="text-2xl mr-2">🏛️</span>
                  <h4 class="font-medium text-gray-900">SARS Registration</h4>
                </div>
                <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.is_sars_registered || false)"></div>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Registered:</span>
                  <span class="font-medium">{{ company.is_sars_registered ? 'Yes' : 'No' }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Tax Status:</span>
                  <span [class]="'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(company.tax_valid_status || '')">
                    {{ company.tax_valid_status || 'N/A' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Tax Pin Expiry:</span>
                  <span [class]="'font-medium ' + getExpiryColor(company.tax_pin_expiry_date || '')">
                    {{ formatDate(company.tax_pin_expiry_date) || 'N/A' }}
                  </span>
                </div>
                <div *ngIf="company.vat_number" class="flex justify-between text-sm">
                  <span class="text-gray-600">VAT Number:</span>
                  <span class="font-medium">{{ company.vat_number }}</span>
                </div>
              </div>
            </div>

            <!-- Tax Clearance -->
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <span class="text-2xl mr-2">📋</span>
                  <h4 class="font-medium text-gray-900">Tax Clearance</h4>
                </div>
                <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.has_tax_clearance || false)"></div>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Status:</span>
                  <span [class]="'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(company.tax_valid_status || '')">
                    {{ company.tax_valid_status || 'N/A' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Has Clearance:</span>
                  <span class="font-medium">{{ company.has_tax_clearance ? 'Yes' : 'No' }}</span>
                </div>
              </div>
            </div>

            <!-- CIPC Registration -->
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <span class="text-2xl mr-2">🏢</span>
                  <h4 class="font-medium text-gray-900">CIPC Registration</h4>
                </div>
                <div [class]="'w-4 h-4 rounded-full ' + getComplianceColor(company.has_cipc_registration || false)"></div>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Status:</span>
                  <span [class]="'px-2 py-1 rounded text-xs font-medium ' + getCipcStatusColor(company.cipc_status || '')">
                    {{ company.cipc_status || 'N/A' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Registration No:</span>
                  <span class="font-medium">{{ company.registration_no }}</span>
                </div>
                <div *ngIf="company.trading_name && company.trading_name !== 'Nil'" class="flex justify-between text-sm">
                  <span class="text-gray-600">Trading Name:</span>
                  <span class="font-medium">{{ company.trading_name }}</span>
                </div>
              </div>
            </div>

            <!-- BBBEE Certificate -->
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <span class="text-2xl mr-2">⭐</span>
                  <h4 class="font-medium text-gray-900">BBBEE Certificate</h4>
                </div>
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
                  <span class="text-gray-600">Valid Status:</span>
                  <span [class]="'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(company.bbbee_valid_status || '')">
                    {{ company.bbbee_valid_status || 'N/A' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Expiry Date:</span>
                  <span [class]="'font-medium ' + getExpiryColor(company.bbbee_expiry_date || '')">
                    {{ formatDate(company.bbbee_expiry_date) || 'N/A' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Ownership Information -->
          <div class="mt-6 border-t pt-6">
            <h4 class="font-medium text-gray-900 mb-4">Ownership Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex items-center space-x-2">
                <div [class]="'w-3 h-3 rounded-full ' + (company.youth_owned ? 'bg-green-500' : 'bg-gray-300')"></div>
                <span class="text-sm text-gray-600">Youth Owned: </span>
                <span class="text-sm font-medium">{{ company.youth_owned_text || 'No' }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <div [class]="'w-3 h-3 rounded-full ' + (company.black_ownership ? 'bg-green-500' : 'bg-gray-300')"></div>
                <span class="text-sm text-gray-600">Black Ownership: </span>
                <span class="text-sm font-medium">{{ company.black_ownership_text || 'No' }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <div [class]="'w-3 h-3 rounded-full ' + (company.black_women_ownership ? 'bg-green-500' : 'bg-gray-300')"></div>
                <span class="text-sm text-gray-600">Black Women Ownership: </span>
                <span class="text-sm font-medium">{{ company.black_women_ownership_text || 'No' }}</span>
              </div>
            </div>
          </div>

          <!-- Business Information -->
          <div class="mt-6 border-t pt-6">
            <h4 class="font-medium text-gray-900 mb-4">Business Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Service Offering:</span>
                <span class="font-medium">{{ company.service_offering || 'N/A' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Business Location:</span>
                <span class="font-medium">{{ company.business_location || 'N/A' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Estimated Turnover:</span>
                <span class="font-medium">{{ formatCurrency(company.turnover_estimated) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Permanent Employees:</span>
                <span class="font-medium">{{ company.permanent_employees || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Compliance Notes -->
          <div *ngIf="company.compliance_notes" class="mt-6 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 class="font-medium text-gray-900 mb-2 flex items-center">
              <span class="text-yellow-600 mr-2">⚠️</span>
              Compliance Notes
            </h4>
            <p class="text-sm text-gray-700">{{ company.compliance_notes }}</p>
          </div>
        </div>

        <!-- Compliance Questionnaire -->
        <app-compliance-questionnaire
          [company]="company">
        </app-compliance-questionnaire>
      </div>
    </div>
  `
})
export class ComplianceTabComponent implements OnInit {
  @Input() company: ICompany | null = null;

  companyId = signal<number>(0);
  loading = false;

  private route = inject(ActivatedRoute);
  private companyService = inject(CompanyService);

  ngOnInit(): void {
    const companyId = +this.route.parent?.snapshot.params['id'];
    this.companyId.set(companyId);
    if (!this.company) {
      this.getCompany();
    }
  }

  getCompany() {
    this.loading = true;
    this.companyService.getCompanyById(this.companyId()).subscribe({
      next: (company) => {
        this.company = company;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading company:', error);
        this.loading = false;
      }
    });
  }

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
      'EME': 'bg-green-600', // Exempt Micro Enterprise
      'QSE': 'bg-green-500', // Qualifying Small Enterprise
      'Non-compliant': 'bg-gray-500'
    };
    return levelMap[level] || 'bg-gray-400';
  }

  getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('valid')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('expired')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  }

  getCipcStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('in business')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('deregistered')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('under business rescue')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  }

  getExpiryColor(dateString: string): string {
    if (!dateString) return '';
    
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'text-red-600'; // Expired
    if (daysUntilExpiry < 30) return 'text-orange-600'; // Expiring soon
    if (daysUntilExpiry < 90) return 'text-yellow-600'; // Due for renewal
    return 'text-green-600'; // Valid
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatCurrency(value: number | null | undefined): string {
    if (!value) return 'R0';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  getComplianceScore(): number {
    if (!this.company) return 0;
    
    let score = 0;
    let total = 4; // Total compliance items
    
    if (this.company.is_sars_registered) score++;
    if (this.company.has_tax_clearance) score++;
    if (this.company.has_cipc_registration) score++;
    if (this.company.has_valid_bbbbee) score++;
    
    return Math.round((score / total) * 100);
  }
}
