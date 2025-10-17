import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { AccountType, CompanyAccount } from '../../../../services/company-account.interface';

/**
 * Test component to verify account type functionality
 * This can be removed after testing
 */
@Component({
  selector: 'app-account-type-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 m-4">
      <h3 class="text-lg font-bold text-blue-800 mb-4">Account Type Test Component</h3>

      <!-- Account Types -->
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Available Account Types:</h4>
        <div class="flex flex-wrap gap-2">
          <span *ngFor="let type of accountTypes"
                [class]="'px-3 py-1 text-sm rounded-full ' + getAccountTypeBadgeClass(type.key)">
            {{ type.label }}
          </span>
        </div>
      </div>

      <!-- Test Accounts (if any) -->
      <div class="mb-4" *ngIf="testAccounts.length > 0">
        <h4 class="font-semibold text-gray-700 mb-2">Test Accounts:</h4>
        <div class="space-y-2">
          <div *ngFor="let account of testAccounts"
               class="p-2 bg-white rounded border flex justify-between items-center">
            <span class="font-medium">{{ account.account_name }}</span>
            <span [class]="'px-2 py-1 text-xs rounded-full ' + getAccountTypeBadgeClass(account.account_type)">
              {{ getAccountTypeLabel(account.account_type) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="text-sm text-gray-600">
        <p>✅ Account types loaded: {{ accountTypes.length > 0 ? 'Yes' : 'No' }}</p>
        <p>✅ Service methods working: {{ serviceWorking ? 'Yes' : 'No' }}</p>
      </div>
    </div>
  `
})
export class AccountTypeTestComponent implements OnInit {
  accountTypes: AccountType[] = [];
  testAccounts: CompanyAccount[] = [];
  serviceWorking = false;

  constructor(private companyAccountService: CompanyAccountService) {}

  ngOnInit() {
    this.loadAccountTypes();
    this.testServiceMethods();
  }

  private loadAccountTypes() {
    // Try to load from API, fallback to default
    this.companyAccountService.getAccountTypes().subscribe({
      next: (response) => {
        if (response.success) {
          this.accountTypes = Object.entries(response.data).map(([key, label]) => ({
            key: key as any,
            label: label
          }));
        } else {
          this.accountTypes = this.companyAccountService.getDefaultAccountTypes();
        }
      },
      error: () => {
        this.accountTypes = this.companyAccountService.getDefaultAccountTypes();
      }
    });
  }

  private testServiceMethods() {
    try {
      // Test helper methods
      const domesticLabel = this.companyAccountService.getAccountTypeLabel('domestic_revenue');
      const exportBadge = this.companyAccountService.getAccountTypeBadgeClass('export_revenue');

      this.serviceWorking = domesticLabel === 'Domestic Revenue' && exportBadge.includes('bg-blue');
    } catch (error) {
      this.serviceWorking = false;
    }
  }

  getAccountTypeLabel(accountType: string): string {
    return this.companyAccountService.getAccountTypeLabel(accountType);
  }

  getAccountTypeBadgeClass(accountType: string): string {
    return this.companyAccountService.getAccountTypeBadgeClass(accountType);
  }
}
