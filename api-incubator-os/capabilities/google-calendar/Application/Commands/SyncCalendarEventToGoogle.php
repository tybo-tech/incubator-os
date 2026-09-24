<?php
declare(strict_types=1);

/**
 * Push local changes (reschedule/edit/cancel) to the Google projection
 * (Sprint 010 Phase 4).
 *
 * Thin orchestration: resolve the live event with the actor's authorization, then
 * delegate to `GoogleEventSyncService`. The service owns every Google boundary;
 * this command owns the "find the event or 404" step and the response envelope.
 *
 * No transaction is opened here: the service manages its own short leases, and a
 * Google network call must never run inside a transaction.
 */
final class SyncCalendarEventToGoogle
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

        $sync = $this->service->sync($event);

        $message = match ($sync->syncStatus) {
            'conflict' => 'The Google event was changed externally; review the conflict.',
            'update_pending' => 'The change could not reach Google yet; it will retry.',
            'detached' => 'The Google event was cancelled',
            default => 'Event synchronised with Google Calendar',
        };

        return new CommandResult(success: true, message: $message, data: $sync);
    }
}
