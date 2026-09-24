<?php
declare(strict_types=1);

/**
 * The ONLY shape the browser receives describing one calendar event's Google
 * projection (Sprint 010 Phase 3).
 *
 * Security: no token, ciphertext, nonce, tag or configuration value is ever part
 * of this DTO. The Google event id and URLs are not secret — they are visible in
 * the connected user's own calendar.
 *
 * Two statuses are deliberately independent:
 *   * `syncStatus`       — the EVENT projection: pending | synced | conflict |
 *                          failed | detached.
 *   * `conferenceStatus` — the async Meet conference: none | pending | success |
 *                          failure.
 *
 * `fullySynced` is the single answer to "is publishing complete?": it is false
 * while a conference is still `pending`, so a caller can never mistake a
 * half-finished publish for a complete one.
 */
final class GoogleEventSyncResponse implements JsonSerializable
{
    public function __construct(
        public readonly int $calendarEventId,
        public readonly string $syncStatus,
        public readonly string $conferenceStatus,
        public readonly bool $published,
        public readonly ?string $googleEventId = null,
        public readonly ?string $googleCalendarId = null,
        public readonly ?string $googleEventUrl = null,
        public readonly ?string $meetUrl = null,
        public readonly ?string $lastSyncedAt = null,
        public readonly ?string $lastError = null,
        public readonly int $version = 1,
        // ---- Presentation context (Phase 5) -------------------------------
        // These describe the LOCAL event and the ACTING viewer; they never
        // reveal a connection id, an etag, a claim token or a remote error.
        /** True once this event has ever been published (even if later removed). */
        public readonly bool $everPublished = false,
        /** True when the local event's category is `meeting`. */
        public readonly bool $isMeeting = false,
        /** How many attendees Google would notify (deterministic; organisers excluded). */
        public readonly int $attendeeCount = 0,
        /** True when publishing/syncing will email invitation updates. */
        public readonly bool $willSendInvitations = false,
        /**
         * True when the ACTING viewer owns the connection backing this mapping and
         * may therefore sync or unpublish it. An event may be viewed (and its Meet
         * link used) without being owned.
         */
        public readonly bool $ownedByViewer = false,
        /** The local event version the projection currently reflects, if any. */
        public readonly ?int $syncedEventVersion = null,
        /** True when the projection reflects the local event's current version (no pending change). */
        public readonly bool $upToDate = false,
    ) {}

    /** No Google projection exists for this event yet. */
    public static function notPublished(int $calendarEventId): self
    {
        return new self(
            calendarEventId: $calendarEventId,
            syncStatus: 'detached',
            conferenceStatus: 'none',
            published: false,
        );
    }

    /**
     * Attach presentation context (Phase 5). Returns a new value; the projection
     * status itself is unchanged.
     */
    public function withPresentation(
        bool $everPublished,
        bool $isMeeting,
        int $attendeeCount,
        bool $willSendInvitations,
        bool $ownedByViewer,
        ?int $syncedEventVersion,
        ?int $eventVersion,
    ): self {
        return new self(
            calendarEventId: $this->calendarEventId,
            syncStatus: $this->syncStatus,
            conferenceStatus: $this->conferenceStatus,
            published: $this->published,
            googleEventId: $this->googleEventId,
            googleCalendarId: $this->googleCalendarId,
            googleEventUrl: $this->googleEventUrl,
            meetUrl: $this->meetUrl,
            lastSyncedAt: $this->lastSyncedAt,
            lastError: $this->lastError,
            version: $this->version,
            everPublished: $everPublished,
            isMeeting: $isMeeting,
            attendeeCount: $attendeeCount,
            willSendInvitations: $willSendInvitations,
            ownedByViewer: $ownedByViewer,
            syncedEventVersion: $syncedEventVersion,
            upToDate: $syncedEventVersion !== null && $eventVersion !== null && $syncedEventVersion === $eventVersion,
        );
    }

    /**
     * True only when the event is synced AND no conference work remains. A pending
     * OR failed conference makes this false by construction: publishing is never
     * reported as fully successful while the Meet room is unfinished.
     */
    public function fullySynced(): bool
    {
        if (!$this->published) {
            return false;
        }
        if ($this->syncStatus !== 'synced') {
            return false;
        }
        return $this->conferenceStatus === 'none' || $this->conferenceStatus === 'success';
    }

    public function jsonSerialize(): mixed
    {
        return [
            'calendarEventId' => $this->calendarEventId,
            'syncStatus' => $this->syncStatus,
            'conferenceStatus' => $this->conferenceStatus,
            'published' => $this->published,
            'fullySynced' => $this->fullySynced(),
            'googleEventId' => $this->googleEventId,
            'googleCalendarId' => $this->googleCalendarId,
            'googleEventUrl' => $this->googleEventUrl,
            'meetUrl' => $this->meetUrl,
            'lastSyncedAt' => $this->lastSyncedAt,
            'lastError' => $this->lastError,
            'version' => $this->version,
            'everPublished' => $this->everPublished,
            'isMeeting' => $this->isMeeting,
            'attendeeCount' => $this->attendeeCount,
            'willSendInvitations' => $this->willSendInvitations,
            'ownedByViewer' => $this->ownedByViewer,
            'syncedEventVersion' => $this->syncedEventVersion,
            'upToDate' => $this->upToDate,
        ];
    }

    /**
     * Build from a `google_event_sync` row.
     *
     * @param array<string,mixed> $row
     */
    public static function fromRow(array $row): self
    {
        $published = ($row['google_event_id'] ?? null) !== null;

        return new self(
            calendarEventId: (int) $row['calendar_event_id'],
            syncStatus: (string) ($row['sync_status'] ?? 'pending'),
            conferenceStatus: (string) ($row['conference_status'] ?? 'none'),
            published: $published,
            googleEventId: isset($row['google_event_id']) ? (string) $row['google_event_id'] : null,
            googleCalendarId: isset($row['google_calendar_id']) ? (string) $row['google_calendar_id'] : null,
            googleEventUrl: isset($row['google_event_url']) ? (string) $row['google_event_url'] : null,
            meetUrl: isset($row['meet_url']) ? (string) $row['meet_url'] : null,
            lastSyncedAt: isset($row['last_synced_at']) ? (string) $row['last_synced_at'] : null,
            lastError: isset($row['last_error']) ? (string) $row['last_error'] : null,
            version: (int) ($row['version'] ?? 1),
        );
    }
}
