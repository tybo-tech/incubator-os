import {
  Component, ChangeDetectionStrategy, input, output, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { GoogleChipState, GoogleConnection } from '../models/google-calendar.models';

/**
 * "Your Google Calendar" connection chip (Sprint 010 Phase 5).
 *
 * A compact header control that communicates ONE thing: whether the acting user's
 * own Google connection is usable. It never shows a token, connection id or raw
 * provider error.
 *
 * Presentation only: it owns the open/menu/confirm state and emits intents; the
 * page performs the API calls. The menu is not dismissed by an outside click — it
 * closes via the chip, Escape, Cancel, or after an action — so a stray click never
 * loses a disconnect confirmation.
 */
@Component({
  selector: 'app-google-connection-chip',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gchip">
      <button
        type="button"
        class="gchip-btn"
        [class.gchip-ok]="chipState() === 'connected'"
        [class.gchip-warn]="chipState() === 'reconnect' || chipState() === 'attention'"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
        [attr.aria-label]="label()"
        [disabled]="chipState() === 'loading'"
        (click)="toggle()">
        <app-icon [name]="icon()"></app-icon>
        <span>{{ label() }}</span>
        @if (chipState() === 'connected' || chipState() === 'reconnect' || chipState() === 'attention') {
          <app-icon name="chevron-down"></app-icon>
        }
      </button>

      @if (open()) {
        <div class="gchip-menu" role="menu" aria-label="Your Google Calendar">
          <div class="gchip-menu-head">
            <strong>Your Google Calendar</strong>
            <button type="button" class="sw-icon-btn" aria-label="Close" title="Close" (click)="closeMenu()">
              <app-icon name="x-mark"></app-icon>
            </button>
          </div>

          @if (confirmingDisconnect()) {
            <div class="gchip-confirm" role="alertdialog" aria-label="Confirm disconnect">
              <p>Disconnecting stops future synchronization. Existing events in Google Calendar will remain unless removed individually.</p>
              <div class="gchip-confirm-actions">
                <button type="button" class="sw-btn sm" (click)="confirmingDisconnect.set(false)">Keep connected</button>
                <button type="button" class="sw-btn sm danger" [disabled]="busy()" (click)="confirmDisconnect()">
                  <app-icon name="x-circle"></app-icon> Disconnect
                </button>
              </div>
            </div>
          } @else {
            <div class="gchip-account">
              <app-icon name="information-circle"></app-icon>
              @if (connection()?.googleAccountEmail; as email) {
                <span>Connected as <strong>{{ email }}</strong></span>
              } @else if (chipState() === 'connected') {
                <span>Connected</span>
              } @else if (chipState() === 'reconnect') {
                <span>Authorisation expired — reconnect to keep syncing.</span>
              } @else if (chipState() === 'attention') {
                <span>This connection needs attention before it can be used.</span>
              } @else {
                <span>Not connected. Connect your own Google Calendar to publish events.</span>
              }
            </div>

            <div class="gchip-actions">
              @if (chipState() === 'connect') {
                <button type="button" class="sw-btn sm primary" [disabled]="busy()" (click)="emitConnect()">
                  <app-icon name="cloud-arrow-up"></app-icon> Connect Google Calendar
                </button>
              } @else if (chipState() === 'connected') {
                <button type="button" class="sw-btn sm" [disabled]="busy()" (click)="emitReconnect()">
                  <app-icon name="arrow-path"></app-icon> Reconnect
                </button>
                <button type="button" class="sw-btn sm danger" [disabled]="busy()" (click)="confirmingDisconnect.set(true)">
                  <app-icon name="x-circle"></app-icon> Disconnect
                </button>
              } @else if (chipState() === 'reconnect' || chipState() === 'attention') {
                <button type="button" class="sw-btn sm primary" [disabled]="busy()" (click)="emitReconnect()">
                  <app-icon name="arrow-path"></app-icon> Reconnect Google Calendar
                </button>
                <button type="button" class="sw-btn sm" [disabled]="busy()" (click)="confirmingDisconnect.set(true)">
                  Disconnect
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class GoogleConnectionChipComponent {
  readonly connection = input<GoogleConnection | null>(null);
  readonly chipState = input<GoogleChipState>('loading');
  /** A request is in flight: disable every repeat action. */
  readonly busy = input<boolean>(false);

  readonly connect = output<void>();
  readonly reconnect = output<void>();
  readonly disconnect = output<void>();

  readonly open = signal(false);
  readonly confirmingDisconnect = signal(false);

  readonly label = computed(() => {
    switch (this.chipState()) {
      case 'connect': return 'Connect Google Calendar';
      case 'connected': return 'Google Calendar connected';
      case 'reconnect': return 'Reconnect Google Calendar';
      case 'attention': return 'Connection needs attention';
      default: return 'Your Google Calendar';
    }
  });

  readonly icon = computed(() => {
    switch (this.chipState()) {
      case 'connect': return 'cloud-arrow-up';
      case 'connected': return 'check-circle';
      case 'reconnect': return 'arrow-path';
      case 'attention': return 'exclamation-triangle';
      default: return 'calendar';
    }
  });

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (!next) this.confirmingDisconnect.set(false);
  }

  closeMenu(): void {
    this.open.set(false);
    this.confirmingDisconnect.set(false);
  }

  emitConnect(): void {
    this.closeMenu();
    this.connect.emit();
  }

  emitReconnect(): void {
    this.closeMenu();
    this.reconnect.emit();
  }

  confirmDisconnect(): void {
    this.confirmingDisconnect.set(false);
    this.open.set(false);
    this.disconnect.emit();
  }
}
