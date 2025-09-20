import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { MetricsService } from '../../../../../services/metrics.service';
import { MetricsHierarchy, IMetricGroup, IMetricType, IMetricRecord } from '../../../../../models/metrics.model';

@Component({
  selector: 'app-financial-v2-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './financial-v2-tab.component.html'
})
export class FinancialV2TabComponent implements OnInit {
  @Input() company!: ICompany;
  // For now pass fixed context (can be wired to actual context later)
  @Input() clientId: number = 1;
  @Input() programId: number = 0;
  @Input() cohortId: number = 0;
  // If set, only show this metric group id
  @Input() filterGroupId: number | null = null;

  loading = signal(true);
  error = signal<string | null>(null);
  hierarchy = signal<MetricsHierarchy>([]);
  // derived filtered view
  get displayedHierarchy(): MetricsHierarchy {
    const groups = this.hierarchy();
    if (this.filterGroupId) return groups.filter(g => g.id === this.filterGroupId);
    return groups;
  }

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void { this.load(); }
  refresh() { this.load(); }

  private load() {
    if (!this.company?.id) return;
    this.loading.set(true); this.error.set(null);
    this.metricsService.fullMetrics(this.clientId, this.company.id, this.programId, this.cohortId).subscribe({
  next: (groups) => { this.hierarchy.set(groups); this.loading.set(false); },
      error: (err) => { console.error(err); this.error.set('Failed to load metrics'); this.loading.set(false); }
    });
  }

  totalForType(type: IMetricType): number | null {
    if(!type.records || !type.records.length) return null;
    return type.records.reduce((acc, r) => acc + (r.total ?? 0), 0);
  }
  hasMargin(type: IMetricType): boolean { return type.show_margin === 1; }
}
