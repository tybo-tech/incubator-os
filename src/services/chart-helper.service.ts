import { Injectable } from '@angular/core';
import { IDoughnutChart, IBarChart } from '../models/Charts';
import { IndustryDashboardResponse, TopIndustryData } from './industry-reports.service';

@Injectable({ providedIn: 'root' })
export class ChartHelperService {

  /**
   * Convert top industries data to doughnut chart format
   */
  getIndustryDistributionChart(topIndustries: TopIndustryData[]): IDoughnutChart {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#8B5CF6', // Purple
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#EC4899', // Pink
      '#6B7280', // Gray
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#84CC16'  // Lime
    ];

    // Take top 10 industries and group the rest as "Other"
    const topTen = topIndustries.slice(0, 10);
    const otherTotal = topIndustries.slice(10).reduce((sum, industry) => sum + industry.total, 0);

    const labels = topTen.map(industry => industry.industry);
    const data = topTen.map(industry => industry.total);

    // Add "Other" if there are more industries
    if (otherTotal > 0) {
      labels.push('Other');
      data.push(otherTotal);
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(color => color),
        borderWidth: 2
      }]
    };
  }

  /**
   * Convert diversity data to bar chart format
   */
  getDiversityChart(diversityStats: IndustryDashboardResponse['overview']['diversity_stats']): IBarChart {
    return {
      labels: ['Youth Owned', 'Black Owned', 'Women Owned'],
      datasets: [{
        label: 'Ownership Distribution',
        data: [
          diversityStats.youth_percentage,
          diversityStats.black_percentage,
          diversityStats.women_percentage
        ],
        backgroundColor: [
          'rgba(251, 191, 36, 0.8)', // Yellow for youth
          'rgba(34, 197, 94, 0.8)',  // Green for black
          'rgba(236, 72, 153, 0.8)'  // Pink for women
        ],
        borderColor: [
          'rgba(251, 191, 36, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(236, 72, 153, 1)'
        ],
        borderWidth: 1
      }]
    };
  }

  /**
   * Convert employment data to bar chart format
   */
  getEmploymentChart(employmentData: any[]): IBarChart {
    // Take top 10 industries by total employees
    const topEmployers = employmentData
      .filter(item => item.total_employees > 0)
      .sort((a, b) => b.total_employees - a.total_employees)
      .slice(0, 10);

    return {
      labels: topEmployers.map(item => item.industry),
      datasets: [
        {
          label: 'Permanent Employees',
          data: topEmployers.map(item => item.permanent || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: 'Temporary Employees',
          data: topEmployers.map(item => item.temporary || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  /**
   * Convert financial data to bar chart format
   */
  getFinancialChart(financialData: any[]): IBarChart {
    // Take top 10 industries by total turnover
    const topFinancial = financialData
      .filter(item => item.total_turnover > 0)
      .sort((a, b) => b.total_turnover - a.total_turnover)
      .slice(0, 10);

    return {
      labels: topFinancial.map(item => item.industry),
      datasets: [{
        label: 'Total Turnover (R)',
        data: topFinancial.map(item => item.total_turnover),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }]
    };
  }

  /**
   * Get colors for consistent theming
   */
  getChartColors(count: number): string[] {
    const colors = [
      '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#6B7280', '#14B8A6', '#F97316', '#84CC16',
      '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'
    ];
    return colors.slice(0, count);
  }
}
