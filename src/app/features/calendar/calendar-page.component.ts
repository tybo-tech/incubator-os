import {
  Component, ChangeDetectionStrategy, inject, signal, computed, effect,
  WritableSignal, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon';
import { CompanyService } from '../../../services/company.service';
import { ViewStateService } from '../../../services/view-state.service';
import { CalendarService } from './services/calendar.service';
import { CalendarMonthComponent } from './components/calendar-month.component';
import { CalendarAgendaComponent } from './components/calendar-agenda.component';
import { CalendarDayModalComponent } from './components/calendar-day-modal.component';
import {
  CalendarEventModalComponent, EventFormContext,
} from './components/calendar-event-modal.component';
import {
  CalendarEvent, CalendarEventInput, CalendarCategory,
  CALENDAR_CATEGORIES, MONTH_LABELS,
} from './models/calendar.models';
import {
  addMonths, addDays, sameMonth, formatTime, compareEvents, toIsoDate, monthGrid,
} from './calendar.utils';

type View = 'month' | 'agenda';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AppIconComponent,
    CalendarMonthComponent, CalendarAgendaComponent,
    CalendarDayModalComponent, CalendarEventModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { --ios-navy:#0f1a31; --ios-blue:#1763ff; --ios-purple:#7c3aed; --ios-green:#079447; --ios-orange:#e95a0c; --ios-red:#d92d20; --ios-ink:#15213a; --ios-copy:#41516d; --ios-muted:#71809a; --ios-line:#dfe5ee; --ios-canvas:#f6f8fb; --ios-white:#fff; --ios-blue-soft:#edf4ff; --ios-green-soft:#ecfdf3; --ios-red-soft:#fff1f0; --ios-orange-soft:#fff7ed; --ios-purple-soft:#f5f3ff; display:block; background:var(--ios-canvas); min-height:100%; }
  `],
  template: `
  <div class="sw-wrap">
    <div class="sw-heading">
      <div>
        <h2 class="sw-title">{{ global() ? 'Calendar' : 'Company Calendar' }}</h2>
        <p class="sw-subtitle">
          @if (global()) { Appointments and deadlines across every company · {{ companyCount() }} companies }
          @else { Appointments, deadlines and check-ins for {{ companyName() || ('Company ' + companyId()) }} }
        </p>
      </div>
      <div class="sw-legend">
        @if (global()) { <span class="cal-global-strip"><app-icon name="globe-alt"></app-icon> Global view</span> }
        @else { <span class="cal-global-strip"><app-icon name="building-office"></app-icon> Company view</span> }
      </div>
    </div>

    @if (error()) { <div class="sw-alert error">{{ error() }}</div> }

    <div class="sw-summary">
      <div class="sw-summary-item"><div class="sw-summary-value">{{ monthCount() }}</div><div class="sw-summary-label">This month</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ upcomingCount() }}</div><div class="sw-summary-label">Upcoming</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ meetingsCount() }}</div><div class="sw-summary-label">Meetings</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ deadlinesCount() }}</div><div class="sw-summary-label">Deadlines</div></div>
    </div>

    <div class="sw-toolbar">
      <div class="sw-seg" role="tablist" aria-label="View">
        <button type="button" role="tab" [class.active]="view() === 'month'" [attr.aria-selected]="view() === 'month'" (click)="view.set('month')">
          <app-icon name="calendar-days"></app-icon> Month
        </button>
        <button type="button" role="tab" [class.active]="view() === 'agenda'" [attr.aria-selected]="view() === 'agenda'" (click)="view.set('agenda')">
          <app-icon name="list-bullet"></app-icon> Agenda
        </button>
      </div>

      <label class="sw-search">
        <app-icon name="magnifying-glass"></app-icon>
        <input type="search" placeholder="Search appointments…" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Search appointments">
        @if (search()) { <button class="sw-search-clear" type="button" aria-label="Clear search" (click)="search.set('')"><app-icon name="x-mark"></app-icon></button> }
      </label>

      <button class="sw-btn" type="button" [class.active]="filtersOpen() || activeFilterCount() > 0" (click)="filtersOpen.set(!filtersOpen())">
        <app-icon name="funnel"></app-icon> Filter
        @if (activeFilterCount() > 0) { <span class="sw-filter-count">{{ activeFilterCount() }}</span> }
      </button>

      <span class="sw-spacer"></span>
      <button class="sw-btn" type="button" (click)="goToday()"><app-icon name="flag"></app-icon> Today</button>
      <button class="sw-btn primary" type="button" (click)="openCreate(todayIso)"><app-icon name="plus"></app-icon> New appointment</button>
    </div>

    @if (filtersOpen()) {
      <div class="sw-filters">
        <div class="sw-filter-row">
          <span class="sw-filter-label">Category</span>
          <div class="sw-chipgroup">
            @for (c of categories; track c.key) {
              <button class="sw-chip" type="button" [class.on]="categoryFilter().has(c.key)" (click)="toggleSet(categoryFilter, c.key)">{{ c.label }}</button>
            }
            @if (activeFilterCount() > 0) { <button class="sw-chip" type="button" style="color:var(--ios-red); border-color:#fecdca;" (click)="clearFilters()">Clear all</button> }
          </div>
        </div>
        @if (global()) {
          <div class="sw-filter-row">
            <span class="sw-filter-label">Scope</span>
            <div class="sw-chipgroup">
              <button class="sw-chip" type="button" [class.on]="scopeFilter() === 'all'" (click)="scopeFilter.set('all')">All</button>
              <button class="sw-chip" type="button" [class.on]="scopeFilter() === 'system'" (click)="scopeFilter.set('system')">System-wide</button>
              <button class="sw-chip" type="button" [class.on]="scopeFilter() === 'company'" (click)="scopeFilter.set('company')">Company-specific</button>
            </div>
          </div>
        }
      </div>
    }

    @if (loading()) {
      <div class="sw-footnote">Loading…</div>
    } @else if (view() === 'agenda') {
      <app-calendar-agenda [events]="filtered()" (eventClick)="openEdit($event)"></app-calendar-agenda>
    } @else {
      <div class="cal-layout">
        <div class="cal-card">
          <div class="cal-toolbar">
            <div class="cal-nav">
              <button type="button" aria-label="Previous month" title="Previous month" (click)="shift(-1)"><app-icon name="chevron-left"></app-icon></button>
              <button type="button" aria-label="Next month" title="Next month" (click)="shift(1)"><app-icon name="chevron-right"></app-icon></button>
            </div>
            <span class="cal-month">{{ monthLabel() }}</span>
            @if (!global()) {
              <span class="cal-global-strip" style="margin-left:auto;"><app-icon name="building-office"></app-icon> Company only</span>
            }
          </div>
          <app-calendar-month
            [year]="cursor().year"
            [month]="cursor().month"
            [events]="filtered()"
            (eventClick)="openEdit($event)"
            (dayClick)="openDay($event)">
          </app-calendar-month>
          <div class="cal-legend">
            @for (c of categories; track c.key) {
              <span class="sw-key"><span class="cal-dot" [class]="'cal-cat-' + c.key"></span> {{ c.label }}</span>
            }
          </div>
        </div>

        <app-calendar-agenda [events]="filtered()" (eventClick)="openEdit($event)"></app-calendar-agenda>
      </div>
    }
  </div>

  @if (dayModalOpen()) {
    <app-calendar-day-modal
      [date]="dayModalDate()"
      [events]="eventsOn(dayModalDate())"
      (close)="dayModalOpen.set(false)"
      (eventClick)="openEdit($event)"
      (addHere)="openCreate(dayModalDate())">
    </app-calendar-day-modal>
  }

  @if (formOpen()) {
    <app-calendar-event-modal
      [ctx]="formContext()"
      [event]="editing()"
      [saving]="saving()"
      (close)="closeForm()"
      (save)="save($event)"
      (delete)="deleteCurrent()"
      (openSession)="openSessionWorkspace($event)">
    </app-calendar-event-modal>
  }
  `,
})
export class CalendarPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(CalendarService);
  private companyService = inject(CompanyService);
  private ui = inject(ViewStateService);
  private viewStateRestored = false;

  readonly todayIso = toIsoDate(new Date());
  readonly categories = CALENDAR_CATEGORIES;

  companyId = signal<number>(0);
  global = signal<boolean>(true);
  companyName = signal<string>('');
  companyCount = signal<number>(0);

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  events = signal<CalendarEvent[]>([]);

  view = signal<View>('month');
  search = signal('');
  filtersOpen = signal(false);
  categoryFilter = signal<Set<CalendarCategory>>(new Set());
  scopeFilter = signal<'all' | 'system' | 'company'>('all');
  cursor = signal<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() });

  dayModalOpen = signal(false);
  dayModalDate = signal<string>(this.todayIso);

  formOpen = signal(false);
  editing = signal<CalendarEvent | null>(null);

  constructor() {
    effect(() => {
      const key = this.persistKey();
      const state = this.captureViewState();
      if (!key || !this.viewStateRestored) return;
      this.ui.save(key, state);
    });
  }

  ngOnInit(): void {
    // The company calendar is a child of the company shell, so the `:id` param
    // lives on an ancestor route — walk up to find the nearest one.
    const id = this.resolveCompanyId();
    this.applySource(id);

    this.route.paramMap.subscribe(() => {
      const next = this.resolveCompanyId();
      if (next !== this.companyId()) this.applySource(next);
    });
    this.route.parent?.paramMap.subscribe(() => {
      const next = this.resolveCompanyId();
      if (next !== this.companyId()) this.applySource(next);
    });
  }

  private resolveCompanyId(): number {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const v = Number(r.snapshot.paramMap.get('id') || 0);
      if (v) return v;
      r = r.parent;
    }
    return 0;
  }

  private applySource(companyId: number): void {
    this.companyId.set(companyId);
    this.global.set(companyId === 0);
    this.load();
  }

  private persistKey(): string {
    return this.global() ? 'calendar-view:global' : `calendar-view:${this.companyId()}`;
  }

  /**
   * The API requires a bounded range, so load the visible month grid plus an
   * agenda horizon (today + 120 days) so the agenda works when browsing.
   */
  private loadRange(): { start: string; end: string } {
    const c = this.cursor();
    const cells = monthGrid(c.year, c.month);
    const gridStart = cells[0];
    const gridEnd = cells[cells.length - 1];
    const horizon = addDays(this.todayIso, 120);
    const start = gridStart < this.todayIso ? gridStart : this.todayIso;
    const end = gridEnd > horizon ? gridEnd : horizon;
    return { start, end };
  }

  load(): void {
    const key = this.persistKey();
    if (!this.viewStateRestored) this.restoreViewState(key);

    this.loading.set(true);
    this.error.set(null);
    const companyId = this.global() ? null : this.companyId();
    this.api.list(this.loadRange(), companyId).subscribe({
      next: events => {
        this.events.set(events);
        const names = new Set(events.filter(e => e.company_id !== null).map(e => e.company_id));
        this.companyCount.set(names.size);
        this.resolveCompanyName();
        this.loading.set(false);
      },
      error: err => {
        this.error.set(this.api.errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private resolveCompanyName(): void {
    const id = this.companyId();
    if (!id || this.global()) { this.companyName.set(''); return; }
    const fromEvents = this.events().find(e => e.company_id === id)?.company_name;
    if (fromEvents) { this.companyName.set(fromEvents); return; }
    this.companyService.getCompanyById(id).subscribe({
      next: company => this.companyName.set(company?.name || `Company ${id}`),
      error: () => this.companyName.set(`Company ${id}`),
    });
  }

  // ---------- derived ----------
  readonly filtered = computed<CalendarEvent[]>(() => {
    const term = this.search().trim().toLowerCase();
    const cats = this.categoryFilter();
    const scope = this.scopeFilter();
    return this.events().filter(ev => {
      if (cats.size && !cats.has(ev.category)) return false;
      if (this.global() && scope === 'system' && ev.company_id !== null) return false;
      if (this.global() && scope === 'company' && ev.company_id === null) return false;
      if (term && !this.matches(ev, term)) return false;
      return true;
    });
  });

  readonly monthCount = computed(() => {
    const c = this.cursor();
    return this.filtered().filter(e => sameMonth(e.date, c.year, c.month)).length;
  });
  readonly upcomingCount = computed(() =>
    this.filtered().filter(e => e.date >= this.todayIso && e.status !== 'cancelled').length);
  readonly meetingsCount = computed(() => this.filtered().filter(e => e.category === 'meeting').length);
  readonly deadlinesCount = computed(() => this.filtered().filter(e => e.category === 'deadline').length);

  readonly monthLabel = computed(() => {
    const c = this.cursor();
    return `${MONTH_LABELS[c.month]} ${c.year}`;
  });

  readonly formContext = computed<EventFormContext>(() => ({
    companyId: this.global() ? null : this.companyId(),
    companyName: this.global() ? null : (this.companyName() || `Company ${this.companyId()}`),
    date: this.dayModalDate() || this.todayIso,
    allowScopeToggle: this.global(),
  }));

  readonly activeFilterCount = computed(() => this.categoryFilter().size);

  private matches(ev: CalendarEvent, term: string): boolean {
    return [ev.title, ev.description, ev.location, ev.assignee, ev.company_name, ev.link_label]
      .some(v => (v ?? '').toLowerCase().includes(term));
  }

  eventsOn(iso: string): CalendarEvent[] {
    return this.filtered().filter(e => e.date === iso).sort(compareEvents);
  }

  time(hhmm: string | null): string { return formatTime(hhmm); }

  // ---------- interactions ----------
  shift(delta: number): void {
    const c = this.cursor();
    this.cursor.set(addMonths(c.year, c.month, delta));
    this.load();
  }

  goToday(): void {
    const now = new Date();
    this.cursor.set({ year: now.getFullYear(), month: now.getMonth() });
    this.view.set('month');
    this.load();
  }

  openDay(iso: string): void {
    this.dayModalDate.set(iso);
    this.dayModalOpen.set(true);
  }

  openCreate(dateIso: string): void {
    if (dateIso) this.dayModalDate.set(dateIso);
    this.editing.set(null);
    this.dayModalOpen.set(false);
    this.formOpen.set(true);
  }

  openEdit(ev: CalendarEvent): void {
    this.dayModalOpen.set(false);
    this.editing.set(ev);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  save(payload: CalendarEventInput & { id?: string }): void {
    this.saving.set(true);
    this.error.set(null);
    const id = payload.id;
    const { id: _omit, ...rest } = payload;
    // Carry the version so the backend can reject a stale write.
    const editing = this.editing();
    const body = { ...rest, version: editing?.version } as CalendarEventInput;
    const request = id
      ? this.api.update(id, body)
      : this.api.create(body);
    request.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.reloadAndKeepView(); },
      error: err => { this.saving.set(false); this.error.set(this.api.errorMessage(err)); },
    });
  }

  deleteCurrent(): void {
    const ev = this.editing();
    if (!ev) return;
    if (!confirm(`Delete "${ev.title}"?`)) return;
    this.api.remove(ev.id).subscribe({
      next: () => { this.closeForm(); this.reloadAndKeepView(); },
      error: err => this.error.set(this.api.errorMessage(err)),
    });
  }

  /**
   * An event that backs a Session cannot be managed from the calendar alone, so
   * jump to the Session workspace in the Sessions tab.
   */
  openSessionWorkspace(sessionId: number): void {
    this.closeForm();
    this.router.navigate(['/company', this.companyId(), 'sessions'], {
      queryParams: { session: sessionId },
    });
  }

  /** Re-fetch the visible window without resetting the restored view state. */
  private reloadAndKeepView(): void {
    this.loading.set(true);
    this.error.set(null);
    const companyId = this.global() ? null : this.companyId();
    this.api.list(this.loadRange(), companyId).subscribe({
      next: events => {
        this.events.set(events);
        const names = new Set(events.filter(e => e.company_id !== null).map(e => e.company_id));
        this.companyCount.set(names.size);
        this.loading.set(false);
      },
      error: err => { this.error.set(this.api.errorMessage(err)); this.loading.set(false); },
    });
  }

  // ---------- filters ----------
  toggleSet(target: WritableSignal<Set<CalendarCategory>>, value: CalendarCategory): void {
    const next = new Set(target());
    if (next.has(value)) next.delete(value); else next.add(value);
    target.set(next);
  }

  clearFilters(): void {
    this.categoryFilter.set(new Set());
    this.scopeFilter.set('all');
    this.search.set('');
  }

  // ---------- view persistence ----------
  private captureViewState() {
    return {
      view: this.view(),
      cursorYear: this.cursor().year,
      cursorMonth: this.cursor().month,
      search: this.search(),
      category: [...this.categoryFilter()],
      scope: this.scopeFilter(),
    };
  }

  private restoreViewState(key: string): void {
    const s = this.ui.load(key, this.captureViewState());
    this.view.set(s.view === 'agenda' ? 'agenda' : 'month');
    this.cursor.set({
      year: Number.isFinite(s.cursorYear) ? s.cursorYear : new Date().getFullYear(),
      month: Number.isFinite(s.cursorMonth) ? Math.min(11, Math.max(0, s.cursorMonth)) : new Date().getMonth(),
    });
    this.search.set(typeof s.search === 'string' ? s.search : '');
    this.categoryFilter.set(new Set(this.ui.array<CalendarCategory>(s.category)));
    this.scopeFilter.set((['all', 'system', 'company'].includes(s.scope) ? s.scope : 'all') as 'all' | 'system' | 'company');
    this.viewStateRestored = true;
  }
}
