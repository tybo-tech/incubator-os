<?php
declare(strict_types=1);

/**
 * Get a single calendar event by id.
 *
 * Authorization is repeated here (list filtering alone is not sufficient).
 */
final class GetCalendarEvent
{
    public function __construct(
        private CalendarEventRepository $repo,
        private CalendarAccessPolicy $policy,
    ) {}

    public function execute(int $id): CalendarEventResponse
    {
        $row = $this->repo->findById($id, $this->policy->tenantId());
        if (!$row) {
            throw new CalendarNotFoundException("Calendar event $id was not found.");
        }
        $this->policy->assertCanAccessCompany(
            $row['company_id'] !== null ? (int)$row['company_id'] : null
        );

        return CalendarEventMapper::toResponse($row, $this->repo->linksForEvent($id));
    }
}
