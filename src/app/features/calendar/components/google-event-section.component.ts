import {
  Component, ChangeDetectionStrategy, input, output, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import {
  GoogleConnection, GoogleEventSync, GoogleEventUiState,
} from '../models/google-calendar.models';

/**
 * The per-event "Google Calendar" section inside the appointment modal
 * (Sprint 010 Phase 5).
 *
 * It answers three questions separately and never conflates them:
 *   1. whether THIS event is published,
 *   2. whether the Google copy matches Incubator OS,
 *   3. (via the header chip) whether the user's connection is usable.
 *
 * Presentation only: every action is emitted to the page, which performs the API
 * call and refreshes the projection afterwards. It never syncs automatically on
 * a form edit. Colour is never the only signal — every state pairs an icon with
 * text. A mapping owned by another organiser is read-only.
 */
@Component({
  selector: 'app-google-event-section',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gsection">
      <div class="sw-section-title">
        <span><app-icon name="calendar"></app-icon> Google Calendar</span>
        @if (projection()?.ownedByViewer && isPublished()) {
          <span class="sw-group-count">Managed by you</span>
        } @else if (projection() && !projection()!.ownedByViewer && isPublished()) {
          <span class="sw-group-count"><app-icon name="lock-closed"></app-icon> Read-only</span>
        }
      </div>

      <!-- Status row: icon + text, never colour alone -->
      <div class="gstate" [class]="'gstate-' + uiState()" role="status">
        <app-icon [name]="stateIcon()"></app-icon>
        <div class="gstate-body">
          <div class="gstate-title">{{ stateTitle() }}</div>
          @if (stateDetail(); as detail) { <div class="gstate-detail">{{ detail }}</div> }
        </div>
        @if (busy()) { <span class="gstate-spinner" aria-label="Working">Working…</span> }
      </div>

      @if (projection()?.lastError && (uiState() === 'conflict' || uiState() === 'retry' || uiState() === 'needs_reconnect')) {
        <div class="gstate-error"><app-icon name="exclamation-circle"></app-icon> {{ projection()!.lastError }}</div>
      }

      <!-- Active links -->
      @if (projection()?.published) {
        <div class="glinks">
          @if (meetAvailable()) {
            <a class="sw-btn primary sm" [href]="projection()!.meetUrl" target="_blank" rel="noopener noreferrer">
              <app-icon name="video-camera"></app-icon> Join Google Meet
            </a>
          } @else if (projection()!.isMeeting && projection()!.conferenceStatus === 'pending') {
            <span class="gchip-note"><app-icon name="clock"></app-icon> Meet link is being created</span>
          } @else if (projection()!.isMeeting && projection()!.conferenceStatus === 'failure') {
            <span class="gchip-note warn"><app-icon name="exclamation-triangle"></app-icon> Calendar event created · Meet link unavailable</span>
          }
          @if (projection()!.googleEventUrl) {
            <a class="sw-btn sm" [href]="projection()!.googleEventUrl" target="_blank" rel="noopener noreferrer">
              <app-icon name="arrow-top-right-on-square"></app-icon> Open in Google Calendar
            </a>
          }
        </div>
      }

      <!-- Actions. Disabled while a request is active; only the owner manages. -->
      @if (canManage()) {
        <div class="gactions">
          @switch (uiState()) {
            @case ('publish') {
              <button type="button" class="sw-btn primary sm" [disabled]="busy()" (click)="requestPublish.emit()">
                <app-icon name="cloud-arrow-up"></app-icon> Add to Google Calendar
              </button>
            }
            @case ('unpublished') {
              <button type="button" class="sw-btn primary sm" [disabled]="busy()" (click)="requestPublish.emit()">
                <app-icon name="cloud-arrow-up"></app-icon> Add to Google Calendar again
              </button>
            }
            @case ('changes_pending') {
              <button type="button" class="sw-btn primary sm" [disabled]="busy()" (click)="requestSync.emit()">
                <app-icon name="arrow-path"></app-icon> Sync changes
              </button>
            }
            @case ('retry') {
              <button type="button" class="sw-btn primary sm" [disabled]="busy()" (click)="requestSync.emit()">
                <app-icon name="arrow-path"></app-icon> Retry sync
              </button>
            }
            @case ('needs_reconnect') {
              <button type="button" class="sw-btn primary sm" [disabled]="busy()" (click)="reconnect.emit()">
                <app-icon name="arrow-path"></app-icon> Reconnect Google Calendar
              </button>
            }
            @case ('conflict') {
              <!-- The "Open in Google Calendar" link above is the recoverable action.
                   No Retry/Overwrite is offered until a real resolution command exists. -->
            }
            @case ('synced') {
              <button type="button" class="sw-btn sm" [disabled]="busy()" (click)="requestSync.emit()">
                <app-icon name="arrow-path"></app-icon> Re-check
              </button>
              <button type="button" class="sw-btn sm danger" [disabled]="busy()" (click)="requestRemove.emit()">
                <app-icon name="trash"></app-icon> Remove from Google Calendar
              </button>
            }
            @case ('conference_pending') {
              <button type="button" class="sw-btn sm" [disabled]="busy()" (click)="requestSync.emit()">
                <app-icon name="arrow-path"></app-icon> Refresh status
              </button>
              <button type="button" class="sw-btn sm danger" [disabled]="busy()" (click)="requestRemove.emit()">
                <app-icon name="trash"></app-icon> Remove from Google Calendar
              </button>
            }
            @default {
              <button type="button" class="sw-btn sm" [disabled]="busy()" (click)="requestSync.emit()">
                <app-icon name="arrow-path"></app-icon> Sync changes
              </button>
              <button type="button" class="sw-btn sm danger" [disabled]="busy()" (click)="requestRemove.emit()">
                <app-icon name="trash"></app-icon> Remove from Google Calendar
              </button>
            }
          }
        </div>
      }

      <!-- Explanations tied to the sync contract -->
      @if (uiState() === 'changes_pending') {
        <div class="gchip-note"><app-icon name="information-circle"></app-icon>
          Changes not yet synced. Attendees receive updated invitations only when you sync.
        </div>
      } @else if (uiState() === 'synced' && projection()!.isMeeting && projection()!.attendeeCount > 0) {
        <div class="gchip-note"><app-icon name="information-circle"></app-icon>
          Syncing a further change will email invitations to {{ projection()!.attendeeCount }} participant{{ projection()!.attendeeCount === 1 ? '' : 's' }}.
        </div>
      } @else if (uiState() === 'conflict') {
        <div class="gchip-note warn"><app-icon name="exclamation-triangle"></app-icon>
          The Google copy was changed outside Incubator OS. Your Incubator OS event is unchanged.
        </div>
      } @else if (uiState() === 'readonly') {
        <div class="gchip-note"><app-icon name="users"></app-icon>
          Published to another organiser's Google Calendar. You can view the links, but only the organiser can sync or remove it.
        </div>
      }
    </div>
  `,
})
export class GoogleEventSectionComponent {
  readonly connection = input<GoogleConnection | null>(null);
  readonly projection = input<GoogleEventSync | null>(null);
  readonly busy = input<boolean>(false);

  readonly requestPublish = output<void>();
  readonly requestSync = output<void>();
  readonly requestRemove = output<void>();
  readonly reconnect = output<void>();

  readonly isPublished = computed(() => !!this.projection()?.published);

  /**
   * The viewer may manage the mapping unless an ACTIVE mapping exists that is
   * owned by another organiser. Before anything is published there is no mapping
   * (so `ownedByViewer` is false by construction) — publishing must still be
   * offered, so the gate keys off the ACTIVE mapping, not the raw flag.
   */
  readonly canManage = computed(() => {
    const p = this.projection();
    return !p?.published || p.ownedByViewer;
  });

  readonly meetAvailable = computed(() => {
    const p = this.projection();
    return !!p?.meetUrl && (p.conferenceStatus === 'success' || p.conferenceStatus === 'none');
  });

  /** The single UI state derived from connection + projection + ownership. */
  readonly uiState = computed<GoogleEventUiState>(() => {
    const p = this.projection();
    // A create in flight, before any projection exists.
    if (this.busy() && !p?.published && this.connected()) return 'publishing';
    if (!p) return this.connected() ? 'publish' : 'connect';
    if (p.published && !p.ownedByViewer) return 'readonly';

    switch (p.syncStatus) {
      case 'pending':
        return 'conference_pending';
      case 'unpublished':
        return 'unpublished';
      case 'conflict':
        return 'conflict';
      case 'failed':
        return this.connected() ? 'retry' : 'needs_reconnect';
      case 'update_pending':
        return this.connected() ? 'retry' : 'needs_reconnect';
      case 'detached':
        return p.everPublished ? 'unpublished' : (this.connected() ? 'publish' : 'connect');
      case 'synced':
        if (!this.connected()) return 'needs_reconnect';
        return p.upToDate ? 'synced' : 'changes_pending';
    }
    return this.connected() ? 'publish' : 'connect';
  });

  private connected(): boolean {
    return this.connection()?.status === 'connected' && !this.connection()?.needsReconnect;
  }

  readonly stateTitle = computed(() => {
    switch (this.uiState()) {
      case 'connect': return 'Not in Google Calendar';
      case 'publish': return 'Not in Google Calendar';
      case 'publishing': return 'Adding to Google Calendar…';
      case 'conference_pending': return 'Adding to Google Calendar…';
      case 'synced': return 'In Google Calendar';
      case 'changes_pending': return 'Changes not yet synced';
      case 'retry': return 'Could not reach Google Calendar';
      case 'conflict': return 'Changed externally in Google Calendar';
      case 'needs_reconnect': return 'Reconnect Google Calendar';
      case 'unpublished': return 'Removed from Google Calendar';
      case 'readonly': return 'Published by another organiser';
    }
    return 'Google Calendar';
  });

  readonly stateDetail = computed(() => {
    const p = this.projection();
    switch (this.uiState()) {
      case 'connect': return 'Connect your Google Calendar to publish this event.';
      case 'publish': return p?.isMeeting
        ? 'Add it to Google Calendar to create a Meet link and invite participants.'
        : 'Add it to Google Calendar.';
      case 'conference_pending': return 'The event is created; the Meet link is being prepared.';
      case 'synced': return p?.lastSyncedAt ? 'Up to date with Incubator OS.' : 'Up to date with Incubator OS.';
      case 'changes_pending': return 'The local event changed after it was published.';
      case 'retry': return 'A temporary problem stopped the last change. Retry when ready.';
      case 'conflict': return 'The Google event was edited outside Incubator OS. Nothing was overwritten.';
      case 'needs_reconnect': return 'Your Google authorisation has expired.';
      case 'unpublished': return 'The Google event and Meet link were removed. The Incubator OS event remains.';
      case 'readonly': return 'Read-only provider status.';
    }
    return '';
  });

  readonly stateIcon = computed(() => {
    switch (this.uiState()) {
      case 'connect': return 'cloud-arrow-up';
      case 'publish': return 'cloud-arrow-up';
      case 'publishing': return 'arrow-path';
      case 'conference_pending': return 'clock';
      case 'synced': return 'check-circle';
      case 'changes_pending': return 'arrow-path';
      case 'retry': return 'exclamation-circle';
      case 'conflict': return 'exclamation-triangle';
      case 'needs_reconnect': return 'arrow-path';
      case 'unpublished': return 'x-circle';
      case 'readonly': return 'lock-closed';
    }
    return 'calendar';
  });
}
