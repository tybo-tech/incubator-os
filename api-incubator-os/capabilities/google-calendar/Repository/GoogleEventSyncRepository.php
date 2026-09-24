<?php
declare(strict_types=1);

/**
 * Persistence for `google_event_sync` (Sprint 010 Phases 2–4).
 *
 * The whole class is built around one rule: NO TRANSACTION IS HELD ACROSS A
 * GOOGLE NETWORK CALL. Every remote operation follows the same three-step
 * protocol:
 *
 *   1. `reserve()` / `acquireLease()` — a tiny atomic transaction that creates or
 *      takes over the row's short lease and returns a lease token. Only one caller
 *      can hold a lease, so two concurrent operations cannot both call Google.
 *   2. (the Google call happens here, with no transaction open)
 *   3. `markResult()` — a tiny transaction, guarded by the lease token, that
 *      writes the outcome. A caller whose lease was taken over writes nothing.
 *
 * The lease has a TTL: a crashed operation self-heals because a stale lease can be
 * taken over rather than wedging the row forever.
 *
 * Phase 4 additions:
 *   * `acquireLease()` — a general lease usable by sync/cancel/unpublish, not only
 *     publish.
 *   * `markResult()` records the publication generation, the local event version
 *     the projection reflects (`synced_event_version`), the current remote etag,
 *     conflict/unpublish metadata, and the previous Google event id.
 *   * An optional `expectedEventVersion` guard: a stale worker that prepared its
 *     payload for an older local version cannot claim the projection reflects a
 *     newer one.
 */
final class GoogleEventSyncRepository
{
    /**
     * Lease lifetime in seconds. An operation that takes longer than this has
     * crashed; its lease may be taken over.
     */
    public const LEASE_TTL_SECONDS = 120;

    public function __construct(private readonly PDO $db) {}

    /** Count of mappings referencing a connection. */
    public function countForConnection(int $connectionId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM google_event_sync WHERE connection_id = :id'
        );
        $stmt->execute(['id' => $connectionId]);
        return (int) $stmt->fetchColumn();
    }

    /** Count of mappings that already have a Google event id (published). */
    public function countPublishedForConnection(int $connectionId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM google_event_sync
              WHERE connection_id = :id AND google_event_id IS NOT NULL'
        );
        $stmt->execute(['id' => $connectionId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByCalendarEvent(int $calendarEventId, int $tenantId = 1): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM google_event_sync WHERE calendar_event_id = :event AND tenant_id = :tenant LIMIT 1'
        );
        $stmt->execute(['event' => $calendarEventId, 'tenant' => $tenantId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Reserve the lease for a PUBLISH. An already-published row is not
     * re-reserved for creation (the caller returns the existing projection)
     * unless `$forUpdate` is set (promoting a pending conference does not create
     * anything).
     *
     * @return string|null 32-char lease token, or null when the lease is taken.
     */
    public function reserve(
        int $tenantId,
        int $calendarEventId,
        int $connectionId,
        string $googleCalendarId,
        int $actorId,
        ?string $meetRequestId,
        bool $forUpdate = false,
    ): ?string {
        return $this->lease(
            $tenantId,
            $calendarEventId,
            $connectionId,
            $googleCalendarId,
            $actorId,
            $meetRequestId,
            createOnly: !$forUpdate,
        );
    }

    /**
     * Acquire the general lease for an existing projection (sync/cancel/unpublish).
     * Returns null when another caller holds a live lease. When the row does not
     * exist this returns null (there is nothing to sync), so callers can respond
     * with `GOOGLE_NOT_PUBLISHED`.
     *
     * @return string|null
     */
    public function acquireLease(
        int $tenantId,
        int $calendarEventId,
        int $connectionId,
        string $googleCalendarId,
        int $actorId,
        ?string $meetRequestId = null,
    ): ?string {
        return $this->lease(
            $tenantId,
            $calendarEventId,
            $connectionId,
            $googleCalendarId,
            $actorId,
            $meetRequestId,
            createOnly: false,
            requireExisting: true,
        );
    }

    /**
     * The single lease primitive.
     *
     * @return string|null
     */
    private function lease(
        int $tenantId,
        int $calendarEventId,
        int $connectionId,
        string $googleCalendarId,
        int $actorId,
        ?string $meetRequestId,
        bool $createOnly,
        bool $requireExisting = false,
    ): ?string {
        $token = bin2hex(random_bytes(16)); // 32 hex chars

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'SELECT id, google_event_id, publish_claim_token, publish_claimed_at
                   FROM google_event_sync
                  WHERE calendar_event_id = :event AND tenant_id = :tenant
                  LIMIT 1
                  FOR UPDATE'
            );
            $stmt->execute(['event' => $calendarEventId, 'tenant' => $tenantId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row === false) {
                if ($requireExisting) {
                    // Nothing to sync/cancel/unpublish.
                    $this->db->commit();
                    return null;
                }
                // First publish for this event: create the row already leased.
                $insert = $this->db->prepare(
                    'INSERT INTO google_event_sync
                        (tenant_id, calendar_event_id, connection_id, google_calendar_id,
                         meet_request_id, conference_status, sync_status, generation,
                         publish_claim_token, publish_claimed_at, created_by)
                     VALUES
                        (:tenant, :event, :connection, :calendar,
                         :meet_request, :conference, \'pending\', 1,
                         :token, UTC_TIMESTAMP(), :actor)'
                );
                $insert->execute([
                    'tenant' => $tenantId,
                    'event' => $calendarEventId,
                    'connection' => $connectionId,
                    'calendar' => $googleCalendarId,
                    'meet_request' => $meetRequestId,
                    'conference' => $meetRequestId !== null ? 'pending' : 'none',
                    'token' => $token,
                    'actor' => $actorId,
                ]);
                $this->db->commit();
                return $token;
            }

            // An already-published row is never re-reserved for CREATION.
            if ($createOnly && ($row['google_event_id'] ?? null) !== null) {
                $this->db->commit();
                return null;
            }

            $heldAt = $row['publish_claimed_at'] ?? null;
            $live = $heldAt !== null
                && (new DateTimeImmutable((string) $heldAt, new DateTimeZone('UTC')))
                    > (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('-' . self::LEASE_TTL_SECONDS . ' seconds');

            if ($live) {
                // Another caller is mid-operation. Do not touch Google.
                $this->db->commit();
                return null;
            }

            // Take over a stale/missing lease.
            $update = $this->db->prepare(
                'UPDATE google_event_sync
                    SET connection_id = :connection,
                        google_calendar_id = :calendar,
                        meet_request_id = COALESCE(meet_request_id, :meet_request),
                        conference_status = CASE WHEN :has_meet = 1 AND conference_status = \'none\' THEN \'pending\' ELSE conference_status END,
                        publish_claim_token = :token,
                        publish_claimed_at = UTC_TIMESTAMP(),
                        version = version + 1
                  WHERE id = :id'
            );
            $update->execute([
                'connection' => $connectionId,
                'calendar' => $googleCalendarId,
                'meet_request' => $meetRequestId,
                'has_meet' => $meetRequestId !== null ? 1 : 0,
                'token' => $token,
                'id' => (int) $row['id'],
            ]);
            $this->db->commit();
            return $token;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Write the outcome of an operation, guarded by the lease token AND an optional
     * local-event-version guard. A caller whose lease was taken over (token no
     * longer matches) writes nothing; a caller whose prepared payload is stale
     * (the local event advanced past `$expectedEventVersion`) also writes nothing,
     * so a stale worker cannot claim a projection it never actually pushed.
     *
     * `$data` keys (all optional unless noted):
     *   sync_status (string), conference_status (string), last_error (?string),
     *   google_event_id (?string), google_event_url (?string), meet_url (?string),
     *   meet_conference_id (?string), etag (?string), remote_etag (?string),
     *   generation (?int), synced_event_version (?int, also the guard value when
     *   `$expectedEventVersion` is null), conflict_at (bool), unpublished_at (bool),
     *   remote_outcome (?string), last_google_event_id (?string), touch_synced (bool).
     *
     * @param array<string,mixed> $data
     * @return bool true when this caller still held the lease and wrote the result
     */
    public function markResult(
        int $calendarEventId,
        string $leaseToken,
        int $tenantId,
        array $data,
        ?int $expectedEventVersion = null,
    ): bool {
        $guardVersion = $expectedEventVersion ?? (isset($data['synced_event_version']) ? (int) $data['synced_event_version'] : null);

        $sql = 'UPDATE google_event_sync
                SET google_event_id = :google_event_id,
                    google_event_url = :google_event_url,
                    meet_url = :meet_url,
                    meet_conference_id = :meet_conference_id,
                    etag = :etag,
                    remote_etag = :remote_etag,
                    synced_event_version = :synced_event_version,
                    generation = :generation,
                    sync_status = :sync_status,
                    conference_status = :conference_status,
                    last_error = :last_error,
                    conflict_at = CASE WHEN :set_conflict = 1 THEN UTC_TIMESTAMP() ELSE conflict_at END,
                    unpublished_at = CASE WHEN :set_unpublished = 1 THEN UTC_TIMESTAMP() ELSE unpublished_at END,
                    remote_outcome = :remote_outcome,
                    last_google_event_id = COALESCE(:last_google_event_id, last_google_event_id),
                    last_synced_at = CASE WHEN :touch = 1 THEN UTC_TIMESTAMP() ELSE last_synced_at END,
                    publish_claim_token = NULL,
                    publish_claimed_at = NULL,
                    version = version + 1
              WHERE calendar_event_id = :event
                AND tenant_id = :tenant
                AND publish_claim_token = :token';

        $params = [
            'google_event_id' => $data['google_event_id'] ?? null,
            'google_event_url' => $data['google_event_url'] ?? null,
            'meet_url' => $data['meet_url'] ?? null,
            'meet_conference_id' => $data['meet_conference_id'] ?? null,
            'etag' => $data['etag'] ?? null,
            'remote_etag' => $data['remote_etag'] ?? null,
            'synced_event_version' => $data['synced_event_version'] ?? null,
            'generation' => max(1, (int) ($data['generation'] ?? 1)),
            'sync_status' => $data['sync_status'] ?? 'pending',
            'conference_status' => $data['conference_status'] ?? 'none',
            'last_error' => isset($data['last_error']) ? mb_substr((string) $data['last_error'], 0, 255) : null,
            'set_conflict' => !empty($data['conflict_at']) ? 1 : 0,
            'set_unpublished' => !empty($data['unpublished_at']) ? 1 : 0,
            'remote_outcome' => isset($data['remote_outcome']) ? mb_substr((string) $data['remote_outcome'], 0, 64) : null,
            'last_google_event_id' => $data['last_google_event_id'] ?? null,
            'touch' => !empty($data['touch_synced']) ? 1 : 0,
            'event' => $calendarEventId,
            'tenant' => $tenantId,
            'token' => $leaseToken,
        ];

        // Stale-worker guard: only write when the local event is still at the
        // version this worker prepared its payload for (NULL = no guard).
        if ($guardVersion !== null) {
            $sql .= ' AND EXISTS (
                          SELECT 1 FROM calendar_events ce
                           WHERE ce.id = google_event_sync.calendar_event_id
                             AND ce.version = :guard_version)';
            $params['guard_version'] = $guardVersion;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    /**
     * Record the stable conference request id without disturbing the lease. Used
     * when a row already exists but its `meet_request_id` was not yet set (e.g. a
     * row created by an earlier non-meeting publish that is now a meeting).
     */
    public function setMeetRequestIdIfMissing(int $calendarEventId, int $tenantId, string $meetRequestId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET meet_request_id = :request, version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant
                AND (meet_request_id IS NULL OR meet_request_id = \'\')'
        );
        $stmt->execute(['request' => $meetRequestId, 'event' => $calendarEventId, 'tenant' => $tenantId]);
    }

    /** Release a lease without writing a result (used on a pre-flight hard stop). */
    public function releaseLease(int $calendarEventId, string $leaseToken, int $tenantId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET publish_claim_token = NULL, publish_claimed_at = NULL, version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant AND publish_claim_token = :token'
        );
        $stmt->execute(['event' => $calendarEventId, 'tenant' => $tenantId, 'token' => $leaseToken]);
    }

    /**
     * Mark a local change as waiting to reach Google (transient failure). Retains
     * the existing projection identifiers so a retry can push it; records a
     * secret-free reason. Guarded by the lease token.
     */
    public function markUpdatePending(int $calendarEventId, string $leaseToken, int $tenantId, string $reason): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET sync_status = \'update_pending\',
                    last_error = :reason,
                    publish_claim_token = NULL,
                    publish_claimed_at = NULL,
                    version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant AND publish_claim_token = :token'
        );
        $stmt->execute([
            'reason' => mb_substr($reason, 0, 255),
            'event' => $calendarEventId,
            'tenant' => $tenantId,
            'token' => $leaseToken,
        ]);
    }

    /** Release a lease and record a secret-free failure without changing identifiers. */
    public function markFailure(int $calendarEventId, string $leaseToken, int $tenantId, string $reason): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET sync_status = \'failed\',
                    last_error = :reason,
                    publish_claim_token = NULL,
                    publish_claimed_at = NULL,
                    version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant AND publish_claim_token = :token'
        );
        $stmt->execute([
            'reason' => mb_substr($reason, 0, 255),
            'event' => $calendarEventId,
            'tenant' => $tenantId,
            'token' => $leaseToken,
        ]);
    }

    /**
     * Record a retryable pending local change WITHOUT a lease token. Used by the
     * best-effort cancellation cascade when the connection is unusable or another
     * operation is in progress: the local cancellation is already committed and
     * the external cancellation must simply be retried later.
     */
    public function setPendingWithoutLease(int $calendarEventId, int $tenantId, string $reason): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET sync_status = \'update_pending\',
                    last_error = :reason,
                    version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant
                AND google_event_id IS NOT NULL'
        );
        $stmt->execute([
            'reason' => mb_substr($reason, 0, 255),
            'event' => $calendarEventId,
            'tenant' => $tenantId,
        ]);
    }

    /** Record only the secret-free remote outcome of an unpublish attempt. */
    public function markRemoteOutcome(int $calendarEventId, int $tenantId, string $outcome): void
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET remote_outcome = :outcome, version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant'
        );
        $stmt->execute([
            'outcome' => mb_substr($outcome, 0, 64),
            'event' => $calendarEventId,
            'tenant' => $tenantId,
        ]);
    }

    /**
     * Increment the publication generation. Called when a republish follows an
     * unpublish so the new Google event id (which embeds the generation) can never
     * reuse a tombstoned id. A new generation also gets a new conference request id.
     *
     * @return int the new generation
     */
    public function bumpGeneration(int $calendarEventId, int $tenantId, string $newMeetRequestId): int
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET generation = generation + 1,
                    meet_request_id = :request,
                    version = version + 1
              WHERE calendar_event_id = :event AND tenant_id = :tenant'
        );
        $stmt->execute(['request' => $newMeetRequestId, 'event' => $calendarEventId, 'tenant' => $tenantId]);

        $read = $this->findByCalendarEvent($calendarEventId, $tenantId);
        return (int) ($read['generation'] ?? 1);
    }
}
