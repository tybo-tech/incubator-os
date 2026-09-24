import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Constants } from '../../../../services/service';
import {
  GoogleConnection,
  GoogleEventSync,
  GoogleOAuthResultCode,
  GOOGLE_OAUTH_RESULT_CODES,
} from '../models/google-calendar.models';

interface ApiConnectionResult {
  status: string;
  googleAccountEmail: string | null;
  calendarId: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
  pendingAccountEmail: string | null;
}

interface ApiEventSyncResult extends Partial<GoogleEventSync> {
  calendarEventId?: number;
}

interface ApiCommandResult {
  success: boolean;
  message: string;
  data?: ApiEventSyncResult;
  warnings?: string[];
}

/** A safe, code-derived failure the UI can branch on. */
export interface GoogleApiError {
  status: number;
  /** Stable backend code, e.g. `GOOGLE_SYNC_CONFLICT`, when present. */
  code: string | null;
  /** A human message safe to show (never a raw Google error). */
  message: string;
  /** The connection status reported alongside `GOOGLE_NOT_CONNECTED`, if any. */
  connectionStatus: string | null;
}

/**
 * Google Calendar data layer (Sprint 010 Phase 5).
 *
 * Every call is `withCredentials` (the PHP session cookie is the auth). The
 * connection is always the ACTING user's own connection — there is no
 * "someone else's calendar" path. The public surface returns the safe shapes
 * only; no token, etag, claim token or remote error is ever exposed.
 */
@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);
  private readonly base = `${Constants.ApiBase}api/google-calendar`;

  // ---------- connection ----------

  /** The acting user's connection status (always resolves, even when disconnected). */
  getConnection(): Observable<GoogleConnection> {
    return this.http
      .get<ApiConnectionResult>(`${this.base}/queries/connection.php`, { withCredentials: true })
      .pipe(map(c => this.connection(c)));
  }

  /**
   * Begin the OAuth flow. Returns the authorization URL the caller navigates to;
   * the request itself never returns a token.
   */
  beginConnect(returnTo: string): Observable<string> {
    return this.http
      .post<{ data?: { authUrl?: string } }>(
        `${this.base}/commands/connect.php`,
        { returnTo },
        { withCredentials: true },
      )
      .pipe(map(res => String(res?.data?.authUrl ?? '')));
  }

  /** Disconnect. Existing Google events are retained unless removed individually. */
  disconnect(): Observable<void> {
    return this.http
      .post(`${this.base}/commands/disconnect.php`, {}, { withCredentials: true })
      .pipe(map(() => void 0));
  }

  // ---------- projection ----------

  /** The Google projection of one event, with presentation context. */
  getEventSync(id: string | number): Observable<GoogleEventSync> {
    return this.http
      .get<{ data?: ApiEventSyncResult }>(
        `${this.base}/queries/event.php?id=${encodeURIComponent(String(id))}`,
        { withCredentials: true },
      )
      .pipe(map(res => this.eventSync(res.data)));
  }

  /** Publish (or safely re-return) the event, requesting a Meet link for a meeting. */
  publish(id: string | number, version?: number): Observable<GoogleEventSync> {
    return this.http
      .post<ApiCommandResult>(
        `${this.base}/commands/publish.php?id=${encodeURIComponent(String(id))}`,
        version != null ? { version } : {},
        { withCredentials: true },
      )
      .pipe(map(res => this.eventSync(res.data)));
  }

  /** Push local changes to the existing Google event. */
  sync(id: string | number, version?: number): Observable<GoogleEventSync> {
    return this.http
      .post<ApiCommandResult>(
        `${this.base}/commands/sync.php?id=${encodeURIComponent(String(id))}`,
        version != null ? { version } : {},
        { withCredentials: true },
      )
      .pipe(map(res => this.eventSync(res.data)));
  }

  /** Remove the Google copy, retaining the local event, Session and audit. */
  unpublish(id: string | number, version?: number): Observable<GoogleEventSync> {
    return this.http
      .post<ApiCommandResult>(
        `${this.base}/commands/unpublish.php?id=${encodeURIComponent(String(id))}`,
        version != null ? { version } : {},
        { withCredentials: true },
      )
      .pipe(map(res => this.eventSync(res.data)));
  }

  // ---------- OAuth result handling ----------

  /** True when `code` is one of the safe result codes the callback may carry. */
  isKnownResultCode(code: string | null | undefined): code is GoogleOAuthResultCode {
    return !!code && (GOOGLE_OAUTH_RESULT_CODES as readonly string[]).includes(code);
  }

  /**
   * The human message for an OAuth callback result. Never echoes a raw Google
   * error or a token; unknown/absent codes fall back to a generic failure.
   */
  oauthResultMessage(code: string | null | undefined): { message: string; type: 'success' | 'error' } {
    switch (code) {
      case 'connected':
        return { message: 'Google Calendar connected.', type: 'success' };
      case 'denied':
        return { message: 'Google Calendar connection was cancelled. No access was granted.', type: 'error' };
      case 'scope_missing':
        return { message: 'Calendar permission was not granted. Connect again and allow calendar access.', type: 'error' };
      case 'account_mismatch':
        return {
          message: 'A different Google account was used while existing events are published. Reconnect with the original account.',
          type: 'error',
        };
      case 'invalid':
        return { message: 'That connection link was no longer valid. Please connect again.', type: 'error' };
      case 'failed':
        return { message: 'Google Calendar could not be connected. Please try again.', type: 'error' };
      default:
        return { message: 'Google Calendar could not be connected. Please try again.', type: 'error' };
    }
  }

  // ---------- error mapping ----------

  /**
   * Normalise an API error into a safe, code-derived shape. Reads the response
   * body (not `instanceof HttpErrorResponse`) so it also works with plain error
   * objects from interceptors/tests. Never surfaces a raw Google message.
   */
  toError(err: unknown): GoogleApiError {
    const e = err as Partial<HttpErrorResponse> | null;
    const body = (e?.error ?? null) as { error?: unknown; code?: unknown; connectionStatus?: unknown } | null;
    const status = typeof e?.status === 'number' ? e.status : 0;
    const code = body && typeof body.code === 'string' ? body.code : null;
    const bodyMessage = body && typeof body.error === 'string' ? body.error : null;
    const connectionStatus = body && typeof body.connectionStatus === 'string' ? body.connectionStatus : null;

    return {
      status,
      code,
      connectionStatus,
      message: bodyMessage || this.fallbackMessage(status),
    };
  }

  errorMessage(err: unknown): string {
    return this.toError(err).message;
  }

  /** True when the error means the projection diverged and must not be overwritten. */
  isConflict(err: unknown): boolean {
    const { code, status } = this.toError(err);
    return code === 'GOOGLE_SYNC_CONFLICT' || (status === 409 && code === null);
  }

  /** True when the connection must be reconnected before anything else works. */
  needsReconnect(err: unknown): boolean {
    const { code } = this.toError(err);
    return code === 'GOOGLE_RECONNECT_REQUIRED' || code === 'GOOGLE_NOT_CONNECTED' || code === 'GOOGLE_TOKEN_UNREADABLE';
  }

  private fallbackMessage(status: number): string {
    switch (status) {
      case 401: return 'Your Google Calendar authorisation is no longer valid. Please reconnect.';
      case 403: return 'You do not have access to manage this Google Calendar event.';
      case 404: return 'That appointment no longer exists.';
      case 409: return 'This action is not available right now. Reload and try again.';
      case 422: return 'Please check the details and try again.';
      case 429: return 'Google is rate limiting requests. Please try again shortly.';
      case 502: return 'Google Calendar could not be reached. The change will retry.';
      case 503: return 'Google Calendar is not configured on this server.';
    }
    return status ? 'Could not complete the request.' : 'Something went wrong.';
  }

  // ---------- mapping ----------

  private connection(c: ApiConnectionResult): GoogleConnection {
    return {
      status: (c?.status ?? 'disconnected') as GoogleConnection['status'],
      googleAccountEmail: c?.googleAccountEmail ?? null,
      calendarId: c?.calendarId ?? null,
      connectedAt: c?.connectedAt ?? null,
      lastSyncedAt: c?.lastSyncedAt ?? null,
      needsReconnect: !!c?.needsReconnect,
      pendingAccountEmail: c?.pendingAccountEmail ?? null,
    };
  }

  private eventSync(d: ApiEventSyncResult | undefined): GoogleEventSync {
    const raw = (d ?? {}) as Partial<GoogleEventSync>;
    return {
      calendarEventId: Number(raw.calendarEventId ?? 0),
      syncStatus: (raw.syncStatus ?? 'detached') as GoogleEventSync['syncStatus'],
      conferenceStatus: (raw.conferenceStatus ?? 'none') as GoogleEventSync['conferenceStatus'],
      published: !!raw.published,
      fullySynced: !!raw.fullySynced,
      googleEventId: raw.googleEventId ?? null,
      googleCalendarId: raw.googleCalendarId ?? null,
      googleEventUrl: raw.googleEventUrl ?? null,
      meetUrl: raw.meetUrl ?? null,
      lastSyncedAt: raw.lastSyncedAt ?? null,
      lastError: raw.lastError ?? null,
      version: Number(raw.version ?? 1),
      everPublished: !!raw.everPublished,
      isMeeting: !!raw.isMeeting,
      attendeeCount: Number(raw.attendeeCount ?? 0),
      willSendInvitations: !!raw.willSendInvitations,
      ownedByViewer: !!raw.ownedByViewer,
      syncedEventVersion: raw.syncedEventVersion ?? null,
      upToDate: !!raw.upToDate,
    };
  }
}
