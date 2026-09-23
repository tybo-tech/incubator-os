<?php
declare(strict_types=1);

/**
 * Sessions-side implementation of the Calendar capability's deletion guard.
 *
 * Lives in the Sessions capability (the Calendar capability must not depend on
 * Sessions). Wired into the calendar delete endpoint only when both capabilities
 * are present.
 *
 * It throws a CalendarConflictException (the calendar's own exception type) so the
 * calendar's error responder emits `409` with `code = SESSION_LINKED` without
 * needing to know anything about Sessions.
 */
final class SessionCalendarGuard implements CalendarSessionGuard
{
    public function __construct(private PDO $db) {}

    public function assertEventNotLinked(int $calendarEventId): void
    {
        $stmt = $this->db->prepare(
            "SELECT id FROM sessions
             WHERE calendar_event_id = :event AND deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute(['event' => $calendarEventId]);
        $sessionId = $stmt->fetchColumn();

        if ($sessionId !== false) {
            throw new CalendarConflictException(
                'SESSION_LINKED: This event is linked to a Session. Cancel the Session instead of deleting the event.'
            );
        }
    }
}
