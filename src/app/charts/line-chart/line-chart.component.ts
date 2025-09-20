import { Component, Input } from '@angular/core';
import { Chart } from 'chart.js';
import { ILineChart, initLineChart } from 'src/models/Charts';

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
})
export class LineChartComponent {
  @Input() componentTitle = 'Line Chart';
  @Input() data: ILineChart = initLineChart();
  config: any;
  chart: any;
  ngOnInit(): void {
    this.config = {
      type: 'line',
      data: this.data,
    };
    this.chart = new Chart('line-chart', this.config);
  }
}
