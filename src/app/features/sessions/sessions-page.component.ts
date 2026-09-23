import {
  Component, ChangeDetectionStrategy, inject, signal, computed, effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon';
import { CompanyService } from '../../../services/company.service';
import { ViewStateService } from '../../../services/view-state.service';
import { AuthService } from '../../auth/auth.service';
import { SessionService, EligibleEvent } from './services/session.service';
import { SessionWorkspaceComponent } from './components/session-workspace.component';
import { SessionScheduleModalComponent } from './components/session-schedule-modal.component';
import {
  SessionSummary, SessionDetail, SessionStatus, SessionType,
  SESSION_TYPES, SESSION_STATUS_LABELS, PreparationBrief, SessionInput,
} from './models/session.models';
import { toIsoDate, addDays } from '../calendar/calendar.utils';

type Tab = 'upcoming' | 'previous';

@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppIconComponent,
    SessionWorkspaceComponent, SessionScheduleModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { --ios-navy:#0f1a31; --ios-blue:#1763ff; --ios-purple:#7c3aed; --ios-green:#079447; --ios-orange:#e95a0c; --ios-red:#d92d20; --ios-ink:#15213a; --ios-copy:#41516d; --ios-muted:#71809a; --ios-line:#dfe5ee; --ios-canvas:#f6f8fb; --ios-white:#fff; --ios-blue-soft:#edf4ff; --ios-green-soft:#ecfdf3; --ios-red-soft:#fff1f0; --ios-orange-soft:#fff7ed; --ios-purple-soft:#f5f3ff; display:block; background:var(--ios-canvas); min-height:100%; }
  `],
  template: `
  <div class="sw-wrap">
    <div class="sw-heading">
      <div>
        <h2 class="sw-title">Sessions</h2>
        <p class="sw-subtitle">
          Why we are meeting, what to review, and what came out of it — for {{ companyName() || ('Company ' + companyId()) }}
        </p>
      </div>
      <div class="sw-legend">
        <button class="sw-btn primary" type="button" (click)="openSchedule()">
          <app-icon name="plus"></app-icon> Schedule session
        </button>
        <button class="sw-btn" type="button" (click)="openConvert()" [disabled]="!canConvert()">
          <app-icon name="arrow-path"></app-icon> Convert event
        </button>
      </div>
    </div>

    @if (error()) { <div class="sw-alert error">{{ error() }}</div> }
    @if (notice()) { <div class="sw-alert success">{{ notice() }}</div> }

    <div class="sw-summary">
      <div class="sw-summary-item"><div class="sw-summary-value">{{ nextSession()?.subject ? '1' : '0' }}</div><div class="sw-summary-label">Next session</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ preparingCount() }}</div><div class="sw-summary-label">Preparing</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ inProgressCount() }}</div><div class="sw-summary-label">In progress</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ completedCount() }}</div><div class="sw-summary-label">Completed</div></div>
    </div>

    @if (nextSession(); as next) {
      <div class="sess-next">
        <div class="sess-next-main">
          <div class="sw-section-title" style="margin-bottom:4px;">Next session</div>
          <div class="sess-next-title">{{ next.subject }}</div>
          <div class="sess-next-meta">
            <span class="sw-pill" [class]="'sess-st-' + next.status">{{ statusLabel(next.status) }}</span>
            <span class="sess-type">{{ typeLabel(next.sessionType) }}</span>
            @if (scheduleLabel(next.event); as when) { <span><app-icon name="clock"></app-icon> {{ when }}</span> }
            @if (next.facilitatorLabel) { <span><app-icon name="users"></app-icon> {{ next.facilitatorLabel }}</span> }
          </div>
        </div>
        <button class="sw-btn primary" type="button" (click)="open(next)">Open workspace</button>
      </div>
    }

    <div class="sw-toolbar">
      <div class="sw-seg" role="tablist" aria-label="Sessions">
        <button type="button" role="tab" [class.active]="tab() === 'upcoming'" (click)="tab.set('upcoming')">
          <app-icon name="calendar-days"></app-icon> Preparing &amp; active
        </button>
        <button type="button" role="tab" [class.active]="tab() === 'previous'" (click)="tab.set('previous')">
          <app-icon name="document-text"></app-icon> Previous
        </button>
      </div>
      <label class="sw-search">
        <app-icon name="magnifying-glass"></app-icon>
        <input type="search" placeholder="Search sessions…" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Search sessions">
      </label>
      <span class="sw-spacer"></span>
      <label class="sw-field" style="min-width:160px;">
        <select class="sw-select" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
          <option value="">All types</option>
          @for (t of sessionTypes; track t.key) { <option [value]="t.key">{{ t.label }}</option> }
        </select>
      </label>
    </div>

    @if (loading()) {
      <div class="sw-footnote">Loading…</div>
    } @else if (visibleSessions().length === 0) {
      <div class="sw-group-empty">
        {{ tab() === 'upcoming' ? 'No Sessions waiting. Schedule one or convert a meeting.' : 'No completed Sessions yet.' }}
      </div>
    } @else {
      <div class="sess-grid">
        @for (s of visibleSessions(); track s.id) {
          <button class="sess-card" type="button" (click)="open(s)">
            <div class="sess-card-top">
              <span class="sw-pill" [class]="'sess-st-' + s.status">{{ statusLabel(s.status) }}</span>
              <span class="sess-type">{{ typeLabel(s.sessionType) }}</span>
            </div>
            <div class="sess-card-title">{{ s.subject }}</div>
            @if (scheduleLabel(s.event); as when) {
              <div class="sess-card-when"><app-icon name="clock"></app-icon> {{ when }}</div>
            }
            <div class="sess-card-counts">
              <span title="Agenda"><app-icon name="list-bullet"></app-icon> {{ s.agendaCount }}</span>
              <span title="Participants"><app-icon name="users"></app-icon> {{ s.participantCount }}</span>
              <span title="Decisions"><app-icon name="check-circle"></app-icon> {{ s.decisionCount }}</span>
              <span title="Linked records"><app-icon name="link"></app-icon> {{ s.linkCount }}</span>
            </div>
          </button>
        }
      </div>
    }
  </div>

  @if (scheduleOpen()) {
    <app-session-schedule-modal
      [companyId]="companyId()"
      [companyName]="companyName()"
      [eligibleEvents]="eligibleEvents()"
      [mode]="scheduleMode()"
      [saving]="saving()"
      (close)="closeSchedule()"
      (submit)="submitSchedule($event)">
    </app-session-schedule-modal>
  }

  @if (workspaceOpen() && session(); as s) {
    <app-session-workspace
      [session]="s"
      [brief]="brief()"
      [isAdmin]="isAdmin()"
      [saving]="saving()"
      (close)="closeWorkspace()"
      (refresh)="reloadCurrent()"
      (start)="startSession()"
      (complete)="completeSession($event)"
      (cancel)="cancelSession($event)"
      (agenda)="agenda($event)"
      (note)="note($event)"
      (decision)="decision($event)"
      (link)="link($event)"
      (participant)="participant($event)"
      (updatePreparation)="updatePreparation($event)">
    </app-session-workspace>
  }
  `,
})
export class SessionsPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(SessionService);
  private companyService = inject(CompanyService);
  private auth = inject(AuthService);
  private ui = inject(ViewStateService);
  private viewStateRestored = false;

  readonly sessionTypes = SESSION_TYPES;

  companyId = signal<number>(0);
  companyName = signal<string>('');
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);

  sessions = signal<SessionSummary[]>([]);
  session = signal<SessionDetail | null>(null);
  brief = signal<PreparationBrief | null>(null);
  eligibleEvents = signal<EligibleEvent[]>([]);

  tab = signal<Tab>('upcoming');
  search = signal('');
  typeFilter = signal<string>('');

  scheduleOpen = signal(false);
  scheduleMode = signal<'create' | 'convert'>('create');
  workspaceOpen = signal(false);

  readonly isAdmin = computed(() => this.auth.isAdmin());

  readonly todayIso = toIsoDate(new Date());

  constructor() {
    effect(() => {
      const key = this.persistKey();
      const state = this.captureViewState();
      if (!key || !this.viewStateRestored) return;
      this.ui.save(key, state);
    });
  }

  ngOnInit(): void {
    let r: ActivatedRoute | null = this.route;
    let id = 0;
    while (r) {
      const v = Number(r.snapshot.paramMap.get('id') || 0);
      if (v) { id = v; break; }
      r = r.parent;
    }
    this.companyId.set(id);
    this.load();
    this.resolveCompanyName();
    // Load convertible meeting events up front so "Convert event" is enabled only
    // when something can actually be converted.
    this.loadEligible();

    // A calendar "Open session workspace" link arrives as ?session=<id>.
    this.route.queryParamMap.subscribe(params => {
      const wanted = Number(params.get('session') || 0);
      if (wanted > 0 && this.session()?.id !== wanted) {
        this.open({ id: wanted } as SessionSummary);
      }
    });
  }

  private load(): void {
    const key = this.persistKey();
    if (!this.viewStateRestored) this.restoreViewState(key);

    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.companyId()).subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: err => { this.error.set(this.api.errorMessage(err)); this.loading.set(false); },
    });
  }

  private resolveCompanyName(): void {
    const id = this.companyId();
    if (!id) return;
    this.companyService.getCompanyById(id).subscribe({
      next: c => this.companyName.set(c?.name || `Company ${id}`),
      error: () => this.companyName.set(`Company ${id}`),
    });
  }

  // ---------- derived ----------

  private readonly sorted = computed(() =>
    [...this.sessions()].sort((a, b) => this.sortKey(b).localeCompare(this.sortKey(a))));

  readonly upcomingSessions = computed(() =>
    this.sorted().filter(s => s.status === 'PREPARING' || s.status === 'IN_PROGRESS')
      .sort((a, b) => this.sortKey(a).localeCompare(this.sortKey(b))));

  readonly previousSessions = computed(() =>
    this.sorted().filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED'));

  readonly visibleSessions = computed(() => {
    const term = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const base = this.tab() === 'upcoming' ? this.upcomingSessions() : this.previousSessions();
    return base.filter(s => {
      if (type && s.sessionType !== type) return false;
      if (term && !`${s.subject} ${s.facilitatorLabel ?? ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  readonly nextSession = computed(() => this.upcomingSessions()[0] ?? null);
  readonly preparingCount = computed(() => this.sessions().filter(s => s.status === 'PREPARING').length);
  readonly inProgressCount = computed(() => this.sessions().filter(s => s.status === 'IN_PROGRESS').length);
  readonly completedCount = computed(() => this.sessions().filter(s => s.status === 'COMPLETED').length);
  readonly canConvert = computed(() => this.eligibleEvents().length > 0);

  private sortKey(s: SessionSummary): string {
    return s.event?.startAt ?? s.event?.startDate ?? s.createdAt;
  }

  // ---------- labels ----------

  statusLabel(s: SessionStatus): string { return SESSION_STATUS_LABELS[s] ?? s; }
  typeLabel(t: SessionType): string { return SESSION_TYPES.find(x => x.key === t)?.label ?? t; }

  scheduleLabel(event: SessionSummary['event']): string | null {
    if (!event) return null;
    if (event.allDay) {
      const end = event.endDate && event.endDate !== event.startDate ? ` – ${event.endDate}` : '';
      return `${event.startDate}${end}`;
    }
    if (!event.startAt) return null;
    const d = new Date(event.startAt);
    if (isNaN(d.getTime())) return event.startAt;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${date} ${time}`;
  }

  // ---------- interactions ----------

  open(s: SessionSummary): void {
    this.error.set(null);
    this.notice.set(null);
    this.api.get(s.id).subscribe({
      next: detail => {
        this.session.set(detail);
        this.workspaceOpen.set(true);
        this.loadBrief(detail.id);
      },
      error: err => this.error.set(this.api.errorMessage(err)),
    });
  }

  private loadBrief(id: number): void {
    this.api.brief(id).subscribe({
      next: b => this.brief.set(b),
      error: () => this.brief.set(null),
    });
  }

  reloadCurrent(): void {
    const s = this.session();
    if (!s) return;
    this.api.get(s.id).subscribe({
      next: detail => { this.session.set(detail); this.loadBrief(detail.id); },
      error: err => this.error.set(this.api.errorMessage(err)),
    });
    this.load();
  }

  closeWorkspace(): void {
    this.workspaceOpen.set(false);
    this.session.set(null);
    this.brief.set(null);
    this.load();
  }

  openSchedule(): void {
    this.scheduleMode.set('create');
    this.error.set(null);
    this.loadEligible();
    this.scheduleOpen.set(true);
  }

  openConvert(): void {
    this.scheduleMode.set('convert');
    this.error.set(null);
    this.loadEligible();
    this.scheduleOpen.set(true);
  }

  loadEligible(): void {
    const id = this.companyId();
    if (!id) return;
    this.api.eligibleEvents(id, this.todayIso, addDays(this.todayIso, 180)).subscribe({
      next: events => this.eligibleEvents.set(events),
      error: () => this.eligibleEvents.set([]),
    });
  }

  closeSchedule(): void {
    this.scheduleOpen.set(false);
    this.saving.set(false);
  }

  submitSchedule(payload: SessionInput): void {
    this.saving.set(true);
    this.error.set(null);
    const request = this.scheduleMode() === 'convert' ? this.api.convert(payload) : this.api.create(payload);
    request.subscribe({
      next: detail => {
        this.saving.set(false);
        this.scheduleOpen.set(false);
        this.notice.set(this.scheduleMode() === 'convert' ? 'Session workspace created.' : 'Session scheduled.');
        this.session.set(detail);
        this.workspaceOpen.set(true);
        this.loadBrief(detail.id);
        this.load();
      },
      error: err => { this.saving.set(false); this.error.set(this.api.errorMessage(err)); },
    });
  }

  // ---------- workspace actions ----------

  startSession(): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.start(s.id, s.version), 'Session started.');
  }
  completeSession(summary: string): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.complete(s.id, summary || null, s.version), 'Session completed.');
  }
  cancelSession(reason: string): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.cancel(s.id, reason, s.version), 'Session cancelled.');
  }
  agenda(e: { action: 'add' | 'update' | 'reorder' | 'delete'; payload: Record<string, unknown> }): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.agenda(s.id, e.action, e.payload), 'Agenda updated.');
  }
  note(e: { action: 'add' | 'update' | 'delete'; payload: Record<string, unknown> }): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.notes(s.id, e.action, e.payload), 'Notes updated.');
  }
  decision(e: { action: 'record' | 'update' | 'delete'; payload: Record<string, unknown> }): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.decisions(s.id, e.action, e.payload), 'Decisions updated.');
  }
  link(e: { action: 'add' | 'remove'; payload: Record<string, unknown> }): void {
    const s = this.session();
    if (!s) return;
    // The workspace emits the frontend label; the API expects the canonical name.
    const payload = { ...e.payload };
    if (e.action === 'add' && typeof payload['entityType'] === 'string') {
      payload['entityType'] = this.api.toApiLinkType(payload['entityType'] as never);
    }
    this.run(this.api.links(s.id, e.action, payload), 'Links updated.');
  }
  participant(e: { action: 'add' | 'update' | 'remove' | 'attendance'; payload: Record<string, unknown> }): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.participants(s.id, e.action, e.payload), 'Participants updated.');
  }
  updatePreparation(input: SessionInput): void {
    const s = this.session();
    if (!s) return;
    this.run(this.api.update(s.id, { ...input, version: s.version }), 'Session updated.');
  }

  private run(request: ReturnType<SessionService['start']>, message: string): void {
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: detail => {
        this.saving.set(false);
        this.session.set(detail);
        this.notice.set(message);
        this.loadBrief(detail.id);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(this.api.errorMessage(err));
      },
    });
  }

  // ---------- view persistence ----------

  private persistKey(): string {
    return `sessions-view:${this.companyId()}`;
  }

  private captureViewState() {
    return { tab: this.tab(), search: this.search(), type: this.typeFilter() };
  }

  private restoreViewState(key: string): void {
    const s = this.ui.load(key, this.captureViewState());
    this.tab.set(s.tab === 'previous' ? 'previous' : 'upcoming');
    this.search.set(typeof s.search === 'string' ? s.search : '');
    this.typeFilter.set(typeof s.type === 'string' ? s.type : '');
    this.viewStateRestored = true;
  }
}
