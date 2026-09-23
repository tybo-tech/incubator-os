import {
  Component, ChangeDetectionStrategy, input, output, signal, computed,
  OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { SessionInput, SessionType, SESSION_TYPES } from '../models/session.models';
import { EligibleEvent } from '../services/session.service';
import { toIsoDate } from '../../calendar/calendar.utils';

/**
 * Schedule a new Session, or convert an eligible existing meeting event.
 *
 * `mode` decides which: 'create' builds a new company meeting event together with
 * the Session (atomically, server-side); 'convert' attaches an existing eligible
 * meeting event.
 */
@Component({
  selector: 'app-session-schedule-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sw-modal" role="dialog" aria-modal="true">
      <div class="sw-modal-card">
        <div class="sw-modal-head">
          <div>
            <h3>{{ isConvert() ? 'Create session workspace' : 'Schedule session' }}</h3>
            <div class="sw-head-sub">{{ companyName() || ('Company ' + companyId()) }}</div>
          </div>
          <button type="button" class="sw-icon-btn" aria-label="Close" title="Close" (click)="close.emit()">
            <app-icon name="x-mark"></app-icon>
          </button>
        </div>

        <div class="sw-modal-body">
          @if (error()) { <div class="sw-alert error">{{ error() }}</div> }

          @if (isConvert()) {
            <div class="sw-field">
              <span>Meeting event</span>
              @if (eligibleEvents().length === 0) {
                <div class="sw-footnote">No eligible meeting events in the next 180 days. Convert requires an existing company meeting event.</div>
              } @else {
                <select class="sw-select" [(ngModel)]="selectedEventId" (ngModelChange)="onEventChange()">
                  <option [ngValue]="0">Choose a meeting…</option>
                  @for (e of eligibleEvents(); track e.id) { <option [ngValue]="e.id">{{ eventLabel(e) }}</option> }
                </select>
              }
            </div>

            @if (selectedEvent(); as ev) {
              <div class="sw-snapshot" style="margin-top:10px;">
                <div><strong>{{ ev.title }}</strong></div>
                <div class="sw-mini">{{ eventLabel(ev) }} · meeting</div>
              </div>
            }
          } @else {
            <div class="sw-field">
              <span>Subject</span>
              <input class="sw-input" type="text" [(ngModel)]="subject" placeholder="e.g. Quarterly progress review" maxlength="200">
            </div>
          }

          <div class="sw-form-grid" style="margin-top:10px;">
            <label class="sw-field">
              <span>Session type</span>
              <select class="sw-select" [(ngModel)]="sessionType">
                @for (t of types; track t.key) { <option [value]="t.key">{{ t.label }}</option> }
              </select>
            </label>
            <label class="sw-field">
              <span>Facilitator</span>
              <input class="sw-input" type="text" [(ngModel)]="facilitatorLabel" placeholder="Optional">
            </label>
          </div>

          @if (!isConvert()) {
            <div class="sw-form-grid" style="margin-top:10px;">
              <label class="sw-field">
                <span>Date</span>
                <input class="sw-input" type="date" [(ngModel)]="date">
              </label>
              <label class="sw-field">
                <span>All day</span>
                <select class="sw-select" [(ngModel)]="allDay">
                  <option [ngValue]="true">Yes</option>
                  <option [ngValue]="false">No</option>
                </select>
              </label>
            </div>

            @if (!allDay) {
              <div class="sw-form-grid" style="margin-top:10px;">
                <label class="sw-field">
                  <span>Start time</span>
                  <input class="sw-input" type="time" [(ngModel)]="startTime">
                </label>
                <label class="sw-field">
                  <span>End time</span>
                  <input class="sw-input" type="time" [(ngModel)]="endTime">
                </label>
              </div>
            }

            <label class="sw-field" style="margin-top:10px;">
              <span>Location</span>
              <input class="sw-input" type="text" [(ngModel)]="location" placeholder="Optional">
            </label>
          }

          <div class="sw-field" style="margin-top:12px;">
            <span>Purpose</span>
            <textarea class="sw-textarea" [(ngModel)]="purpose" placeholder="Why are we meeting?"></textarea>
          </div>

          <div class="sw-footnote" style="margin-top:10px;">
            @if (isConvert()) {
              The Session links to the selected meeting. Rescheduling happens in the calendar.
            } @else {
              A company meeting event is created together with the Session in one step.
            }
          </div>
        </div>

        <div class="sw-modal-foot">
          <button type="button" class="sw-btn" (click)="close.emit()">Cancel</button>
          <button type="button" class="sw-btn primary" [disabled]="saving() || !canSubmit" (click)="doSubmit()">
            <app-icon name="check"></app-icon> {{ isConvert() ? 'Create workspace' : 'Schedule session' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SessionScheduleModalComponent implements OnChanges {
  readonly companyId = input.required<number>();
  readonly companyName = input<string>('');
  readonly eligibleEvents = input<EligibleEvent[]>([]);
  readonly mode = input<'create' | 'convert'>('create');
  readonly saving = input<boolean>(false);

  readonly close = output<void>();
  readonly submit = output<SessionInput>();

  readonly types = SESSION_TYPES;
  readonly error = signal<string | null>(null);

  readonly isConvert = computed(() => this.mode() === 'convert');

  subject = '';
  sessionType: SessionType = 'coaching';
  facilitatorLabel = '';
  date = toIsoDate(new Date());
  allDay = false;
  startTime = '09:00';
  endTime = '10:00';
  location = '';
  purpose = '';
  selectedEventId = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      // Reset the form whenever the modal switches purpose.
      this.subject = '';
      this.selectedEventId = 0;
      this.purpose = '';
      this.facilitatorLabel = '';
      this.date = toIsoDate(new Date());
    }
  }

  readonly selectedEvent = computed(() =>
    this.eligibleEvents().find(e => e.id === this.selectedEventId) ?? null);

  /**
   * Template-bound form state is plain properties (ngModel), not signals, so this
   * must be a getter — a `computed()` would never re-evaluate.
   */
  get canSubmit(): boolean {
    if (this.isConvert()) return this.selectedEventId > 0;
    return this.subject.trim().length > 0 && !!this.date;
  }

  eventLabel(e: EligibleEvent): string {
    const when = e.allDay ? (e.startDate ?? '') : this.localDateTime(e.startAt);
    return when ? `${e.title} · ${when}` : e.title;
  }

  private localDateTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  onEventChange(): void {
    const ev = this.selectedEvent();
    if (ev) this.subject = ev.title;
  }

  doSubmit(): void {
    if (!this.canSubmit) return;
    const tz = this.localTimezone();

    if (this.isConvert()) {
      const ev = this.selectedEvent();
      if (!ev) return;
      this.submit.emit({
        companyId: this.companyId(),
        calendarEventId: ev.id,
        sessionType: this.sessionType,
        subject: this.subject || ev.title,
        purpose: this.purpose || null,
        facilitatorLabel: this.facilitatorLabel || null,
      });
      return;
    }

    const base: SessionInput = {
      companyId: this.companyId(),
      sessionType: this.sessionType,
      subject: this.subject.trim(),
      purpose: this.purpose || null,
      facilitatorLabel: this.facilitatorLabel || null,
      eventTitle: this.subject.trim(),
      eventLocation: this.location || null,
      allDay: this.allDay,
      timezone: this.allDay ? null : tz,
    };

    if (this.allDay) {
      base.startDate = this.date;
      base.endDate = this.date;
    } else {
      base.startAt = this.localToUtcIso(this.date, this.startTime);
      base.endAt = this.localToUtcIso(this.date, this.endTime || this.startTime);
    }

    this.submit.emit(base);
  }

  private localTimezone(): string {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg'; }
    catch { return 'Africa/Johannesburg'; }
  }

  private localToUtcIso(dateIso: string, hhmm: string): string | null {
    if (!dateIso) return null;
    const [y, m, d] = dateIso.split('-').map(Number);
    const [hh, mm] = hhmm.split(':').map(Number);
    const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
    return local.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
}


