<?php
declare(strict_types=1);

/**
 * Persistence for `google_event_sync` (Sprint 010 Phase 2).
 *
 * Phase 2 uses this mainly to answer: does this connection already have published
 * event mappings? That decides both the account-mismatch guard (do not silently
 * reassign) and whether a disconnect may hard-delete. The publish/sync write
 * paths arrive in Phases 3–4.
 */
final class GoogleEventSyncRepository
{
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
}
