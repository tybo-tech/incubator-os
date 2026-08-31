import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tools-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="max-w-5xl mx-auto p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Tools</h1>
      <p class="text-sm text-slate-500">Admin utilities — imports, data migrations and other maintenance tools. Add new tools here as cards.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <a routerLink="/import" class="bg-white border rounded-xl p-5 hover:border-slate-900 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3"><i class="fas fa-file-import"></i></div>
        <h3 class="font-semibold">Data Import</h3>
        <p class="text-xs text-slate-500 mt-1">Bulk import companies, nodes and legacy data via JSON.</p>
        <span class="text-xs text-blue-600 mt-3 inline-block">Open →</span>
      </a>

      <a routerLink="/admin/system-tools/data-migration" class="bg-white border rounded-xl p-5 hover:border-slate-900 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3"><i class="fas fa-database"></i></div>
        <h3 class="font-semibold">System Tools — Data Migration</h3>
        <p class="text-xs text-slate-500 mt-1">Preview and run the normalized SWOT/GPS migration. System Administrator only. Audited.</p>
        <span class="text-xs text-emerald-600 mt-3 inline-block">Open →</span>
      </a>

      <div class="bg-slate-50 border border-dashed rounded-xl p-5">
        <h3 class="font-semibold text-slate-400">Add next tool</h3>
        <p class="text-xs text-slate-400 mt-1">Next data fixing tool can be another card here — no nav edits needed.</p>
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
      Tip: Use <code class="bg-white px-1 rounded">/admin/system-tools/data-migration</code> for the production preview → migrate flow. It is POST-only, SA-only and audit-logged.
    </div>
  </div>
  `,
})
export class ToolsDashboardPage {}
