import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Chart } from '../../../utils/chart-setup';
import { ILineChart, initLineChart } from '../../../models/Charts';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
})
export class LineChartComponent implements OnInit, OnDestroy {
  @Input() componentTitle = 'Line Chart';
  @Input() data: ILineChart = initLineChart();

  // Generate unique chart ID
  chartId = `line-chart-${Math.random().toString(36).substr(2, 9)}`;
  config: any;
  chart: any;

  ngOnInit(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      this.initializeChart();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private initializeChart(): void {
    try {
      this.config = {
        type: 'line',
        data: this.data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
            },
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.1)',
              },
            },
          },
          plugins: {
            legend: {
              position: 'top' as const,
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
        },
      };
      this.chart = new Chart(this.chartId, this.config);
      console.log(`✅ Line chart initialized with ID: ${this.chartId}`);
    } catch (error) {
      console.error('Failed to initialize line chart:', error);
    }
  }
}
