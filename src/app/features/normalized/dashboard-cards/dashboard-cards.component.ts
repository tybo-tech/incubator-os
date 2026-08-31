import { Component, ChangeDetectionStrategy, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GpsService } from '../services/gps.service';
import { SwotService } from '../services/swot.service';

@Component({
  selector: 'app-dashboard-normalized-cards',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-sm font-semibold text-gray-900">Strategy Workspace — Normalized</h3>
      <span class="text-xs text-gray-500">Company {{ companyId }}</span>
    </div>
    @if (loading()) { <div class="text-xs text-gray-400">Loading…</div> }
    @else {
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <a [routerLink]="['/company', companyId, 'swot-v2']" class="border rounded-lg p-3 hover:border-blue-500 transition-colors">
          <div class="text-xs text-gray-500">SWOT findings</div>
          <div class="text-xl font-bold text-gray-900">{{ swotTotal() }}</div>
          <div class="text-xs text-gray-400">{{ swotBreakdown() }}</div>
        </a>
        <a [routerLink]="['/company', companyId, 'gps-targets-v2']" class="border rounded-lg p-3 hover:border-purple-500 transition-colors">
          <div class="text-xs text-gray-500">GPS targets</div>
          <div class="text-xl font-bold text-gray-900">{{ gpsTotal() }}</div>
          <div class="text-xs text-gray-400">{{ gpsCategoryBreakdown() }}</div>
        </a>
        <a [routerLink]="['/company', companyId, 'gps-targets-v2']" class="border rounded-lg p-3 hover:border-orange-500 transition-colors">
          <div class="text-xs text-gray-500">Overdue · At risk</div>
          <div class="text-xl font-bold" [class.text-red-600]="overdue()>0">{{ overdue() }} · {{ atRisk() }}</div>
          <div class="text-xs text-gray-400">Due 30 days: {{ due30() }}</div>
        </a>
        <a [routerLink]="['/company', companyId, 'gps-targets-v2']" class="border rounded-lg p-3 hover:border-emerald-500 transition-colors">
          <div class="text-xs text-gray-500">Overall progress</div>
          <div class="text-xl font-bold text-gray-900">{{ avgProgress() }}%</div>
          <div class="text-xs text-gray-400">by category/status</div>
        </a>
      </div>
      <div class="flex gap-2 mt-3 text-xs">
        <a [routerLink]="['/company', companyId, 'swot-v2']" class="px-3 py-1.5 rounded bg-blue-600 text-white">Open SWOT Workspace →</a>
        <a [routerLink]="['/company', companyId, 'gps-targets-v2']" class="px-3 py-1.5 rounded border bg-white">Open GPS Targets →</a>
      </div>
    }
  </div>
  `,
})
export class DashboardNormalizedCardsComponent {
  @Input() companyId!: number;

  private gps = inject(GpsService);
  private swot = inject(SwotService);

  loading = signal(true);
  gpsTotal = signal(0);
  overdue = signal(0);
  atRisk = signal(0);
  due30 = signal(0);
  byCategory = signal<Record<string, number>>({});
  byStatus = signal<Record<string, number>>({});
  swotTotal = signal(0);
  swotByCategory = signal<Record<string, number>>({ strength:0, weakness:0, opportunity:0, threat:0 });
  avgProgress = signal(0);

  swotBreakdown = computed(() => {
    const m = this.swotByCategory();
    return `S ${m['strength']||0} · W ${m['weakness']||0} · O ${m['opportunity']||0} · T ${m['threat']||0}`;
  });
  gpsCategoryBreakdown = computed(() => {
    const c = this.byCategory();
    return `Fin ${c['finance']||0} · Strat ${c['strategy_general']||0} · SM ${c['sales_marketing']||0} · PD ${c['personal_development']||0}`;
  });

  ngOnInit(): void { this.load(); }
  ngOnChanges(): void { if (this.companyId) this.load(); }

  load(): void {
    const cid = Number(this.companyId);
    if (!cid) return;
    this.loading.set(true);
    // gps counts
    this.gps.dashboardCounts(cid).subscribe({
      next: (res: any) => {
        const counts = res.counts || res;
        this.gpsTotal.set(counts.total || 0);
        this.overdue.set(counts.overdue || 0);
        this.atRisk.set(counts.at_risk || 0);
        this.due30.set(counts.due_30_days || counts.due_this_month || 0);
        this.byStatus.set({ not_started: counts.not_started, in_progress: counts.in_progress, completed: counts.completed, cancelled: counts.cancelled });
        this.byCategory.set(res.by_category || {});
        // avg progress from listTargets
        this.gps.listTargets(cid).subscribe({
          next: rows => {
            const avg = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.manual_progress_percentage||0), 0) / rows.length) : 0;
            this.avgProgress.set(avg);
          },
          error: () => {}
        });
      },
      error: () => {}
    });
    // swot
    this.swot.listAnalyses(cid).subscribe({
      next: analyses => {
        const cur = analyses.find(a=>a.is_current) || analyses[0];
        if (!cur) { this.swotTotal.set(0); this.loading.set(false); return; }
        this.swot.listItems(cur.id).subscribe({
          next: items => {
            this.swotTotal.set(items.length);
            const map: Record<string, number> = { strength:0, weakness:0, opportunity:0, threat:0 };
            for (const it of items) map[it.category] = (map[it.category]||0)+1;
            this.swotByCategory.set(map);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }
}
