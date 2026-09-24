import {
  Component, ChangeDetectionStrategy, input, output,
  signal, computed, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import {
  CalendarEvent, CalendarEventInput, CalendarCategory, CalendarStatus,
  CalendarLinkType, CALENDAR_CATEGORIES, CALENDAR_LINK_TYPES,
} from '../models/calendar.models';
import {
  GoogleConnection, GoogleEventSync, GooglePublishIntent,
} from '../models/google-calendar.models';
import { GoogleEventSectionComponent } from './google-event-section.component';
import { GooglePublishConfirmComponent } from './google-publish-confirm.component';
import { toIsoDate } from '../calendar.utils';

export interface EventFormContext {
  /** Company to attach the event to; null = system-wide (global calendar). */
  companyId: number | null;
  companyName: string | null;
  /** Pre-selected date (e.g. clicked day cell). */
  date: string;
  /** Allow choosing the scope on the global calendar. */
  allowScopeToggle: boolean;
}

@Component({
  selector: 'app-calendar-event-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent, GoogleEventSectionComponent, GooglePublishConfirmComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sw-modal" role="dialog" aria-modal="true">
      <div class="sw-modal-card">
        <div class="sw-modal-head">
          <div>
            <h3>{{ editing() ? 'Edit appointment' : 'New appointment' }}</h3>
            <div class="sw-head-sub">{{ scopeLabel() }}</div>
          </div>
          <button type="button" class="sw-icon-btn" aria-label="Close" title="Close" (click)="close.emit()">
            <app-icon name="x-mark"></app-icon>
          </button>
        </div>

        <div class="sw-modal-body">
          @if (error()) { <div class="sw-alert error">{{ error() }}</div> }

          <div class="sw-field">
            <span>Title</span>
            <input class="sw-input" type="text" [(ngModel)]="title" placeholder="e.g. Quarterly board meeting" maxlength="120">
          </div>

          <div class="sw-form-grid" style="margin-top:10px;">
            <label class="sw-field">
              <span>Category</span>
              <select class="sw-select" [(ngModel)]="category">
                @for (c of categories; track c.key) { <option [value]="c.key">{{ c.label }}</option> }
              </select>
            </label>
            <label class="sw-field">
              <span>Status</span>
              <select class="sw-select" [(ngModel)]="status">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          @if (ctx().allowScopeToggle) {
            <div class="sw-field" style="margin-top:10px;">
              <span>Applies to</span>
              <select class="sw-select" [(ngModel)]="scope">
                <option value="system">All companies (system-wide)</option>
                <option value="company">This company ({{ ctx().companyName || ctx().companyId }})</option>
              </select>
            </div>
          }

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

          <div class="sw-form-grid" style="margin-top:10px;">
            <label class="sw-field">
              <span>Location</span>
              <input class="sw-input" type="text" [(ngModel)]="location" placeholder="Optional">
            </label>
            <label class="sw-field">
              <span>Assignee</span>
              <input class="sw-input" type="text" [(ngModel)]="assignee" placeholder="Optional">
            </label>
          </div>

          <div class="sw-section">
            <div class="sw-section-title">Linked record (optional)</div>
            <div class="sw-form-grid">
              <label class="sw-field">
                <span>Type</span>
                <select class="sw-select" [(ngModel)]="linkType">
                  <option value="">None</option>
                  @for (l of linkTypes; track l.key) { <option [value]="l.key">{{ l.label }}</option> }
                </select>
              </label>
              <label class="sw-field">
                <span>Label</span>
                <input class="sw-input" type="text" [(ngModel)]="linkLabel" placeholder="e.g. Revenue growth target" [disabled]="!linkType">
              </label>
            </div>
          </div>

          <div class="sw-field" style="margin-top:12px;">
            <span>Description</span>
            <textarea class="sw-textarea" [(ngModel)]="description" placeholder="Optional notes"></textarea>
          </div>

          @if (sessionId()) {
            <div class="sw-snapshot" style="margin-top:12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <div>
                <div><strong>This appointment has a Session</strong></div>
                <div class="sw-mini">Preparation, agenda, notes and decisions live in the Session workspace.</div>
              </div>
              <button type="button" class="sw-btn sm" (click)="openSession.emit(sessionId()!)">
                <app-icon name="arrow-right"></app-icon> Open session workspace
              </button>
            </div>
          }

          @if (editing()) {
            <app-google-event-section
              [connection]="googleConnection()"
              [projection]="googleProjection()"
              [busy]="googleBusy()"
              (requestPublish)="confirmPublish.set(true)"
              (requestSync)="syncRequested.emit()"
              (requestRemove)="removeRequested.emit()"
              (reconnect)="reconnectRequested.emit()">
            </app-google-event-section>
          }
        </div>

        <div class="sw-modal-foot">
          @if (editing()) {
            <button type="button" class="sw-btn danger" style="margin-right:auto;" (click)="delete.emit()">
              <app-icon name="trash"></app-icon> Delete
            </button>
          }
          <button type="button" class="sw-btn" (click)="close.emit()">Cancel</button>
          <button type="button" class="sw-btn primary" [disabled]="saving()" (click)="submit()">
            <app-icon name="check"></app-icon> {{ editing() ? 'Save changes' : 'Create appointment' }}
          </button>
        </div>
      </div>
    </div>

    @if (confirmPublish()) {
      <app-google-publish-confirm
        [intent]="publishIntent()"
        [busy]="googleBusy()"
        (cancel)="confirmPublish.set(false)"
        (confirm)="confirmPublish.set(false); confirmPublishAction.emit()">
      </app-google-publish-confirm>
    }
  `,
})
export class CalendarEventModalComponent implements OnChanges {
  readonly ctx = input.required<EventFormContext>();
  readonly event = input<CalendarEvent | null>(null);
  readonly saving = input<boolean>(false);
  /** The acting user's Google connection, for the per-event Google section. */
  readonly googleConnection = input<GoogleConnection | null>(null);
  /** The event's Google projection (null until loaded). */
  readonly googleProjection = input<GoogleEventSync | null>(null);
  /** A Google request is in flight: disable repeat actions. */
  readonly googleBusy = input<boolean>(false);
  /** The publish confirmation details (organiser, attendees, invitations, Meet). */
  readonly publishIntent = input<GooglePublishIntent>({
    organiserEmail: null, attendeeCount: 0, willSendInvitations: false, isMeeting: false,
  });

  readonly close = output<void>();
  readonly save = output<CalendarEventInput & { id?: string }>();
  readonly delete = output<void>();
  /** Emitted with the Session id when the user opens the linked workspace. */
  readonly openSession = output<number>();
  /** Google intents, handled by the page (which owns the API calls). */
  readonly syncRequested = output<void>();
  readonly removeRequested = output<void>();
  readonly reconnectRequested = output<void>();
  /** The user confirmed publishing in the confirmation dialog. */
  readonly confirmPublishAction = output<void>();

  /** The publish confirmation dialog is owned here and only appears on request. */
  readonly confirmPublish = signal(false);

  /** Linked Session id for the event being edited, if any. */
  readonly sessionId = computed(() => this.event()?.session_id ?? null);

  readonly categories = CALENDAR_CATEGORIES;
  readonly linkTypes = CALENDAR_LINK_TYPES;

  readonly error = signal<string | null>(null);

  title = '';
  description = '';
  category: CalendarCategory = 'meeting';
  status: CalendarStatus = 'scheduled';
  date = '';
  allDay = false;
  startTime = '09:00';
  endTime = '10:00';
  location = '';
  assignee = '';
  linkType: CalendarLinkType | '' = '';
  linkLabel = '';
  scope: 'system' | 'company' = 'company';

  readonly editing = computed(() => !!this.event());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event'] || changes['ctx']) this.hydrate();
  }

  private hydrate(): void {
    this.error.set(null);
    const ev = this.event();
    const ctx = this.ctx();
    if (ev) {
      this.title = ev.title;
      this.description = ev.description ?? '';
      this.category = ev.category;
      this.status = ev.status;
      this.date = ev.date;
      this.allDay = ev.all_day;
      this.startTime = ev.start_time ?? '09:00';
      this.endTime = ev.end_time ?? '10:00';
      this.location = ev.location ?? '';
      this.assignee = ev.assignee ?? '';
      this.linkType = ev.link_type ?? '';
      this.linkLabel = ev.link_label ?? '';
      this.scope = ev.company_id === null ? 'system' : 'company';
    } else {
      this.title = '';
      this.description = '';
      this.category = 'meeting';
      this.status = 'scheduled';
      this.date = ctx.date || toIsoDate(new Date());
      this.allDay = false;
      this.startTime = '09:00';
      this.endTime = '10:00';
      this.location = '';
      this.assignee = '';
      this.linkType = '';
      this.linkLabel = '';
      this.scope = ctx.companyId === null ? 'system' : 'company';
    }
  }

  scopeLabel(): string {
    if (this.scope === 'system' || this.ctx().companyId === null) return 'Visible in every company calendar';
    return `${this.ctx().companyName || 'Company ' + this.ctx().companyId}`;
  }

  submit(): void {
    if (!this.title.trim()) { this.error.set('A title is required.'); return; }
    if (!this.date) { this.error.set('A date is required.'); return; }
    if (!this.allDay && this.startTime && this.endTime && this.endTime < this.startTime) {
      this.error.set('End time must be after the start time.'); return;
    }

    const companyId = this.scope === 'system' || this.ctx().companyId === null ? null : this.ctx().companyId;
    const payload: CalendarEventInput & { id?: string } = {
      company_id: companyId,
      company_name: companyId === null ? null : this.ctx().companyName,
      title: this.title.trim(),
      description: this.description.trim() || null,
      category: this.category,
      date: this.date,
      all_day: this.allDay,
      start_time: this.allDay ? null : (this.startTime || null),
      end_time: this.allDay ? null : (this.endTime || null),
      location: this.location.trim() || null,
      assignee: this.assignee.trim() || null,
      link_type: this.linkType || null,
      link_id: null,
      link_label: this.linkType ? (this.linkLabel.trim() || null) : null,
      status: this.status,
      created_by: null,
    };
    if (this.event()?.id) payload.id = this.event()!.id;
    this.save.emit(payload);
  }
}
