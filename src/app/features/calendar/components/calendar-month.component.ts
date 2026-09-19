import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent, CalendarCategory, WEEKDAY_LABELS } from '../models/calendar.models';
import { monthGrid, sameMonth, formatTime, compareEvents, toIsoDate } from '../calendar.utils';

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  overflow: number;
}

const MAX_CHIPS = 3;

@Component({
  selector: 'app-calendar-month',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal-grid">
      @for (dow of weekdays; track dow) { <div class="cal-dow">{{ dow }}</div> }
    </div>
    <div class="cal-grid">
      @for (cell of cells(); track cell.iso) {
        <div class="cal-cell" [class.muted]="!cell.inMonth" [class.today]="cell.isToday">
          <button type="button" class="cal-daynum" (click)="dayClick.emit(cell.iso)" [attr.aria-label]="'Add event on ' + cell.iso">{{ cell.day }}</button>
          @for (ev of cell.events; track ev.id) {
            <button
              type="button"
              class="cal-ev {{ catClass(ev.category) }}"
              [class.status-cancelled]="ev.status === 'cancelled'"
              [class.status-completed]="ev.status === 'completed'"
              (click)="eventClick.emit(ev)"
              [title]="ev.title">
              @if (!ev.all_day && ev.start_time) { <span class="cal-ev-time">{{ time(ev.start_time) }}</span> }
              <span class="cal-ev-title">{{ ev.title }}</span>
            </button>
          }
          @if (cell.overflow > 0) {
            <button type="button" class="cal-more" (click)="dayClick.emit(cell.iso)">+{{ cell.overflow }} more</button>
          }
        </div>
      }
    </div>
  `,
})
export class CalendarMonthComponent {
  readonly year = input.required<number>();
  readonly month = input.required<number>();
  readonly events = input.required<CalendarEvent[]>();
  readonly maxChips = input<number>(MAX_CHIPS);

  readonly eventClick = output<CalendarEvent>();
  readonly dayClick = output<string>();

  readonly weekdays = WEEKDAY_LABELS;
  private readonly todayIso = toIsoDate(new Date());

  readonly cells = computed<DayCell[]>(() => {
    const y = this.year();
    const m = this.month();
    const byDay = new Map<string, CalendarEvent[]>();
    for (const ev of this.events()) {
      const list = byDay.get(ev.date) ?? [];
      list.push(ev);
      byDay.set(ev.date, list);
    }
    for (const list of byDay.values()) list.sort(compareEvents);

    return monthGrid(y, m).map(iso => {
      const all = byDay.get(iso) ?? [];
      const limit = this.maxChips();
      return {
        iso,
        day: Number(iso.slice(8, 10)),
        inMonth: sameMonth(iso, y, m),
        isToday: iso === this.todayIso,
        events: all.slice(0, limit),
        overflow: Math.max(0, all.length - limit),
      };
    });
  });

  time(hhmm: string | null): string { return formatTime(hhmm); }

  catClass(category: CalendarCategory): string { return `cal-cat-${category}`; }
}
