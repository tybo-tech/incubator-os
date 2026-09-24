<?php
declare(strict_types=1);

/**
 * Deliberately remove the Google copy while retaining the local event, Session
 * and audit history (Sprint 010 Phase 4).
 *
 * Distinct from disconnecting Google (which is about the connection) and distinct
 * from cancelling the local event (which is about the meeting still happening).
 *
 * Thin orchestration; the service owns every Google boundary and the persistence.
 */
final class UnpublishCalendarEventFromGoogle
{
    public function __construct(
        private CalendarEventRepository $events,
        private GoogleEventSyncService $service,
        private GoogleAccessPolicy $policy,
    ) {}

    public function execute(int $calendarEventId): CommandResult
    {
        $event = $this->events->findById($calendarEventId, $this->policy->tenantId());
        if ($event === null) {
            throw new CalendarNotFoundException("Calendar event $calendarEventId was not found.");
        }

        $sync = $this->service->unpublish($event);

        return new CommandResult(
            success: true,
            message: 'Removed from Google Calendar',
            data: $sync,
        );
    }
}
