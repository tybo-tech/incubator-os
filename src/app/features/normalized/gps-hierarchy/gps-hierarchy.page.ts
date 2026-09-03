import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GpsService, GpsTarget, GpsTask, GpsUpdate, GpsTargetSource } from '../services/gps.service';
import { SwotService } from '../services/swot.service';

@Component({
  selector: 'app-gps-hierarchy',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { --ios-navy:#0f1a31; --ios-blue:#1763ff; --ios-purple:#7c3aed; --ios-green:#079447; --ios-orange:#e95a0c; --ios-red:#d92d20; --ios-ink:#15213a; --ios-copy:#41516d; --ios-muted:#71809a; --ios-line:#dfe5ee; --ios-canvas:#f6f8fb; --ios-white:#fff; --ios-blue-soft:#edf4ff; --ios-green-soft:#ecfdf3; --ios-red-soft:#fff1f0; --ios-orange-soft:#fff7ed; display:block; background:var(--ios-canvas); min-height:100%; }
    .ios-wrap{ max-width:1100px; margin:0 auto; padding:19px 20px 28px; }
    .ios-heading{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px; }
    .ios-title{ font-size:19px; font-weight:700; margin:0; color:var(--ios-ink); }
    .ios-subtitle{ color:var(--ios-copy); font-size:12px; margin:4px 0 0; }
    .ios-primary{ border:0; border-radius:6px; background:var(--ios-blue); color:#fff; padding:9px 13px; cursor:pointer; font-size:12px; font-weight:600; }
    .ios-secondary{ border:1px solid var(--ios-line); border-radius:6px; background:var(--ios-white); color:var(--ios-ink); padding:7px 10px; cursor:pointer; font-size:11px; }
    .ios-danger{ border:0; border-radius:6px; background:var(--ios-red); color:#fff; padding:6px 10px; cursor:pointer; font-size:11px; }
    .ios-summary-bar{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
    .ios-chip{ background:var(--ios-white); border:1px solid var(--ios-line); border-radius:999px; padding:6px 10px; font-size:11px; color:var(--ios-ink); }
    .ios-chip.muted{ background:#f1f5f9; }
    .ios-target-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ios-category{ background:var(--ios-white); border:1px solid var(--ios-line); border-radius:9px; padding:14px; }
    .ios-category-title{ font-size:13px; font-weight:700; margin-bottom:10px; display:flex; justify-content:space-between; color:var(--ios-ink); }
    .ios-target{ border:1px solid #d9d8f7; border-left:3px solid var(--ios-purple); border-radius:7px; background:var(--ios-white); padding:12px; margin-top:9px; }
    .ios-target-top{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .ios-target-title{ font-size:12px; font-weight:700; color:var(--ios-ink); }
    .ios-source{ color:var(--ios-muted); font-size:10px; margin-top:6px; display:flex; gap:5px; align-items:center; }
    .ios-source strong{ color:var(--ios-copy); font-weight:600; }
    .ios-target-meta{ display:flex; gap:10px; color:var(--ios-muted); font-size:10px; margin-top:5px; flex-wrap:wrap; }
    .ios-status{ border-radius:999px; padding:3px 7px; background:var(--ios-orange-soft); color:var(--ios-orange); font-size:10px; font-weight:700; white-space:nowrap; }
    .ios-progress-row{ display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; margin-top:10px; }
    .ios-progress{ height:6px; background:#e9edf4; border-radius:999px; overflow:hidden; } .ios-progress>span{ display:block; height:100%; border-radius:inherit; background:var(--ios-purple); }
    .ios-progress-value{ color:var(--ios-copy); font-size:10px; font-weight:700; }
    .ios-expand{ border-top:1px dashed var(--ios-line); margin-top:11px; padding-top:10px; display:grid; gap:10px; }
    .ios-tasks{ display:grid; gap:5px; }
    .ios-task{ display:grid; grid-template-columns:16px 1fr auto; gap:7px; align-items:center; min-height:25px; font-size:11px; }
    .ios-task.done .ios-task-name{ color:var(--ios-muted); text-decoration:line-through; }
    .ios-task-owner{ color:var(--ios-muted); font-size:10px; }
    .ios-link-button{ border:0; background:transparent; color:var(--ios-blue); cursor:pointer; font-size:11px; font-weight:600; padding:4px; }
    .ios-input{ border:1px solid var(--ios-line); border-radius:6px; padding:7px 9px; font-size:12px; width:100%; }
    .ios-select{ border:1px solid var(--ios-line); border-radius:6px; padding:7px 9px; font-size:12px; background:#fff; }
    .ios-textarea{ border:1px solid var(--ios-line); border-radius:6px; padding:7px 9px; font-size:12px; width:100%; min-height:60px; }
    .ios-error{ background:#fff1f0; border:1px solid #fecdca; color:#d92d20; border-radius:6px; padding:8px 10px; font-size:11px; }
    .ios-success{ background:#ecfdf3; border:1px solid #a6f4c5; color:#079447; border-radius:6px; padding:8px 10px; font-size:11px; }
    .ios-modal{ position:fixed; inset:0; background:rgba(15,26,49,0.45); display:grid; place-items:center; z-index:50; padding:16px; }
    .ios-modal-card{ background:var(--ios-white); border-radius:10px; padding:16px; width:100%; max-width:520px; max-height:90vh; overflow:auto; border:1px solid var(--ios-line); }
    @media(max-width:760px){ .ios-target-grid{ grid-template-columns:1fr; } .ios-heading{ display:block; } }
  `],
  template: `
  <div class="ios-wrap">
    <div class="ios-heading">
      <div><h2 class="ios-title">GPS Targets</h2><p class="ios-subtitle">Track measurable outcomes while preserving the strategic source behind each target. Company {{ companyId() }}</p></div>
      <button class="ios-primary" type="button" (click)="openCreate()">+ Add independent target</button>
    </div>

    @if (loading()) { <div style="color:var(--ios-muted); font-size:12px;">Loading…</div> }
    @if (error()) { <div class="ios-error">{{ error() }}</div> }
    @if (successMsg()) { <div class="ios-success">{{ successMsg() }}</div> }

    <div class="ios-summary-bar">
      <span class="ios-chip">Total: {{ total() }}</span>
      @if (counts(); as c) {
        <span class="ios-chip muted">Overdue: {{ c.counts?.overdue ?? c.overdue ?? 0 }}</span>
        <span class="ios-chip muted">At risk: {{ c.counts?.at_risk ?? c.at_risk ?? 0 }}</span>
        <span class="ios-chip muted">Due this month: {{ c.counts?.due_30_days ?? c.due_this_month ?? 0 }}</span>
        <span class="ios-chip muted">By status — not_started {{ c.counts?.not_started ?? 0 }} · in_progress {{ c.counts?.in_progress ?? 0 }} · completed {{ c.counts?.completed ?? 0 }}</span>
      }
      <a [routerLink]="['/company', companyId(), 'swot-v2']" class="ios-chip" style="color:var(--ios-blue)">← SWOT Workspace</a>
      <button class="ios-secondary" (click)="load()">Refresh</button>
    </div>

    <div class="ios-target-grid">
      @for (cat of categories; track cat.key) {
        <section class="ios-category">
          <div class="ios-category-title"><span>{{ cat.label }}</span><span style="color:var(--ios-purple)">{{ grouped()[cat.key]?.length || 0 }} targets</span></div>

          @if (!(grouped()[cat.key]?.length)) { <div style="color:var(--ios-muted); font-size:11px; border:1px dashed #cbd3e0; border-radius:7px; padding:10px; text-align:center;">No targets in {{ cat.label }}.</div> }
          @else {
            @for (t of grouped()[cat.key]; track t.id) {
              <div class="ios-target">
                <div class="ios-target-top"><div><div class="ios-target-title">{{ t.title }}</div>
                  <div class="ios-source">
                    @if (sources()[t.id] === undefined) { <span>Loading source…</span> }
                    @else if (hasSwotSource(t.id)) {
                      @for (s of swotSources(t.id); track s.id) {
                        <span>From SWOT {{ s.swot_category || 'finding' }}: <strong>{{ s.swot_description || ('#'+s.swot_item_id) }}</strong></span>
                      }
                    } @else {
                      <span>Legacy import — not linked to a SWOT item</span>
                    }
                  </div>
                </div><span class="ios-status">{{ t.manual_progress_percentage }}%</span></div>
                <div class="ios-target-meta"><span>{{ t.category }}</span><span>Due {{ t.due_date || '—' }}</span><span>Owner: {{ t.owner_label || '—' }}</span><span>{{ t.status }} · {{ t.priority }}</span></div>
                <div class="ios-progress-row"><div class="ios-progress" [attr.aria-label]="'Progress ' + t.manual_progress_percentage + '%'"><span [style.width.%]="t.manual_progress_percentage"></span></div><span class="ios-progress-value">{{ t.manual_progress_percentage }}% · {{ t.progress_mode }}</span></div>
                <div class="flex gap-2 mt-2 flex-wrap">
                  <button class="ios-link-button" (click)="toggleExpand(t.id)">{{ expanded().has(t.id) ? 'Hide details' : 'Show tasks & updates' }}</button>
                  <button class="ios-link-button" (click)="openEdit(t)">Edit</button>
                  <button class="ios-link-button" style="color:var(--ios-red)" (click)="deleteTarget(t)">Delete</button>
                </div>

                @if (expanded().has(t.id)) {
                  <div class="ios-expand">
                    <!-- provenance detail -->
                    <div style="font-size:11px;">
                      <div style="font-weight:700; color:var(--ios-ink); margin-bottom:4px;">Provenance</div>
                      @if (sources()[t.id] === undefined) { <span style="color:var(--ios-muted)">Loading…</span> }
                      @else if (sources()[t.id].length===0) { <span style="color:var(--ios-muted)">No source record.</span> }
                      @else {
                        @for (s of sources()[t.id]; track s.id) {
                          <div style="background:#f8fafc; border:1px solid var(--ios-line); border-radius:6px; padding:6px 8px; margin-bottom:4px;">
                            <span style="font-size:10px; color:var(--ios-muted)">{{ s.source_type }}</span> — @if (s.swot_item_id) { <span>SWOT #{{ s.swot_item_id }} <span style="color:var(--ios-muted)">({{ s.swot_category || '' }})</span> — {{ s.swot_description || '' }}</span> } @else { <span>Legacy import — not linked to a SWOT item</span> }
                            @if (s.notes) { <div style="color:var(--ios-muted); font-size:10px;">{{ s.notes }}</div> }
                          </div>
                        }
                      }
                    </div>

                    <!-- tasks -->
                    <div>
                      <div style="font-weight:700; font-size:11px; color:var(--ios-ink); margin-bottom:4px;">Tasks — {{ tasks()[t.id]?.length || 0 }} · Progress {{ t.manual_progress_percentage }}% (backend-driven)</div>
                      @if (tasks()[t.id] === undefined) { <span style="color:var(--ios-muted); font-size:11px;">Loading tasks…</span> }
                      @else {
                        <div class="ios-tasks">
                          @for (task of tasks()[t.id]; track task.id) {
                            <label class="ios-task" [class.done]="task.status==='completed'">
                              <input type="checkbox" [checked]="task.status==='completed'" (change)="toggleTask(task)" />
                              <span class="ios-task-name">{{ task.title }} <span style="color:var(--ios-muted); font-size:10px;">· {{ task.status }} · due {{ task.due_date || '—' }}</span></span>
                              <span class="ios-task-owner">
                                <button class="ios-link-button" (click)="editTask(task)">Edit</button>
                                <button class="ios-link-button" (click)="deleteTask(task)">Delete</button>
                                <button class="ios-link-button" (click)="moveTask(task,-1)">↑</button>
                                <button class="ios-link-button" (click)="moveTask(task,1)">↓</button>
                              </span>
                            </label>
                          }
                          @if (tasks()[t.id].length===0) { <span style="color:var(--ios-muted); font-size:11px;">No tasks yet.</span> }
                        </div>
                        <div class="flex gap-2 mt-2">
                          <input class="ios-input flex-1" placeholder="New task title" [(ngModel)]="newTaskTitle[t.id]" (keyup.enter)="addTask(t.id)" />
                          <button class="ios-secondary" (click)="addTask(t.id)">Add task</button>
                        </div>
                      }
                    </div>

                    <!-- updates -->
                    <div>
                      <div style="font-weight:700; font-size:11px; color:var(--ios-ink); margin-bottom:4px;">Progress updates — newest first</div>
                      @if (updates()[t.id] === undefined) { <span style="color:var(--ios-muted); font-size:11px;">Loading updates…</span> }
                      @else {
                        @for (u of updates()[t.id]; track u.id) {
                          <div style="background:#f8fafc; border:1px solid var(--ios-line); border-radius:6px; padding:6px 8px; margin-bottom:4px; font-size:11px;">
                            <div style="display:flex; justify-content:space-between;"><span style="font-weight:600;">{{ u.status }} · {{ u.progress_percentage }}%</span><span style="color:var(--ios-muted)">{{ u.recorded_at }}</span></div>
                            @if (u.note) { <div style="color:var(--ios-copy); margin-top:2px;">{{ u.note }}</div> }
                            <div style="color:var(--ios-muted); font-size:10px;">by {{ u.recorded_by || '—' }}</div>
                          </div>
                        }
                        @if (updates()[t.id].length===0) { <span style="color:var(--ios-muted); font-size:11px;">No updates yet.</span> }
                      }
                      <div class="grid grid-cols-2 gap-2 mt-2">
                        <input class="ios-input" type="number" min="0" max="100" placeholder="Progress %" [(ngModel)]="newUpdateProgress[t.id]" />
                        <select class="ios-select" [(ngModel)]="newUpdateStatus[t.id]">
                          <option value="not_started">not_started</option><option value="in_progress">in_progress</option><option value="at_risk">at_risk</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
                        </select>
                        <textarea class="ios-textarea col-span-2" placeholder="Note (optional)" [(ngModel)]="newUpdateNote[t.id]"></textarea>
                      </div>
                      @if (updateError()[t.id]) { <div class="ios-error mt-1">{{ updateError()[t.id] }}</div> }
                      <button class="ios-primary mt-2" (click)="addUpdate(t.id)">Add update</button>
                    </div>

                    <div style="font-size:10px; color:var(--ios-muted)">Dates — due: {{ t.due_date || '—' }} · created: {{ t.legacy_node_id ? 'legacy #'+t.legacy_node_id : '—' }} · path: {{ t.legacy_path || '—' }}</div>
                  </div>
                }
              </div>
            }
          }
        </section>
      }
    </div>

    <div style="font-size:11px; color:var(--ios-muted); margin-top:12px;">path: company/{{ companyId() }}/gps-targets-v2 · Total {{ total() }} · Overdue/at risk from dashboardCounts</div>
  </div>

  @if (showCreate()) {
    <div class="ios-modal" (click)="showCreate.set(false)">
      <div class="ios-modal-card" (click)="$event.stopPropagation()">
        <h3 style="font-weight:700; font-size:14px;">{{ editingTarget() ? 'Edit GPS target' : 'Add independent target' }}</h3>
        <p style="font-size:11px; color:var(--ios-muted); margin:2px 0 10px;">Company {{ companyId() }} — uses normalized API, no nodes.</p>
        <div class="grid gap-2">
          <input class="ios-input" placeholder="Title (auto from description if blank)" [(ngModel)]="formTitle" />
          <textarea class="ios-textarea" placeholder="Description *" [(ngModel)]="formDescription"></textarea>
          <div class="grid grid-cols-2 gap-2">
            <select class="ios-select" [(ngModel)]="formCategory">
              <option value="finance">Finance</option><option value="strategy_general">Strategy / General</option><option value="sales_marketing">Sales & Marketing</option><option value="personal_development">Personal Development</option>
            </select>
            <select class="ios-select" [(ngModel)]="formPriority">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <select class="ios-select" [(ngModel)]="formStatus">
              <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="at_risk">At risk</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
            <input class="ios-input" type="date" [(ngModel)]="formDueDate" />
          </div>
          <input class="ios-input" placeholder="Owner label" [(ngModel)]="formOwner" />
          <div class="grid grid-cols-2 gap-2">
            <select class="ios-select" [(ngModel)]="formProgressMode">
              <option value="manual">Manual</option><option value="tasks">Tasks</option><option value="metric">Metric</option>
            </select>
            <input class="ios-input" type="number" min="0" max="100" placeholder="Manual progress %" [(ngModel)]="formProgress" />
          </div>
        </div>
        @if (formError()) { <div class="ios-error mt-2">{{ formError() }}</div> }
        <div class="flex gap-2 mt-3">
          <button class="ios-primary" (click)="submitForm()" [disabled]="formLoading()">{{ editingTarget() ? 'Save' : 'Create' }}</button>
          <button class="ios-secondary" (click)="showCreate.set(false)">Cancel</button>
        </div>
      </div>
    </div>
  }
  `,
})
export class GpsHierarchyPage {
  private route = inject(ActivatedRoute);
  private gps = inject(GpsService);
  private swot = inject(SwotService);

  companyId = signal<number>(0);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  grouped = signal<Record<string, GpsTarget[]>>({});
  counts = signal<any>(null);
  expanded = signal<Set<number>>(new Set());
  tasks = signal<Record<number, GpsTask[]>>({});
  updates = signal<Record<number, GpsUpdate[]>>({});
  sources = signal<Record<number, GpsTargetSource[]>>({});

  newTaskTitle: Record<number, string> = {};
  newUpdateProgress: Record<number, number | null> = {};
  newUpdateStatus: Record<number, string> = {};
  newUpdateNote: Record<number, string> = {};
  updateError = signal<Record<number, string | null>>({});

  categories = [
    { key: 'finance', label: 'Finance' },
    { key: 'strategy_general', label: 'Strategy / General' },
    { key: 'sales_marketing', label: 'Sales & Marketing' },
    { key: 'personal_development', label: 'Personal Development' },
  ] as const;

  total = computed(() => Object.values(this.grouped()).reduce((a, b) => a + (b?.length || 0), 0));

  // create/edit form
  showCreate = signal(false);
  editingTarget = signal<GpsTarget | null>(null);
  formTitle = '';
  formDescription = '';
  formCategory: GpsTarget['category'] = 'finance';
  formPriority = 'medium';
  formStatus: GpsTarget['status'] = 'not_started';
  formDueDate = '';
  formOwner = '';
  formProgressMode: GpsTarget['progress_mode'] = 'manual';
  formProgress: number | null = 0;
  formError = signal<string | null>(null);
  formLoading = signal(false);

  ngOnInit(): void {
    // company/:id is the parent CompanyShell route — walk the param chain
    this.route.paramMap.subscribe(pm => {
      const v = Number(pm.get('id') || 0);
      if (v) { this.companyId.set(v); this.load(); }
    });
    this.route.parent?.paramMap.subscribe(pm => {
      const v = Number(pm.get('id') || 0);
      if (v) { this.companyId.set(v); this.load(); }
    });
    // fallback: full snapshot chain (handles deep nesting / first load)
    let r: ActivatedRoute | null = this.route;
    while (r && !this.companyId()) {
      const v = Number(r.snapshot.paramMap.get('id') || 0);
      if (v) { this.companyId.set(v); this.load(); break; }
      r = r.parent;
    }
  }

  load(): void {
    const cid = this.companyId();
    if (!cid) { this.error.set('Missing company id'); return; }
    this.loading.set(true); this.error.set(null);
    this.gps.grouped(cid).subscribe({
      next: g => { this.grouped.set(g || {}); this.loading.set(false); // eager load sources for provenance preview
        const ids: number[] = [];
        for (const arr of Object.values(g || {})) for (const t of arr as GpsTarget[]) ids.push(t.id);
        for (const id of ids) this.loadSources(id);
      },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
    this.gps.dashboardCounts(cid).subscribe({ next: c => this.counts.set(c), error: () => {} });
  }

  hasSwotSource(targetId: number): boolean { return (this.sources()[targetId] || []).some(s => !!s.swot_item_id); }
  swotSources(targetId: number): GpsTargetSource[] { return (this.sources()[targetId] || []).filter(s => !!s.swot_item_id); }

  toggleExpand(id: number): void {
    const s = new Set(this.expanded());
    if (s.has(id)) s.delete(id); else {
      s.add(id);
      if (this.tasks()[id] === undefined) this.loadTasks(id);
      if (this.updates()[id] === undefined) this.loadUpdates(id);
      if (this.sources()[id] === undefined) this.loadSources(id);
    }
    this.expanded.set(s);
  }

  loadTasks(id: number): void { this.gps.tasks(id).subscribe({ next: rows => this.tasks.update(m => ({ ...m, [id]: rows })), error: () => this.tasks.update(m => ({ ...m, [id]: [] })) }); }
  loadUpdates(id: number): void { this.gps.updates(id).subscribe({ next: rows => this.updates.update(m => ({ ...m, [id]: rows })), error: () => this.updates.update(m => ({ ...m, [id]: [] })) }); }
  loadSources(id: number): void { this.gps.listByTarget(id).subscribe({ next: rows => this.sources.update(m => ({ ...m, [id]: rows as any })), error: () => this.sources.update(m => ({ ...m, [id]: [] })) }); }

  openCreate(): void {
    this.editingTarget.set(null);
    this.formTitle=''; this.formDescription=''; this.formCategory='finance'; this.formPriority='medium'; this.formStatus='not_started'; this.formDueDate=''; this.formOwner=''; this.formProgressMode='manual'; this.formProgress=0; this.formError.set(null); this.showCreate.set(true);
  }
  openEdit(t: GpsTarget): void {
    this.editingTarget.set(t);
    this.formTitle=t.title; this.formDescription=t.description; this.formCategory=t.category; this.formPriority=t.priority; this.formStatus=t.status; this.formDueDate=t.due_date || ''; this.formOwner=t.owner_label || ''; this.formProgressMode=t.progress_mode; this.formProgress=t.manual_progress_percentage; this.formError.set(null); this.showCreate.set(true);
  }

  submitForm(): void {
    if (!this.formDescription.trim()) { this.formError.set('Description is required'); return; }
    if (this.formProgress !== null && (this.formProgress <0 || this.formProgress>100)) { this.formError.set('Progress must be 0..100'); return; }
    this.formLoading.set(true); this.formError.set(null);
    const payload: any = {
      company_id: this.companyId(),
      title: this.formTitle.trim() || undefined,
      description: this.formDescription.trim(),
      category: this.formCategory,
      priority: this.formPriority,
      status: this.formStatus,
      due_date: this.formDueDate || undefined,
      owner_label: this.formOwner.trim() || undefined,
      progress_mode: this.formProgressMode,
      manual_progress_percentage: this.formProgress ?? 0,
    };
    const editing = this.editingTarget();
    const obs = editing ? this.gps.updateTarget(editing.id, payload) : this.gps.createTarget(payload);
    obs.subscribe({
      next: () => { this.formLoading.set(false); this.showCreate.set(false); this.successMsg.set(editing ? 'Target updated' : 'Target created'); this.load(); },
      error: e => { this.formLoading.set(false); this.formError.set(e.error?.error || e.message); }
    });
  }

  deleteTarget(t: GpsTarget): void {
    if (!confirm('Delete target "'+t.title+'"? This cannot be undone.')) return;
    this.gps.deleteTarget(t.id).subscribe({
      next: () => { this.successMsg.set('Target deleted'); this.load(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  addTask(targetId: number): void {
    const title = (this.newTaskTitle[targetId] || '').trim();
    if (!title) return;
    this.gps.createTask({ gps_target_id: targetId, title }).subscribe({
      next: () => { this.newTaskTitle[targetId]=''; this.loadTasks(targetId); this.refreshTarget(targetId); this.successMsg.set('Task added'); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }
  toggleTask(task: GpsTask): void {
    const nextStatus = task.status==='completed' ? 'not_started' : 'completed';
    this.gps.updateTask(task.id, { status: nextStatus }).subscribe({
      next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }
  editTask(task: GpsTask): void {
    const next = prompt('Edit task title', task.title);
    if (next===null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed===task.title) return;
    this.gps.updateTask(task.id, { title: trimmed }).subscribe({ next: () => this.loadTasks(task.gps_target_id), error: e => this.error.set(e.error?.error || e.message) });
  }
  deleteTask(task: GpsTask): void {
    if (!confirm('Delete task "'+task.title+'"?')) return;
    this.gps.deleteTask(task.id).subscribe({ next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); }, error: e => this.error.set(e.error?.error || e.message) });
  }
  moveTask(task: GpsTask, dir: number): void {
    const list = [...(this.tasks()[task.gps_target_id]||[])].sort((a,b)=>a.sort_order-b.sort_order);
    const idx = list.findIndex(t=>t.id===task.id);
    const nIdx = idx+dir;
    if (nIdx<0||nIdx>=list.length) return;
    const tmp=list[idx]; list[idx]=list[nIdx]; list[nIdx]=tmp;
    this.gps.reorderTasks(task.gps_target_id, list.map(t=>t.id)).subscribe({ next: rows => this.tasks.update(m=>({ ...m, [task.gps_target_id]: rows })), error: e => this.error.set(e.error?.error || e.message) });
  }

  addUpdate(targetId: number): void {
    const prog = Number(this.newUpdateProgress[targetId]);
    const status = (this.newUpdateStatus[targetId] || 'in_progress').trim();
    const note = (this.newUpdateNote[targetId] || '').trim() || undefined;
    if (!Number.isFinite(prog) || prog<0 || prog>100) {
      this.updateError.update(m=>({ ...m, [targetId]: 'Progress must be 0..100' })); return;
    }
    this.updateError.update(m=>({ ...m, [targetId]: null }));
    this.gps.addUpdate({ gps_target_id: targetId, progress_percentage: prog, status, note }).subscribe({
      next: () => {
        this.newUpdateProgress[targetId]=null; this.newUpdateNote[targetId]='';
        this.loadUpdates(targetId); this.refreshTarget(targetId);
        this.gps.dashboardCounts(this.companyId()).subscribe({ next: c=> this.counts.set(c) });
        this.successMsg.set('Update added');
      },
      error: e => this.updateError.update(m=>({ ...m, [targetId]: e.error?.error || e.message }))
    });
  }

  private refreshTarget(targetId: number): void {
    this.gps.getTarget(targetId).subscribe({
      next: updated => {
        const g = this.grouped();
        const next: Record<string, GpsTarget[]> = {};
        for (const [k, arr] of Object.entries(g)) next[k] = (arr as GpsTarget[]).map(t=> t.id===updated.id ? updated : t);
        this.grouped.set(next);
        this.gps.dashboardCounts(this.companyId()).subscribe({ next: c=> this.counts.set(c) });
      },
      error: () => {}
    });
  }
}
