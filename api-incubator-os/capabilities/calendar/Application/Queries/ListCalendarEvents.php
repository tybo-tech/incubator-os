<?php
declare(strict_types=1);

/**
 * List calendar events for a bounded date range.
 *
 * Range is required (the UI only ever needs the displayed month + agenda
 * horizon). A company-scoped call includes system-wide events; a global call
 * includes system-wide events plus the companies the actor may access.
 */
final class ListCalendarEvents
{
    public function __construct(
        private CalendarEventRepository $repo,
        private CalendarAccessPolicy $policy,
    ) {}

    /**
     * @return CalendarEventResponse[]
     * @throws CalendarValidationException
     */
    public function execute(
        string $startDate,
        string $endDate,
        ?int $companyId = null,
        ?string $category = null,
        ?string $status = null,
        ?string $search = null,
        ?int $assigneeUserId = null,
    ): array {
        if (!CalendarValidator::isValidDate($startDate) || !CalendarValidator::isValidDate($endDate)) {
            throw new CalendarValidationException('A valid start and end date (YYYY-MM-DD) are required.');
        }
        if ($endDate < $startDate) {
            throw new CalendarValidationException('The end date must be on or after the start date.');
        }

        if ($companyId !== null) {
            $this->policy->assertCanAccessCompany($companyId);
        }

        $rows = $this->repo->listByRange($this->policy->tenantId(), [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'companyId' => $companyId,
            'includeSystem' => true,
            'companyIds' => $companyId === null ? $this->policy->accessibleCompanyIds() : [],
            'category' => $category,
            'status' => $status,
            'search' => $search,
            'assigneeUserId' => $assigneeUserId,
        ]);

        $out = [];
        foreach ($rows as $row) {
            $links = $this->repo->linksForEvent((int)$row['id']);
            $out[] = CalendarEventMapper::toResponse($row, $links);
        }
        return $out;
    }
}
