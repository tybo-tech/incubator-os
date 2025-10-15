import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap, map } from 'rxjs';
import {
  CompanyAccount,
  CompanyAccountCreateRequest,
  CompanyAccountUpdateRequest,
  CompanyAccountsListResponse,
  CompanyAccountResponse,
  CompanyAccountsSummaryResponse,
  CompanyAccountsListFilters,
  ApiResponse
} from './company-account.interface';
import { Constants } from '../../services/service';

@Injectable({
  providedIn: 'root'
})
export class CompanyAccountService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-accounts`;

  // Signals for reactive state management
  companyAccounts = signal<CompanyAccount[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(
    private http: HttpClient
  ) {}

  /**
   * Get all company accounts with optional filters
   */
  getAllAccounts(filters?: CompanyAccountsListFilters): Observable<CompanyAccountsListResponse> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (filters) {
      if (filters.company_id) {
        params = params.set('company_id', filters.company_id.toString());
      }
      if (filters.is_active !== undefined) {
        params = params.set('is_active', filters.is_active.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
      if (filters.offset) {
        params = params.set('offset', filters.offset.toString());
      }
    }

    return this.http.get<CompanyAccountsListResponse>(`${this.apiUrl}/list-company-accounts.php`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this.companyAccounts.set(response.data);
          }
          this.loading.set(false);
        }),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to fetch company accounts');
          return of({
            success: false,
            data: [],
            count: 0,
            message: error.message || 'Failed to fetch company accounts'
          });
        })
      );
  }

  /**
   * Get accounts for a specific company
   */
  getAccountsByCompany(companyId: number, activeOnly: boolean = true): Observable<CompanyAccountsListResponse> {
    const filters: CompanyAccountsListFilters = {
      company_id: companyId,
      is_active: activeOnly
    };
    return this.getAllAccounts(filters);
  }

  /**
   * Get a single company account by ID
   */
  getAccountById(id: number): Observable<CompanyAccountResponse> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams().set('id', id.toString());

    return this.http.get<CompanyAccountResponse>(`${this.apiUrl}/get-company-account.php`, { params })
      .pipe(
        tap(() => this.loading.set(false)),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to fetch company account');
          return of({
            success: false,
            data: {} as CompanyAccount,
            message: error.message || 'Failed to fetch company account'
          });
        })
      );
  }

  /**
   * Create a new company account
   */
  createAccount(accountData: CompanyAccountCreateRequest): Observable<CompanyAccountResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<CompanyAccountResponse>(`${this.apiUrl}/add-company-account.php`, accountData)
      .pipe(
        tap(response => {
          this.loading.set(false);
          if (response.success) {
            // Refresh accounts list if we have a company context
            if (accountData.company_id) {
              this.getAccountsByCompany(accountData.company_id).subscribe();
            }
          }
        }),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to create company account');
          return of({
            success: false,
            data: {} as CompanyAccount,
            message: error.message || 'Failed to create company account'
          });
        })
      );
  }

  /**
   * Update an existing company account
   */
  updateAccount(id: number, accountData: CompanyAccountUpdateRequest): Observable<CompanyAccountResponse> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams().set('id', id.toString());

    return this.http.put<CompanyAccountResponse>(`${this.apiUrl}/update-company-account.php`, accountData, { params })
      .pipe(
        tap(response => {
          this.loading.set(false);
          if (response.success) {
            // Update the local accounts list
            const currentAccounts = this.companyAccounts();
            const index = currentAccounts.findIndex(account => account.id === id);
            if (index !== -1) {
              const updatedAccounts = [...currentAccounts];
              updatedAccounts[index] = response.data;
              this.companyAccounts.set(updatedAccounts);
            }
          }
        }),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to update company account');
          return of({
            success: false,
            data: {} as CompanyAccount,
            message: error.message || 'Failed to update company account'
          });
        })
      );
  }

  /**
   * Delete a company account
   */
  deleteAccount(id: number): Observable<ApiResponse> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams().set('id', id.toString());

    return this.http.delete<ApiResponse>(`${this.apiUrl}/delete-company-account.php`, { params })
      .pipe(
        tap(response => {
          this.loading.set(false);
          if (response.success) {
            // Remove from local accounts list
            const currentAccounts = this.companyAccounts();
            const updatedAccounts = currentAccounts.filter(account => account.id !== id);
            this.companyAccounts.set(updatedAccounts);
          }
        }),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to delete company account');
          return of({
            success: false,
            message: error.message || 'Failed to delete company account'
          });
        })
      );
  }

  /**
   * Set account active status
   */
  setAccountActive(id: number, isActive: boolean): Observable<CompanyAccountResponse> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams().set('id', id.toString());
    const data = { is_active: isActive };

    return this.http.patch<CompanyAccountResponse>(`${this.apiUrl}/set-account-active.php`, data, { params })
      .pipe(
        tap(response => {
          this.loading.set(false);
          if (response.success) {
            // Update the local accounts list
            const currentAccounts = this.companyAccounts();
            const index = currentAccounts.findIndex(account => account.id === id);
            if (index !== -1) {
              const updatedAccounts = [...currentAccounts];
              updatedAccounts[index] = response.data;
              this.companyAccounts.set(updatedAccounts);
            }
          }
        }),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to update account status');
          return of({
            success: false,
            data: {} as CompanyAccount,
            message: error.message || 'Failed to update account status'
          });
        })
      );
  }

  /**
   * Get accounts summary statistics
   */
  getAccountsSummary(companyId?: number): Observable<CompanyAccountsSummaryResponse> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }

    return this.http.get<CompanyAccountsSummaryResponse>(`${this.apiUrl}/accounts-summary.php`, { params })
      .pipe(
        tap(() => this.loading.set(false)),
        catchError(error => {
          this.loading.set(false);
          this.error.set(error.message || 'Failed to fetch accounts summary');
          return of({
            success: false,
            data: {
              total_accounts: 0,
              active_accounts: 0,
              inactive_accounts: 0
            },
            message: error.message || 'Failed to fetch accounts summary'
          });
        })
      );
  }

  /**
   * Helper method to get active accounts for dropdown
   */
  getActiveAccountsForDropdown(companyId: number): Observable<CompanyAccount[]> {
    return this.getAccountsByCompany(companyId, true).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Validation helpers
   */
  isValidAccountName(name: string): boolean {
    return !!(name && name.trim().length > 0 && name.length <= 150);
  }

  isValidAccountNumber(number: string): boolean {
    return !number || number.length <= 50;
  }

  isValidCompanyId(companyId: number): boolean {
    return !!(companyId && companyId > 0);
  }

  /**
   * Format helpers
   */
  getAccountDisplayName(account: CompanyAccount): string {
    if (account.account_number) {
      return `${account.account_name} (${account.account_number})`;
    }
    return account.account_name;
  }

  getAccountStatusText(account: CompanyAccount): string {
    return account.is_active ? 'Active' : 'Inactive';
  }

  getAccountStatusClass(account: CompanyAccount): string {
    return account.is_active ? 'status-active' : 'status-inactive';
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Clear accounts state
   */
  clearAccounts(): void {
    this.companyAccounts.set([]);
  }

  /**
   * Refresh accounts for a specific company
   */
  refreshAccountsForCompany(companyId: number): void {
    this.getAccountsByCompany(companyId).subscribe();
  }
}
