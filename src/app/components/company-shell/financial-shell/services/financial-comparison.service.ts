import { Injectable } from '@angular/core';
import { ILineChart, IBarChart, IChartDataset } from '../../../../../models/Charts';
import { YearGroup } from '../models/revenue-capture.interface';

export interface FinancialYearComparison {
  yearId: number;
  yearName: string;
  monthlyTotals: number[];
  yearTotal: number;
  accounts: {
    accountName: string;
    monthlyData: number[];
    total: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class FinancialComparisonService {

  /**
   * Generate line chart data for comparing financial years monthly trends
   */
  generateYearlyComparisonLineChart(years: YearGroup[]): ILineChart {
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

    // Color palette for different years
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 1)' }, // Blue
      { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 1)' },   // Green
      { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 1)' },   // Red
      { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 1)' }, // Amber
      { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 1)' }, // Purple
      { bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 1)' }  // Teal
    ];

    const datasets: IChartDataset[] = years.map((year, index) => {
      // Calculate monthly totals for this year
      const monthlyTotals = this.calculateMonthlyTotals(year);
      const colorSet = colors[index % colors.length];

      return {
        label: `${year.name} (Total: R${this.formatNumber(year.accounts.reduce((sum, acc) => sum + acc.total, 0))})`,
        data: monthlyTotals,
        backgroundColor: colorSet.bg,
        borderColor: colorSet.border,
        borderWidth: 3,
        fill: false,
        tension: 0.4,
      };
    });

    return {
      labels: monthLabels,
      datasets: datasets
    };
  }

  /**
   * Generate bar chart data comparing yearly totals
   */
  generateYearlyTotalsBarChart(years: YearGroup[]): IBarChart {
    const labels = years.map(year => year.name);
    const data = years.map(year =>
      year.accounts.reduce((sum, acc) => sum + acc.total, 0)
    );

    // Generate gradient colors
    const colors = this.generateGradientColors(years.length);

    return {
      labels: labels,
      datasets: [{
        label: 'Total Annual Revenue',
        data: data,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 2
      }]
    };
  }

  /**
   * Generate account comparison across years
   */
  generateAccountComparisonChart(years: YearGroup[], accountName: string): ILineChart {
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

    const colors = [
      { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 1)' },
      { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 1)' },
      { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 1)' },
      { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 1)' },
      { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 1)' }
    ];

    const datasets: IChartDataset[] = years
      .map((year, index) => {
        const account = year.accounts.find(acc => acc.accountName === accountName);
        if (!account) return null;

        const monthlyData = [
          account.months['m3'] || 0, // Mar
          account.months['m4'] || 0, // Apr
          account.months['m5'] || 0, // May
          account.months['m6'] || 0, // Jun
          account.months['m7'] || 0, // Jul
          account.months['m8'] || 0, // Aug
          account.months['m9'] || 0, // Sep
          account.months['m10'] || 0, // Oct
          account.months['m11'] || 0, // Nov
          account.months['m12'] || 0, // Dec
          account.months['m1'] || 0, // Jan
          account.months['m2'] || 0  // Feb
        ];

        const colorSet = colors[index % colors.length];

        return {
          label: `${year.name} - ${accountName} (R${this.formatNumber(account.total)})`,
          data: monthlyData,
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
          borderWidth: 2,
          fill: false,
          tension: 0.3
        };
      })
      .filter(dataset => dataset !== null) as IChartDataset[];

    return {
      labels: monthLabels,
      datasets: datasets
    };
  }

  /**
   * Get comparison summary statistics
   */
  getComparisonSummary(years: YearGroup[]): {
    totalYears: number;
    totalRevenue: number;
    averageMonthlyRevenue: number;
    bestYear: { name: string; total: number } | null;
    growthRates: { yearName: string; growthRate: number }[];
  } {
    if (years.length === 0) {
      return {
        totalYears: 0,
        totalRevenue: 0,
        averageMonthlyRevenue: 0,
        bestYear: null,
        growthRates: []
      };
    }

    const yearTotals = years.map(year => ({
      name: year.name,
      total: year.accounts.reduce((sum, acc) => sum + acc.total, 0)
    }));

    const totalRevenue = yearTotals.reduce((sum, year) => sum + year.total, 0);
    const averageMonthlyRevenue = totalRevenue / (years.length * 12);
    const bestYear = yearTotals.reduce((best, current) =>
      current.total > best.total ? current : best
    );

    // Calculate year-over-year growth rates
    const sortedYears = [...yearTotals].sort((a, b) => a.name.localeCompare(b.name));
    const growthRates = sortedYears.map((year, index) => {
      if (index === 0) {
        return { yearName: year.name, growthRate: 0 };
      }
      const previousYear = sortedYears[index - 1];
      const growthRate = previousYear.total > 0
        ? ((year.total - previousYear.total) / previousYear.total) * 100
        : 0;
      return { yearName: year.name, growthRate };
    });

    return {
      totalYears: years.length,
      totalRevenue,
      averageMonthlyRevenue,
      bestYear,
      growthRates
    };
  }

  /**
   * Calculate monthly totals for a year (sum across all accounts)
   */
  private calculateMonthlyTotals(year: YearGroup): number[] {
    // Financial year months: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb
    const months = ['m3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm1', 'm2'];

    return months.map(month => {
      return year.accounts.reduce((sum, account) => {
        return sum + (account.months[month] || 0);
      }, 0);
    });
  }

  /**
   * Generate gradient colors for charts
   */
  private generateGradientColors(count: number): { bg: string[]; border: string[] } {
    const baseColors = [
      'rgba(59, 130, 246', // Blue
      'rgba(34, 197, 94',  // Green
      'rgba(239, 68, 68',  // Red
      'rgba(245, 158, 11', // Amber
      'rgba(168, 85, 247', // Purple
      'rgba(20, 184, 166'  // Teal
    ];

    const bg = [];
    const border = [];

    for (let i = 0; i < count; i++) {
      const baseColor = baseColors[i % baseColors.length];
      bg.push(`${baseColor}, 0.6)`);
      border.push(`${baseColor}, 1)`);
    }

    return { bg, border };
  }

  /**
   * Format numbers for display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toFixed(0);
    }
  }

  /**
   * Get all unique account names across years
   */
  getUniqueAccountNames(years: YearGroup[]): string[] {
    const accountNames = new Set<string>();
    years.forEach(year => {
      year.accounts.forEach(account => {
        accountNames.add(account.accountName);
      });
    });
    return Array.from(accountNames).sort();
  }
}
