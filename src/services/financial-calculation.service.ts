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

/**
 * 🎯 Clean computed interface for components
 * Components get all calculations in one reactive object
 */
export interface FinancialMetrics extends FinancialCalculations {
  // Formatted display values
  formattedRevenue: string;
  formattedGrossProfit: string;
  formattedOperatingProfit: string;
  formattedGrossMargin: string;
  formattedOperatingMargin: string;

  // Advanced ratios
  debtToEquityRatio: number;
  expenseRatio: number;
  currentRatio: number;
  quickRatio: number;
  returnOnAssets: number;
  formattedDebtToEquity: string;
  formattedExpenseRatio: string;
  formattedCurrentRatio: string;

  // Health indicators
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  healthMessage: string;
  healthColor: string;
}

export interface FinancialSummaryItem {
  label: string;
  value: number;
  currency: string;
  isPercentage?: boolean;
  isPositive?: boolean;
}

/**
 * 📈 Trend Analytics Interface
 * Year-over-year comparison and growth analysis
 */
export interface FinancialTrendAnalysis {
  revenueGrowth: number;
  profitGrowth: number;
  marginChange: number;
  costGrowth: number;
  efficiencyTrend: 'improving' | 'declining' | 'stable';
  formattedRevenueGrowth: string;
  formattedProfitGrowth: string;
  formattedMarginChange: string;
}

/**
 * 🎯 Financial Performance Benchmarks
 * Industry comparison and performance indicators
 */
export interface FinancialBenchmarks {
  profitMarginBenchmark: number;
  revenueGrowthBenchmark: number;
  industryAverageRatios: {
    currentRatio: number;
    debtToEquity: number;
    returnOnAssets: number;
  };
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
   * 🎯 Enhanced method that returns everything components need
   * Clean interface with calculations + formatting + health status
   */
  calculateFinancialMetrics(
    directCosts: CompanyFinancialItem[],
    operationalCosts: CompanyFinancialItem[],
    revenues: CompanyFinancialItem[] = [],
    assets: CompanyFinancialItem[] = [],
    liabilities: CompanyFinancialItem[] = [],
    currency: string = 'USD'
  ): FinancialMetrics {

    // Get base calculations
    const calculations = this.calculateBaseFinancialMetrics(
      directCosts, operationalCosts, revenues, assets, liabilities
    );

    // Calculate advanced ratios
    const advancedRatios = this.calculateAdvancedRatios(calculations, assets, liabilities);

    // Get health status
    const health = this.getFinancialHealthStatus(calculations);

    // Return enhanced metrics with formatting and health
    return {
      ...calculations,
      ...advancedRatios,
      formattedRevenue: this.formatCurrency(calculations.totalRevenue, currency),
      formattedGrossProfit: this.formatCurrency(calculations.grossProfit, currency),
      formattedOperatingProfit: this.formatCurrency(calculations.operatingProfit, currency),
      formattedGrossMargin: this.formatPercentage(calculations.grossMargin),
      formattedOperatingMargin: this.formatPercentage(calculations.operatingMargin),
      formattedDebtToEquity: advancedRatios.debtToEquityRatio.toFixed(2),
      formattedExpenseRatio: this.formatPercentage(advancedRatios.expenseRatio),
      formattedCurrentRatio: advancedRatios.currentRatio.toFixed(2),
      healthStatus: health.status,
      healthMessage: health.message,
      healthColor: health.color
    };
  }

  /**
   * Base calculation method (renamed for clarity)
   */
  private calculateBaseFinancialMetrics(
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

  /**
   * 📊 Calculate advanced financial ratios
   * Essential for enterprise financial analysis
   */
  private calculateAdvancedRatios(
    calculations: FinancialCalculations,
    assets: CompanyFinancialItem[],
    liabilities: CompanyFinancialItem[]
  ): {
    debtToEquityRatio: number;
    expenseRatio: number;
    currentRatio: number;
    quickRatio: number;
    returnOnAssets: number;
  } {
    const totalAssets = this.sumItems(assets);
    const totalLiabilities = this.sumItems(liabilities);
    const equity = totalAssets - totalLiabilities;

    // Debt-to-Equity Ratio: Total Debt / Total Equity
    const debtToEquityRatio = equity > 0 ? totalLiabilities / equity : 0;

    // Expense Ratio: Total Expenses / Total Revenue
    const totalExpenses = calculations.totalDirectCosts + calculations.totalOperationalCosts;
    const expenseRatio = calculations.totalRevenue > 0 ? (totalExpenses / calculations.totalRevenue) * 100 : 0;

    // Current Ratio: Current Assets / Current Liabilities (simplified as total assets/liabilities)
    const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;

    // Quick Ratio: (Current Assets - Inventory) / Current Liabilities (simplified)
    const quickRatio = currentRatio * 0.8; // Estimate assuming 20% inventory

    // Return on Assets: Operating Profit / Total Assets
    const returnOnAssets = totalAssets > 0 ? (calculations.operatingProfit / totalAssets) * 100 : 0;

    return {
      debtToEquityRatio,
      expenseRatio,
      currentRatio,
      quickRatio,
      returnOnAssets
    };
  }

  /**
   * 📈 Calculate Year-over-Year Growth Analysis
   * Essential for trend analysis and performance tracking
   */
  calculateYearOverYearGrowth(
    current: FinancialMetrics, 
    previous: FinancialMetrics
  ): FinancialTrendAnalysis {
    const revenueGrowth = this.calculateGrowthRate(current.totalRevenue, previous.totalRevenue);
    const profitGrowth = this.calculateGrowthRate(current.operatingProfit, previous.operatingProfit);
    const marginChange = current.operatingMargin - previous.operatingMargin;
    const costGrowth = this.calculateGrowthRate(
      current.totalDirectCosts + current.totalOperationalCosts,
      previous.totalDirectCosts + previous.totalOperationalCosts
    );

    // Determine efficiency trend
    let efficiencyTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (marginChange > 2) {
      efficiencyTrend = 'improving';
    } else if (marginChange < -2) {
      efficiencyTrend = 'declining';
    }

    return {
      revenueGrowth,
      profitGrowth,
      marginChange,
      costGrowth,
      efficiencyTrend,
      formattedRevenueGrowth: this.formatPercentage(revenueGrowth),
      formattedProfitGrowth: this.formatPercentage(profitGrowth),
      formattedMarginChange: this.formatPercentage(marginChange)
    };
  }

  /**
   * 🎯 Calculate Financial Performance Benchmarks
   * Compare against industry standards
   */
  calculateBenchmarks(metrics: FinancialMetrics): FinancialBenchmarks {
    // Industry average benchmarks (configurable)
    return {
      profitMarginBenchmark: 15, // 15% operating margin benchmark
      revenueGrowthBenchmark: 10, // 10% annual growth benchmark
      industryAverageRatios: {
        currentRatio: 1.5, // Healthy liquidity ratio
        debtToEquity: 0.5, // Conservative debt level
        returnOnAssets: 8   // 8% ROA benchmark
      }
    };
  }

  /**
   * 📊 Calculate Multi-Period Trend Analysis
   * Analyze trends across multiple periods
   */
  calculateMultiPeriodTrends(
    periods: FinancialMetrics[]
  ): {
    trend: 'upward' | 'downward' | 'volatile' | 'stable';
    averageGrowthRate: number;
    volatilityScore: number;
    bestPeriod: FinancialMetrics;
    worstPeriod: FinancialMetrics;
  } {
    if (periods.length < 2) {
      return {
        trend: 'stable',
        averageGrowthRate: 0,
        volatilityScore: 0,
        bestPeriod: periods[0],
        worstPeriod: periods[0]
      };
    }

    // Calculate period-over-period growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < periods.length; i++) {
      const growth = this.calculateGrowthRate(periods[i].totalRevenue, periods[i-1].totalRevenue);
      growthRates.push(growth);
    }

    const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    
    // Calculate volatility (standard deviation of growth rates)
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - averageGrowthRate, 2), 0) / growthRates.length;
    const volatilityScore = Math.sqrt(variance);

    // Determine trend
    let trend: 'upward' | 'downward' | 'volatile' | 'stable' = 'stable';
    if (volatilityScore > 15) {
      trend = 'volatile';
    } else if (averageGrowthRate > 5) {
      trend = 'upward';
    } else if (averageGrowthRate < -5) {
      trend = 'downward';
    }

    // Find best and worst periods
    const bestPeriod = periods.reduce((best, current) => 
      current.operatingProfit > best.operatingProfit ? current : best
    );
    const worstPeriod = periods.reduce((worst, current) => 
      current.operatingProfit < worst.operatingProfit ? current : worst
    );

    return {
      trend,
      averageGrowthRate,
      volatilityScore,
      bestPeriod,
      worstPeriod
    };
  }
}
