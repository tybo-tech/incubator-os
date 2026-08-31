import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SwotService, SwotItem } from '../services/swot.service';
import { GpsService } from '../services/gps.service';

@Component({
  selector: 'app-swot-hierarchy',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 space-y-4 max-w-6xl mx-auto">
    <div>
      <h1 class="text-xl font-bold">SWOT — Normalized (Company {{ companyId() }})</h1>
      <p class="text-xs text-slate-500">Reads swot_analyses / swot_items — legacy nodes untouched. Company 11 demo: 8 items.</p>
    </div>

    @if (loading()) { <div class="text-sm text-slate-500">Loading…</div> }
    @if (error()) { <div class="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{{ error() }}</div> }

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      @for (q of quadrants; track q.key) {
        <div class="bg-white border rounded-xl p-4">
          <h3 class="font-semibold text-sm mb-2">{{ q.label }} <span class="text-slate-400">({{ itemsByCategory()[q.key]?.length || 0 }})</span></h3>
          @if ((itemsByCategory()[q.key]?.length || 0) === 0) {
            <div class="text-xs text-slate-400 border border-dashed rounded p-4 text-center">No {{ q.label.toLowerCase() }}.</div>
          } @else {
            <div class="space-y-3">
              @for (item of itemsByCategory()[q.key]; track item.id) {
                <div class="border rounded-lg p-3">
                  <div class="text-sm font-medium">{{ item.description }}</div>
                  <div class="text-xs text-slate-500 mt-1">Impact: {{ item.impact }} · Priority: {{ item.priority }} · Status: {{ item.status }} · Owner: {{ item.owner_label || '—' }} · Target: {{ item.target_date || '—' }}</div>
                  @if (item.recommended_response) { <div class="text-xs mt-1"><span class="font-semibold">Response:</span> {{ item.recommended_response }}</div> }
                  <button (click)="toggle(item.id)" class="text-xs text-blue-600 mt-2">{{ expanded().has(item.id) ? 'Hide linked targets' : 'Show linked GPS targets' }}</button>
                  @if (expanded().has(item.id)) {
                    <div class="mt-2 text-xs border-t pt-2">
                      @if (linked()[item.id] === undefined) { <span class="text-slate-400">Loading…</span> }
                      @else if (linked()[item.id].length === 0) { <span class="text-slate-400">No linked GPS targets (all legacy_unlinked until linked).</span> }
                      @else { @for (t of linked()[item.id]; track t.id) { <div class="bg-slate-50 border rounded px-2 py-1 mb-1">{{ t.category }} — {{ t.title }} ({{ t.status }})</div> } }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <div class="text-xs text-slate-400">Analysis: {{ analysis()?.id ? '#' + analysis()!.id + ' · ' + analysis()!.status + ' · current=' + analysis()!.is_current : '— none' }} · path: company/{{ companyId() }}/swot-v2</div>
  </div>
  `,
})
export class SwotHierarchyPage {
  private route = inject(ActivatedRoute);
  private swot = inject(SwotService);
  private gps = inject(GpsService);

  companyId = signal<number>(Number(this.route.snapshot.paramMap.get('id') || 0));
  loading = signal(false);
  error = signal<string | null>(null);
  analysis = signal<any | null>(null);
  items = signal<SwotItem[]>([]);
  expanded = signal<Set<number>>(new Set());
  linked = signal<Record<number, any[]>>({});

  quadrants = [
    { key: 'strength', label: 'Strengths' },
    { key: 'weakness', label: 'Weaknesses' },
    { key: 'opportunity', label: 'Opportunities' },
    { key: 'threat', label: 'Threats' },
  ] as const;

  itemsByCategory = computed(() => {
    const map: Record<string, SwotItem[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    for (const it of this.items()) map[it.category]?.push(it);
    return map;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    const cid = this.companyId();
    if (!cid) { this.error.set('Missing company id'); return; }
    this.loading.set(true);
    this.swot.listAnalyses(cid).subscribe({
      next: analyses => {
        const cur = analyses.find(a => a.is_current) || analyses[0] || null;
        this.analysis.set(cur);
        if (!cur) { this.items.set([]); this.loading.set(false); return; }
        this.swot.listItems(cur.id).subscribe({
          next: items => { this.items.set(items); this.loading.set(false); },
          error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
        });
      },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
  }

  toggle(id: number): void {
    const s = new Set(this.expanded());
    if (s.has(id)) s.delete(id); else {
      s.add(id);
      if (this.linked()[id] === undefined) {
        this.gps.listBySwotItem(id).subscribe({
          next: rows => this.linked.update(m => ({ ...m, [id]: rows })),
          error: () => this.linked.update(m => ({ ...m, [id]: [] }))
        });
      }
    }
    this.expanded.set(s);
  }
}
