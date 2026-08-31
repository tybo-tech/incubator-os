import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GpsService, GpsTarget } from '../services/gps.service';

@Component({
  selector: 'app-gps-hierarchy',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 space-y-4 max-w-6xl mx-auto">
    <div>
      <h1 class="text-xl font-bold">GPS Targets — Normalized (Company {{ companyId() }})</h1>
      <p class="text-xs text-slate-500">Grouped by category — finance, strategy_general, sales_marketing, personal_development. Company 11 demo: 12 targets.</p>
    </div>

    @if (loading()) { <div class="text-sm text-slate-500">Loading…</div> }
    @if (error()) { <div class="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{{ error() }}</div> }

    <div class="flex gap-2 text-xs">
      <span class="bg-slate-100 border rounded px-2 py-1">Total: {{ total() }}</span>
      @if (counts(); as c) {
        <span class="bg-white border rounded px-2 py-1">Overdue: {{ c.overdue || 0 }}</span>
        <span class="bg-white border rounded px-2 py-1">At risk: {{ c.at_risk || 0 }}</span>
        <span class="bg-white border rounded px-2 py-1">Due this month: {{ c.due_this_month || 0 }}</span>
      }
    </div>

    @for (cat of categories; track cat) {
      <div class="bg-white border rounded-xl p-4">
        <h3 class="font-semibold text-sm mb-2">{{ cat }} <span class="text-slate-400">({{ grouped()[cat]?.length || 0 }})</span></h3>
        @if (!(grouped()[cat]?.length)) { <div class="text-xs text-slate-400 border border-dashed rounded p-3 text-center">No targets in {{ cat }}.</div> }
        @else {
          <div class="space-y-3">
            @for (t of grouped()[cat]; track t.id) {
              <div class="border rounded-lg p-3">
                <div class="text-sm font-medium">{{ t.title }}</div>
                <div class="text-xs text-slate-600 mt-1">{{ t.description }}</div>
                <div class="text-xs text-slate-500 mt-1">Status: {{ t.status }} · Priority: {{ t.priority }} · Due: {{ t.due_date || '—' }} · Progress: {{ t.manual_progress_percentage }}% ({{ t.progress_mode }}) · Owner: {{ t.owner_label || '—' }}</div>
                <div class="flex gap-2 mt-2">
                  <button (click)="toggleTasks(t.id)" class="text-xs text-blue-600">{{ expandedTasks().has(t.id) ? 'Hide tasks/updates' : 'Show tasks & updates' }}</button>
                </div>
                @if (expandedTasks().has(t.id)) {
                  <div class="mt-2 text-xs border-t pt-2 space-y-2">
                    <div><span class="font-semibold">Tasks:</span> {{ tasks()[t.id] === undefined ? 'Loading…' : (tasks()[t.id].length ? '' : ' none') }}</div>
                    @if (tasks()[t.id]?.length) { @for (tk of tasks()[t.id]; track tk.id) { <div class="bg-slate-50 border rounded px-2 py-1 ml-2">{{ tk.title }} — {{ tk.status }}</div> } }
                    <div><span class="font-semibold">Updates:</span> {{ updates()[t.id] === undefined ? 'Loading…' : (updates()[t.id].length ? '' : ' none') }}</div>
                    @if (updates()[t.id]?.length) { @for (u of updates()[t.id]; track u.id) { <div class="bg-slate-50 border rounded px-2 py-1 ml-2">{{ u.recorded_at }} — {{ u.status }} {{ u.progress_percentage }}% — {{ u.note || '' }}</div> } }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    }
    <div class="text-xs text-slate-400">path: company/{{ companyId() }}/gps-targets-v2</div>
  </div>
  `,
})
export class GpsHierarchyPage {
  private route = inject(ActivatedRoute);
  private gps = inject(GpsService);
  companyId = signal<number>(Number(this.route.snapshot.paramMap.get('id') || 0));
  loading = signal(false);
  error = signal<string | null>(null);
  grouped = signal<Record<string, GpsTarget[]>>({});
  counts = signal<any>(null);
  expandedTasks = signal<Set<number>>(new Set());
  tasks = signal<Record<number, any[]>>({});
  updates = signal<Record<number, any[]>>({});

  categories = ['finance','strategy_general','sales_marketing','personal_development'];
  total = () => Object.values(this.grouped()).reduce((a, b) => a + (b?.length || 0), 0);

  ngOnInit(): void { this.load(); }

  load(): void {
    const cid = this.companyId();
    if (!cid) { this.error.set('Missing company id'); return; }
    this.loading.set(true);
    this.gps.grouped(cid).subscribe({
      next: g => { this.grouped.set(g || {}); this.loading.set(false); },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
    this.gps.dashboardCounts(cid).subscribe({ next: c => this.counts.set(c), error: () => {} });
  }

  toggleTasks(id: number): void {
    const s = new Set(this.expandedTasks());
    if (s.has(id)) s.delete(id); else {
      s.add(id);
      if (this.tasks()[id] === undefined) {
        this.gps.tasks(id).subscribe({ next: rows => this.tasks.update(m => ({ ...m, [id]: rows })), error: () => this.tasks.update(m => ({ ...m, [id]: [] })) });
      }
      if (this.updates()[id] === undefined) {
        this.gps.updates(id).subscribe({ next: rows => this.updates.update(m => ({ ...m, [id]: rows })), error: () => this.updates.update(m => ({ ...m, [id]: [] })) });
      }
    }
    this.expandedTasks.set(s);
  }
}
