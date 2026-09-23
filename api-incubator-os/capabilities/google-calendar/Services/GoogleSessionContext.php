<?php
declare(strict_types=1);

/**
 * Read-only lookup of the Session linked to a calendar event (Sprint 010 Phase 3).
 *
 * The Google Calendar capability must not depend on `capabilities/sessions`, so
 * this queries the `sessions` table defensively (guarded by a table-existence
 * check) rather than including a Sessions class. When the Sessions capability is
 * absent the lookup simply returns null, and publishing proceeds with no session
 * subject and no attendees.
 *
 * At most one Session can be linked (`sessions.calendar_event_id` is UNIQUE).
 */
final class GoogleSessionContext
{
    /** @var array<string,bool> */
    private array $tableCache = [];

    public function __construct(private readonly PDO $db) {}

    /**
     * @return array{sessionId:int, subject:string, companyId:?int}|null
     */
    public function forEvent(int $calendarEventId): ?array
    {
        if ($calendarEventId <= 0 || !$this->tableExists('sessions')) {
            return null;
        }
        $stmt = $this->db->prepare(
            'SELECT id, subject, company_id FROM sessions
              WHERE calendar_event_id = :event AND deleted_at IS NULL
              LIMIT 1'
        );
        $stmt->execute(['event' => $calendarEventId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'sessionId' => (int) $row['id'],
            'subject' => (string) ($row['subject'] ?? ''),
            'companyId' => $row['company_id'] !== null ? (int) $row['company_id'] : null,
        ];
    }

    private function tableExists(string $table): bool
    {
        if (array_key_exists($table, $this->tableCache)) {
            return $this->tableCache[$table];
        }
        try {
            $stmt = $this->db->prepare(
                'SELECT COUNT(*) FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t'
            );
            $stmt->execute(['t' => $table]);
            $exists = (int) $stmt->fetchColumn() > 0;
        } catch (Throwable) {
            $exists = false;
        }
        $this->tableCache[$table] = $exists;
        return $exists;
    }
}
