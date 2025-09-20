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

  constructor(private metricsService: MetricsService, private toast: ToastService) {}

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
      unit: type.unit || 'ZAR'
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
        // Reload just this type's records to avoid any mapping inconsistencies
        this.reloadTypeRecords(type);
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
    const numFields: (keyof IMetricRecord)[] = ['q1','q2','q3','q4','total','margin_pct'];
    if (!this.draft[record.id]) this.draft[record.id] = {};
    (this.draft[record.id] as any)[field] = numFields.includes(field) ? (value === '' ? null : Number(value)) : value;
    // Auto compute total if user isn't explicitly overriding total
    if (['q1','q2','q3','q4'].includes(field) && (this.draft[record.id] as any)['total'] == null) {
      (this.draft[record.id] as any)['total'] = this.computeRowTotal(record);
    }
    // Auto compute margin if quarters or total changed and margin not explicitly changed
    if ((['q1','q2','q3','q4','total'].includes(field)) && (this.draft[record.id] as any)['margin_pct'] == null) {
      const margin = this.computeMargin(record);
      if (margin != null) (this.draft[record.id] as any)['margin_pct'] = margin;
    }
    this.dirtyRecords.add(record.id);
  }

  computeRowTotal(record: IMetricRecord): number | null {
    const draft = this.draft[record.id] || {};
    const q1 = draft.q1 ?? record.q1 ?? 0;
    const q2 = draft.q2 ?? record.q2 ?? 0;
    const q3 = draft.q3 ?? record.q3 ?? 0;
    const q4 = draft.q4 ?? record.q4 ?? 0;
    const explicit = draft.total ?? record.total;
    return explicit ?? (q1+q2+q3+q4);
  }

  saveRecord(type: IMetricType, record: IMetricRecord) {
    if (!this.dirtyRecords.has(record.id)) return;
    const changes = this.draft[record.id];
    if (!changes) return;
    this.savingRecord[record.id] = true;
    const snapshot = { ...record }; // rollback snapshot
    // Optimistic: merge into visible record immediately
    Object.assign(record, changes);
    // Auto fill total if missing
    if (record.total == null) record.total = this.computeRowTotal(record) ?? null;
    if (record.margin_pct == null) record.margin_pct = this.computeMargin(record);
    this.metricsService.updateRecord({ id: record.id, ...changes }).subscribe({
      next: updated => {
        Object.assign(record, updated);
        delete this.draft[record.id];
        this.dirtyRecords.delete(record.id);
        delete this.savingRecord[record.id];
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

  computeMargin(record: IMetricRecord): number | null {
    const draft = this.draft[record.id] || {};
    const total = (draft.total ?? record.total);
    // Example: margin = (q1 - cost etc.) -- since we only have total & quarters we can't infer; placeholder logic use total vs sum.
    // If definition differs, adjust here. For now margin derived as (sum quarters != 0) ? total / sumQuarters * 100 : null when total provided.
    const q1 = draft.q1 ?? record.q1 ?? 0;
    const q2 = draft.q2 ?? record.q2 ?? 0;
    const q3 = draft.q3 ?? record.q3 ?? 0;
    const q4 = draft.q4 ?? record.q4 ?? 0;
    const sum = q1 + q2 + q3 + q4;
    if (total == null || sum === 0) return null;
    const pct = (total / sum) * 100;
    return Math.round(pct * 100) / 100;
  }

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
        type.records = records.sort((a,b)=> b.year - a.year);
      },
      error: err => console.error('Failed to reload records', err)
    });
  }
}
