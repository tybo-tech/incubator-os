<?php
declare(strict_types=1);

/**
 * Publish a local calendar event to Google Calendar (Sprint 010 Phase 3).
 *
 * ── The invariants this class enforces ──────────────────────────────────────
 *  1. Only the AUTHENTICATED user's own active connection may publish.
 *  2. Event, Session, company and connection must share tenant/company
 *     authorization (checked before any Google call).
 *  3. A calendar event has at most ONE active Google mapping (`UNIQUE`).
 *  4. Publishing again returns the existing mapping or safely resumes — it never
 *     creates a second Google event.
 *  5. The Google event id is DETERMINISTIC (see `GoogleEventMapper::idFor`), so a
 *     publish that reached Google but failed to persist locally recovers the
 *     existing event on retry instead of duplicating it.
 *  6. The conference request id is STABLE and stored once (`meet_request_id`).
 *  7. Conferencing is attached only for the `meeting` category.
 *  8. Google's ASYNCHRONOUS conference state is tracked separately, and publishing
 *     is never reported fully successful while a conference is `pending`.
 *  9. The Google network call happens with NO database transaction open.
 * 10. A short local lease prevents concurrent double-publishing.
 * 11. The access token is refreshed at most ONCE per publish; `invalid_grant`
 *     becomes `needs_reconnect`, and a 401 after that refresh stops immediately.
 * 12. `sendUpdates=all` is used deliberately, and only when there are attendees.
 *
 * Nothing here writes Google identifiers from the browser: the id, the request id
 * and every timestamp are derived server-side.
 */
final class GoogleEventSyncService
{
    private const CATEGORY_MEETING = 'meeting';

    public function __construct(
        private readonly GoogleApiClient $client,
        private readonly GoogleConnectionRepository $connections,
        private readonly GoogleEventSyncRepository $sync,
        private readonly OAuthService $oauth,
        private readonly GoogleEventMapper $mapper,
        private readonly GoogleAttendeeResolver $attendees,
        private readonly GoogleSessionContext $sessions,
        private readonly GoogleAccessPolicy $policy,
    ) {}

    public static function fromConfig(PDO $db, GoogleAccessPolicy $policy): self
    {
        return new self(
            client: GoogleApiClientFactory::create(),
            connections: new GoogleConnectionRepository($db),
            sync: new GoogleEventSyncRepository($db),
            oauth: OAuthService::fromConfig($db),
            mapper: new GoogleEventMapper(),
            attendees: new GoogleAttendeeResolver($db),
            sessions: new GoogleSessionContext($db),
            policy: $policy,
        );
    }

    /**
     * Publish (or safely re-return) the Google projection of a calendar event.
     *
     * @param array<string,mixed> $eventRow a live `calendar_events` row
     * @throws GoogleNotConnectedException|GoogleForbiddenException|GooglePublishInProgressException|GoogleApiException
     */
    public function publish(array $eventRow): GoogleEventSyncResponse
    {
        $tenantId = $this->policy->tenantId();
        $actorId = $this->policy->actorId();
        $calendarEventId = (int) $eventRow['id'];

        // 1 + 2. Authorization: the event's company and the linked Session's company.
        $this->policy->assertCanPublishEvent($eventRow);
        $session = $this->sessions->forEvent($calendarEventId);
        $this->policy->assertSessionMatchesEvent(
            $eventRow['company_id'] !== null ? (int) $eventRow['company_id'] : null,
            $session['companyId'] ?? null,
        );

        // 1. The ACTING user's own connection must exist and be usable.
        $connection = $this->requireUsableConnection($tenantId, $actorId);
        $this->policy->assertOwnConnection((int) $connection['user_id']);

        // 4. Idempotency: an existing projection is returned, never re-created.
        $existing = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        if ($existing !== null && ($existing['google_event_id'] ?? null) !== null) {
            return $this->resumeExisting($existing, $connection, $tenantId, $actorId);
        }

        $isMeeting = ((string) ($eventRow['category'] ?? '')) === self::CATEGORY_MEETING;
        $googleEventId = GoogleEventMapper::idFor($tenantId, $calendarEventId);
        $meetRequestId = $this->stableMeetRequestId($existing, $isMeeting);
        $organiserEmail = (string) ($connection['google_account_email'] ?? '');

        // 10. Reserve the short lease. This opens and closes a tiny transaction.
        $lease = $this->sync->reserve(
            $tenantId,
            $calendarEventId,
            (int) $connection['id'],
            (string) $connection['google_calendar_id'],
            $actorId,
            $meetRequestId,
        );

        if ($lease === null) {
            // Either published concurrently, or another publish is in flight.
            $current = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
            if ($current !== null && ($current['google_event_id'] ?? null) !== null) {
                return $this->resumeExisting($current, $connection, $tenantId, $actorId);
            }
            throw new GooglePublishInProgressException();
        }

        try {
            // 11. Refresh at most once, BEFORE the Google call, outside any lock.
            $accessToken = $this->oauth->freshAccessToken($tenantId, $actorId);

            $attendees = $this->attendees->resolve($eventRow, $organiserEmail);
            $payload = $this->mapper->buildEvent(
                $eventRow,
                $googleEventId,
                $isMeeting ? $meetRequestId : null,
                $attendees,
                $session['subject'] ?? null,
            );

            $options = $this->writeOptions($isMeeting, $attendees);

            // 9. No transaction is open here.
            $ref = $this->insertOrRecover($googleEventId, $connection, $payload, $options, $accessToken);

            return $this->recordOutcome($eventRow, $connection, $ref, $lease, $isMeeting, $tenantId);
        } catch (GoogleApiException $e) {
            // Persist a secret-free failure state (guarded by the lease), then
            // surface the classified error. The event was not created.
            $this->sync->markResult($calendarEventId, $lease, $tenantId, [
                'sync_status' => 'failed',
                'conference_status' => $isMeeting ? 'failure' : 'none',
                'last_error' => $this->safeError($e),
            ]);
            throw $e;
        } catch (Throwable $e) {
            // Any other failure (including a local persistence error) releases the
            // lease so a retry can proceed rather than waiting for the TTL.
            $this->sync->releaseLease($calendarEventId, $lease, $tenantId);
            throw $e;
        }
    }

    /**
     * Insert the event, recovering the existing one if Google already holds the
     * deterministic id (a prior publish succeeded but did not persist, or a
     * concurrent create won the race).
     *
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $options
     */
    private function insertOrRecover(
        string $googleEventId,
        array $connection,
        array $payload,
        array $options,
        string $accessToken,
    ): GoogleEventRef {
        $calendarId = (string) $connection['google_calendar_id'];
        try {
            return $this->client->insertEvent($calendarId, $payload, $options, $accessToken);
        } catch (GoogleApiException $e) {
            if ($e->reason() !== GoogleApiException::REASON_DUPLICATE) {
                throw $e;
            }
            // Google already has this exact id: read it back instead of duplicating.
            return $this->client->getEvent($calendarId, $googleEventId, ['conferenceDataVersion' => 1], $accessToken);
        }
    }

    /**
     * Persist a successful insert outcome and build the response.
     *
     * @param array<string,mixed> $eventRow
     */
    private function recordOutcome(
        array $eventRow,
        array $connection,
        GoogleEventRef $ref,
        string $lease,
        bool $isMeeting,
        int $tenantId,
    ): GoogleEventSyncResponse {
        $calendarEventId = (int) $eventRow['id'];

        // 8. Google's conference state is asynchronous. A `pending` conference
        //    keeps the projection `pending`; only `success`/`none` is `synced`.
        [$syncStatus, $conferenceStatus] = $this->statusesFor($ref, $isMeeting);

        $wrote = $this->sync->markResult($calendarEventId, $lease, $tenantId, [
            'google_event_id' => $ref->eventId,
            'google_event_url' => $ref->htmlLink,
            'meet_url' => $ref->meetUrl,
            'meet_conference_id' => $ref->conferenceId,
            'etag' => $ref->etag,
            'sync_status' => $syncStatus,
            'conference_status' => $conferenceStatus,
            'last_error' => null,
            'touch_synced' => $syncStatus === 'synced',
        ]);

        // A lost lease means another worker owns the row; return the stored truth.
        $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        if ($row !== null) {
            return GoogleEventSyncResponse::fromRow($row);
        }
        if (!$wrote) {
            throw new GooglePublishInProgressException();
        }

        return new GoogleEventSyncResponse(
            calendarEventId: $calendarEventId,
            syncStatus: $syncStatus,
            conferenceStatus: $conferenceStatus,
            published: true,
            googleEventId: $ref->eventId,
            googleCalendarId: (string) $connection['google_calendar_id'],
            googleEventUrl: $ref->htmlLink,
            meetUrl: $ref->meetUrl,
        );
    }

    /**
     * An already-published event: return it. When its conference is still
     * `pending`, make ONE safe read to see whether Google has finished, promoting
     * it to `synced`/`success` if so ("safely resume").
     *
     * @param array<string,mixed> $existing
     * @param array<string,mixed> $connection
     */
    private function resumeExisting(array $existing, array $connection, int $tenantId, int $actorId): GoogleEventSyncResponse
    {
        if (($existing['conference_status'] ?? 'none') !== 'pending') {
            return GoogleEventSyncResponse::fromRow($existing);
        }

        $calendarEventId = (int) $existing['calendar_event_id'];
        $calendarId = (string) ($existing['google_calendar_id'] ?? $connection['google_calendar_id']);

        try {
            $accessToken = $this->oauth->freshAccessToken($tenantId, $actorId);
            $ref = $this->client->getEvent(
                $calendarId,
                (string) $existing['google_event_id'],
                ['conferenceDataVersion' => 1],
                $accessToken,
            );
        } catch (GoogleApiException) {
            // A read failure must not fail an idempotent publish; return what we have.
            return GoogleEventSyncResponse::fromRow($existing);
        }

        if ($ref->conferenceStatus === 'success') {
            $lease = $this->sync->reserve(
                $tenantId,
                $calendarEventId,
                (int) $connection['id'],
                $calendarId,
                $actorId,
                null,
                forUpdate: true,
            );
            if ($lease !== null) {
                $this->sync->markResult($calendarEventId, $lease, $tenantId, [
                    'google_event_id' => $existing['google_event_id'],
                    'google_event_url' => $ref->htmlLink,
                    'meet_url' => $ref->meetUrl,
                    'meet_conference_id' => $ref->conferenceId,
                    'etag' => $ref->etag,
                    'sync_status' => 'synced',
                    'conference_status' => 'success',
                    'last_error' => null,
                    'touch_synced' => true,
                ]);
            }
        }

        $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        return GoogleEventSyncResponse::fromRow($row ?? $existing);
    }

    /**
     * @return array{0:string,1:string} [syncStatus, conferenceStatus]
     */
    private function statusesFor(GoogleEventRef $ref, bool $isMeeting): array
    {
        if (!$isMeeting) {
            return ['synced', 'none'];
        }
        return match ($ref->conferenceStatus) {
            'pending' => ['pending', 'pending'],
            'failure' => ['synced', 'failure'],
            default => [$ref->meetUrl !== null ? 'synced' : 'pending', $ref->meetUrl !== null ? 'success' : 'pending'],
        };
    }

    /**
     * A stable conference request id: reuse the stored one, else mint one UUID v4.
     *
     * @param array<string,mixed>|null $existing
     */
    private function stableMeetRequestId(?array $existing, bool $isMeeting): ?string
    {
        if (!$isMeeting) {
            return null;
        }
        $stored = $existing['meet_request_id'] ?? null;
        if (is_string($stored) && $stored !== '') {
            return $stored;
        }
        return self::uuidV4();
    }

    /** RFC 4122 version 4 UUID from a CSPRNG. */
    public static function uuidV4(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }

    /**
     * Write options. `sendUpdates=all` is deliberate: it emails attendees, so it
     * is used ONLY when there is at least one attendee. `conferenceDataVersion=1`
     * is required for the Meet request and is present only for a meeting.
     *
     * @param array<int,array{email:string}> $attendees
     * @return array<string,mixed>
     */
    private function writeOptions(bool $isMeeting, array $attendees): array
    {
        $options = [
            'sendUpdates' => $attendees ? 'all' : 'none',
        ];
        if ($isMeeting) {
            $options['conferenceDataVersion'] = 1;
        }
        return $options;
    }

    /**
     * @return array<string,mixed>
     * @throws GoogleNotConnectedException
     */
    private function requireUsableConnection(int $tenantId, int $actorId): array
    {
        $connection = $this->connections->findForUser($actorId, $tenantId);
        if ($connection === null) {
            throw new GoogleNotConnectedException('Connect your Google Calendar before publishing.');
        }
        $status = (string) ($connection['status'] ?? '');
        if ($status !== 'connected') {
            throw new GoogleNotConnectedException(
                $status === 'needs_reconnect'
                    ? 'Your Google Calendar authorisation has expired. Reconnect to continue.'
                    : 'Your Google connection is not active. Reconnect to continue.',
                $status,
            );
        }
        return $connection;
    }

    /** A short, secret-free diagnostic stored on the sync row. */
    private function safeError(GoogleApiException $e): string
    {
        return match ($e->reason()) {
            GoogleApiException::REASON_TIMEOUT => 'Google did not respond in time.',
            GoogleApiException::REASON_RATE_LIMITED => 'Google rate limit reached.',
            GoogleApiException::REASON_SERVER_ERROR => 'Google returned a server error.',
            GoogleApiException::REASON_FORBIDDEN => 'Google denied access to the calendar.',
            default => 'The Google Calendar request failed.',
        };
    }
}
