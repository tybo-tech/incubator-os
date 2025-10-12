import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from '../../../utils/chart-setup';
import { IPieChart, initPieChart } from '../../../models/Charts';

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
export class PieComponent implements OnInit, OnDestroy {
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
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: $${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    // Small delay to ensure canvas is rendered
    setTimeout(() => {
      this.chart = new Chart(this.canvasId, this.config);
    }, 0);
  }

  ngOnDestroy(): void {
    // Clean up chart instance
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
