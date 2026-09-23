<?php
declare(strict_types=1);

/**
 * Guard the Calendar capability consults before a calendar event is deleted.
 *
 * The Calendar capability must not depend on the Sessions capability, so it
 * declares this tiny interface and the Sessions capability supplies the concrete
 * implementation at endpoint wiring time. When no guard is injected (e.g. a
 * calendar-only deployment) deletion behaves exactly as before.
 */
interface CalendarSessionGuard
{
    /**
     * @throws Throwable when the event is linked to a Session (the implementation
     *                   throws a CalendarConflictException carrying SESSION_LINKED).
     */
    public function assertEventNotLinked(int $calendarEventId): void;
}
