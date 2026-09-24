<?php
declare(strict_types=1);

/**
 * Outbound Google Calendar projection service (Sprint 010 Phases 3–4).
 *
 * Incubator OS is the source of truth. Every method here follows the same
 * contract:
 *
 *   * A Google network call NEVER runs inside a database transaction. Each
 *     operation takes a short lease (tiny transaction), calls Google with no
 *     transaction open, then records the outcome in a second tiny transaction
 *     guarded by the lease token.
 *   * A local change is authoritative. A Google failure records a visible,
 *     retryable state; it never rolls back the local Calendar or Session change.
 *   * A stale worker that prepared its payload for an older local event version
 *     cannot claim the projection reflects a newer one (version guard).
 *
 * Operations:
 *   * `publish()`   — create (or return) the Google event, with a Meet link for
 *                     `meeting` events. Deterministic id embeds a generation so a
 *                     republish after an unpublish never reuses a tombstoned id.
 *   * `sync()`      — PATCH only the Incubator-managed fields, preserving the
 *                     conference and unrelated provider fields. `If-Match` etag;
 *                     412 -> `conflict`; transient -> `update_pending`; a repeat
 *                     with the same local version is a no-op (no email).
 *   * `cancelEvent()` — best-effort DELETE when the local event/Session is
 *                     cancelled. 404/410 means already absent (success). A
 *                     failure records a pending external cancellation.
 *   * `unpublish()` — deliberate removal of the Google copy, retaining all local
 *                     records and the sync row for audit.
 */
final class GoogleEventSyncService
{
    private const CATEGORY_MEETING = 'meeting';
    private const EVENT_CANCELLED = 'cancelled';

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

    // ==================================================================== publish

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

        $this->policy->assertCanPublishEvent($eventRow);
        $session = $this->sessions->forEvent($calendarEventId);
        $this->policy->assertSessionMatchesEvent(
            $eventRow['company_id'] !== null ? (int) $eventRow['company_id'] : null,
            $session['companyId'] ?? null,
        );

        // The ACTING user's own active connection.
        $connection = $this->requireUsableConnection($tenantId, $actorId);
        $this->policy->assertOwnConnection((int) $connection['user_id']);

        // Idempotency: an active projection is returned, never re-created.
        $existing = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        if ($existing !== null && ($existing['google_event_id'] ?? null) !== null) {
            return $this->resumeExisting($existing, $connection, $tenantId, $actorId);
        }

        $isMeeting = ((string) ($eventRow['category'] ?? '')) === self::CATEGORY_MEETING;

        // Republish after a deliberate removal must use a NEW generation (and a new
        // conference request id), never a Google id that may be tombstoned.
        $generation = 1;
        $meetRequestId = $this->stableMeetRequestId($existing, $isMeeting);
        if ($this->isRepublishAfterRemoval($existing)) {
            $newRequestId = $isMeeting ? self::uuidV4() : ($meetRequestId ?? self::uuidV4());
            $generation = $this->sync->bumpGeneration($calendarEventId, $tenantId, $newRequestId);
            $meetRequestId = $isMeeting ? $newRequestId : null;
        } elseif ($existing !== null) {
            $generation = max(1, (int) ($existing['generation'] ?? 1));
        }

        $googleEventId = GoogleEventMapper::idFor($tenantId, $calendarEventId, $generation);
        $organiserEmail = (string) ($connection['google_account_email'] ?? '');

        $lease = $this->sync->reserve(
            $tenantId,
            $calendarEventId,
            (int) $connection['id'],
            (string) $connection['google_calendar_id'],
            $actorId,
            $meetRequestId,
        );
        if ($lease === null) {
            $current = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
            if ($current !== null && ($current['google_event_id'] ?? null) !== null) {
                return $this->resumeExisting($current, $connection, $tenantId, $actorId);
            }
            throw new GooglePublishInProgressException();
        }

        try {
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

            $ref = $this->insertOrRecover($googleEventId, $connection, $payload, $options, $accessToken);
            return $this->recordPublishOutcome($eventRow, $connection, $ref, $lease, $isMeeting, $tenantId, $generation);
        } catch (GoogleApiException $e) {
            if ($e->requiresReconnect()) {
                $this->sync->markFailure($calendarEventId, $lease, $tenantId, $this->safeError($e));
            } else {
                $this->sync->markFailure($calendarEventId, $lease, $tenantId, $this->safeError($e));
            }
            throw $e;
        } catch (Throwable $e) {
            $this->sync->releaseLease($calendarEventId, $lease, $tenantId);
            throw $e;
        }
    }

    // ======================================================================= sync

    /**
     * Push local changes (reschedule/edit) to the existing Google event.
     *
     * Idempotent: when the projection already reflects the event's current version
     * and is clean, nothing is sent (no email). A cancelled local event is
     * delegated to the cancellation path.
     *
     * @param array<string,mixed> $eventRow a live `calendar_events` row
     * @throws GoogleNotPublishedException|GoogleOperationInProgressException|GoogleSyncConflictException|GoogleApiException
     */
    public function sync(array $eventRow): GoogleEventSyncResponse
    {
        $tenantId = $this->policy->tenantId();
        $calendarEventId = (int) $eventRow['id'];

        $this->policy->assertCanPublishEvent($eventRow);

        // A cancelled event is a cancellation, not an update.
        if ((string) ($eventRow['status'] ?? '') === self::EVENT_CANCELLED) {
            return $this->cancelEvent($eventRow);
        }

        $existing = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        if ($existing === null || ($existing['google_event_id'] ?? null) === null) {
            throw new GoogleNotPublishedException();
        }

        $isMeeting = ((string) ($eventRow['category'] ?? '')) === self::CATEGORY_MEETING;

        // Idempotency: already reflecting this version and clean -> no Google call.
        $eventVersion = (int) ($eventRow['version'] ?? 1);
        if (($existing['sync_status'] ?? '') === 'synced'
            && (int) ($existing['synced_event_version'] ?? 0) === $eventVersion) {
            return GoogleEventSyncResponse::fromRow($existing);
        }

        $connection = $this->loadStoredConnection($existing, $tenantId);
        $session = $this->sessions->forEvent($calendarEventId);
        $organiserEmail = (string) ($connection['google_account_email'] ?? '');

        $lease = $this->sync->acquireLease(
            $tenantId,
            $calendarEventId,
            (int) $connection['id'],
            (string) $existing['google_calendar_id'],
            $this->policy->actorId(),
        );
        if ($lease === null) {
            throw new GoogleOperationInProgressException();
        }

        try {
            $accessToken = $this->oauth->freshAccessTokenForConnection($connection, $tenantId);
            $attendees = $this->attendees->resolve($eventRow, $organiserEmail);
            $patch = $this->mapper->buildPatch($eventRow, $attendees, $session['subject'] ?? null);
            $options = $this->writeOptions($isMeeting, $attendees);

            $ref = $this->client->patchEvent(
                (string) $existing['google_calendar_id'],
                (string) $existing['google_event_id'],
                $patch,
                $options,
                (string) ($existing['etag'] ?? ''),
                $accessToken,
            );

            return $this->recordSyncOutcome($eventRow, $existing, $lease, $ref, $eventVersion, $tenantId);
        } catch (GoogleApiException $e) {
            return $this->handleSyncFailure($eventRow, $existing, $lease, $tenantId, $e);
        } catch (Throwable $e) {
            $this->sync->releaseLease($calendarEventId, $lease, $tenantId);
            throw $e;
        }
    }

    // ===================================================================== cancel

    /**
     * Cancel the Google copy because the local event (or its Session) was
     * cancelled. BEST-EFFORT: a Google failure never throws and never rolls back
     * the local cancellation; it records a pending external cancellation instead.
     *
     * 404/410 means the remote event is already absent and is treated as success.
     *
     * @param array<string,mixed> $eventRow
     */
    public function cancelEvent(array $eventRow): GoogleEventSyncResponse
    {
        $tenantId = $this->policy->tenantId();
        $calendarEventId = (int) $eventRow['id'];

        $existing = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        if ($existing === null || ($existing['google_event_id'] ?? null) === null) {
            // Nothing to cancel remotely.
            return $existing !== null
                ? GoogleEventSyncResponse::fromRow($existing)
                : GoogleEventSyncResponse::notPublished($calendarEventId);
        }

        try {
            $connection = $this->loadStoredConnection($existing, $tenantId);
        } catch (GoogleNotConnectedException) {
            // The connection is unusable. Leave a retryable pending cancellation;
            // the local cancellation is already committed and must not fail.
            $this->sync->setPendingWithoutLease($calendarEventId, $tenantId, 'Google is not connected.');
            $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
            return GoogleEventSyncResponse::fromRow($row ?? $existing);
        }

        $organiserEmail = (string) ($connection['google_account_email'] ?? '');

        $lease = $this->sync->acquireLease(
            $tenantId,
            $calendarEventId,
            (int) $connection['id'],
            (string) $existing['google_calendar_id'],
            $this->policy->actorId(),
        );
        if ($lease === null) {
            // Someone else is mid-operation; leave a retryable pending state.
            $this->sync->setPendingWithoutLease($calendarEventId, $tenantId, 'Cancellation is in progress.');
            $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
            return GoogleEventSyncResponse::fromRow($row ?? $existing);
        }

        try {
            $accessToken = $this->oauth->freshAccessTokenForConnection($connection, $tenantId);
            $attendees = $this->attendees->resolve($eventRow, $organiserEmail);
            $options = ['sendUpdates' => $attendees ? 'all' : 'none'];

            $this->deleteRemote((string) $existing['google_calendar_id'], (string) $existing['google_event_id'], $options, $accessToken, $tenantId);
            $this->recordRemoval($calendarEventId, $lease, $tenantId, $existing, 'detached', 'deleted');
        } catch (GoogleNotFoundException) {
            // Already gone remotely: success.
            $this->recordRemoval($calendarEventId, $lease, $tenantId, $existing, 'detached', 'already_absent');
        } catch (GoogleApiException $e) {
            // Best-effort: never throw. Record a retryable pending cancellation.
            $this->sync->markUpdatePending($calendarEventId, $lease, $tenantId, $this->safeError($e));
        } catch (Throwable) {
            $this->sync->releaseLease($calendarEventId, $lease, $tenantId);
        }

        $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        return GoogleEventSyncResponse::fromRow($row ?? $existing);
    }

    // ================================================================== unpublish

    /**
     * Deliberately remove the Google copy, retaining the local event, Session and
     * audit history. The sync row is NOT deleted; it becomes `unpublished` with a
     * timestamp and the remote outcome.
     *
     * Idempotent: unpublishing an already-unpublished event is a clean no-op.
     *
     * @param array<string,mixed> $eventRow
     * @throws GoogleNotPublishedException|GoogleOperationInProgressException|GoogleApiException
     */
    public function unpublish(array $eventRow): GoogleEventSyncResponse
    {
        $tenantId = $this->policy->tenantId();
        $calendarEventId = (int) $eventRow['id'];

        $this->policy->assertCanPublishEvent($eventRow);

        $existing = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        if ($existing === null) {
            throw new GoogleNotPublishedException();
        }
        if (($existing['google_event_id'] ?? null) === null) {
            // Already unpublished/detached: a clean no-op.
            return GoogleEventSyncResponse::fromRow($existing);
        }

        $connection = $this->loadStoredConnection($existing, $tenantId);
        $organiserEmail = (string) ($connection['google_account_email'] ?? '');

        $lease = $this->sync->acquireLease(
            $tenantId,
            $calendarEventId,
            (int) $connection['id'],
            (string) $existing['google_calendar_id'],
            $this->policy->actorId(),
        );
        if ($lease === null) {
            throw new GoogleOperationInProgressException();
        }

        try {
            $accessToken = $this->oauth->freshAccessTokenForConnection($connection, $tenantId);
            $attendees = $this->attendees->resolve($eventRow, $organiserEmail);
            $options = ['sendUpdates' => $attendees ? 'all' : 'none'];

            $outcome = 'deleted';
            try {
                $this->deleteRemote((string) $existing['google_calendar_id'], (string) $existing['google_event_id'], $options, $accessToken, $tenantId);
            } catch (GoogleNotFoundException) {
                $outcome = 'already_absent'; // already gone: still a successful unpublish
            }

            $this->recordRemoval($calendarEventId, $lease, $tenantId, $existing, 'unpublished', $outcome);
            $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
            return GoogleEventSyncResponse::fromRow($row ?? $existing);
        } catch (GoogleApiException $e) {
            // The remote copy could not be removed. Keep the mapping active and
            // retryable; do NOT clear the identifiers.
            $this->sync->markUpdatePending($calendarEventId, $lease, $tenantId, $this->safeError($e));
            $this->sync->markRemoteOutcome($calendarEventId, $tenantId, 'failed');
            throw $e;
        } catch (Throwable $e) {
            $this->sync->releaseLease($calendarEventId, $lease, $tenantId);
            throw $e;
        }
    }

    // ================================================================ internals

    /**
     * DELETE the remote event, translating 404/410 into `GoogleNotFoundException`
     * so callers can treat "already absent" as success.
     *
     * @param array<string,mixed> $options
     */
    private function deleteRemote(string $calendarId, string $eventId, array $options, string $accessToken, int $tenantId): void
    {
        try {
            $this->client->deleteEvent($calendarId, $eventId, $options, $accessToken);
        } catch (GoogleApiException $e) {
            if ($e->reason() === GoogleApiException::REASON_NOT_FOUND) {
                throw new GoogleNotFoundException('The Google event is already absent.');
            }
            throw $e;
        }
    }

    /**
     * Record a successful remote removal: move the active id to `last_google_event_id`,
     * clear the active links (only now that deletion succeeded), set the terminal
     * status (`detached` for a cancellation, `unpublished` for a deliberate
     * removal) and the remote outcome.
     *
     * @param array<string,mixed> $existing
     */
    private function recordRemoval(
        int $calendarEventId,
        string $lease,
        int $tenantId,
        array $existing,
        string $terminalStatus,
        string $remoteOutcome,
    ): void {
        $this->sync->markResult($calendarEventId, $lease, $tenantId, [
            'google_event_id' => null,
            'google_event_url' => null,
            'meet_url' => null,
            'meet_conference_id' => null,
            'etag' => null,
            'remote_etag' => null,
            'generation' => (int) ($existing['generation'] ?? 1),
            'sync_status' => $terminalStatus,
            'conference_status' => 'none',
            'last_error' => null,
            'unpublished_at' => true,
            'remote_outcome' => $remoteOutcome,
            'last_google_event_id' => (string) $existing['google_event_id'],
        ]);
    }

    /**
     * @param array<string,mixed> $eventRow
     * @param array<string,mixed> $connection
     */
    private function recordPublishOutcome(
        array $eventRow,
        array $connection,
        GoogleEventRef $ref,
        string $lease,
        bool $isMeeting,
        int $tenantId,
        int $generation,
    ): GoogleEventSyncResponse {
        $calendarEventId = (int) $eventRow['id'];
        [$syncStatus, $conferenceStatus] = $this->statusesFor($ref, $isMeeting);

        $this->sync->markResult($calendarEventId, $lease, $tenantId, [
            'google_event_id' => $ref->eventId,
            'google_event_url' => $ref->htmlLink,
            'meet_url' => $ref->meetUrl,
            'meet_conference_id' => $ref->conferenceId,
            'etag' => $ref->etag,
            'remote_etag' => $ref->etag,
            'synced_event_version' => (int) ($eventRow['version'] ?? 1),
            'generation' => $generation,
            'sync_status' => $syncStatus,
            'conference_status' => $conferenceStatus,
            'last_error' => null,
            'touch_synced' => $syncStatus === 'synced',
        ]);

        $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        return GoogleEventSyncResponse::fromRow($row ?? []);
    }

    /**
     * @param array<string,mixed> $eventRow
     * @param array<string,mixed> $existing
     */
    private function recordSyncOutcome(
        array $eventRow,
        array $existing,
        string $lease,
        GoogleEventRef $ref,
        int $eventVersion,
        int $tenantId,
    ): GoogleEventSyncResponse {
        $calendarEventId = (int) $eventRow['id'];
        $isMeeting = ((string) ($eventRow['category'] ?? '')) === self::CATEGORY_MEETING;
        [$syncStatus, $conferenceStatus] = $this->statusesFor($ref, $isMeeting);

        // A PATCH does not send conferenceData (the conference is preserved), so a
        // ref with no conference information must NOT downgrade a meeting to
        // `pending`. Retain the last known conference state/URL instead.
        $meetUrl = $ref->meetUrl;
        $conferenceId = $ref->conferenceId;
        if ($isMeeting && $ref->conferenceStatus === 'none') {
            $conferenceStatus = (string) ($existing['conference_status'] ?? 'success');
            $meetUrl = $existing['meet_url'] ?? null;
            $conferenceId = $existing['meet_conference_id'] ?? null;
            $syncStatus = 'synced';
        }

        $wrote = $this->sync->markResult($calendarEventId, $lease, $tenantId, [
            'google_event_id' => $ref->eventId,
            'google_event_url' => $ref->htmlLink,
            'meet_url' => $meetUrl,
            'meet_conference_id' => $conferenceId,
            'etag' => $ref->etag,
            'remote_etag' => $ref->etag,
            'synced_event_version' => $eventVersion,
            'generation' => (int) ($existing['generation'] ?? 1),
            'sync_status' => $syncStatus,
            'conference_status' => $conferenceStatus,
            'last_error' => null,
            'touch_synced' => true,
        ], expectedEventVersion: $eventVersion);

        if (!$wrote) {
            // The local event advanced while we were patching, or we lost the lease.
            // Record the fresh remote etag as `update_pending` so a later sync can
            // push the newer local state, and never claim the newer version synced.
            $this->sync->markResult($calendarEventId, $lease, $tenantId, [
                'google_event_id' => $ref->eventId,
                'google_event_url' => $ref->htmlLink,
                'meet_url' => $meetUrl,
                'meet_conference_id' => $conferenceId,
                'etag' => $ref->etag,
                'remote_etag' => $ref->etag,
                'synced_event_version' => null,
                'generation' => (int) ($existing['generation'] ?? 1),
                'sync_status' => 'update_pending',
                'conference_status' => $conferenceStatus,
                'last_error' => 'The event changed locally during the update.',
            ]);
        }

        $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        return GoogleEventSyncResponse::fromRow($row ?? $existing);
    }

    /**
     * Classify a sync failure. Records the state and either returns the response
     * (transient -> update_pending, retryable) or throws (conflict, reconnect).
     *
     * @param array<string,mixed> $eventRow
     * @param array<string,mixed> $existing
     * @throws GoogleSyncConflictException|GoogleApiException
     */
    private function handleSyncFailure(
        array $eventRow,
        array $existing,
        string $lease,
        int $tenantId,
        GoogleApiException $e,
    ): GoogleEventSyncResponse {
        $calendarEventId = (int) $eventRow['id'];
        $calendarId = (string) $existing['google_calendar_id'];

        if ($e->reason() === GoogleApiException::REASON_CONFLICT) {
            // A Google-side edit. Never overwrite. Try to read the current remote
            // etag so the conflict view can show both, but store NO snapshot.
            $remoteEtag = null;
            try {
                $connection = $this->loadStoredConnection($existing, $tenantId);
                $accessToken = $this->oauth->freshAccessTokenForConnection($connection, $tenantId);
                $ref = $this->client->getEvent($calendarId, (string) $existing['google_event_id'], ['conferenceDataVersion' => 1], $accessToken);
                $remoteEtag = $ref->etag;
            } catch (Throwable) {
                // Reading the remote etag is best effort.
            }

            $this->sync->markResult($calendarEventId, $lease, $tenantId, [
                'google_event_id' => $existing['google_event_id'],
                'etag' => $existing['etag'] ?? null,
                'remote_etag' => $remoteEtag,
                'generation' => (int) ($existing['generation'] ?? 1),
                'sync_status' => 'conflict',
                'conference_status' => (string) ($existing['conference_status'] ?? 'none'),
                'last_error' => 'Google event changed externally.',
                'conflict_at' => true,
            ]);
            throw new GoogleSyncConflictException($existing['etag'] ?? null, $remoteEtag);
        }

        if ($e->requiresReconnect() || $e->reason() === GoogleApiException::REASON_INVALID_GRANT) {
            // The connection already flipped to needs_reconnect inside OAuthService.
            $this->sync->markUpdatePending($calendarEventId, $lease, $tenantId, $this->safeError($e));
            throw $e;
        }

        // Transient (timeout/429/5xx/network): keep the local change and expose a
        // retryable pending state rather than failing the user's edit.
        $this->sync->markUpdatePending($calendarEventId, $lease, $tenantId, $this->safeError($e));
        $row = $this->sync->findByCalendarEvent($calendarEventId, $tenantId);
        return GoogleEventSyncResponse::fromRow($row ?? $existing);
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
            return $this->client->getEvent($calendarId, $googleEventId, ['conferenceDataVersion' => 1], $accessToken);
        }
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
                    'remote_etag' => $ref->etag,
                    'synced_event_version' => $existing['synced_event_version'] ?? null,
                    'generation' => (int) ($existing['generation'] ?? 1),
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

    /** True when an existing row represents a prior publication that was removed. */
    private function isRepublishAfterRemoval(?array $existing): bool
    {
        if ($existing === null) {
            return false;
        }
        if (($existing['google_event_id'] ?? null) !== null) {
            return false;
        }
        $status = (string) ($existing['sync_status'] ?? '');
        return in_array($status, ['detached', 'unpublished'], true)
            || ($existing['last_google_event_id'] ?? null) !== null;
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
     * is required to read/preserve conference data and present only for a meeting.
     *
     * @param array<int,array{email:string}> $attendees
     * @return array<string,mixed>
     */
    private function writeOptions(bool $isMeeting, array $attendees): array
    {
        $options = ['sendUpdates' => $attendees ? 'all' : 'none'];
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

    /**
     * Load the connection stored on a sync row (server-side), which may belong to
     * the original publisher rather than the acting user.
     *
     * @param array<string,mixed> $existing
     * @return array<string,mixed>
     * @throws GoogleNotConnectedException
     */
    private function loadStoredConnection(array $existing, int $tenantId): array
    {
        $connection = $this->connections->findById((int) $existing['connection_id']);
        if ($connection === null) {
            throw new GoogleNotConnectedException('The Google connection for this event is no longer available.');
        }
        // A needs_reconnect/disconnected connection cannot be used.
        $status = (string) ($connection['status'] ?? '');
        if ($status !== 'connected') {
            throw new GoogleNotConnectedException(
                $status === 'needs_reconnect'
                    ? 'Your Google Calendar authorisation has expired. Reconnect to continue.'
                    : 'The Google connection for this event is not active. Reconnect to continue.',
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
            GoogleApiException::REASON_UNAUTHORIZED,
            GoogleApiException::REASON_INVALID_GRANT => 'Google authorisation is no longer valid.',
            GoogleApiException::REASON_NOT_FOUND => 'The Google event was not found.',
            default => 'The Google Calendar request failed.',
        };
    }
}
