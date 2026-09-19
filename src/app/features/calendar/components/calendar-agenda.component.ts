import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { CalendarEvent, CalendarCategory, CALENDAR_CATEGORIES } from '../models/calendar.models';
import { compareEvents, formatLongDate, formatTime, toIsoDate } from '../calendar.utils';

interface AgendaGroup {
  iso: string;
  label: string;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar-agenda',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal-card">
      <div class="cal-agenda-head">
        <span class="cal-agenda-title">Upcoming</span>
        <span class="cal-global-strip"><app-icon name="list-bullet"></app-icon> {{ total() }} event{{ total() === 1 ? '' : 's' }}</span>
      </div>
      <div class="cal-agenda-body">
        @if (groups().length === 0) {
          <div class="cal-empty">No upcoming appointments. Add one to get started.</div>
        } @else {
          @for (g of groups(); track g.iso) {
            <div class="cal-agenda-day">{{ g.label }}</div>
            @for (ev of g.events; track ev.id) {
              <button type="button" class="cal-agenda-row {{ catClass(ev.category) }}" (click)="eventClick.emit(ev)">
                <div class="cal-agenda-top">
                  <span class="cal-agenda-name">{{ ev.title }}</span>
                  <span class="cal-agenda-time">{{ ev.all_day ? 'All day' : time(ev.start_time) }}</span>
                </div>
                <div class="cal-agenda-meta">
                  <span class="cal-chip {{ catClass(ev.category) }}"><app-icon [name]="catIcon(ev.category)"></app-icon> {{ catLabel(ev.category) }}</span>
                  @if (ev.company_name) { <span class="cal-agenda-co"><app-icon name="building-office"></app-icon> {{ ev.company_name }}</span> }
                  @if (ev.location) { <span class="cal-agenda-co"><app-icon name="map-pin"></app-icon> {{ ev.location }}</span> }
                </div>
              </button>
            }
          }
        }
      </div>
    </div>
  `,
})
export class CalendarAgendaComponent {
  readonly events = input.required<CalendarEvent[]>();
  readonly eventClick = output<CalendarEvent>();

  private readonly todayIso = toIsoDate(new Date());

  readonly groups = computed<AgendaGroup[]>(() => {
    const upcoming = this.events()
      .filter(e => e.date >= this.todayIso && e.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || compareEvents(a, b));

    const byDate = new Map<string, CalendarEvent[]>();
    for (const ev of upcoming) {
      const list = byDate.get(ev.date) ?? [];
      list.push(ev);
      byDate.set(ev.date, list);
    }
    return [...byDate.entries()].map(([iso, events]) => ({
      iso,
      label: iso === this.todayIso ? 'Today' : formatLongDate(iso),
      events,
    }));
  });

  readonly total = computed(() => this.groups().reduce((sum, g) => sum + g.events.length, 0));

  time(hhmm: string | null): string { return formatTime(hhmm); }
  catClass(category: CalendarCategory): string { return `cal-cat-${category}`; }
  catLabel(category: CalendarCategory): string {
    return CALENDAR_CATEGORIES.find(c => c.key === category)?.label ?? category;
  }
  catIcon(category: CalendarCategory): string {
    return CALENDAR_CATEGORIES.find(c => c.key === category)?.icon ?? 'ellipsis-horizontal';
  }
}
