import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MigrationService } from '../../normalized/services/migration.service';

@Component({
  selector: 'app-data-migration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="max-w-5xl mx-auto p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-bold">System Tools — Data Migration</h1>
      <p class="text-sm text-slate-500">Normalized SWOT/GPS — preview → verify → confirmed migrate. Requires System Administrator. Tables must exist via SQL migrations.</p>
    </div>

    <div class="bg-white rounded-xl border p-4 space-y-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-[240px]">
          <label class="text-xs font-semibold text-slate-600">Company IDs (comma separated)</label>
          <input [(ngModel)]="companyIdsInput" placeholder="11 or 59,11" class="w-full border rounded-lg px-3 py-2 text-sm" />
          <p class="text-xs text-slate-400 mt-1">Explicit list required — never migrate all implicitly. Local demo: 11. Prod demo: 59,11.</p>
        </div>
        <button (click)="doPreview()" [disabled]="loading()" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50">Preview migration</button>
      </div>

      @if (error()) {
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{{ error() }}</div>
      }

      @if (preview()) {
        <div class="border rounded-lg p-4 bg-slate-50 space-y-3">
          <h3 class="font-semibold text-sm">Preview summary — rolled_back: {{ preview()!.rolled_back ? 'yes (dry-run)' : 'no' }}</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div class="bg-white rounded p-3 border"><div class="text-slate-500">SWOT nodes seen/selected</div><div class="font-bold text-base">{{ preview()!.swot.nodes_seen }} / {{ preview()!.swot.nodes_selected }}</div></div>
            <div class="bg-white rounded p-3 border"><div class="text-slate-500">SWOT items created / skipped</div><div class="font-bold text-base">{{ preview()!.swot.items_created }} / {{ preview()!.swot.items_skipped_empty }}</div></div>
            <div class="bg-white rounded p-3 border"><div class="text-slate-500">GPS targets created / skipped</div><div class="font-bold text-base">{{ preview()!.gps.targets_created }} / {{ preview()!.gps.targets_skipped_empty }}</div></div>
            <div class="bg-white rounded p-3 border"><div class="text-slate-500">Sources created</div><div class="font-bold text-base">{{ preview()!.gps.sources_created }}</div></div>
          </div>
          <div class="text-xs space-y-1">
            <div><span class="font-semibold">Companies processed:</span> {{ preview()!.companies_processed.join(', ') || '—' }}</div>
            <div><span class="font-semibold">Duplicates flagged:</span> {{ preview()!.duplicates_flagged.length }} 
              @for (d of preview()!.duplicates_flagged; track d.company_id) {
                <span class="ml-2 bg-amber-100 px-2 py-0.5 rounded">Co {{ d.company_id }}: {{ d.total_nodes }} nodes → pick #{{ d.selected_node_id }}</span>
              }
            </div>
            @if (preview()!.swot.errors.length || preview()!.gps.errors.length) {
              <div class="text-red-600">Errors: {{ (preview()!.swot.errors.length + preview()!.gps.errors.length) }} — check preview.gps.errors for ISO datetime etc.</div>
            }
          </div>

          <div class="border-t pt-3 space-y-2">
            <label class="text-xs font-semibold">Confirm phrase to migrate</label>
            <input [(ngModel)]="confirmInput" placeholder="MIGRATE_NORMALIZED_SWOT_GPS" class="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            <button (click)="doMigrate()" [disabled]="!canMigrate() || loading()" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50">Run migration</button>
            <p class="text-xs text-slate-400">Button disabled until preview success and exact phrase typed.</p>
          </div>
        </div>
      }

      @if (migrateResult()) {
        <div class="border rounded-lg p-4 bg-emerald-50 space-y-2">
          <h3 class="font-semibold text-sm text-emerald-800">Migration result</h3>
          <pre class="text-xs bg-white border rounded p-3 overflow-auto max-h-64">{{ migrateResult() | json }}</pre>
        </div>
      }

      <div class="flex gap-2">
        <button (click)="loadAudits()" class="px-3 py-2 rounded-lg border text-sm">Reload audit history</button>
        <span class="text-xs text-slate-400 self-center">Shows who ran preview/migrate, companyIds, counts, timestamp.</span>
      </div>

      @if (audits().length) {
        <div class="border rounded-lg overflow-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-100"><tr><th class="text-left p-2">When</th><th class="text-left p-2">User</th><th class="text-left p-2">Action</th><th class="text-left p-2">Companies</th><th class="text-left p-2">Status</th><th class="text-left p-2">Summary</th></tr></thead>
            <tbody>
              @for (a of audits(); track a.id) {
                <tr class="border-t">
                  <td class="p-2">{{ a.created_at }}</td>
                  <td class="p-2">{{ a.user_email || a.user_id }} <span class="text-slate-400">{{ a.user_role }}</span></td>
                  <td class="p-2">{{ a.action }}</td>
                  <td class="p-2">{{ a.company_ids?.join(', ') }}</td>
                  <td class="p-2">{{ a.status }}</td>
                  <td class="p-2 max-w-xs truncate" title="{{ a.result_summary | json }}">{{ a.result_summary?.swot?.items_created }}/{{ a.result_summary?.gps?.targets_created }} items/targets</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
      Operational note: Run <code class="bg-white px-1 rounded">migrations/2026-08-31-normalized-swot-gps.sql</code> and <code class="bg-white px-1 rounded">2026-08-31-normalized-migration-audit.sql</code> via phpMyAdmin before first use. <code>clear</code> is CLI-only. Production uses explicit companyIds — never migrate all implicitly.
    </div>
  </div>
  `,
})
export class DataMigrationPage {
  private svc = inject(MigrationService);
  companyIdsInput = '11';
  confirmInput = '';
  loading = signal(false);
  error = signal<string | null>(null);
  preview = signal<any | null>(null);
  migrateResult = signal<any | null>(null);
  audits = signal<any[]>([]);

  canMigrate = computed(() => !!this.preview() && this.confirmInput === 'MIGRATE_NORMALIZED_SWOT_GPS');

  private parseIds(): number[] {
    return this.companyIdsInput.split(',').map(s => parseInt(s.trim(),10)).filter(n=>Number.isFinite(n) && n>0);
  }

  doPreview(): void {
    const ids = this.parseIds();
    if (!ids.length) { this.error.set('companyIds required — e.g. 11 or 59,11'); return; }
    this.loading.set(true); this.error.set(null); this.migrateResult.set(null);
    this.svc.preview(ids).subscribe({
      next: res => { this.preview.set(res.data); this.loading.set(false); this.loadAudits(); },
      error: err => { this.error.set(err.error?.error || err.message); this.loading.set(false); }
    });
  }

  doMigrate(): void {
    const ids = this.parseIds();
    this.loading.set(true); this.error.set(null);
    this.svc.migrate(ids, this.confirmInput).subscribe({
      next: res => { this.migrateResult.set(res.data); this.loading.set(false); this.loadAudits(); },
      error: err => { this.error.set(err.error?.error || err.message); this.loading.set(false); }
    });
  }

  loadAudits(): void {
    this.svc.auditHistory(20).subscribe({
      next: res => this.audits.set(res.audits || []),
      error: () => {}
    });
  }

  ngOnInit(): void { this.loadAudits(); }
}
