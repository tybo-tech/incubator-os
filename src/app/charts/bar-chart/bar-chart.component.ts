import { Component, Input } from '@angular/core';
import { Chart } from '../../../utils/chart-setup';
import { IBarChart, initBarChart } from '../../../models/Charts';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
})
export class BarChartComponent {
  @Input() componentTitle = 'Colours overview';
  @Input() data: IBarChart = initBarChart();
  config: any;
  chart: any;
  ngOnInit(): void {
    this.config = {
      type: 'bar',
      data: this.data,
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };
    this.chart = new Chart('bar-chart', this.config);
  }
}
