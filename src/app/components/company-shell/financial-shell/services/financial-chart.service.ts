import { Injectable } from '@angular/core';
import { IPieChart } from '../../../../../models/Charts';
import { CompanyFinancialItem } from '../../../../../models/financial.models';

export interface ChartDataConfig {
  items: CompanyFinancialItem[];
  baseColor: 'green' | 'red' | 'blue';
  emptyStateLabel?: string;
  itemNameFallback?: string;
}

/**
 * 🎨 Financial Chart Service
 *
 * Centralized service for generating chart data and color palettes for financial components.
 * Eliminates duplicate chart logic across Balance Sheet, Cost Structure, and other financial views.
 *
 * Features:
 * - Dynamic color palette generation
 * - Standardized empty state handling
 * - Consistent chart data formatting
 * - Reusable across all financial components
 */
@Injectable({
  providedIn: 'root'
})
export class FinancialChartService {

  /**
   * 🎯 Generate pie chart data from financial items
   * @param config Chart configuration object
   * @returns IPieChart formatted data
   */
  generatePieChartData(config: ChartDataConfig): IPieChart {
    const { items, baseColor, emptyStateLabel = 'No data available', itemNameFallback = 'Unnamed Item' } = config;

    console.log(`🔍 FinancialChartService - Generating ${baseColor} chart with ${items.length} items`);

    // Handle empty state
    if (items.length === 0) {
      console.log('📊 Returning empty state for chart');
      return {
        labels: [emptyStateLabel],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(156, 163, 175, 0.8)'], // gray-400
          borderColor: ['rgba(156, 163, 175, 1)'],
          borderWidth: 2
        }]
      };
    }

    // Generate chart data from actual items
    const chartData = {
      labels: items.map(item => {
        const label = item.category_name || item.name || itemNameFallback;
        console.log(`📊 Chart label for item:`, {
          name: item.name,
          category_name: item.category_name,
          finalLabel: label
        });
        return label;
      }),
      datasets: [{
        data: items.map(item => item.amount || 0),
        backgroundColor: this.generateColors(items.length, baseColor),
        borderColor: this.generateColors(items.length, baseColor, true),
        borderWidth: 2
      }]
    };

    console.log('📊 Generated chart data:', {
      labels: chartData.labels,
      data: chartData.datasets[0].data,
      color: baseColor
    });

    return chartData;
  }

  /**
   * 🎨 Generate dynamic color palettes for charts
   * @param count Number of colors needed
   * @param baseColor Base color scheme (green/red/blue)
   * @param isBorder Whether generating border colors (full opacity)
   * @returns Array of color strings
   */
  generateColors(count: number, baseColor: 'green' | 'red' | 'blue', isBorder = false): string[] {
    const opacity = isBorder ? '1' : '0.8';

    const colorPalettes = {
      green: [
        `rgba(34, 197, 94, ${opacity})`,   // emerald-500
        `rgba(74, 222, 128, ${opacity})`,  // emerald-400
        `rgba(134, 239, 172, ${opacity})`, // emerald-300
        `rgba(187, 247, 208, ${opacity})`, // emerald-200
        `rgba(21, 128, 61, ${opacity})`,   // emerald-700
        `rgba(5, 150, 105, ${opacity})`,   // emerald-600
        `rgba(16, 185, 129, ${opacity})`,  // emerald-500 variant
      ],
      red: [
        `rgba(239, 68, 68, ${opacity})`,   // red-500
        `rgba(248, 113, 113, ${opacity})`, // red-400
        `rgba(252, 165, 165, ${opacity})`, // red-300
        `rgba(254, 202, 202, ${opacity})`, // red-200
        `rgba(185, 28, 28, ${opacity})`,   // red-700
        `rgba(220, 38, 38, ${opacity})`,   // red-600
        `rgba(239, 68, 68, ${opacity})`,   // red-500 variant
      ],
      blue: [
        `rgba(59, 130, 246, ${opacity})`,  // blue-500
        `rgba(96, 165, 250, ${opacity})`,  // blue-400
        `rgba(147, 197, 253, ${opacity})`, // blue-300
        `rgba(191, 219, 254, ${opacity})`, // blue-200
        `rgba(29, 78, 216, ${opacity})`,   // blue-700
        `rgba(37, 99, 235, ${opacity})`,   // blue-600
        `rgba(59, 130, 246, ${opacity})`,  // blue-500 variant
      ]
    };

    const palette = colorPalettes[baseColor];
    const colors: string[] = [];

    for (let i = 0; i < count; i++) {
      colors.push(palette[i % palette.length]);
    }

    return colors;
  }

  /**
   * 🎯 Quick helper for asset charts (green theme)
   */
  generateAssetChartData(items: CompanyFinancialItem[]): IPieChart {
    return this.generatePieChartData({
      items,
      baseColor: 'green',
      emptyStateLabel: 'No assets yet'
    });
  }

  /**
   * 🎯 Quick helper for liability charts (red theme)
   */
  generateLiabilityChartData(items: CompanyFinancialItem[]): IPieChart {
    return this.generatePieChartData({
      items,
      baseColor: 'red',
      emptyStateLabel: 'No liabilities yet'
    });
  }

  /**
   * 🎯 Quick helper for direct cost charts (red theme)
   */
  generateDirectCostChartData(items: CompanyFinancialItem[]): IPieChart {
    return this.generatePieChartData({
      items,
      baseColor: 'red',
      emptyStateLabel: 'No direct costs yet'
    });
  }

  /**
   * 🎯 Quick helper for operational cost charts (blue theme)
   */
  generateOperationalCostChartData(items: CompanyFinancialItem[]): IPieChart {
    return this.generatePieChartData({
      items,
      baseColor: 'blue',
      emptyStateLabel: 'No operational costs yet'
    });
  }

  /**
   * 🎯 Quick helper for revenue charts (green theme)
   */
  generateRevenueChartData(items: CompanyFinancialItem[]): IPieChart {
    return this.generatePieChartData({
      items,
      baseColor: 'green',
      emptyStateLabel: 'No revenue yet'
    });
  }
}
