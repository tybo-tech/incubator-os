import { IPieChart } from '../../../models/Charts';

// Example usage for financial data
export function createFinancialPieChart(directCosts: number, operationalCosts: number, assets: number): IPieChart {
  return {
    labels: ['Direct Costs', 'Operational Costs', 'Assets'],
    datasets: [{
      data: [directCosts, operationalCosts, assets],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',   // Red for Direct Costs
        'rgba(59, 130, 246, 0.8)',  // Blue for Operational Costs
        'rgba(34, 197, 94, 0.8)'    // Green for Assets
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 2
    }]
  };
}

// Example usage for cost breakdown
export function createCostBreakdownPieChart(categories: {name: string, amount: number, color?: string}[]): IPieChart {
  const defaultColors = [
    'rgba(239, 68, 68, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(251, 191, 36, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)'
  ];

  return {
    labels: categories.map(cat => cat.name),
    datasets: [{
      data: categories.map(cat => cat.amount),
      backgroundColor: categories.map((cat, index) =>
        cat.color || defaultColors[index % defaultColors.length]
      ),
      borderColor: categories.map((cat, index) =>
        cat.color?.replace('0.8', '1') || defaultColors[index % defaultColors.length].replace('0.8', '1')
      ),
      borderWidth: 2
    }]
  };
}
