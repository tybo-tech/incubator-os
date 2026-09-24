/**
 * Google Calendar projection models (Sprint 010 Phase 5).
 *
 * These mirror the ONLY shapes the backend exposes for a Google connection and a
 * per-event projection. They deliberately contain no token, etag, claim token,
 * connection id or raw remote error — the browser cannot reconstruct a credential
 * from anything here.
 */

/** The acting user's Google connection status (mirrors the PHP enum). */
export type GoogleConnectionStatus =
  | 'disconnected'
  | 'connected'
  | 'needs_reconnect'
  | 'revoked'
  | 'account_mismatch';

export interface GoogleConnection {
  status: GoogleConnectionStatus;
  /** The connected Google account, when known. Never a credential. */
  googleAccountEmail: string | null;
  calendarId: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
  /** Email seen during a mismatched reconnect (requires reconciliation). */
  pendingAccountEmail: string | null;
}

/** The EVENT projection: where the local change has reached. */
export type GoogleSyncStatus =
  | 'pending'
  | 'synced'
  | 'update_pending'
  | 'conflict'
  | 'failed'
  | 'detached'
  | 'unpublished';

/** The async Meet conference: tracked independently of the event projection. */
export type GoogleConferenceStatus = 'none' | 'pending' | 'success' | 'failure';

export interface GoogleEventSync {
  calendarEventId: number;
  syncStatus: GoogleSyncStatus;
  conferenceStatus: GoogleConferenceStatus;
  /** True while an active Google event exists. */
  published: boolean;
  /** True when synced AND no conference work remains. */
  fullySynced: boolean;
  googleEventId: string | null;
  googleCalendarId: string | null;
  /** The "Open in Google Calendar" link. Not a secret. */
  googleEventUrl: string | null;
  /** The "Join Google Meet" link. Not a secret. */
  meetUrl: string | null;
  lastSyncedAt: string | null;
  /** A short, secret-free retryable diagnostic; shown on failed/conflict. */
  lastError: string | null;
  version: number;
  // ---- presentation context ----
  /** True once this event has ever been published (even if later removed). */
  everPublished: boolean;
  /** True when the local event's category is `meeting`. */
  isMeeting: boolean;
  /** How many attendees Google would notify (organisers excluded). */
  attendeeCount: number;
  /** True when publishing/syncing will email invitation updates. */
  willSendInvitations: boolean;
  /** True when the acting viewer owns the connection and may sync/unpublish. */
  ownedByViewer: boolean;
  /** The local event version the projection reflects, if any. */
  syncedEventVersion: number | null;
  /** True when the projection reflects the local event's current version. */
  upToDate: boolean;
}

/** A safe result code carried back on the OAuth redirect (`?google=`). */
export type GoogleOAuthResultCode =
  | 'connected'
  | 'denied'
  | 'scope_missing'
  | 'invalid'
  | 'account_mismatch'
  | 'failed';

export const GOOGLE_OAUTH_RESULT_CODES: readonly GoogleOAuthResultCode[] = [
  'connected',
  'denied',
  'scope_missing',
  'invalid',
  'account_mismatch',
  'failed',
];

/**
 * The single UI state of the Google section for a given event. Derived from the
 * connection + projection + the acting viewer's ownership — never from a raw
 * status alone, so a colour is never the only signal.
 */
export type GoogleEventUiState =
  | 'connect'              // not published + disconnected
  | 'publish'              // not published + connected
  | 'publishing'           // create in flight
  | 'conference_pending'   // event created, Meet still being prepared
  | 'synced'               // published and up to date
  | 'changes_pending'      // published, local change waiting to be pushed
  | 'retry'                // retryable failure
  | 'conflict'             // changed externally in Google; no destructive action
  | 'needs_reconnect'      // the connection must be reconnected
  | 'unpublished'          // deliberately removed; may be published again
  | 'readonly';            // published by another organiser: view only

/** What the connection chip shows. */
export type GoogleChipState =
  | 'loading'
  | 'connect'
  | 'connected'
  | 'reconnect'
  | 'attention';

export interface GooglePublishIntent {
  /** Connected organiser email, or null when unknown. */
  organiserEmail: string | null;
  attendeeCount: number;
  willSendInvitations: boolean;
  isMeeting: boolean;
}
