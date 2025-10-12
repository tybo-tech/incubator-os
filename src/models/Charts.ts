// Chart.js data structures for various chart types

export interface IKeyValue {
  key: string;
  value: string | number;
  color?: string;
  icon?: string;
  subtitle?: string;
}

export interface IChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ILineChart {
  labels: string[];
  datasets: IChartDataset[];
}

export interface IBarChart {
  labels: string[];
  datasets: IChartDataset[];
}

export interface IDoughnutChart {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface IPieChart {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

// Initialize functions for default chart data
export function initLineChart(): ILineChart {
  return {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [{
      label: 'Sample Data',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 2,
      fill: false,
      tension: 0.1
    }]
  };
}

export function initBarChart(): IBarChart {
  return {
    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    datasets: [{
      label: 'Sample Data',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 205, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(255, 159, 64, 0.2)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }]
  };
}

export function initDoughnutChart(): IDoughnutChart {
  return {
    labels: ['Red', 'Blue', 'Yellow'],
    datasets: [{
      data: [300, 50, 100],
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 205, 86, 0.8)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 205, 86, 1)'
      ],
      borderWidth: 1
    }]
  };
}

export function initPieChart(): IPieChart {
  return {
    labels: ['Direct Costs', 'Operational Costs', 'Assets'],
    datasets: [{
      data: [45000, 30000, 25000],
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

// Industry-specific chart data interfaces
export interface IIndustryStatsCard {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: string;
  color?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export interface IIndustryFinancialData {
  industry: string;
  avg_turnover: number;
  total_turnover: number;
  total_companies: number;
}

export interface IIndustryEmploymentData {
  industry: string;
  permanent: number;
  temporary: number;
  total_employees: number;
}

export interface IIndustryDiversityData {
  industry: string;
  youth_owned: number;
  black_owned: number;
  women_owned: number;
  total_companies: number;
}
