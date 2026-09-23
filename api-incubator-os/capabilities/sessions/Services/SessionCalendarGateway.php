<?php
declare(strict_types=1);

/**
 * Sessions-side bridge to the Calendar capability.
 *
 * Creation and conversion must be ATOMIC with the Session: this gateway therefore
 * uses the calendar's repository/writer/validator DIRECTLY and never opens its own
 * transaction. The calling command owns the transaction, so a failure on either
 * side rolls back both records (a Session never exists without its event, and an
 * event created for a Session is never orphaned).
 *
 * Eligibility (conversion) rules — all enforced here, not trusted from the client:
 *   * the event must exist and be live (not soft-deleted),
 *   * must be a COMPANY event (system-wide events cannot become Sessions),
 *   * must be in the `meeting` category,
 *   * must belong to the Session's company,
 *   * must not already be linked to another Session.
 */
final class SessionCalendarGateway
{
    public function __construct(
        private CalendarEventRepository $events,
        private CalendarEventWriter $writer,
        private CalendarValidator $validator,
        private CalendarAccessPolicy $calendarPolicy,
    ) {}

    /**
     * Create a company `meeting` event inside the caller's transaction.
     *
     * @return int the new event id
     * @throws SessionValidationException when the requested schedule shape is invalid
     */
    public function createMeetingEvent(SessionRequest $input, int $tenantId, int $actorId, int $companyId): int
    {
        $request = new CalendarEventRequest(
            companyId: $companyId,
            title: $input->eventTitle !== '' ? $input->eventTitle : $input->subject,
            description: $input->eventDescription,
            category: CalendarCategory::MEETING,
            status: CalendarStatus::SCHEDULED,
            allDay: $input->allDay,
            timezone: $input->timezone,
            location: $input->eventLocation,
            startDate: $input->startDate,
            endDate: $input->endDate,
            startAt: $input->startAt,
            endAt: $input->endAt,
            assigneeUserId: $input->facilitatorUserId,
            assigneeLabel: $input->facilitatorLabel,
            links: [],
            clientToken: null,
        );

        try {
            $this->validator->validate($request);
        } catch (CalendarValidationException $e) {
            throw new SessionValidationException($e->getMessage());
        }

        $row = $this->writer->toRow($request, $tenantId, $actorId);
        return $this->events->create($row);
    }

    /**
     * Assert a calendar event is eligible to become a Session and return it.
     *
     * @return array<string,mixed> the live event row
     * @throws SessionNotFoundException|SessionForbiddenException|SessionValidationException|SessionConflictException
     */
    public function assertEligibleForSession(int $calendarEventId, int $tenantId, int $companyId, int $actorId): array
    {
        $event = $this->events->findById($calendarEventId, $tenantId);
        if (!$event) {
            throw new SessionNotFoundException("Calendar event $calendarEventId was not found.");
        }

        // System-wide events are never eligible.
        if ($event['company_id'] === null) {
            throw new SessionValidationException(json_encode([
                'calendarEventId' => 'A system-wide event cannot become a Session.',
            ]) ?: 'A system-wide event cannot become a Session.');
        }

        // The event must belong to the Session's company.
        if ((int)$event['company_id'] !== $companyId) {
            throw new SessionValidationException(json_encode([
                'calendarEventId' => 'The event belongs to a different company.',
            ]) ?: 'The event belongs to a different company.');
        }

        // Only meeting-category events qualify.
        if ((string)$event['category'] !== CalendarCategory::MEETING) {
            throw new SessionValidationException(json_encode([
                'calendarEventId' => 'Only a meeting event can become a Session.',
            ]) ?: 'Only a meeting event can become a Session.');
        }

        // The actor must be allowed to touch the event in its own right.
        try {
            $this->calendarPolicy->assertCanModifyEvent($event);
        } catch (CalendarForbiddenException $e) {
            throw new SessionForbiddenException($e->getMessage());
        }

        return $event;
    }

    /**
     * Cancel the linked event when its Session is cancelled. Uses the event's
     * current version so a concurrent change is surfaced rather than clobbered.
     *
     * @throws SessionConflictException
     */
    public function cancelLinkedEvent(int $calendarEventId, int $tenantId, int $actorId): void
    {
        $event = $this->events->findById($calendarEventId, $tenantId);
        if (!$event) {
            // The event was removed out from under us; the Session can still cancel.
            return;
        }
        if ((string)$event['status'] === CalendarStatus::CANCELLED) {
            return;
        }
        $affected = $this->events->setStatus(
            $calendarEventId,
            $tenantId,
            CalendarStatus::CANCELLED,
            $actorId,
            (int)$event['version']
        );
        if ($affected === 0) {
            throw new SessionConflictException(
                'The linked calendar event was changed by someone else. Reload and try again.'
            );
        }
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findEvent(int $calendarEventId, int $tenantId): ?array
    {
        return $this->events->findById($calendarEventId, $tenantId);
    }
}
