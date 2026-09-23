<?php
declare(strict_types=1);

/**
 * Persistence for `google_event_sync` (Sprint 010 Phase 2, extended in Phase 3).
 *
 * Phase 2 used this only to answer reference questions for the account-mismatch
 * guard and the disconnect policy.
 *
 * Phase 3 adds the publish write path, built around one rule: NO TRANSACTION IS
 * HELD ACROSS A GOOGLE NETWORK CALL. Publishing is a three-step protocol:
 *
 *   1. `reserve()`  — a tiny atomic transaction that creates or takes over the
 *                     row's short lease and returns a lease token. Only one
 *                     caller can hold the lease, so concurrent publishes cannot
 *                     both create a Google event.
 *   2. (the Google call happens here, with no transaction open)
 *   3. `markResult()` — a tiny transaction, guarded by the lease token, that
 *                     writes the outcome. A caller whose lease was taken over
 *                     writes nothing (it lost the race).
 *
 * The lease has a TTL: a crashed publish self-heals because a stale lease can be
 * taken over rather than wedging the row forever.
 */
final class GoogleEventSyncRepository
{
    /**
     * Lease lifetime in seconds. A publish that takes longer than this has
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
     * Atomically reserve (or take over) the publish lease for a calendar event.
     *
     * Returns a lease token when THIS caller now holds the lease, or null when
     * another caller holds a live lease — in which case the caller must NOT call
     * Google.
     *
     * A lease is free when the row does not exist, when it has no lease, or when
     * its lease is older than the TTL. The row is created as needed, so a first
     * publish and a concurrent retry converge on one row (UNIQUE calendar_event_id).
     *
     * Everything here runs in one tiny transaction; nothing is held afterwards.
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
                // First publish for this event: create the row already leased.
                $insert = $this->db->prepare(
                    'INSERT INTO google_event_sync
                        (tenant_id, calendar_event_id, connection_id, google_calendar_id,
                         meet_request_id, conference_status, sync_status,
                         publish_claim_token, publish_claimed_at, created_by)
                     VALUES
                        (:tenant, :event, :connection, :calendar,
                         :meet_request, :conference, \'pending\',
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

            // An already-published row is never re-reserved for CREATION: the
            // caller returns the existing projection instead (idempotent publish).
            // An UPDATE lease (forUpdate) may still be taken to promote a pending
            // conference, which does not create anything.
            if (($row['google_event_id'] ?? null) !== null && !$forUpdate) {
                $this->db->commit();
                return null;
            }

            $heldAt = $row['publish_claimed_at'] ?? null;
            $live = $heldAt !== null
                && (new DateTimeImmutable((string) $heldAt, new DateTimeZone('UTC')))
                    > (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('-' . self::LEASE_TTL_SECONDS . ' seconds');

            if ($live) {
                // Another caller is mid-publish. Do not touch Google.
                $this->db->commit();
                return null;
            }

            // Take over a stale/missing lease.
            $update = $this->db->prepare(
                'UPDATE google_event_sync
                    SET connection_id = :connection,
                        google_calendar_id = :calendar,
                        meet_request_id = COALESCE(meet_request_id, :meet_request),
                        conference_status = CASE WHEN :has_meet = 1 THEN \'pending\' ELSE conference_status END,
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
     * Write the outcome of a publish, guarded by the lease token. A caller whose
     * lease was taken over (token no longer matches) writes nothing.
     *
     * @param array<string,mixed> $data
     * @return bool true when this caller still held the lease and wrote the result
     */
    public function markResult(int $calendarEventId, string $leaseToken, int $tenantId, array $data): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE google_event_sync
                SET google_event_id = :google_event_id,
                    google_event_url = :google_event_url,
                    meet_url = :meet_url,
                    meet_conference_id = :meet_conference_id,
                    etag = :etag,
                    sync_status = :sync_status,
                    conference_status = :conference_status,
                    last_error = :last_error,
                    last_synced_at = CASE WHEN :touch = 1 THEN UTC_TIMESTAMP() ELSE last_synced_at END,
                    publish_claim_token = NULL,
                    publish_claimed_at = NULL,
                    version = version + 1
              WHERE calendar_event_id = :event
                AND tenant_id = :tenant
                AND publish_claim_token = :token'
        );
        $stmt->execute([
            'google_event_id' => $data['google_event_id'] ?? null,
            'google_event_url' => $data['google_event_url'] ?? null,
            'meet_url' => $data['meet_url'] ?? null,
            'meet_conference_id' => $data['meet_conference_id'] ?? null,
            'etag' => $data['etag'] ?? null,
            'sync_status' => $data['sync_status'] ?? 'pending',
            'conference_status' => $data['conference_status'] ?? 'none',
            'last_error' => isset($data['last_error']) ? mb_substr((string) $data['last_error'], 0, 255) : null,
            'touch' => !empty($data['touch_synced']) ? 1 : 0,
            'event' => $calendarEventId,
            'tenant' => $tenantId,
            'token' => $leaseToken,
        ]);
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
}
