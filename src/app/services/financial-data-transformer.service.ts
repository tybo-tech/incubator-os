import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { CompanyFinancialYearlyStats, CompanyFinancialYearlyStatsService } from '../../services/company-financial-yearly-stats.service';
import { CompanyAccount } from './company-account.interface';
import { CompanyAccountService } from './company-account.service';
import { FinancialYear, FinancialYearService } from '../../services/financial-year.service';

/**
 * Year group data structure for the revenue capture component
 */
export interface YearGroupData {
  year: FinancialYear;
  accounts: CompanyAccount[];
  monthlyData: Map<number, CompanyFinancialYearlyStats>; // account_id -> stats
  usedAccountIds: Set<number>; // Track which accounts are already used
}

/**
 * Monthly data for input fields
 */
export interface MonthlyInputData {
  accountId: number | null;
  months: number[]; // 12 months of data
  total: number;
  statsId?: number; // For updating existing records
}

/**
 * 🔄 Financial Data Transformer Service
 * Transforms database records from company_financial_yearly_stats
 * into the format needed by the revenue capture components
 */
@Injectable({
  providedIn: 'root'
})
export class FinancialDataTransformerService {

  constructor(
    private yearlyStatsService: CompanyFinancialYearlyStatsService,
    private accountService: CompanyAccountService,
    private financialYearService: FinancialYearService
  ) {}

  /**
   * Get financial data for a specific company and year
   */
  getYearData(companyId: number, financialYearId: number): Observable<YearGroupData | null> {
    return combineLatest([
      this.financialYearService.getFinancialYearById(financialYearId),
      this.accountService.getAccountsByCompany(companyId, false), // Get all accounts
      this.yearlyStatsService.getByCompanyAndYear(companyId, financialYearId)
    ]).pipe(
      map(([year, accountsResponse, yearStats]) => {
        if (!year || !accountsResponse.success) return null;

        const accounts = accountsResponse.data;

        // Create a map of account_id -> stats
        const monthlyData = new Map<number, CompanyFinancialYearlyStats>();
        const usedAccountIds = new Set<number>();

        yearStats.forEach((stat: CompanyFinancialYearlyStats) => {
          if (stat.account_id) {
            monthlyData.set(stat.account_id, stat);
            usedAccountIds.add(stat.account_id);
          } else {
            // Handle company-wide stats (account_id is null)
            monthlyData.set(0, stat); // Use 0 for company-wide
          }
        });

        return {
          year,
          accounts,
          monthlyData,
          usedAccountIds
        };
      })
    );
  }

  /**
   * Get all year groups for a company
   */
  getAllYearGroups(companyId: number): Observable<YearGroupData[]> {
    return this.financialYearService.getActiveFinancialYears().pipe(
      map((years: FinancialYear[]) => {
        // For now, return empty array. We'll load individual years on demand
        return [];
      })
    );
  }

  /**
   * Get available accounts for a specific year (excluding already used ones)
   */
  getAvailableAccountsForYear(companyId: number, financialYearId: number): Observable<CompanyAccount[]> {
    return combineLatest([
      this.accountService.getAccountsByCompany(companyId, true), // Only active accounts
      this.yearlyStatsService.getByCompanyAndYear(companyId, financialYearId)
    ]).pipe(
      map(([accountsResponse, yearStats]) => {
        if (!accountsResponse.success) return [];

        const usedAccountIds = new Set(
          yearStats
            .filter((stat: CompanyFinancialYearlyStats) => stat.account_id !== null)
            .map((stat: CompanyFinancialYearlyStats) => stat.account_id!)
        );

        return accountsResponse.data.filter((account: CompanyAccount) =>
          !usedAccountIds.has(account.id)
        );
      })
    );
  }

  /**
   * Convert CompanyFinancialYearlyStats to monthly input data
   */
  statsToMonthlyInput(stats: CompanyFinancialYearlyStats): MonthlyInputData {
    return {
      accountId: stats.account_id || null,
      months: [
        stats.m1, stats.m2, stats.m3, stats.m4,
        stats.m5, stats.m6, stats.m7, stats.m8,
        stats.m9, stats.m10, stats.m11, stats.m12
      ],
      total: stats.total_amount,
      statsId: stats.id
    };
  }

  /**
   * Convert monthly input data to CompanyFinancialYearlyStats format
   */
  monthlyInputToStats(
    input: MonthlyInputData,
    companyId: number,
    financialYearId: number
  ): Partial<CompanyFinancialYearlyStats> {
    const data: Partial<CompanyFinancialYearlyStats> = {
      company_id: companyId,
      financial_year_id: financialYearId,
      account_id: input.accountId,
      m1: input.months[0] || 0,
      m2: input.months[1] || 0,
      m3: input.months[2] || 0,
      m4: input.months[3] || 0,
      m5: input.months[4] || 0,
      m6: input.months[5] || 0,
      m7: input.months[6] || 0,
      m8: input.months[7] || 0,
      m9: input.months[8] || 0,
      m10: input.months[9] || 0,
      m11: input.months[10] || 0,
      m12: input.months[11] || 0
    };

    // Include ID if updating existing record
    if (input.statsId) {
      data.id = input.statsId;
    }

    return data;
  }

  /**
   * Save monthly data (create or update)
   */
  saveMonthlyData(
    input: MonthlyInputData,
    companyId: number,
    financialYearId: number
  ): Observable<CompanyFinancialYearlyStats> {
    const statsData = this.monthlyInputToStats(input, companyId, financialYearId);

    if (input.statsId) {
      // Update existing record
      return this.yearlyStatsService.updateYearlyStats(input.statsId, statsData);
    } else {
      // Create new record using upsert to handle duplicates
      return this.yearlyStatsService.upsertYearlyStats(statsData);
    }
  }

  /**
   * Validate that account is not already used in the year
   */
  validateAccountNotUsed(
    companyId: number,
    financialYearId: number,
    accountId: number,
    excludeStatsId?: number
  ): Observable<boolean> {
    return this.yearlyStatsService.getByCompanyAndYear(companyId, financialYearId).pipe(
      map((stats: CompanyFinancialYearlyStats[]) => {
        const conflictingStats = stats.filter((stat: CompanyFinancialYearlyStats) =>
          stat.account_id === accountId &&
          (!excludeStatsId || stat.id !== excludeStatsId)
        );
        return conflictingStats.length === 0;
      })
    );
  }

  /**
   * Get summary data for a year
   */
  getYearSummary(companyId: number, financialYearId: number): Observable<{
    totalRevenue: number;
    accountCount: number;
    monthlyTotals: number[];
    quarterlyTotals: number[];
  }> {
    return this.yearlyStatsService.getByCompanyAndYear(companyId, financialYearId).pipe(
      map((stats: CompanyFinancialYearlyStats[]) => {
        const monthlyTotals = Array(12).fill(0);
        let totalRevenue = 0;

        stats.forEach((stat: CompanyFinancialYearlyStats) => {
          totalRevenue += stat.total_amount;
          for (let i = 0; i < 12; i++) {
            const monthKey = `m${i + 1}` as keyof CompanyFinancialYearlyStats;
            monthlyTotals[i] += (stat[monthKey] as number) || 0;
          }
        });

        const quarterlyTotals = [
          monthlyTotals[0] + monthlyTotals[1] + monthlyTotals[2], // Q1
          monthlyTotals[3] + monthlyTotals[4] + monthlyTotals[5], // Q2
          monthlyTotals[6] + monthlyTotals[7] + monthlyTotals[8], // Q3
          monthlyTotals[9] + monthlyTotals[10] + monthlyTotals[11] // Q4
        ];

        return {
          totalRevenue,
          accountCount: stats.length,
          monthlyTotals,
          quarterlyTotals
        };
      })
    );
  }

  /**
   * Delete yearly stats record
   */
  deleteYearlyStats(statsId: number): Observable<{ success: boolean; message: string }> {
    return this.yearlyStatsService.deleteYearlyStats(statsId);
  }

  /**
   * Get month names for display
   */
  getMonthNames(): string[] {
    return this.yearlyStatsService.getMonthNames();
  }

  /**
   * Get month abbreviations for compact display
   */
  getMonthAbbreviations(): string[] {
    return this.yearlyStatsService.getMonthAbbreviations();
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number): string {
    return this.yearlyStatsService.formatCurrency(value);
  }

  /**
   * Calculate percentage change between periods
   */
  calculatePercentageChange(current: number, previous: number): number {
    return this.yearlyStatsService.calculateGrowthRate(current, previous);
  }
}
