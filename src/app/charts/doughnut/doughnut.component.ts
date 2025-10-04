import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from '../../../utils/chart-setup';
import { IDoughnutChart, initDoughnutChart } from '../../../models/Charts';

@Component({
  selector: 'app-doughnut',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doughnut.component.html',
  styleUrls: ['./doughnut.component.scss'],
})
export class DoughnutComponent implements OnInit {
  @Input() componentTitle = 'Colours overview';
  @Input() data: IDoughnutChart = initDoughnutChart();
  config: any;
  chart: any;
  ngOnInit(): void {
    this.config = {
      type: 'doughnut',
      data: this.data,
    };
    this.chart = new Chart('doughnut-chart', this.config);
  }
}
