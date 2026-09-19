import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { CalendarEvent, CalendarCategory, CALENDAR_CATEGORIES } from '../models/calendar.models';
import { compareEvents, formatLongDate, formatTime } from '../calendar.utils';

@Component({
  selector: 'app-calendar-day-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sw-modal" role="dialog" aria-modal="true">
      <div class="sw-modal-card">
        <div class="sw-modal-head">
          <div>
            <h3>{{ heading() }}</h3>
            <div class="sw-head-sub">{{ events().length }} appointment{{ events().length === 1 ? '' : 's' }}</div>
          </div>
          <button type="button" class="sw-icon-btn" aria-label="Close" title="Close" (click)="close.emit()">
            <app-icon name="x-mark"></app-icon>
          </button>
        </div>
        <div class="sw-modal-body">
          @if (events().length === 0) {
            <div class="cal-empty">Nothing scheduled for this day.</div>
          } @else {
            <div class="cal-day-list">
              @for (ev of sorted(); track ev.id) {
                <button type="button" class="cal-day-item {{ catClass(ev.category) }}" (click)="eventClick.emit(ev)">
                  <span class="cal-dot" [class]="'cal-cat-' + ev.category"></span>
                  <span style="flex:1; min-width:0;">
                    <strong style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ ev.title }}</strong>
                    <span style="color:var(--ios-muted); font-size:10px;">
                      {{ ev.all_day ? 'All day' : time(ev.start_time) + (ev.end_time ? ' – ' + time(ev.end_time) : '') }}
                      @if (ev.company_name) { · {{ ev.company_name }} }
                    </span>
                  </span>
                  <app-icon name="chevron-right"></app-icon>
                </button>
              }
            </div>
          }
        </div>
        <div class="sw-modal-foot">
          <button type="button" class="sw-btn" (click)="close.emit()">Close</button>
          <button type="button" class="sw-btn primary" (click)="addHere.emit()"><app-icon name="plus"></app-icon> Add on this day</button>
        </div>
      </div>
    </div>
  `,
})
export class CalendarDayModalComponent {
  readonly date = input.required<string>();
  readonly events = input.required<CalendarEvent[]>();

  readonly close = output<void>();
  readonly eventClick = output<CalendarEvent>();
  readonly addHere = output<void>();

  heading(): string { return formatLongDate(this.date()); }
  sorted(): CalendarEvent[] { return [...this.events()].sort(compareEvents); }
  time(hhmm: string | null): string { return formatTime(hhmm); }
  catClass(category: CalendarCategory): string { return `cal-cat-${category}`; }
}
