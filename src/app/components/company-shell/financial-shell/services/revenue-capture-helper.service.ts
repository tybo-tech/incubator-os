import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { YearGroup, AccountRecord } from '../models/revenue-capture.interface';
import { FinancialYear } from '../../../../../services/financial-year.service';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { CompanyFinancialYearlyStats, CompanyFinancialYearlyStatsService } from '../../../../../services/company-financial-yearly-stats.service';
import { FinancialDataTransformerService, MonthlyInputData } from '../../../../services/financial-data-transformer.service';

/**
 * Helper service for revenue capture operations
 * Extracts business logic from the component for better testability and reusability
 */
@Injectable({
  providedIn: 'root'
})
export class RevenueCaptureHelperService {
  private static readonly DEFAULT_START_MONTH = 3; // March
  private static readonly DEFAULT_END_MONTH = 2; // February

  constructor(
    private transformerService: FinancialDataTransformerService,
    private yearlyStatsService: CompanyFinancialYearlyStatsService
  ) {}

  /**
   * Transform database yearly stats into YearGroup format for UI
   */
  transformToYearGroups(
    financialYears: FinancialYear[],
    accounts: CompanyAccount[],
    yearlyStats: CompanyFinancialYearlyStats[]
  ): YearGroup[] {
    // Get unique financial year IDs that have data
    const yearIdsWithData = [...new Set(yearlyStats.map(stat => stat.financial_year_id))];

    // Only create year groups for financial years that have actual data
    return financialYears
      .filter(year => yearIdsWithData.includes(year.id))
      .map(year => this.createYearGroup(year, accounts, yearlyStats));
  }

  /**
   * Create a single YearGroup from financial year and stats
   */
  private createYearGroup(
    year: FinancialYear,
    accounts: CompanyAccount[],
    yearlyStats: CompanyFinancialYearlyStats[]
  ): YearGroup {
    const yearStats = yearlyStats.filter(stat => stat.financial_year_id === year.id);
    const accountRecords = this.createAccountRecords(yearStats, accounts);

    return {
      id: year.id,
      name: year.name,
      startMonth: RevenueCaptureHelperService.DEFAULT_START_MONTH,
      endMonth: RevenueCaptureHelperService.DEFAULT_END_MONTH,
      expanded: year.is_active,
      isActive: year.is_active,
      accounts: accountRecords
    };
  }

  /**
   * Create AccountRecord array from yearly stats
   * Note: Backend returns records sorted by created_at ASC (oldest first)
   * This ensures natural data entry flow like Excel (top to bottom)
   */
  private createAccountRecords(
    yearStats: CompanyFinancialYearlyStats[],
    accounts: CompanyAccount[]
  ): AccountRecord[] {
    const records: AccountRecord[] = [];

    // Process stats in the order received from backend (oldest first)
    for (const stat of yearStats) {
      const account = accounts.find(acc => acc.id === stat.account_id);

      // If no account found and account_id is not null, log warning and skip
      if (!account && stat.account_id !== null) {
        console.warn('Account not found for stats:', stat);
        continue;
      }

      records.push({
        id: stat.id,
        accountId: stat.account_id ?? null,
        accountName: account ? account.account_name : '', // Empty string if no account
        months: {
          m1: stat.m1 || 0,
          m2: stat.m2 || 0,
          m3: stat.m3 || 0,
          m4: stat.m4 || 0,
          m5: stat.m5 || 0,
          m6: stat.m6 || 0,
          m7: stat.m7 || 0,
          m8: stat.m8 || 0,
          m9: stat.m9 || 0,
          m10: stat.m10 || 0,
          m11: stat.m11 || 0,
          m12: stat.m12 || 0,
        },
        total: stat.total_amount,
      });
    }

    return records;
  }

  /**
   * Create an empty YearGroup for a new financial year
   */
  createEmptyYearGroup(year: FinancialYear): YearGroup {
    return {
      id: year.id,
      name: year.name,
      startMonth: RevenueCaptureHelperService.DEFAULT_START_MONTH,
      endMonth: RevenueCaptureHelperService.DEFAULT_END_MONTH,
      expanded: true,
      isActive: year.is_active,
      accounts: []
    };
  }

  /**
   * Calculate total revenue for a year group
   */
  calculateYearTotal(year: YearGroup): number {
    return year.accounts.reduce((total, account) => total + (account.total || 0), 0);
  }

  /**
   * Convert AccountRecord to MonthlyInputData format for saving
   */
  accountRecordToMonthlyInput(account: AccountRecord): MonthlyInputData {
    return {
      accountId: account.accountId,
      months: [
        account.months['m1'] || 0,
        account.months['m2'] || 0,
        account.months['m3'] || 0,
        account.months['m4'] || 0,
        account.months['m5'] || 0,
        account.months['m6'] || 0,
        account.months['m7'] || 0,
        account.months['m8'] || 0,
        account.months['m9'] || 0,
        account.months['m10'] || 0,
        account.months['m11'] || 0,
        account.months['m12'] || 0,
      ],
      total: account.total,
      statsId: account.id > 0 ? account.id : undefined,
    };
  }

  /**
   * Save account data to database
   */
  saveAccountData(
    account: AccountRecord,
    yearId: number,
    companyId: number,
    action: 'insert' | 'update' = 'update'
  ): Observable<CompanyFinancialYearlyStats> {
    const monthlyData = this.accountRecordToMonthlyInput(account);

    if (action === 'insert') {
      // Remove statsId for insert operations
      const insertData = { ...monthlyData };
      delete insertData.statsId;
      return this.transformerService.saveMonthlyData(insertData, companyId, yearId);
    } else {
      return this.transformerService.saveMonthlyData(monthlyData, companyId, yearId);
    }
  }

  /**
   * Create an empty account record in the database
   * This is used when adding new accounts to prevent data loss
   */
  createEmptyRecord(companyId: number, financialYearId: number): Observable<CompanyFinancialYearlyStats> {
    const emptyData = {
      company_id: companyId,
      financial_year_id: financialYearId,
      account_id: null,
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
      m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
      total_amount: 0
    };

    // Use addYearlyStats to ensure a new record is created
    return this.yearlyStatsService.addYearlyStats(emptyData);
  }

  /**
   * Delete account record from database
   */
  deleteAccountData(account: AccountRecord): Observable<{ success: boolean; message: string }> {
    // Use the account.id which is the yearly_stats.id from the database
    return this.yearlyStatsService.deleteYearlyStats(account.id);
  }
}
