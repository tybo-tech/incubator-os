import { IMetricType, IMetricRecord, MetricPeriodType } from '../models/metrics.model';

/**
 * Utility functions for handling metrics with different period types
 */
export class MetricsUtils {

  /**
   * Check if a metric type is quarterly
   */
  static isQuarterly(type: IMetricType): boolean {
    return type.period_type === 'QUARTERLY';
  }

  /**
   * Check if a metric type is yearly
   */
  static isYearly(type: IMetricType): boolean {
    return type.period_type === 'YEARLY';
  }

  /**
   * Get appropriate column headers based on period type
   */
  static getColumnHeaders(periodType: MetricPeriodType): string[] {
    switch (periodType) {
      case 'QUARTERLY':
        return ['Year', 'Q1', 'Q2', 'Q3', 'Q4', 'Total', 'Margin %'];
      case 'YEARLY':
        return ['Year', 'Annual Value', 'Margin %'];
      default:
        return ['Year', 'Q1', 'Q2', 'Q3', 'Q4', 'Total', 'Margin %'];
    }
  }

  /**
   * Get editable fields based on period type
   */
  static getEditableFields(periodType: MetricPeriodType): string[] {
    switch (periodType) {
      case 'QUARTERLY':
        return ['q1', 'q2', 'q3', 'q4'];
      case 'YEARLY':
        return ['total']; // For yearly, we edit the total field directly
      default:
        return ['q1', 'q2', 'q3', 'q4'];
    }
  }

  /**
   * Filter metric types by period type
   */
  static filterByPeriodType(types: IMetricType[], periodType: MetricPeriodType): IMetricType[] {
    return types.filter(type => type.period_type === periodType);
  }

  /**
   * Group metric types by period type
   */
  static groupByPeriodType(types: IMetricType[]): { quarterly: IMetricType[], yearly: IMetricType[] } {
    return {
      quarterly: types.filter(type => type.period_type === 'QUARTERLY'),
      yearly: types.filter(type => type.period_type === 'YEARLY')
    };
  }

  /**
   * Calculate total for quarterly metrics (Q1+Q2+Q3+Q4)
   * For yearly metrics, total is entered directly
   */
  static calculateTotal(record: IMetricRecord, periodType: MetricPeriodType): number | null {
    if (periodType === 'YEARLY') {
      return record.total ?? null; // Yearly total is entered directly
    }

    // Quarterly calculation
    const quarters = [record.q1, record.q2, record.q3, record.q4];
    const validQuarters = quarters.filter(q => q !== null && q !== undefined);

    if (validQuarters.length === 0) return null;
    return validQuarters.reduce((sum, q) => sum + (q || 0), 0);
  }

  /**
   * Get display value for a field based on period type
   */
  static getDisplayValue(record: IMetricRecord, field: string, periodType: MetricPeriodType): number | null {
    if (periodType === 'YEARLY' && field === 'total') {
      return record.total ?? null; // Show direct total for yearly
    }

    if (periodType === 'YEARLY' && ['q1', 'q2', 'q3', 'q4'].includes(field)) {
      return null; // Don't show quarters for yearly metrics
    }

    return (record as any)[field];
  }
}
