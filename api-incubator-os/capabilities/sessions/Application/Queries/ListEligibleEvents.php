<?php
declare(strict_types=1);

/**
 * Company `meeting` calendar events that can be converted into a Session.
 *
 * Returns only live, company-scoped, `meeting`-category events in the requested
 * company that are NOT already linked to a Session. Used to populate the
 * "Create session workspace" picker.
 */
final class ListEligibleEvents
{
    public function __construct(
        private CalendarEventRepository $events,
        private SessionRepository $sessions,
        private SessionAccessPolicy $policy,
        private CalendarValidator $validator,
    ) {}

    /**
     * @return array<int,array<string,mixed>>
     * @throws SessionValidationException|SessionForbiddenException
     */
    public function execute(int $companyId, string $startDate, string $endDate): array
    {
        $this->policy->assertCanAccessCompany($companyId);
        if (!CalendarValidator::isValidDate($startDate) || !CalendarValidator::isValidDate($endDate)) {
            throw new SessionValidationException('A valid start and end date (YYYY-MM-DD) are required.');
        }
        if ($endDate < $startDate) {
            throw new SessionValidationException('The end date must be on or after the start date.');
        }

        // Company-scoped only: `includeSystem` false excludes system-wide events,
        // which can never become Sessions.
        $events = $this->events->listByRange($this->policy->tenantId(), [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'companyId' => $companyId,
            'includeSystem' => false,
            'category' => CalendarCategory::MEETING,
        ]);

        $out = [];
        foreach ($events as $event) {
            $eventId = (int)$event['id'];
            if ($this->sessions->findByCalendarEvent($eventId, $this->policy->tenantId())) {
                continue; // already has a Session
            }
            $out[] = SessionMapper::eventProjection($event);
        }
        return array_values(array_filter($out));
    }
}
