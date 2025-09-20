import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { MetricsService } from '../../../../../services/metrics.service';
import { MetricsHierarchy } from '../../../../../models/metrics.model';

@Component({
  selector: 'app-metrics-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-tab.component.html'
})
export class MetricsTabComponent implements OnInit {
  @Input() company!: ICompany;
  @Input() clientId: number = 1;
  @Input() programId: number = 0;
  @Input() cohortId: number = 0;
  @Input() filterGroupId: number | null = null;

  loading = signal(true);
  error = signal<string | null>(null);
  hierarchy = signal<MetricsHierarchy>([]);

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

  get displayedHierarchy() {
    const groups = this.hierarchy();
    if (this.filterGroupId) return groups.filter(g => g.id === this.filterGroupId);
    return groups;
  }
}
