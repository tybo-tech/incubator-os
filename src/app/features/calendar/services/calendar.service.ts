import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import {
  CalendarCategory,
  CalendarEvent,
  CalendarEventInput,
  CalendarLinkType,
} from '../models/calendar.models';
import { addDays, addMonths, toIsoDate } from '../calendar.utils';

const STORAGE_KEY = 'ios:calendar:events';
const SEEDED_KEY = 'ios:calendar:seeded-companies';

/**
 * Demo companies used to populate the global calendar before real company data
 * is wired in. Ids/names are made up and never written anywhere but localStorage.
 */
const DEMO_COMPANIES: { id: number; name: string }[] = [
  { id: 9001, name: 'Ubuntu Agri Processing' },
  { id: 9002, name: 'Thabo Logistics' },
  { id: 9003, name: 'Khanya Textiles' },
  { id: 9004, name: 'Moloi Construction' },
  { id: 9005, name: 'Zanele Foods' },
];

/**
 * Mock calendar data layer.
 *
 * Sprint-007's measurement / achievement work is backed by real endpoints; the
 * calendar has no backend yet, so this service is deliberately local-only:
 * events are generated once per company, persisted to localStorage and then
 * mutated there. The public surface mirrors the REST services
 * (`list/create/update/remove`) so swapping in PHP endpoints later is a
 * drop-in change — no component edits required.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private auth = inject(AuthService);

  /** All events for the global calendar (every company + system-wide). */
  listGlobal(): Observable<CalendarEvent[]> {
    this.ensureSeeded();
    return of(this.all().sort((a, b) => a.date.localeCompare(b.date)));
  }

  /**
   * Events for one company: its own events plus system-wide ones
   * (`company_id === null`), which appear in every company calendar.
   */
  listForCompany(companyId: number): Observable<CalendarEvent[]> {
    this.ensureSeeded();
    if (!companyId) return of([]);
    this.ensureCompanySeeded(companyId, `Company ${companyId}`);
    const events = this.all()
      .filter(e => e.company_id === companyId || e.company_id === null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return of(events);
  }

  create(input: CalendarEventInput): Observable<CalendarEvent> {
    this.ensureSeeded();
    const events = this.all();
    const event: CalendarEvent = {
      ...input,
      id: this.newId(),
      created_by: this.currentUserName(),
      created_at: new Date().toISOString(),
    };
    events.push(event);
    this.write(events);
    return of(event);
  }

  update(id: string, patch: Partial<CalendarEventInput>): Observable<CalendarEvent> {
    this.ensureSeeded();
    const events = this.all();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) throw new Error(`Calendar event ${id} not found`);
    events[index] = { ...events[index], ...patch, id: events[index].id };
    this.write(events);
    return of(events[index]);
  }

  remove(id: string): Observable<void> {
    this.ensureSeeded();
    this.write(this.all().filter(e => e.id !== id));
    return of(void 0);
  }

  /** Wipes all mock events and re-seeds on next read (handy while prototyping). */
  resetDemoData(): Observable<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SEEDED_KEY);
    } catch { /* ignore */ }
    return of(void 0);
  }

  private newId(): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `cal_${Date.now().toString(36)}_${rand}`;
  }

  private currentUserName(): string {
    const user = this.auth.getUser();
    return user?.full_name || user?.username || 'System';
  }

  private all(): CalendarEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CalendarEvent[]) : [];
    } catch {
      return [];
    }
  }

  private write(events: CalendarEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch { /* storage unavailable — mock data is best-effort */ }
  }

  /**
   * Seeds a deterministic set of demo events the first time a company is
   * viewed, plus a couple of system-wide events. Repeated calls are cheap.
   */
  private ensureSeeded(): void {
    const seeded = this.seededCompanies();
    const events = this.all();
    let changed = false;

    if (!seeded.includes(0)) {
      events.push(...this.systemEvents());
      // Demo companies keep the global view meaningful while the calendar is
      // still mock-data only.
      for (const co of DEMO_COMPANIES) {
        events.push(...this.companyEvents(co.id, co.name));
      }
      seeded.push(0);
      changed = true;
    }

    if (changed) {
      this.write(events);
      this.writeSeeded(seeded);
    }
  }

  /** Seeds a company's own demo events the first time its calendar is opened. */
  private ensureCompanySeeded(companyId: number, name: string): void {
    const seeded = this.seededCompanies();
    if (seeded.includes(companyId)) return;
    const events = this.all();
    events.push(...this.companyEvents(companyId, name));
    seeded.push(companyId);
    this.write(events);
    this.writeSeeded(seeded);
  }

  private seededCompanies(): number[] {
    try {
      const raw = localStorage.getItem(SEEDED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }

  private writeSeeded(ids: number[]): void {
    try {
      localStorage.setItem(SEEDED_KEY, JSON.stringify(ids));
    } catch { /* ignore */ }
  }

  private base(companyId: number): { anchor: string; year: number; month: number } {
    // Anchor demo events around "today" but vary by company so each company
    // calendar looks distinct.
    const today = new Date();
    const shift = (companyId % 5) - 2;
    const { year, month } = addMonths(today.getFullYear(), today.getMonth(), shift);
    const anchor = toIsoDate(new Date(year, month, 8));
    return { anchor, year, month };
  }

  private systemEvents(): CalendarEvent[] {
    const today = new Date();
    const monthStart = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 3));
    const monthEnd = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 26));
    return [
      this.seed({
        id: 'cal_seed_sys_1',
        company_id: null,
        company_name: null,
        title: 'Quarterly programme check-in (all companies)',
        description: 'System-wide review of incubatee progress for the quarter.',
        category: 'review',
        date: monthStart,
        all_day: true,
        start_time: null,
        end_time: null,
        location: 'Online',
        assignee: 'Programme Office',
        link_type: null,
        link_id: null,
        link_label: null,
      }),
      this.seed({
        id: 'cal_seed_sys_2',
        company_id: null,
        company_name: null,
        title: 'Reporting submissions close',
        description: 'Deadline for all companies to submit quarterly reporting.',
        category: 'deadline',
        date: monthEnd,
        all_day: true,
        start_time: null,
        end_time: null,
        location: null,
        assignee: null,
        link_type: null,
        link_id: null,
        link_label: null,
      }),
    ];
  }

  private companyEvents(companyId: number, name: string): CalendarEvent[] {
    const { anchor } = this.base(companyId);
    const mk = (
      idx: number,
      dayOffset: number,
      title: string,
      category: CalendarCategory,
      extra: Partial<CalendarEvent> = {},
    ): CalendarEvent => this.seed({
      id: `cal_seed_${companyId}_${idx}`,
      company_id: companyId,
      company_name: name,
      title,
      description: null,
      category,
      date: addDays(anchor, dayOffset),
      all_day: false,
      start_time: '09:00',
      end_time: '10:00',
      location: null,
      assignee: null,
      link_type: null,
      link_id: null,
      link_label: null,
      ...extra,
    });

    return [
      mk(1, 0, 'Board meeting', 'meeting', {
        start_time: '08:30', end_time: '10:00', location: 'Boardroom', assignee: 'Executive team',
      }),
      mk(2, 2, 'Financial indicators due', 'deadline', {
        start_time: '17:00', end_time: null, link_type: 'financial', link_id: null, link_label: 'Monthly financial indicators',
      }),
      mk(3, 4, 'Mentorship session', 'check_in', {
        start_time: '11:00', end_time: '12:00', location: 'Online', assignee: 'Coach', link_type: 'task', link_id: null, link_label: 'Mentorship logbook',
      }),
      mk(4, 7, 'Revenue target review', 'review', {
        start_time: '14:00', end_time: '15:00', link_type: 'target', link_id: null, link_label: 'Revenue growth target',
      }),
      mk(5, 9, 'SWOT refresh workshop', 'milestone', {
        all_day: true, start_time: null, end_time: null, link_type: 'swot', link_id: null, link_label: 'SWOT analysis',
      }),
      mk(6, 12, 'Submit grant application', 'deadline', {
        start_time: '12:00', end_time: null, link_type: 'task', link_id: null, link_label: 'Grant funding application',
      }),
      mk(7, 15, 'Results & achievements capture', 'check_in', {
        start_time: '10:00', end_time: '11:00', link_type: 'result', link_id: null, link_label: 'Verified results',
      }),
    ];
  }

  private seed(event: Omit<CalendarEvent, 'status' | 'created_by' | 'created_at'> & Partial<CalendarEvent>): CalendarEvent {
    return {
      status: 'scheduled',
      created_by: 'Demo data',
      created_at: '2026-09-01T08:00:00.000Z',
      ...event,
    } as CalendarEvent;
  }
}
