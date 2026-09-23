<?php
declare(strict_types=1);

/**
 * Publish a calendar event to Google Calendar (Sprint 010 Phase 3).
 *
 * Thin orchestration: resolve the live event with the actor's authorization,
 * then delegate to `GoogleEventSyncService`. The service owns every Google
 * boundary; this command owns the "find the event or 404" step and the response
 * envelope.
 *
 * No transaction is opened here: the service manages its own short leases, and a
 * Google network call must never run inside a transaction.
 */
final class PublishCalendarEventToGoogle
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

        $sync = $this->service->publish($event);

        $message = $sync->fullySynced()
            ? 'Event published to Google Calendar'
            : 'Event created in Google Calendar; the Meet link is still being prepared';

        return new CommandResult(
            success: true,
            message: $message,
            data: $sync,
        );
    }
}
