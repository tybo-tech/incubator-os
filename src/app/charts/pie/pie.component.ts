import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from '../../../utils/chart-setup';
import { IPieChart, initPieChart } from '../../../models/Charts';
import { Constants } from '../../../services/service';

@Component({
  selector: 'app-pie',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <h3 *ngIf="componentTitle" class="chart-title">{{ componentTitle }}</h3>
      <div class="chart-wrapper">
        <canvas [id]="canvasId" width="400" height="400"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      padding: 1rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .chart-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      text-align: center;
    }

    .chart-wrapper {
      position: relative;
      height: 400px;
      width: 100%;
    }

    canvas {
      max-width: 100%;
      height: auto;
    }
  `]
})
export class PieComponent implements OnInit, OnDestroy, OnChanges {
  @Input() componentTitle = 'Financial Overview';
  @Input() data: IPieChart = initPieChart();

  canvasId: string = '';
  config: any;
  chart: any;

  ngOnInit(): void {
    // Generate unique canvas ID
    this.canvasId = `pie-chart-${Math.random().toString(36).substr(2, 9)}`;

    this.config = {
      type: 'pie',
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

                // Enhanced formatting with currency and better styling
                const formattedValue = value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: Constants.Currency,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });

                return `${label}: ${formattedValue} (${percentage}%)`;
              },
              title: function(context: any) {
                return 'Financial Distribution';
              },
              footer: function(tooltipItems: any) {
                const total = tooltipItems[0].dataset.data.reduce((a: number, b: number) => a + b, 0);
                const formattedTotal = total.toLocaleString('en-US', {
                  style: 'currency',
                  currency: Constants.Currency,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
                return `Total: ${formattedTotal}`;
              }
            },
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            footerColor: '#d1d5db',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            padding: 12
          }
        }
      }
    };

    // Small delay to ensure canvas is rendered
    setTimeout(() => {
      this.chart = new Chart(this.canvasId, this.config);
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update chart when data input changes
    if (changes['data'] && this.chart) {
      console.log('🔄 Pie chart data changed, updating chart...', this.data);
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    if (this.chart) {
      // Update chart data
      this.chart.data.labels = this.data.labels;
      this.chart.data.datasets = this.data.datasets;

      // Trigger chart update with animation
      this.chart.update('active');

      console.log('✅ Chart updated with new data:', {
        labels: this.data.labels,
        dataPoints: this.data.datasets[0]?.data
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up chart instance
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
