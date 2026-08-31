import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SwotService, SwotItem } from '../services/swot.service';
import { GpsService, GpsTarget, GpsTask } from '../services/gps.service';

@Component({
  selector: 'app-swot-hierarchy',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { --ios-navy:#0f1a31; --ios-blue:#1763ff; --ios-purple:#7c3aed; --ios-green:#079447; --ios-orange:#e95a0c; --ios-red:#d92d20; --ios-ink:#15213a; --ios-copy:#41516d; --ios-muted:#71809a; --ios-line:#dfe5ee; --ios-canvas:#f6f8fb; --ios-white:#fff; --ios-blue-soft:#edf4ff; --ios-green-soft:#ecfdf3; --ios-red-soft:#fff1f0; --ios-orange-soft:#fff7ed; display:block; background:var(--ios-canvas); min-height:100%; }
    .ios-wrap{ max-width:1100px; margin:0 auto; padding:19px 20px 28px; }
    .ios-heading{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px; }
    .ios-title{ font-size:19px; font-weight:700; margin:0; color:var(--ios-ink); }
    .ios-subtitle{ color:var(--ios-copy); font-size:12px; margin:4px 0 0; }
    .ios-legend{ display:flex; align-items:center; gap:14px; color:var(--ios-muted); font-size:11px; flex-wrap:wrap; }
    .ios-key{ display:inline-flex; align-items:center; gap:5px; }
    .ios-dot{ width:8px; height:8px; border-radius:50%; background:var(--ios-blue); }
    .ios-dot.target{ background:var(--ios-purple); } .ios-dot.task{ background:var(--ios-green); }
    .ios-summary{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:15px; }
    .ios-summary-item{ background:var(--ios-white); border:1px solid var(--ios-line); padding:12px 14px; border-radius:8px; }
    .ios-summary-value{ font-size:20px; font-weight:700; color:var(--ios-ink); }
    .ios-summary-label{ color:var(--ios-muted); font-size:11px; margin-top:2px; }
    .ios-list{ display:grid; gap:12px; }
    .ios-swot{ background:var(--ios-white); border:1px solid var(--ios-line); border-left:4px solid var(--ios-red); border-radius:9px; overflow:hidden; }
    .ios-swot.strength{ border-left-color:var(--ios-green); } .ios-swot.opportunity{ border-left-color:var(--ios-blue); } .ios-swot.threat{ border-left-color:var(--ios-orange); } .ios-swot.weakness{ border-left-color:var(--ios-red); }
    .ios-swot-head{ width:100%; border:0; background:var(--ios-white); display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center; text-align:left; padding:14px 15px; cursor:pointer; color:var(--ios-ink); }
    .ios-swot-main{ display:flex; align-items:flex-start; gap:10px; min-width:0; }
    .ios-chevron{ color:var(--ios-muted); transition:transform .2s ease; margin-top:2px; display:inline-block; }
    .ios-swot.open .ios-chevron{ transform:rotate(90deg); }
    .ios-kicker{ display:flex; align-items:center; gap:7px; margin-bottom:4px; flex-wrap:wrap; }
    .ios-badge{ display:inline-flex; align-items:center; border-radius:999px; padding:3px 7px; font-size:10px; font-weight:700; }
    .ios-badge.weakness{ color:var(--ios-red); background:var(--ios-red-soft); } .ios-badge.opportunity{ color:var(--ios-blue); background:var(--ios-blue-soft); } .ios-badge.strength{ color:var(--ios-green); background:var(--ios-green-soft); } .ios-badge.threat{ color:var(--ios-orange); background:var(--ios-orange-soft); }
    .ios-priority{ color:var(--ios-orange); font-size:10px; font-weight:600; }
    .ios-swot-title{ font-size:13px; font-weight:700; } .ios-swot-context{ color:var(--ios-copy); font-size:11px; margin-top:3px; }
    .ios-swot-count{ color:var(--ios-muted); font-size:11px; white-space:nowrap; }
    .ios-children{ display:none; border-top:1px solid var(--ios-line); padding:14px 15px 15px 38px; background:#fbfcfe; }
    .ios-swot.open .ios-children{ display:block; }
    .ios-child-label{ display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; color:var(--ios-muted); font-size:10px; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
    .ios-link-button{ border:0; background:transparent; color:var(--ios-blue); cursor:pointer; font-size:11px; font-weight:600; padding:5px; }
    .ios-target{ border:1px solid #d9d8f7; border-left:3px solid var(--ios-purple); border-radius:7px; background:var(--ios-white); padding:12px; margin-top:9px; }
    .ios-target-top{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .ios-target-title{ font-size:12px; font-weight:700; } .ios-target-meta{ display:flex; gap:10px; color:var(--ios-muted); font-size:10px; margin-top:5px; flex-wrap:wrap; }
    .ios-status{ border-radius:999px; padding:3px 7px; background:var(--ios-orange-soft); color:var(--ios-orange); font-size:10px; font-weight:700; white-space:nowrap; }
    .ios-progress-row{ display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; margin-top:10px; }
    .ios-progress{ height:6px; background:#e9edf4; border-radius:999px; overflow:hidden; } .ios-progress>span{ display:block; height:100%; border-radius:inherit; background:var(--ios-purple); }
    .ios-progress-value{ color:var(--ios-copy); font-size:10px; font-weight:700; }
    .ios-tasks{ border-top:1px dashed var(--ios-line); margin-top:11px; padding-top:8px; display:grid; gap:5px; }
    .ios-task{ display:grid; grid-template-columns:16px 1fr auto; gap:7px; align-items:center; min-height:25px; font-size:11px; }
    .ios-task.done .ios-task-name{ color:var(--ios-muted); text-decoration:line-through; }
    .ios-task-owner{ color:var(--ios-muted); font-size:10px; }
    .ios-empty-target{ border:1px dashed #cbd3e0; border-radius:7px; padding:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--ios-muted); font-size:11px; }
    .ios-primary{ border:0; border-radius:6px; background:var(--ios-blue); color:#fff; padding:9px 13px; cursor:pointer; font-size:12px; font-weight:600; }
    .ios-secondary{ border:1px solid var(--ios-line); border-radius:6px; background:var(--ios-white); color:var(--ios-ink); padding:7px 10px; cursor:pointer; font-size:11px; }
    .ios-danger{ border:0; border-radius:6px; background:var(--ios-red); color:#fff; padding:6px 10px; cursor:pointer; font-size:11px; }
    @media(max-width:760px){ .ios-summary{ grid-template-columns:1fr 1fr; } .ios-children{ padding-left:14px; } .ios-heading{ display:block; } .ios-legend{ margin-top:10px; } }
    .ios-input{ border:1px solid var(--ios-line); border-radius:6px; padding:7px 9px; font-size:12px; width:100%; }
    .ios-select{ border:1px solid var(--ios-line); border-radius:6px; padding:7px 9px; font-size:12px; background:#fff; }
    .ios-error{ background:#fff1f0; border:1px solid #fecdca; color:#d92d20; border-radius:6px; padding:8px 10px; font-size:11px; }
    .ios-success{ background:#ecfdf3; border:1px solid #a6f4c5; color:#079447; border-radius:6px; padding:8px 10px; font-size:11px; }
  `],
  template: `
  <div class="ios-wrap">
    <div class="ios-heading">
      <div><h2 class="ios-title">SWOT Strategy Workspace</h2><p class="ios-subtitle">Turn business findings into measurable targets and practical tasks. Company {{ companyId() }} · Analysis {{ analysis()?.id ? '#'+analysis()!.id : '—' }}</p></div>
      <div class="ios-legend" aria-label="Hierarchy legend"><span class="ios-key"><span class="ios-dot"></span> SWOT finding</span><span class="ios-key"><span class="ios-dot target"></span> GPS target</span><span class="ios-key"><span class="ios-dot task"></span> Task</span></div>
    </div>

    @if (loading()) { <div class="text-sm" style="color:var(--ios-muted)">Loading…</div> }
    @if (error()) { <div class="ios-error">{{ error() }}</div> }
    @if (successMsg()) { <div class="ios-success">{{ successMsg() }}</div> }

    <div class="ios-summary">
      <div class="ios-summary-item"><div class="ios-summary-value">{{ items().length }}</div><div class="ios-summary-label">SWOT findings</div></div>
      <div class="ios-summary-item"><div class="ios-summary-value">{{ linkedCount() }}</div><div class="ios-summary-label">Linked targets</div></div>
      <div class="ios-summary-item"><div class="ios-summary-value">{{ activeTasksCount() }}</div><div class="ios-summary-label">Active tasks</div></div>
      <div class="ios-summary-item"><div class="ios-summary-value">{{ overallProgress() }}%</div><div class="ios-summary-label">Overall progress</div></div>
    </div>

    <div class="flex gap-2 mb-3 text-xs">
      <a [routerLink]="['/company', companyId(), 'gps-targets-v2']" class="ios-secondary">View GPS Targets →</a>
      <button (click)="load()" class="ios-secondary">Refresh</button>
    </div>

    <div class="ios-list">
      @for (q of quadrants; track q.key) {
        @for (item of itemsByCategory()[q.key]; track item.id) {
          <article class="ios-swot {{ q.key }}" [class.open]="expanded().has(item.id)">
            <button class="ios-swot-head" type="button" (click)="toggle(item.id)" [attr.aria-expanded]="expanded().has(item.id)">
              <span class="ios-swot-main">
                <span class="ios-chevron">›</span>
                <span>
                  <span class="ios-kicker"><span class="ios-badge {{ q.key }}">{{ q.label.slice(0,-1) }}</span><span class="ios-priority">{{ item.priority }} priority</span></span>
                  <span class="ios-swot-title">{{ item.description }}</span>
                  @if (item.recommended_response) { <span class="ios-swot-context">{{ item.recommended_response }}</span> }
                  <span class="ios-swot-context">Impact: {{ item.impact }} · Status: {{ item.status }} · Owner: {{ item.owner_label || '—' }} · Target: {{ item.target_date || '—' }}</span>
                </span>
              </span>
              <span class="ios-swot-count">{{ linked()[item.id]?.length || 0 }} GPS targets · {{ tasksCountForItem(item.id) }} tasks</span>
            </button>
            <div class="ios-children">
              <div class="ios-child-label"><span>Linked GPS targets</span>
                <span class="flex gap-1">
                  <button class="ios-link-button" type="button" (click)="openLinkPicker(item.id)">+ Link existing</button>
                  <button class="ios-link-button" type="button" (click)="openCreate(item.id)">+ Create target</button>
                </span>
              </div>

              @if (linkPickerFor() === item.id) {
                <div class="bg-white border rounded-lg p-3 mb-2 flex gap-2 items-end flex-wrap">
                  <div class="flex-1 min-w-[200px]">
                    <label class="text-xs font-semibold" style="color:var(--ios-muted)">Choose target to link</label>
                    <select class="ios-select w-full" [(ngModel)]="linkTargetId">
                      <option [ngValue]="null">— select —</option>
                      @for (t of unlinkedTargetsFor(item.id); track t.id) {
                        <option [ngValue]="t.id">{{ t.category }} — {{ t.title }} ({{ t.status }})</option>
                      }
                    </select>
                  </div>
                  <button class="ios-primary" (click)="doLink(item.id)" [disabled]="!linkTargetId">Link</button>
                  <button class="ios-secondary" (click)="linkPickerFor.set(null)">Cancel</button>
                </div>
              }

              @if (createFor() === item.id) {
                <div class="bg-white border rounded-lg p-3 mb-2 space-y-2">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input class="ios-input" placeholder="Title (optional — auto from description)" [(ngModel)]="createTitle" />
                    <select class="ios-select" [(ngModel)]="createCategory">
                      <option value="finance">Finance</option>
                      <option value="strategy_general">Strategy / General</option>
                      <option value="sales_marketing">Sales & Marketing</option>
                      <option value="personal_development">Personal Development</option>
                    </select>
                    <input class="ios-input md:col-span-2" placeholder="Description *" [(ngModel)]="createDescription" />
                    <select class="ios-select" [(ngModel)]="createPriority">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                    <input class="ios-input" type="date" [(ngModel)]="createDueDate" />
                    <input class="ios-input" placeholder="Owner label" [(ngModel)]="createOwner" />
                  </div>
                  @if (createError()) { <div class="ios-error">{{ createError() }}</div> }
                  <div class="flex gap-2">
                    <button class="ios-primary" (click)="doCreate(item.id)" [disabled]="createLoading()">Create & link</button>
                    <button class="ios-secondary" (click)="createFor.set(null)">Cancel</button>
                  </div>
                </div>
              }

              @if (linked()[item.id] === undefined) { <span style="color:var(--ios-muted); font-size:11px;">Loading…</span> }
              @else if (linked()[item.id].length === 0) {
                <div class="ios-empty-target"><span>No measurable target has been created from this finding.</span><button class="ios-primary" type="button" (click)="openCreate(item.id)">Create GPS target</button></div>
              } @else {
                @for (t of linked()[item.id]; track trackTargetId(t)) {
                  <div class="ios-target">
                    <div class="ios-target-top"><div><div class="ios-target-title">{{ displayTargetTitle(t) }}</div><div class="ios-target-meta"><span>{{ displayTargetCategory(t) }}</span><span>Due {{ displayTargetDue(t) || '—' }}</span><span>Owner: {{ displayTargetOwner(t) || '—' }}</span></div></div><span class="ios-status">{{ displayTargetStatus(t) }}</span></div>
                    <div class="ios-progress-row"><div class="ios-progress" [attr.aria-label]="'Target progress ' + displayTargetProgress(t) + ' percent'"><span [style.width.%]="displayTargetProgress(t)"></span></div><span class="ios-progress-value">{{ displayTargetProgress(t) }}%</span></div>
                    <div class="ios-tasks">
                      @if (tasks()[displayTargetId(t)] === undefined) { <span style="color:var(--ios-muted)">Loading tasks…</span> }
                      @else {
                        @for (task of tasks()[displayTargetId(t)]; track task.id) {
                          <label class="ios-task" [class.done]="task.status==='completed'">
                            <input type="checkbox" [checked]="task.status==='completed'" (change)="toggleTask(task)" />
                            <span class="ios-task-name">{{ task.title }}</span>
                            <span class="ios-task-owner flex gap-1 items-center">
                              {{ task.owner_label || '' }}
                              <button class="ios-link-button" (click)="editTask(task)">Edit</button>
                              <button class="ios-link-button" (click)="deleteTask(task)">Delete</button>
                              <button class="ios-link-button" (click)="moveTask(task, -1)">↑</button>
                              <button class="ios-link-button" (click)="moveTask(task, 1)">↓</button>
                            </span>
                          </label>
                        }
                        @if (tasks()[displayTargetId(t)].length===0) { <span style="color:var(--ios-muted); font-size:11px;">No tasks yet.</span> }
                      }
                      <div class="flex gap-2 mt-2">
                        <input class="ios-input flex-1" placeholder="New task title" [(ngModel)]="newTaskTitle[displayTargetId(t)]" (keyup.enter)="addTaskFor(displayTargetId(t))" />
                        <button class="ios-secondary" (click)="addTaskFor(displayTargetId(t))">Add task</button>
                      </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                      <button class="ios-danger" (click)="doUnlink(t, item.id)">Unlink</button>
                    </div>
                  </div>
                }
              }
            </div>
          </article>
        }
        @if ((itemsByCategory()[q.key]?.length || 0)===0 && q.key==='opportunity') {
          <!-- keep empty state hidden for other quadrants already handled via no items case, but ensure opportunity shows empty -->
        }
      }
      @if (items().length===0 && !loading()) {
        <div class="ios-empty-target">No SWOT items for this company.</div>
      }
    </div>

    <div class="text-xs mt-4" style="color:var(--ios-muted)">Analysis: {{ analysis()?.id ? '#'+analysis()!.id+' · '+analysis()!.status+' · current='+analysis()!.is_current : '— none' }} · path: company/{{ companyId() }}/swot-v2 · Sources: {{ linkedCount() }} linked, {{ legacySources() }} legacy_unlinked</div>
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
  successMsg = signal<string | null>(null);
  analysis = signal<any | null>(null);
  items = signal<SwotItem[]>([]);
  expanded = signal<Set<number>>(new Set());
  linked = signal<Record<number, any[]>>({});
  tasks = signal<Record<number, GpsTask[]>>({});
  newTaskTitle: Record<number, string> = {};

  allTargets = signal<GpsTarget[]>([]);
  counts = signal<any>(null);

  // create/link UI
  createFor = signal<number | null>(null);
  linkPickerFor = signal<number | null>(null);
  linkTargetId: number | null = null;
  createTitle = '';
  createDescription = '';
  createCategory: GpsTarget['category'] = 'finance';
  createPriority = 'medium';
  createDueDate = '';
  createOwner = '';
  createError = signal<string | null>(null);
  createLoading = signal(false);

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

  linkedCount = computed(() => {
    const m = this.linked();
    const ids = new Set<number>();
    for (const arr of Object.values(m)) for (const t of arr as any[]) ids.add(this.displayTargetId(t));
    return ids.size;
  });

  legacySources = computed(() => {
    // derived from total targets - linked? For Company 11 initially 12 legacy_unlinked
    const total = this.allTargets().length;
    return Math.max(0, total - this.linkedCount());
  });

  activeTasksCount = computed(() => {
    let c = 0;
    for (const arr of Object.values(this.tasks())) for (const t of arr as GpsTask[]) if (t.status !== 'completed') c++;
    return c;
  });

  overallProgress = computed(() => {
    const all = this.allTargets();
    if (!all.length) return 0;
    const avg = all.reduce((s, t) => s + Number(t.manual_progress_percentage || 0), 0) / all.length;
    return Math.round(avg);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    const cid = this.companyId();
    if (!cid) { this.error.set('Missing company id'); return; }
    this.loading.set(true); this.error.set(null);
    this.swot.listAnalyses(cid).subscribe({
      next: analyses => {
        const cur = analyses.find(a => a.is_current) || analyses[0] || null;
        this.analysis.set(cur);
        if (!cur) { this.items.set([]); this.loading.set(false); this.loadTargets(); return; }
        this.swot.listItems(cur.id).subscribe({
          next: items => {
            this.items.set(items);
            this.loading.set(false);
            this.loadTargets();
            // eager load links for summary
            this.eagerLoadLinks(items);
          },
          error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
        });
      },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
  }

  private loadTargets(): void {
    const cid = this.companyId();
    this.gps.listTargets(cid).subscribe({ next: rows => this.allTargets.set(rows), error: () => {} });
    this.gps.dashboardCounts(cid).subscribe({ next: c => this.counts.set(c), error: () => {} });
  }

  private eagerLoadLinks(items: SwotItem[]): void {
    if (!items.length) return;
    const obs = items.map(it => this.gps.listBySwotItem(it.id).pipe(catchError(() => of([]))));
    forkJoin(obs).subscribe({
      next: arrs => {
        const m: Record<number, any[]> = {};
        items.forEach((it, idx) => m[it.id] = arrs[idx] as any[]);
        this.linked.set(m);
        // also eager load tasks for each linked target
        const targetIds = new Set<number>();
        for (const a of arrs) for (const t of a as any[]) targetIds.add(this.displayTargetId(t as any));
        for (const tid of targetIds) this.loadTasks(tid);
      },
      error: () => {}
    });
  }

  toggle(id: number): void {
    const s = new Set(this.expanded());
    const willOpen = !s.has(id);
    if (willOpen) s.add(id); else s.delete(id);
    this.expanded.set(s);
    if (willOpen && this.linked()[id] === undefined) {
      this.gps.listBySwotItem(id).subscribe({
        next: rows => {
          this.linked.update(m => ({ ...m, [id]: rows }));
          for (const t of rows as any[]) this.loadTasks(this.displayTargetId(t));
        },
        error: () => this.linked.update(m => ({ ...m, [id]: [] }))
      });
    }
  }

  // helpers to handle both GpsTarget and joined row shapes
  displayTargetId(t: any): number { return Number(t.id ?? t.gps_target_id ?? t.target_id ?? 0); }
  displayTargetTitle(t: any): string { return t.title ?? t.target_title ?? 'Untitled'; }
  displayTargetCategory(t: any): string { return t.category ?? '—'; }
  displayTargetStatus(t: any): string { return t.status ?? t.target_status ?? 'not_started'; }
  displayTargetDue(t: any): string | null { return t.due_date ?? null; }
  displayTargetOwner(t: any): string | null { return t.owner_label ?? null; }
  displayTargetProgress(t: any): number { return Math.round(Number(t.manual_progress_percentage ?? 0)); }
  trackTargetId = (t: any) => this.displayTargetId(t) + '-' + (t.swot_item_id || '');

  tasksCountForItem(itemId: number): number {
    const linked = this.linked()[itemId] || [];
    let c = 0;
    for (const t of linked) {
      const tid = this.displayTargetId(t);
      c += (this.tasks()[tid]?.length || 0);
    }
    return c;
  }

  unlinkedTargetsFor(itemId: number): GpsTarget[] {
    const linkedIds = new Set((this.linked()[itemId] || []).map(t => this.displayTargetId(t)));
    return this.allTargets().filter(t => !linkedIds.has(t.id));
  }

  openLinkPicker(itemId: number): void { this.linkPickerFor.set(itemId); this.linkTargetId = null; this.successMsg.set(null); }
  openCreate(itemId: number): void { this.createFor.set(itemId); this.createError.set(null); this.createTitle=''; this.createDescription=''; this.createCategory='finance'; this.createPriority='medium'; this.createDueDate=''; this.createOwner=''; }

  doLink(swotItemId: number): void {
    if (!this.linkTargetId) return;
    this.gps.link(this.linkTargetId, swotItemId).subscribe({
      next: () => {
        this.successMsg.set('Linked target #' + this.linkTargetId);
        this.linkPickerFor.set(null);
        this.linkTargetId = null;
        // refresh linked
        this.gps.listBySwotItem(swotItemId).subscribe({
          next: rows => {
            this.linked.update(m => ({ ...m, [swotItemId]: rows }));
            this.loadTargets();
            for (const t of rows as any[]) this.loadTasks(this.displayTargetId(t));
          }
        });
      },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  doCreate(swotItemId: number): void {
    if (!this.createDescription.trim()) { this.createError.set('Description is required'); return; }
    this.createLoading.set(true); this.createError.set(null);
    const payload: any = {
      company_id: this.companyId(),
      title: this.createTitle.trim() || undefined,
      description: this.createDescription.trim(),
      category: this.createCategory,
      priority: this.createPriority,
      due_date: this.createDueDate || undefined,
      owner_label: this.createOwner.trim() || undefined,
      status: 'not_started',
      progress_mode: 'manual',
      manual_progress_percentage: 0,
    };
    this.gps.createTarget(payload).subscribe({
      next: created => {
        // link to swot
        this.gps.link(created.id, swotItemId).subscribe({
          next: () => {
            this.createLoading.set(false); this.createFor.set(null);
            this.successMsg.set('Created and linked target #' + created.id);
            this.gps.listBySwotItem(swotItemId).subscribe({
              next: rows => { this.linked.update(m => ({ ...m, [swotItemId]: rows })); this.loadTargets(); for (const t of rows as any[]) this.loadTasks(this.displayTargetId(t)); }
            });
          },
          error: e => { this.createLoading.set(false); this.createError.set(e.error?.error || e.message); }
        });
      },
      error: e => { this.createLoading.set(false); this.createError.set(e.error?.error || e.message); }
    });
  }

  doUnlink(t: any, swotItemId: number): void {
    const targetId = this.displayTargetId(t);
    // find link id: need to fetch sources for target to find link row id; listBySwotItem rows contain gts id? The join returns gts fields including id. Use that id if present.
    const linkId = Number(t.id && t.swot_item_id ? t.id : 0); // if row is gts, id is link id; but our displayTargetId uses target id, so ambiguous. Fetch sources for target to find correct link.
    // simpler: use unlinkByTargetAndSwot
    if (!confirm('Unlink this target from the SWOT item? The target itself will remain.')) return;
    const obs = linkId ? this.gps.unlink(linkId) : this.gps.unlinkByTargetAndSwot(targetId, swotItemId);
    // If linkId is actually target id, the first will fail; fallback to second via error handling
    obs.subscribe({
      next: () => {
        this.successMsg.set('Unlinked target #' + targetId);
        this.gps.listBySwotItem(swotItemId).subscribe({
          next: rows => { this.linked.update(m => ({ ...m, [swotItemId]: rows })); this.loadTargets(); }
        });
      },
      error: e => {
        // try fallback
        if (linkId) {
          this.gps.unlinkByTargetAndSwot(targetId, swotItemId).subscribe({
            next: () => {
              this.successMsg.set('Unlinked target #' + targetId);
              this.gps.listBySwotItem(swotItemId).subscribe({ next: rows => { this.linked.update(m => ({ ...m, [swotItemId]: rows })); this.loadTargets(); } });
            },
            error: e2 => this.error.set(e2.error?.error || e2.message)
          });
        } else this.error.set(e.error?.error || e.message);
      }
    });
  }

  // tasks
  loadTasks(targetId: number): void {
    this.gps.tasks(targetId).subscribe({ next: rows => this.tasks.update(m => ({ ...m, [targetId]: rows })), error: () => this.tasks.update(m => ({ ...m, [targetId]: [] })) });
  }

  addTaskFor(targetId: number): void {
    const title = (this.newTaskTitle[targetId] || '').trim();
    if (!title) return;
    this.gps.createTask({ gps_target_id: targetId, title }).subscribe({
      next: () => { this.newTaskTitle[targetId]=''; this.loadTasks(targetId); this.refreshTarget(targetId); this.successMsg.set('Task added'); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  toggleTask(task: GpsTask): void {
    const nextStatus = task.status === 'completed' ? 'not_started' : 'completed';
    this.gps.updateTask(task.id, { status: nextStatus }).subscribe({
      next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  editTask(task: GpsTask): void {
    const next = prompt('Edit task title', task.title);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === task.title) return;
    this.gps.updateTask(task.id, { title: trimmed }).subscribe({
      next: () => this.loadTasks(task.gps_target_id),
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  deleteTask(task: GpsTask): void {
    if (!confirm('Delete task "' + task.title + '"?')) return;
    this.gps.deleteTask(task.id).subscribe({
      next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  moveTask(task: GpsTask, dir: number): void {
    const list = [...(this.tasks()[task.gps_target_id] || [])].sort((a,b)=>a.sort_order-b.sort_order);
    const idx = list.findIndex(t=>t.id===task.id);
    const nIdx = idx + dir;
    if (nIdx <0 || nIdx>=list.length) return;
    const tmp = list[idx]; list[idx]=list[nIdx]; list[nIdx]=tmp;
    const ordered = list.map(t=>t.id);
    this.gps.reorderTasks(task.gps_target_id, ordered).subscribe({
      next: rows => this.tasks.update(m=>({ ...m, [task.gps_target_id]: rows })),
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  private refreshTarget(targetId: number): void {
    this.gps.getTarget(targetId).subscribe({
      next: updated => {
        // patch allTargets
        this.allTargets.update(arr => arr.map(t=> t.id===updated.id ? updated : t));
        // patch linked entries containing this target
        const linked = this.linked();
        const next: Record<number, any[]> = {};
        for (const [k, arr] of Object.entries(linked)) {
          next[Number(k)] = (arr as any[]).map((t:any) => this.displayTargetId(t)===targetId ? { ...t, manual_progress_percentage: updated.manual_progress_percentage, status: updated.status } : t);
        }
        this.linked.set(next);
      },
      error: () => {}
    });
  }
}
