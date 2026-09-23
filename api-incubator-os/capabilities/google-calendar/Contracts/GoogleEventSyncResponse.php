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
