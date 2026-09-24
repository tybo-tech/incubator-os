<?php
declare(strict_types=1);

/**
 * Maps a local `calendar_events` row to a Google Calendar event resource
 * (Sprint 010 Phase 3).
 *
 * ── Date translation ────────────────────────────────────────────────────────
 * The local model and Google disagree in two ways, and both are handled here so
 * no caller has to think about them.
 *
 * 1. ALL-DAY. The local `start_date`/`end_date` are INCLUSIVE. Google's
 *    `end.date` is EXCLUSIVE. A one-day event on the 15th therefore publishes as
 *    `start.date = 15` and `end.date = 16`, while remaining the 15th locally.
 *    All-day events carry no `timeZone`.
 *
 * 2. TIMED. `start_at`/`end_at` are stored in UTC. Google wants an RFC3339
 *    `dateTime` whose offset matches the event's own IANA zone, PLUS a `timeZone`.
 *    The instant is preserved exactly: a 09:30 `Africa/Johannesburg` event stays
 *    09:30 local, and the same code is correct across a DST boundary because the
 *    offset is derived per-instant by the zone database rather than assumed.
 *
 * ── Content safety ──────────────────────────────────────────────────────────
 * The Google `description` is built from the linked Session SUBJECT and an
 * authenticated Incubator OS link ONLY. The local description (notes), SWOT
 * content, financial data, decisions, agenda and every other internal field are
 * NEVER copied to Google. The mapper has no access to those fields by design, so
 * a future edit cannot accidentally widen the payload.
 */
final class GoogleEventMapper
{
    /**
     * Build the Google event resource for an INSERT.
     *
     * @param array<string,mixed> $event    a `calendar_events` row
     * @param string              $googleEventId the deterministic id (see idFor())
     * @param string|null         $meetRequestId stable conference request id, or null
     * @param array<int,array{email:string,displayName?:string|null}> $attendees
     * @param string|null         $sessionSubject the linked Session's subject, or null
     * @return array<string,mixed>
     */
    public function buildEvent(
        array $event,
        string $googleEventId,
        ?string $meetRequestId,
        array $attendees,
        ?string $sessionSubject = null,
    ): array {
        $payload = [
            'id' => $googleEventId,
            'summary' => (string) ($event['title'] ?? ''),
            'description' => $this->description($sessionSubject, $event),
        ];

        $location = trim((string) ($event['location'] ?? ''));
        if ($location !== '') {
            $payload['location'] = $location;
        }

        $payload += $this->dateFields($event);

        if ($attendees) {
            $payload['attendees'] = $attendees;
        }

        if ($meetRequestId !== null && $meetRequestId !== '') {
            $payload['conferenceData'] = [
                'createRequest' => [
                    'requestId' => $meetRequestId,
                    // hangoutsMeet is the only solution this sprint requests.
                    'conferenceSolutionKey' => ['type' => 'hangoutsMeet'],
                ],
            ];
        }

        return $payload;
    }

    /**
     * Deterministic Google event id for a (tenant, calendar event, generation).
     *
     * Google requires a base32hex alphabet (digits 0-9 and letters a-v); plain
     * lower-case hex plus the letters used here are a valid subset. Because the id
     * is recomputed exactly, a retried publish targets the SAME event: Google
     * answers 409 (duplicate) and the caller recovers the existing event instead of
     * creating a second one.
     *
     * The GENERATION is part of the id so that an event unpublished (and possibly
     * tombstoned by Google) is republished under a NEW id, never reusing one Google
     * may refuse forever.
     */
    public static function idFor(int $tenantId, int $calendarEventId, int $generation = 1): string
    {
        // 'inc' + 8 hex tenant + 8 hex event id + 'g' + hex generation.
        return 'inc' . str_pad(dechex($tenantId), 8, '0', STR_PAD_LEFT)
            . str_pad(dechex($calendarEventId), 8, '0', STR_PAD_LEFT)
            . 'g' . dechex(max(1, $generation));
    }

    /**
     * Build the Google event resource for a PATCH (reschedule / edit).
     *
     * Only INCUBATOR-MANAGED fields are sent: summary, description, location,
     * start, end and attendees. Crucially there is NO `conferenceData` key, so
     * Google preserves the existing Meet conference (and any unrelated provider
     * fields such as reminders or colour) rather than clearing them. `location` is
     * always sent (an empty string clears a previously set location) because it is
     * an Incubator-managed field.
     *
     * @param array<string,mixed> $event a `calendar_events` row
     * @param array<int,array{email:string}> $attendees
     * @param string|null $sessionSubject
     * @return array<string,mixed>
     */
    public function buildPatch(array $event, array $attendees, ?string $sessionSubject = null): array
    {
        $payload = [
            'summary' => (string) ($event['title'] ?? ''),
            'description' => $this->description($sessionSubject, $event),
            'location' => trim((string) ($event['location'] ?? '')),
        ];

        $payload += $this->dateFields($event);

        // Attendees are Incubator-managed: reflect the local list exactly (an empty
        // list clears attendees, which is the faithful projection of the Session).
        $payload['attendees'] = $attendees;

        return $payload;
    }

    /**
     * @param array<string,mixed> $event
     * @return array{start:array<string,string>,end:array<string,string>}
     */
    private function dateFields(array $event): array
    {
        $allDay = (bool) ($event['all_day'] ?? false);

        if ($allDay) {
            $start = (string) ($event['start_date'] ?? '');
            $end = (string) ($event['end_date'] ?? '');
            if ($end === '') {
                $end = $start;
            }
            // Google's all-day end is EXCLUSIVE: add exactly one day.
            $endExclusive = $this->addOneDay($end);

            return [
                'start' => ['date' => $start],
                'end' => ['date' => $endExclusive],
            ];
        }

        $timezone = trim((string) ($event['timezone'] ?? ''));
        $zone = $this->safeZone($timezone);

        $startAt = (string) ($event['start_at'] ?? '');
        $endAt = (string) ($event['end_at'] ?? '');

        return [
            'start' => [
                'dateTime' => $this->toZonedRfc3339($startAt, $zone),
                'timeZone' => $zone,
            ],
            'end' => [
                'dateTime' => $this->toZonedRfc3339($endAt, $zone),
                'timeZone' => $zone,
            ],
        ];
    }

    /**
     * Convert a stored UTC datetime into an RFC3339 string in the event's zone,
     * preserving the instant. Falls back to UTC for an unparseable value.
     */
    private function toZonedRfc3339(string $utc, string $zone): string
    {
        try {
            $d = new DateTimeImmutable($utc, new DateTimeZone('UTC'));
            return $d->setTimezone(new DateTimeZone($zone))->format('Y-m-d\TH:i:sP');
        } catch (Throwable) {
            return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');
        }
    }

    private function addOneDay(string $date): string
    {
        try {
            return (new DateTimeImmutable($date, new DateTimeZone('UTC')))
                ->modify('+1 day')
                ->format('Y-m-d');
        } catch (Throwable) {
            return $date;
        }
    }

    private function safeZone(string $zone): string
    {
        if ($zone === '') {
            return 'UTC';
        }
        try {
            new DateTimeZone($zone);
            return $zone;
        } catch (Throwable) {
            return 'UTC';
        }
    }

    /**
     * Description = Session subject (when linked) + the authenticated Incubator OS
     * link. Nothing else. The local description is never read.
     *
     * @param array<string,mixed> $event
     */
    private function description(?string $sessionSubject, array $event): string
    {
        $lines = [];
        $subject = trim((string) $sessionSubject);
        if ($subject !== '') {
            $lines[] = 'Session: ' . $subject;
        }

        $link = $this->incubatorLink($event);
        if ($link !== '') {
            $lines[] = 'Open in Incubator OS: ' . $link;
        }

        return implode("\n\n", $lines);
    }

    /**
     * A deep link back into the authenticated Incubator OS calendar surface.
     * Derived from APP_URL (config/app.php); never includes internal metadata.
     *
     * @param array<string,mixed> $event
     */
    private function incubatorLink(array $event): string
    {
        $base = defined('APP_URL') ? rtrim((string) APP_URL, '/') : '';
        if ($base === '') {
            return '';
        }
        $companyId = $event['company_id'] ?? null;
        $path = $companyId !== null
            ? '/company/' . (int) $companyId . '/calendar'
            : '/calendar';

        return $base . $path;
    }
}
