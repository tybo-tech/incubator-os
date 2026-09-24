import {
  Component, ChangeDetectionStrategy, input, output, computed,
  signal, effect, ElementRef, viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { GooglePublishIntent } from '../models/google-calendar.models';

/**
 * "Add to Google Calendar" confirmation (Sprint 010 Phase 5).
 *
 * States plainly what publishing will do BEFORE it happens: the connected
 * organiser, how many attendees will be invited, whether invitation emails will
 * be sent, and whether a Meet link will be created. A generic (non-Session)
 * event states that no attendees will be invited.
 *
 * Follows the popup contract: no outside-click close, fixed header/footer,
 * scrollable body, Escape cancels, and the confirm action is focused on open.
 */
@Component({
  selector: 'app-google-publish-confirm',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sw-modal" role="dialog" aria-modal="true" aria-labelledby="gpc-title" (keydown.escape)="cancel.emit()">
      <div class="sw-modal-card gpc-card" (click)="$event.stopPropagation()">
        <div class="sw-modal-head">
          <div>
            <h3 id="gpc-title">{{ headerText() }}</h3>
            <div class="sw-head-sub">Your Google Calendar</div>
          </div>
          <button type="button" class="sw-icon-btn" aria-label="Cancel" title="Cancel" (click)="cancel.emit()">
            <app-icon name="x-mark"></app-icon>
          </button>
        </div>

        <div class="sw-modal-body">
          <p class="gpc-lead">{{ bodyText() }}</p>

          <div class="sw-kv" style="margin-top:12px;">
            <div>
              <span>Connected organiser</span>
              <strong>{{ intent().organiserEmail || 'Your Google account' }}</strong>
            </div>
            <div>
              <span>Attendees to invite</span>
              <strong>{{ intent().attendeeCount }}</strong>
            </div>
            <div>
              <span>Invitation emails</span>
              <strong>{{ intent().willSendInvitations ? 'Will be sent' : 'Not sent' }}</strong>
            </div>
            <div>
              <span>Google Meet link</span>
              <strong>{{ intent().isMeeting ? 'Will be created' : 'Not created' }}</strong>
            </div>
          </div>

          @if (!intent().isMeeting) {
            <div class="sw-alert" style="margin-top:12px; background:var(--ios-blue-soft); border-color:#c7d7fe; color:var(--ios-blue);">
              <app-icon name="information-circle"></app-icon>
              This is not a meeting, so no attendees will be invited and no Meet link will be created.
            </div>
          } @else if (intent().attendeeCount === 0) {
            <div class="sw-alert" style="margin-top:12px; background:var(--ios-blue-soft); border-color:#c7d7fe; color:var(--ios-blue);">
              <app-icon name="information-circle"></app-icon>
              No participants are on this Session yet, so no invitation emails will be sent.
            </div>
          }
        </div>

        <div class="sw-modal-foot">
          <button type="button" class="sw-btn" (click)="cancel.emit()">Cancel</button>
          <button #confirmBtn type="button" class="sw-btn primary" [disabled]="busy()" (click)="confirm.emit()">
            <app-icon name="cloud-arrow-up"></app-icon> Add to Google Calendar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class GooglePublishConfirmComponent {
  readonly intent = input.required<GooglePublishIntent>();
  readonly busy = input<boolean>(false);

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  private readonly confirmBtn = viewChild<ElementRef<HTMLButtonElement>>('confirmBtn');

  readonly headerText = computed(() =>
    this.intent().isMeeting ? 'Add this meeting to Google Calendar?' : 'Add to Google Calendar?');

  readonly bodyText = computed(() => {
    const i = this.intent();
    if (!i.isMeeting) {
      return 'Google will create a calendar event with no attendees and no Meet link.';
    }
    if (i.attendeeCount === 0) {
      return 'Google will create the event and a Meet link, but there are no participants to email yet.';
    }
    const n = i.attendeeCount;
    return `Google will create a Meet link and email invitations to ${n} participant${n === 1 ? '' : 's'}.`;
  });

  private readonly ready = signal(false);

  constructor() {
    effect(() => {
      if (this.ready()) return;
      const el = this.confirmBtn()?.nativeElement;
      if (el) {
        el.focus();
        this.ready.set(true);
      }
    });
  }
}
