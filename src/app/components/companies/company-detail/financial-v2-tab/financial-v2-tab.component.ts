import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { FinancialMetricService } from '../../../../../services/financial-metric.service';
import { MetricTypeService } from '../../../../../services/metric-type.service';
import { IMetricType } from '../../../../../models/metric-type.model';

interface GroupedFinancialMetricsResponse {
  years: Record<string, any[]>; // year_ => metrics
  meta: { total: number; year_count: number; years: number[] };
}

@Component({
  selector: 'app-financial-v2-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './financial-v2-tab.component.html'
})
export class FinancialV2TabComponent implements OnInit {
  @Input() company!: ICompany;

  loading = signal(true);
  error = signal<string | null>(null);
  grouped = signal<GroupedFinancialMetricsResponse | null>(null);
  metricTypes = signal<IMetricType[]>([]);

  // Derived convenience structure: per year -> metrics by metric_type_id
  metricsByYearAndType = computed(() => {
    const g = this.grouped();
    if (!g) return {} as Record<string, Record<number, any[]>>;
    const map: Record<string, Record<number, any[]>> = {};
    Object.entries(g.years).forEach(([year, arr]) => {
      map[year] = {};
      arr.forEach(m => {
        if (!map[year][m.metric_type_id]) map[year][m.metric_type_id] = [];
        map[year][m.metric_type_id].push(m);
      });
      // Sort quarterly entries Q1..Q4 after annual (null quarter first)
      Object.values(map[year]).forEach(list => {
        list.sort((a,b) => {
          if (a.quarter === b.quarter) return 0;
          if (a.quarter === null) return -1;
            if (b.quarter === null) return 1;
          return a.quarter.localeCompare(b.quarter);
        });
      });
    });
    return map;
  });

  constructor(
    private financialMetricService: FinancialMetricService,
    private metricTypeService: MetricTypeService
  ) {}

  ngOnInit(): void {
    this.fetchAll();
  }

  refresh() { this.fetchAll(); }

  private fetchAll() {
    if (!this.company?.id) return;
    this.loading.set(true);
    this.error.set(null);

    // Fetch metric types & grouped metrics in parallel via two subscriptions
    this.metricTypeService.list().subscribe({
      next: types => this.metricTypes.set(types),
      error: err => console.error('Metric types load error', err)
    });

    this.financialMetricService.list(this.company.id, {}).subscribe({
      next: (resp: GroupedFinancialMetricsResponse) => {
        this.grouped.set(resp);
        this.loading.set(false);
      },
      error: err => {
        console.error('Financial metrics (grouped) load error', err);
        this.error.set('Failed to load financial metrics');
        this.loading.set(false);
      }
    });
  }

  metricTypeName(id: number): string {
    const mt = this.metricTypes().find(m => m.id === id);
    return mt ? mt.name : '#' + id;
  }

  annualValue(records: any[]): number | null {
    const annual = records.find(r => r.quarter === null);
    return annual ? annual.value : null;
  }

  quarterly(records: any[]) {
    return records.filter(r => r.quarter !== null);
  }
}
