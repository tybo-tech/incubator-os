import { Injectable } from '@angular/core';
import { CompanyFinancialItem } from '../models/financial.models';

export interface FinancialCalculations {
  totalRevenue: number;
  totalDirectCosts: number;
  totalOperationalCosts: number;
  grossProfit: number;
  operatingProfit: number;
  grossMargin: number;
  operatingMargin: number;
  netAssets: number;
  workingCapitalRatio: number;
}

export interface FinancialSummaryItem {
  label: string;
  value: number;
  currency: string;
  isPercentage?: boolean;
  isPositive?: boolean;
}

/**
 * 🧮 Financial Calculation Service
 *
 * Centralized service for all financial calculations and business logic.
 * Implements the same calculation patterns used in financial check-ins
 * and provides reusable methods for all financial components.
 *
 * This follows the enterprise architecture pattern of centralizing
 * business logic in services rather than duplicating it across components.
 */
@Injectable({
  providedIn: 'root'
})
export class FinancialCalculationService {

  /**
   * Calculate comprehensive financial metrics from financial items
   */
  calculateFinancialMetrics(
    directCosts: CompanyFinancialItem[],
    operationalCosts: CompanyFinancialItem[],
    revenues: CompanyFinancialItem[] = [],
    assets: CompanyFinancialItem[] = [],
    liabilities: CompanyFinancialItem[] = []
  ): FinancialCalculations {

    const totalRevenue = this.sumItems(revenues);
    const totalDirectCosts = this.sumItems(directCosts);
    const totalOperationalCosts = this.sumItems(operationalCosts);
    const totalAssets = this.sumItems(assets);
    const totalLiabilities = this.sumItems(liabilities);

    // Core profit calculations (matching financial check-in logic)
    const grossProfit = totalRevenue - totalDirectCosts;
    const operatingProfit = grossProfit - totalOperationalCosts;

    // Margin calculations
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

    // Balance sheet calculations
    const netAssets = totalAssets - totalLiabilities;
    const workingCapitalRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;

    return {
      totalRevenue,
      totalDirectCosts,
      totalOperationalCosts,
      grossProfit,
      operatingProfit,
      grossMargin,
      operatingMargin,
      netAssets,
      workingCapitalRatio
    };
  }

  /**
   * Generate financial summary items for display components
   */
  generateFinancialSummary(
    calculations: FinancialCalculations,
    currency: string = 'USD'
  ): FinancialSummaryItem[] {
    return [
      {
        label: `Total Revenue ${currency}`,
        value: calculations.totalRevenue,
        currency: '$',
        isPositive: calculations.totalRevenue > 0
      },
      {
        label: `Gross Profit ${currency}`,
        value: calculations.grossProfit,
        currency: '$',
        isPositive: calculations.grossProfit > 0
      },
      {
        label: 'Gross Margin',
        value: calculations.grossMargin,
        currency: '%',
        isPercentage: true,
        isPositive: calculations.grossMargin > 0
      },
      {
        label: `Operating Profit ${currency}`,
        value: calculations.operatingProfit,
        currency: '$',
        isPositive: calculations.operatingProfit > 0
      },
      {
        label: 'Operating Margin',
        value: calculations.operatingMargin,
        currency: '%',
        isPercentage: true,
        isPositive: calculations.operatingMargin > 0
      }
    ];
  }

  /**
   * Generate cost structure summary for direct costs
   */
  generateDirectCostSummary(
    calculations: FinancialCalculations,
    currency: string = 'USD'
  ): FinancialSummaryItem[] {
    return [
      {
        label: `Revenue ${currency}`,
        value: calculations.totalRevenue,
        currency: '$'
      },
      {
        label: `Direct Costs ${currency}`,
        value: calculations.totalDirectCosts,
        currency: '$'
      },
      {
        label: `Gross Profit ${currency}`,
        value: calculations.grossProfit,
        currency: '$',
        isPositive: calculations.grossProfit > 0
      },
      {
        label: 'Gross Margin %',
        value: calculations.grossMargin,
        currency: '%',
        isPercentage: true,
        isPositive: calculations.grossMargin > 0
      }
    ];
  }

  /**
   * Generate operational cost summary
   */
  generateOperationalCostSummary(
    calculations: FinancialCalculations,
    currency: string = 'USD'
  ): FinancialSummaryItem[] {
    return [
      {
        label: `Gross Profit ${currency}`,
        value: calculations.grossProfit,
        currency: '$'
      },
      {
        label: `Operational Costs ${currency}`,
        value: calculations.totalOperationalCosts,
        currency: '$'
      },
      {
        label: `Operating Profit ${currency}`,
        value: calculations.operatingProfit,
        currency: '$',
        isPositive: calculations.operatingProfit > 0
      },
      {
        label: 'Operating Margin %',
        value: calculations.operatingMargin,
        currency: '%',
        isPercentage: true,
        isPositive: calculations.operatingMargin > 0
      }
    ];
  }

  /**
   * Helper method to sum financial items safely
   */
  private sumItems(items: CompanyFinancialItem[]): number {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }

  /**
   * Format currency values for display
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Format percentage values for display
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Calculate year-over-year growth
   */
  calculateGrowthRate(currentValue: number, previousValue: number): number {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Determine financial health status based on key metrics
   */
  getFinancialHealthStatus(calculations: FinancialCalculations): {
    status: 'excellent' | 'good' | 'warning' | 'critical';
    message: string;
    color: string;
  } {
    const { grossMargin, operatingMargin, operatingProfit } = calculations;

    if (operatingProfit > 0 && grossMargin > 30 && operatingMargin > 15) {
      return {
        status: 'excellent',
        message: 'Strong financial performance',
        color: 'text-green-600'
      };
    } else if (operatingProfit > 0 && grossMargin > 20) {
      return {
        status: 'good',
        message: 'Healthy financial metrics',
        color: 'text-green-500'
      };
    } else if (grossMargin > 10) {
      return {
        status: 'warning',
        message: 'Improvement opportunities available',
        color: 'text-yellow-600'
      };
    } else {
      return {
        status: 'critical',
        message: 'Financial performance needs attention',
        color: 'text-red-600'
      };
    }
  }
}
