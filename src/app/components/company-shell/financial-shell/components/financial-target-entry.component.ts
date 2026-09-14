import { Component, ChangeDetectionStrategy, effect, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GpsService, GpsTarget } from '../../../../features/normalized/services/gps.service';

/**
 * A financial year offered as a measurement period. The date fields are required to order the
 * options by their real period (`ORDER BY id` from the API is arbitrary relative to dates):
 * `startYear`/`startMonth` and `endYear`/`endMonth`. A year without a start date cannot be
 * auto-selected (see `FinancialTargetEntryComponent`).
 */
export interface RevenueYearOption {
  id: number;
  name: string;
  isActive?: boolean;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

type Mode = 'create' | 'link';
type Direction = 'increase' | 'decrease' | 'maintain';

/**
 * Financial-screen target entry (Sprint 007 Phase 6).
 *
 * Adds "Create revenue target" and "Link existing target" to the revenue screen. Prefills the
 * company, measure and financial-year/quarter period, previews the baseline/target periods via
 * the measurement service (read-only) and warns on incomplete/no-account/unknown data instead of
 * fabricating a baseline. Writes go through the transactional create-measured / link-measure
 * endpoints (target + metric binding + manual provenance in one request).
 */
@Component({
  selector: 'app-financial-target-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="flex flex-wrap items-center gap-2 mb-4">
    <button type="button" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2" (click)="open('create')">
      <i class="fas fa-bullseye"></i> Create revenue target
    </button>
    <button type="button" class="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2" (click)="open('link')">
      <i class="fas fa-link"></i> Link existing target
    </button>
    @if (successTargetId()) {
      <span class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        Target #{{ successTargetId() }} now appears in the central
        <a class="font-semibold underline" [routerLink]="['/company', companyId(), 'gps-targets-v2']">Targets</a> workspace
        (<a class="font-semibold underline" [routerLink]="['/company', companyId(), 'results']">Results</a>).
      </span>
    }
    @if (error()) { <span class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error() }}</span> }
  </div>

  @if (mode()) {
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" (click)="$event.stopPropagation()">
        <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 class="text-base font-bold text-gray-900">{{ mode() === 'create' ? 'Create revenue target' : 'Link existing target to a measure' }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">Company {{ companyId() }} · measure from live financial data</p>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-700" (click)="close()" aria-label="Close"><i class="fas fa-times"></i></button>
        </div>

        <div class="px-5 py-4 space-y-4 text-sm flex-1 overflow-y-auto min-h-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Measure</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="measureCode" (ngModelChange)="refreshPreview()">
                @for (m of measures; track m.code) { <option [value]="m.code">{{ m.label }}</option> }
              </select>
              <span class="block text-xs text-gray-400 mt-1">Domestic-only measure is pending definition approval; combined revenue needs domestic + export accounts.</span>
            </label>
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Direction</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="direction">
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
                <option value="maintain">Maintain</option>
              </select>
            </label>
          </div>

          @if (mode() === 'link') {
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Existing target *</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="linkTargetId">
                <option value="">— select a target —</option>
                @for (t of targets(); track t.id) { <option [value]="t.id">#{{ t.id }} · {{ t.title }}{{ t.progress_mode === 'metric' ? ' (already metric)' : '' }}</option> }
              </select>
            </label>
          } @else {
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Target title (optional)</span>
              <input class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="title" placeholder="Auto-generated from the measure and goal">
            </label>
          }

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Baseline FY</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [ngModel]="baselineYearId()" (ngModelChange)="onBaselineYearChange($event)">
                <option [ngValue]="0">—</option>
                @for (y of sortedYears(); track y.id) { <option [ngValue]="y.id">{{ y.name }}</option> }
              </select>
              @if (!baselineYearId()) { <span class="block text-xs text-amber-700 mt-1">Select a baseline year — none could be determined automatically.</span> }
            </label>
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Baseline period</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="baselineQuarter" (ngModelChange)="refreshPreview()">
                <option value="FY">Full year</option>
                <option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
              </select>
            </label>
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Target FY</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [ngModel]="targetYearId()" (ngModelChange)="onTargetYearChange($event)">
                <option [ngValue]="0">—</option>
                @for (y of sortedYears(); track y.id) { <option [ngValue]="y.id">{{ y.name }}</option> }
              </select>
              @if (!targetYearId()) { <span class="block text-xs text-amber-700 mt-1">Select a target year — none could be determined automatically.</span> }
            </label>
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Target period</span>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="targetQuarter" (ngModelChange)="refreshPreview()">
                <option value="FY">Full year</option>
                <option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label class="block">
              <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Goal ({{ unit() }}) *</span>
              <input type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="goal" placeholder="e.g. 320000">
            </label>
            @if (direction === 'maintain') {
              <label class="block">
                <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Tolerance</span>
                <input type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="toleranceValue">
              </label>
              <label class="block">
                <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Tolerance unit</span>
                <select class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="toleranceUnit">
                  <option value="absolute">Absolute</option><option value="percent">Percent</option>
                </select>
              </label>
            } @else {
              <label class="block">
                <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Owner label</span>
                <input class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="ownerLabel" placeholder="e.g. Financial Manager">
              </label>
              <label class="block">
                <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Due date</span>
                <input type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2" [(ngModel)]="dueDate">
              </label>
            }
          </div>

          <!-- Preview -->
          <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-gray-500 uppercase">Period preview (read-only)</span>
              @if (previewLoading()) { <span class="text-xs text-gray-400">Calculating…</span> }
            </div>
            @if (previewError()) {
              <div class="text-xs text-amber-700">{{ previewError() }}</div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div class="font-semibold text-gray-700">Baseline · {{ baselinePreview()?.period?.label || '—' }}</div>
                  <div class="text-gray-600">Subtotal: <strong>{{ baselinePreview()?.subtotal ?? '—' }}</strong> · {{ statusLabel(baselinePreview()?.status) }}</div>
                </div>
                <div>
                  <div class="font-semibold text-gray-700">Target · {{ targetPreview()?.period?.label || '—' }}</div>
                  <div class="text-gray-600">Subtotal: <strong>{{ targetPreview()?.subtotal ?? '—' }}</strong> · {{ statusLabel(targetPreview()?.status) }}</div>
                </div>
              </div>
            }
            @if (warnings().length) {
              <ul class="mt-2 space-y-1">
                @for (w of warnings(); track w) { <li class="text-xs text-amber-700 flex gap-1"><i class="fas fa-triangle-exclamation mt-0.5"></i><span>{{ w }}</span></li> }
              </ul>
            }
          </div>

          @if (formError()) { <div class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ formError() }}</div> }
        </div>

        <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 shrink-0">
          <button type="button" class="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700" (click)="close()">Cancel</button>
          <button type="button" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60" [disabled]="saving()" (click)="save()">
            {{ saving() ? 'Saving…' : (mode() === 'create' ? 'Create target' : 'Link measure') }}
          </button>
        </div>
      </div>
    </div>
  }
  `,
})
export class FinancialTargetEntryComponent {
  private gps = inject(GpsService);

  companyId = input.required<number>();
  years = input<RevenueYearOption[]>([]);

  readonly measures = [
    { code: 'REVENUE_TOTAL', label: 'Combined revenue (domestic + export)' },
    { code: 'REVENUE_EXPORT', label: 'Export revenue' },
  ] as const;

  mode = signal<Mode | null>(null);
  measureCode: string = 'REVENUE_TOTAL';
  direction: Direction = 'increase';
  title = '';
  goal: number | null = null;
  ownerLabel = '';
  dueDate = '';
  toleranceValue: number | null = null;
  toleranceUnit: 'absolute' | 'percent' = 'absolute';
  baselineYearId = signal(0);
  baselineQuarter = 'FY';
  targetYearId = signal(0);
  targetQuarter = 'FY';
  linkTargetId = '';
  /** True once the user changes a year select; deliberate choices are preserved across reopen. */
  private periodsTouched = false;

  targets = signal<GpsTarget[]>([]);
  baselinePreview = signal<any>(null);
  targetPreview = signal<any>(null);
  previewLoading = signal(false);
  previewError = signal<string | null>(null);
  formError = signal<string | null>(null);
  saving = signal(false);
  successTargetId = signal<number | null>(null);
  error = signal<string | null>(null);

  unit = computed(() => 'ZAR');

  /** Financial years ordered by their real period start (the API's `ORDER BY id` is arbitrary). */
  readonly sortedYears = computed(() => {
    const list = [...(this.years() ?? [])];
    return list.sort((a, b) => {
      const ak = this.startKey(a);
      const bk = this.startKey(b);
      if (ak == null && bk == null) return 0;
      if (ak == null) return 1;
      if (bk == null) return -1;
      if (ak !== bk) return ak - bk;
      return (this.endKey(a) ?? ak) - (this.endKey(b) ?? bk);
    });
  });

  constructor() {
    // (Re)derive the default baseline/target periods whenever the year options arrive or change
    // (e.g. an async load that lands after the dialog opens). A deliberate user selection is
    // never overwritten — only stale ids that no longer resolve are cleared.
    effect(() => {
      const years = this.sortedYears();
      if (!this.mode()) return;
      const valid = years.filter((y) => this.startKey(y) != null);
      if (this.periodsTouched) {
        const ids = new Set(valid.map((y) => y.id));
        if (this.targetYearId() && !ids.has(this.targetYearId())) this.targetYearId.set(0);
        if (this.baselineYearId() && !ids.has(this.baselineYearId())) this.baselineYearId.set(0);
        return;
      }
      if (!valid.length) return;
      this.applyPeriodDefaults();
      this.refreshPreview();
    });
  }

  /** Target = current/open/latest applicable year; baseline = its immediate predecessor. */
  private applyPeriodDefaults(): void {
    const valid = this.sortedYears().filter((y) => this.startKey(y) != null);
    const target = this.pickTargetYear(valid);
    this.targetYearId.set(target?.id ?? 0);
    const idx = target ? valid.findIndex((y) => y.id === target.id) : -1;
    this.baselineYearId.set(idx > 0 ? valid[idx - 1].id : 0);
  }

  /**
   * The "current/open/latest applicable" year: the year whose period contains today, else the
   * active (open) year, else the latest year by period. Never an arbitrary array position.
   */
  private pickTargetYear(valid: RevenueYearOption[]): RevenueYearOption | null {
    if (!valid.length) return null;
    const now = new Date();
    const todayKey = now.getFullYear() * 12 + now.getMonth();
    const current = valid.find((y) => {
      const s = this.startKey(y);
      const e = this.endKey(y);
      return s != null && e != null && todayKey >= s && todayKey <= e;
    });
    if (current) return current;
    const active = valid.find((y) => y.isActive);
    if (active) return active;
    return valid[valid.length - 1];
  }

  /** Comparable month ordinal (year * 12 + month); null when the period cannot be determined. */
  private startKey(y: RevenueYearOption): number | null {
    if (y.startYear == null || y.startMonth == null) return null;
    return y.startYear * 12 + (y.startMonth - 1);
  }

  private endKey(y: RevenueYearOption): number | null {
    const start = this.startKey(y);
    if (y.endYear != null && y.endMonth != null) return y.endYear * 12 + (y.endMonth - 1);
    return start == null ? null : start + 11;
  }

  onBaselineYearChange(id: number): void {
    this.baselineYearId.set(Number(id) || 0);
    this.periodsTouched = true;
    this.refreshPreview();
  }

  onTargetYearChange(id: number): void {
    this.targetYearId.set(Number(id) || 0);
    this.periodsTouched = true;
    this.refreshPreview();
  }

  warnings = computed(() => {
    const out: string[] = [];
    const b = this.baselinePreview();
    const t = this.targetPreview();
    for (const [name, p] of [['Baseline', b], ['Target', t]] as const) {
      if (!p) continue;
      if (p.status === 'no_accounts') out.push(`${name} period: no accounts resolve for this measure.`);
      else if (p.status === 'partial_coverage') out.push(`${name} period: partial coverage — the subtotal is partial revenue, not combined revenue.`);
      else if (p.status === 'unknown') out.push(`${name} period: zero-filled records — completeness cannot be confirmed.`);
      else if (p.status === 'incomplete') out.push(`${name} period: identifiable financial data is missing (row/month).`);
      if (p.unresolved_rows) out.push(`${name} period: ${p.unresolved_rows} financial row(s) excluded (unresolved account).`);
    }
    return out;
  });

  open(mode: Mode): void {
    this.mode.set(mode);
    this.formError.set(null);
    this.successTargetId.set(null);
    this.error.set(null);
    this.baselineQuarter = 'FY';
    this.targetQuarter = 'FY';
    this.goal = null;
    this.title = '';
    this.linkTargetId = '';
    if (mode === 'link') this.loadTargets();
  }

  close(): void {
    this.mode.set(null);
  }

  private loadTargets(): void {
    this.gps.listTargets(this.companyId()).subscribe({
      next: rows => this.targets.set(rows || []),
      error: () => this.targets.set([]),
    });
  }

  private period(type: string, yearId: number, quarter: string): { period_type: string; period_ref: string } {
    if (quarter === 'FY') return { period_type: 'financial_year', period_ref: String(yearId) };
    return { period_type: 'quarter', period_ref: `${yearId}:Q${quarter}` };
  }

  refreshPreview(): void {
    const cid = this.companyId();
    if (!cid) return;
    if (this.baselineYearId() === 0 || this.targetYearId() === 0) { this.baselinePreview.set(null); this.targetPreview.set(null); return; }
    const b = this.period('baseline', this.baselineYearId(), this.baselineQuarter);
    const t = this.period('target', this.targetYearId(), this.targetQuarter);
    this.previewLoading.set(true);
    this.previewError.set(null);
    forkJoin({
      baseline: this.gps.measurePreview(cid, this.measureCode, b.period_type, b.period_ref),
      target: this.gps.measurePreview(cid, this.measureCode, t.period_type, t.period_ref),
    }).subscribe({
      next: res => { this.baselinePreview.set(res.baseline?.period ?? null); this.targetPreview.set(res.target?.period ?? null); this.previewLoading.set(false); },
      error: e => { this.previewLoading.set(false); this.previewError.set(e.error?.error || e.message); this.baselinePreview.set(null); this.targetPreview.set(null); },
    });
  }

  save(): void {
    if (this.mode() === 'link' && !this.linkTargetId) { this.formError.set('Select an existing target to link.'); return; }
    if (!this.targetYearId()) { this.formError.set('Select a target financial year — none could be determined automatically.'); return; }
    if (!this.baselineYearId()) { this.formError.set('Select a baseline financial year — none could be determined automatically.'); return; }
    if (this.goal === null || this.goal === undefined || String(this.goal) === '') { this.formError.set('A goal value is required.'); return; }
    if (this.direction === 'maintain' && (this.toleranceValue === null || this.toleranceValue === undefined)) { this.formError.set('A tolerance value is required when direction is maintain.'); return; }

    const b = this.period('baseline', this.baselineYearId(), this.baselineQuarter);
    const t = this.period('target', this.targetYearId(), this.targetQuarter);
    const base: Record<string, unknown> = {
      metric_code: this.measureCode,
      target_value: this.goal,
      direction: this.direction,
      baseline_period_type: b.period_type,
      baseline_period_ref: b.period_ref,
      target_period_type: t.period_type,
      target_period_ref: t.period_ref,
    };
    if (this.direction === 'maintain') {
      base['maintain_tolerance_value'] = this.toleranceValue;
      base['maintain_tolerance_unit'] = this.toleranceUnit;
    }

    let payload: Record<string, unknown>;
    if (this.mode() === 'link') {
      payload = { ...base, gps_target_id: Number(this.linkTargetId) };
    } else {
      payload = {
        ...base,
        company_id: this.companyId(),
        title: this.title.trim() || `Grow ${this.measureCode === 'REVENUE_EXPORT' ? 'export' : 'combined'} revenue to ${this.goal}`,
        category: 'finance',
        owner_label: this.ownerLabel.trim() || null,
        due_date: this.dueDate || null,
      };
    }

    this.saving.set(true); this.formError.set(null);
    const obs = this.mode() === 'link' ? this.gps.linkMeasure(payload) : this.gps.createFromMeasure(payload);
    obs.subscribe({
      next: (res: any) => {
        this.saving.set(false);
        const id = res?.target?.id ?? Number(res?.target_id) ?? null;
        this.successTargetId.set(id);
        this.close();
      },
      error: e => { this.saving.set(false); this.formError.set(e.error?.error || e.message); },
    });
  }

  statusLabel(status: string | undefined | null): string {
    if (!status) return '—';
    return String(status).replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase());
  }
}
