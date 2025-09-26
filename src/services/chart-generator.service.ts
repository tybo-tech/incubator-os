// services/chart-generator.service.ts - Simple SVG Chart Generator Service

import { Injectable } from '@angular/core';

export interface ChartData {
  period: string;
  value: number;
}

export interface ChartOptions {
  title: string;
  color?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChartGeneratorService {

  constructor() {}

  /**
   * Generate a simple line chart SVG
   */
  generateLineChart(data: ChartData[], options: ChartOptions): string {
    if (!data || data.length === 0) {
      return this.generateEmptyChart(options);
    }

    const config = {
      width: options.width || 600,
      height: options.height || 300,
      color: options.color || '#3b82f6',
      title: options.title || 'Chart',
      showGrid: options.showGrid !== false,
      showLabels: options.showLabels !== false
    };

    const margin = { top: 40, right: 30, bottom: 60, left: 80 };
    const chartWidth = config.width - margin.left - margin.right;
    const chartHeight = config.height - margin.top - margin.bottom;

    // Calculate value ranges
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || maxValue || 1;

    // Generate path points
    const points = data.map((d, i) => {
      const x = margin.left + (i * chartWidth) / Math.max(data.length - 1, 1);
      const y = margin.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
      return { x, y, value: d.value, period: d.period };
    });

    const pathData = points.map(p => `${p.x},${p.y}`).join(' ');

    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .chart-title { font: bold 16px sans-serif; fill: #1f2937; text-anchor: middle; }
            .axis-label { font: 12px sans-serif; fill: #6b7280; }
            .grid-line { stroke: #f3f4f6; stroke-width: 1; }
            .axis-line { stroke: #d1d5db; stroke-width: 2; }
            .data-line { stroke: ${config.color}; stroke-width: 3; fill: none; }
            .data-point { fill: ${config.color}; stroke: white; stroke-width: 2; }
            .data-area { fill: ${config.color}; fill-opacity: 0.1; }
          </style>
        </defs>

        <!-- Background -->
        <rect width="${config.width}" height="${config.height}" fill="white"/>

        <!-- Title -->
        <text x="${config.width/2}" y="25" class="chart-title">${config.title}</text>

        ${config.showGrid ? this.generateGridLines(margin, chartWidth, chartHeight, minValue, maxValue) : ''}

        <!-- Axes -->
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" class="axis-line"/>
        <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" class="axis-line"/>

        <!-- Data area (fill under line) -->
        ${data.length > 1 ? `<path d="M${margin.left},${margin.top + chartHeight} ${pathData} ${margin.left + chartWidth},${margin.top + chartHeight} Z" class="data-area"/>` : ''}

        <!-- Data line -->
        ${data.length > 1 ? `<polyline points="${pathData}" class="data-line"/>` : ''}

        <!-- Data points -->
        ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" class="data-point"/>`).join('')}

        ${config.showLabels ? this.generateLabels(points, data, margin, chartHeight, minValue, maxValue) : ''}
      </svg>
    `;
  }

  /**
   * Generate a bar chart SVG
   */
  generateBarChart(data: ChartData[], options: ChartOptions): string {
    if (!data || data.length === 0) {
      return this.generateEmptyChart(options);
    }

    const config = {
      width: options.width || 600,
      height: options.height || 300,
      color: options.color || '#10b981',
      title: options.title || 'Bar Chart',
      showLabels: options.showLabels !== false
    };

    const margin = { top: 40, right: 30, bottom: 60, left: 80 };
    const chartWidth = config.width - margin.left - margin.right;
    const chartHeight = config.height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = chartWidth / data.length * 0.7;
    const barSpacing = chartWidth / data.length * 0.3;

    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .chart-title { font: bold 16px sans-serif; fill: #1f2937; text-anchor: middle; }
            .axis-label { font: 12px sans-serif; fill: #6b7280; text-anchor: middle; }
            .bar { fill: ${config.color}; }
            .bar:hover { fill-opacity: 0.8; }
            .value-label { font: 11px sans-serif; fill: #374151; text-anchor: middle; }
          </style>
        </defs>

        <!-- Background -->
        <rect width="${config.width}" height="${config.height}" fill="white"/>

        <!-- Title -->
        <text x="${config.width/2}" y="25" class="chart-title">${config.title}</text>

        <!-- Axes -->
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#d1d5db" stroke-width="2"/>
        <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#d1d5db" stroke-width="2"/>

        <!-- Bars -->
        ${data.map((d, i) => {
          const x = margin.left + (i * (barWidth + barSpacing)) + (barSpacing / 2);
          const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
          const y = margin.top + chartHeight - barHeight;

          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" class="bar"/>
            ${config.showLabels ? `<text x="${x + barWidth/2}" y="${y - 5}" class="value-label">${this.formatValue(d.value)}</text>` : ''}
          `;
        }).join('')}

        <!-- X-axis labels -->
        ${config.showLabels ? data.map((d, i) => {
          const x = margin.left + (i * (barWidth + barSpacing)) + (barSpacing / 2) + (barWidth / 2);
          return `<text x="${x}" y="${config.height - 10}" class="axis-label">${d.period}</text>`;
        }).join('') : ''}

        <!-- Y-axis labels -->
        ${this.generateYAxisLabels(margin, chartHeight, 0, maxValue)}
      </svg>
    `;
  }

  /**
   * Generate a pie chart SVG
   */
  generatePieChart(data: ChartData[], options: ChartOptions): string {
    if (!data || data.length === 0) {
      return this.generateEmptyChart(options);
    }

    const config = {
      width: options.width || 400,
      height: options.height || 400,
      title: options.title || 'Pie Chart'
    };

    const margin = 20;
    const radius = Math.min(config.width, config.height) / 2 - margin - 40;
    const centerX = config.width / 2;
    const centerY = config.height / 2;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = -Math.PI / 2; // Start from top

    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    const slices = data.map((d, i) => {
      const sliceAngle = (d.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      currentAngle = endAngle;

      return {
        path: pathData,
        color: colors[i % colors.length],
        label: d.period,
        value: d.value,
        percentage: (d.value / total * 100).toFixed(1)
      };
    });

    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .chart-title { font: bold 16px sans-serif; fill: #1f2937; text-anchor: middle; }
            .slice { stroke: white; stroke-width: 2; }
            .legend-text { font: 12px sans-serif; fill: #374151; }
          </style>
        </defs>

        <!-- Background -->
        <rect width="${config.width}" height="${config.height}" fill="white"/>

        <!-- Title -->
        <text x="${config.width/2}" y="25" class="chart-title">${config.title}</text>

        <!-- Pie slices -->
        ${slices.map(slice => `<path d="${slice.path}" fill="${slice.color}" class="slice"/>`).join('')}

        <!-- Legend -->
        <g transform="translate(${config.width - 150}, 60)">
          ${slices.map((slice, i) => `
            <g transform="translate(0, ${i * 20})">
              <rect x="0" y="0" width="12" height="12" fill="${slice.color}"/>
              <text x="18" y="10" class="legend-text">${slice.label}: ${slice.percentage}%</text>
            </g>
          `).join('')}
        </g>
      </svg>
    `;
  }

  /**
   * Generate grid lines for charts
   */
  private generateGridLines(margin: any, chartWidth: number, chartHeight: number, minValue: number, maxValue: number): string {
    const lines = [];
    const gridCount = 5;

    // Horizontal grid lines
    for (let i = 0; i <= gridCount; i++) {
      const y = margin.top + (i * chartHeight) / gridCount;
      lines.push(`<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" class="grid-line"/>`);
    }

    return lines.join('');
  }

  /**
   * Generate labels for line chart
   */
  private generateLabels(points: any[], data: ChartData[], margin: any, chartHeight: number, minValue: number, maxValue: number): string {
    const labels = [];

    // X-axis labels (show every nth label to avoid crowding)
    const labelStep = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % labelStep === 0) {
        const x = points[i].x;
        labels.push(`<text x="${x}" y="${margin.top + chartHeight + 20}" class="axis-label" text-anchor="middle">${d.period}</text>`);
      }
    });

    // Y-axis labels
    labels.push(this.generateYAxisLabels(margin, chartHeight, minValue, maxValue));

    return labels.join('');
  }

  /**
   * Generate Y-axis labels
   */
  private generateYAxisLabels(margin: any, chartHeight: number, minValue: number, maxValue: number): string {
    const labels = [];
    const labelCount = 5;

    for (let i = 0; i <= labelCount; i++) {
      const y = margin.top + chartHeight - (i * chartHeight) / labelCount;
      const value = minValue + (i * (maxValue - minValue)) / labelCount;
      labels.push(`<text x="${margin.left - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${this.formatValue(value)}</text>`);
    }

    return labels.join('');
  }

  /**
   * Generate empty chart placeholder
   */
  private generateEmptyChart(options: ChartOptions): string {
    const width = options.width || 600;
    const height = options.height || 300;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .empty-text { font: 14px sans-serif; fill: #9ca3af; text-anchor: middle; }
            .empty-title { font: bold 16px sans-serif; fill: #6b7280; text-anchor: middle; }
          </style>
        </defs>
        <rect width="${width}" height="${height}" fill="#f9fafb" stroke="#e5e7eb"/>
        <text x="${width/2}" y="30" class="empty-title">${options.title}</text>
        <text x="${width/2}" y="${height/2}" class="empty-text">No data available for chart</text>
      </svg>
    `;
  }

  /**
   * Format values for display
   */
  private formatValue(value: number): string {
    if (value >= 1000000) {
      return `R${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R${(value / 1000).toFixed(1)}K`;
    } else {
      return `R${Math.round(value)}`;
    }
  }
}
