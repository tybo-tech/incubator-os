import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICompany } from '../../../../../models/simple.schema';
import { MetricsService } from '../../../../../services/metrics.service';
import { ToastService } from '../../../../services/toast.service';
import { MetricsHierarchy, IMetricRecord, IMetricGroup, IMetricType } from '../../../../../models/metrics.model';

@Component({
  selector: 'app-metrics-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  // Editing state
  addingYearForType: { [typeId: number]: boolean } = {};
  newYearInput: { [typeId: number]: number | null } = {};
  savingRecord: { [recordId: number]: boolean } = {};
  dirtyRecords: Set<number> = new Set();

  // Local mutable draft values keyed by record id
  draft: { [recordId: number]: Partial<IMetricRecord> } = {};
  // Revenue lookup cache (year -> revenue total)
  private revenueTotalsByYear = new Map<number, number>();

  constructor(private metricsService: MetricsService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }
  refresh() { this.load(); }

  private load() {
    if (!this.company?.id) return;
    this.loading.set(true); this.error.set(null);
    this.metricsService.fullMetrics(this.clientId, this.company.id, this.programId, this.cohortId).subscribe({
      next: (groups) => {
        this.normalizeHierarchy(groups);
        this.hierarchy.set(groups);
        this.refreshDerivedCaches();
        this.loading.set(false);
      },
      error: (err) => { console.error(err); this.error.set('Failed to load metrics'); this.loading.set(false); }
    });
  }

  get displayedHierarchy() {
    const groups = this.hierarchy();
    if (this.filterGroupId) return groups.filter(g => g.id === this.filterGroupId);
    return groups;
  }

  // ----- Editing Helpers -----
  startAddYear(type: IMetricType) {
    this.addingYearForType[type.id] = true;
    this.newYearInput[type.id] = this.suggestNextYear(type);
  }

  cancelAddYear(type: IMetricType) {
    this.addingYearForType[type.id] = false;
    this.newYearInput[type.id] = null;
  }

  suggestNextYear(type: IMetricType): number {
    const years = (type.records || []).map(r => r.year).sort((a,b)=>b-a);
    return years.length ? years[0] + 1 : (new Date().getFullYear());
  }

  addYear(type: IMetricType) {
    const year = this.newYearInput[type.id];
    if (!year) return;
    // Prevent duplicate year
    if (type.records?.some(r => r.year === year)) { this.toast.warning('Year already exists'); return; }
    const optimistic: IMetricRecord = {
      id: -Date.now(), // temp id
      metric_type_id: type.id,
      client_id: this.clientId,
      company_id: this.company.id,
      program_id: this.programId,
      cohort_id: this.cohortId,
      year,
      unit: type.unit ?? 'ZAR'
    } as IMetricRecord;
    // Ensure array
    if (!type.records) type.records = [];
    type.records = [optimistic, ...type.records].sort((a,b)=> b.year - a.year);
    this.addingYearForType[type.id] = false;
    this.metricsService.addRecord({
      client_id: this.clientId,
      company_id: this.company.id,
      program_id: this.programId,
      cohort_id: this.cohortId,
      metric_type_id: type.id,
      year
    }).subscribe({
      next: saved => {
        // Replace temp record
        type.records = (type.records||[]).map(r => r.id === optimistic.id ? saved : r)
          .sort((a,b)=> b.year - a.year);
        this.toast.success('Year added');
        this.reloadTypeRecords(type);
        this.refreshDerivedCaches();
      },
      error: err => {
        console.error(err);
        // Rollback optimistic
        type.records = (type.records||[]).filter(r => r.id !== optimistic.id);
        this.toast.error('Failed to add year');
      }
    });
  }

  editField(record: IMetricRecord, field: keyof IMetricRecord, value: any) {
    if (!['q1','q2','q3','q4'].includes(field)) return; // only quarters editable
    if (!this.draft[record.id]) this.draft[record.id] = {};
    (this.draft[record.id] as any)[field] = (value === '' ? null : Number(value));
    // Do not persist total/margin in draft; they are derived live.
    this.dirtyRecords.add(record.id);
    this.refreshDerivedCaches();
  }

  computeRowTotal(record: IMetricRecord): number | null {
    const d = this.draft[record.id] || {};
    // Force numeric coercion in case backend delivered strings
    const q1 = Number(d.q1 ?? record.q1 ?? 0) || 0;
    const q2 = Number(d.q2 ?? record.q2 ?? 0) || 0;
    const q3 = Number(d.q3 ?? record.q3 ?? 0) || 0;
    const q4 = Number(d.q4 ?? record.q4 ?? 0) || 0;
    const sum = q1 + q2 + q3 + q4;
    return Number.isFinite(sum) ? sum : null;
  }

  saveRecord(type: IMetricType, record: IMetricRecord) {
    if (!this.dirtyRecords.has(record.id)) return;
    const changes = this.draft[record.id];
    if (!changes) return;
    this.savingRecord[record.id] = true;
    const snapshot = { ...record }; // rollback snapshot
    // Optimistic: merge into visible record immediately
    Object.assign(record, changes);
    // Derived values (compute before sending to backend)
    record.total = this.computeRowTotal(record) ?? null;
    record.margin_pct = this.computeMargin(record, type);
    const updatePayload: any = {
      id: record.id,
      q1: record.q1 ?? null,
      q2: record.q2 ?? null,
      q3: record.q3 ?? null,
      q4: record.q4 ?? null,
      total: record.total ?? null,
      margin_pct: record.margin_pct ?? null
    };
    this.metricsService.updateRecord(updatePayload).subscribe({
      next: updated => {
        Object.assign(record, updated);
        // Re-normalize & re-derive (backend might not recompute derived fields)
        record.total = this.computeRowTotal(record) ?? (record.total ?? null);
        record.margin_pct = this.computeMargin(record, type);
        delete this.draft[record.id];
        this.dirtyRecords.delete(record.id);
        delete this.savingRecord[record.id];
        this.refreshDerivedCaches();
        this.toast.success('Saved');
      },
      error: err => {
        console.error(err);
        Object.assign(record, snapshot); // rollback
        this.toast.error('Failed to save');
        delete this.savingRecord[record.id];
      }
    });
  }

  // ----- Template helpers -----
  isAddingYear(type: IMetricType) { return !!this.addingYearForType[type.id]; }
  isSaving(record: IMetricRecord) { return !!this.savingRecord[record.id]; }
  isDirty(record: IMetricRecord) { return this.dirtyRecords.has(record.id); }
  fieldDraft(record: IMetricRecord, field: keyof IMetricRecord): any {
    return (this.draft[record.id] && (this.draft[record.id] as any)[field]) ?? (record as any)[field];
  }

  computeMargin(record: IMetricRecord, type?: IMetricType): number | null {
    const t = type ?? this.findTypeOfRecord(record);
    if (!t || t.show_margin !== 1) return null;
    const total = this.computeRowTotal(record) ?? record.total ?? null;
    if (total == null) return null;
    const rev = this.revenueTotalsByYear.get(record.year);
    if (rev == null || rev === 0) return null;
    // Return ratio (0-1). UI will format as %.
    return total / rev;
  }

  private findTypeOfRecord(rec: IMetricRecord): IMetricType | null {
    for (const g of this.hierarchy()) {
      const type = g.types?.find(t => t.id === rec.metric_type_id);
      if (type) return type;
    }
    return null;
  }

  private buildRevenueIndex() {
    this.revenueTotalsByYear.clear();
    const groups = this.hierarchy();
    // Collect candidate revenue types (flexible matching: code or name contains 'REV')
    const candidateTypes: IMetricType[] = [];
    for (const g of groups) {
      const gName = (g.code || g.name || '').toUpperCase();
      g.types?.forEach(t => {
        const tName = (t.code + ' ' + t.name).toUpperCase();
        if (gName.includes('REV') || tName.includes('REV')) candidateTypes.push(t);
      });
    }
    if (candidateTypes.length === 0) return; // no revenue present yet
    // Prefer an explicit TOTAL revenue type
    let revenueType = candidateTypes.find(t => (t.code || '').toUpperCase().includes('TOTAL'))
      || candidateTypes.find(t => (t.code || '').toUpperCase() === 'REVENUE_TOTAL')
      || candidateTypes[0];
    revenueType.records?.forEach(r => {
      const total = this.computeRowTotal(r) ?? r.total ?? null;
      if (r.year && total != null) this.revenueTotalsByYear.set(r.year, Number(total));
    });
  }

  private refreshDerivedCaches() { this.buildRevenueIndex(); }

  // Bulk save all dirty records
  saveAllDirty() {
    for (const g of this.displayedHierarchy) {
      g.types?.forEach(t => t.records?.forEach(r => { if (this.isDirty(r)) this.saveRecord(t, r); }));
    }
  }

  trackByRecord(index: number, rec: IMetricRecord) { return rec.id; }

  deleteRecord(type: IMetricType, record: IMetricRecord) {
    if (record.id < 0) { // optimistic unsaved
      type.records = (type.records||[]).filter(r => r.id !== record.id);
      return;
    }
    if (!confirm(`Delete year ${record.year}?`)) return;
    const prev = type.records || [];
    type.records = prev.filter(r => r.id !== record.id);
    this.metricsService.deleteRecord(record.id).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Deleted');
        } else {
          type.records = prev; this.toast.error('Delete failed');
        }
      },
      error: err => { console.error(err); type.records = prev; this.toast.error('Delete failed'); }
    });
  }

  private reloadTypeRecords(type: IMetricType) {
    this.metricsService.listRecords(type.id, this.company.id, this.programId, this.cohortId).subscribe({
      next: records => {
        // ensure year mapping (API might send year_)
        (records as any[]).forEach(r => { if ((r as any).year_ && !r.year) r.year = (r as any).year_; });
        records.forEach(r => this.normalizeRecord(r, type));
        type.records = records.sort((a,b)=> b.year - a.year);
        this.refreshDerivedCaches();
      },
      error: err => console.error('Failed to reload records', err)
    });
  }

  // ----- Normalization helpers -----
  private normalizeHierarchy(groups: MetricsHierarchy) {
    groups.forEach(g => g.types?.forEach(t => {
      t.records?.forEach(r => this.normalizeRecord(r, t));
    }));
    this.normalizeMarginsInPlace(groups);
  }

  private normalizeRecord(r: IMetricRecord, type?: IMetricType) {
    // Coerce numerics (backend may send strings)
    r.year = Number(r.year);
    r.q1 = r.q1 == null ? null : Number(r.q1);
    r.q2 = r.q2 == null ? null : Number(r.q2);
    r.q3 = r.q3 == null ? null : Number(r.q3);
    r.q4 = r.q4 == null ? null : Number(r.q4);
    r.total = r.total == null ? null : Number(r.total);
    r.margin_pct = r.margin_pct == null ? null : Number(r.margin_pct);
    // Normalize legacy stored percentage (e.g. 53 -> 0.53)
    if (r.margin_pct != null && r.margin_pct > 1) r.margin_pct = r.margin_pct / 100;
    if (!r.unit && type?.unit) r.unit = type.unit;
  }

  private normalizeMarginsInPlace(groups: MetricsHierarchy) {
    groups.forEach(g => g.types?.forEach(t => {
      if (t.show_margin === 1) {
        t.records?.forEach(r => {
          if (r.margin_pct != null && r.margin_pct > 1) r.margin_pct = r.margin_pct / 100;
        });
      }
    }));
  }
}
