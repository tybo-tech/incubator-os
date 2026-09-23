<?php
declare(strict_types=1);

/**
 * Upcoming Sessions accessible to the actor.
 *
 * "Accessible" is actor-scoped: administrators see every company, everyone else
 * only their own. The horizon is bounded so a caller can never request the whole
 * table.
 */
final class ListUpcomingSessions
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
        private CalendarValidator $validator,
    ) {}

    /**
     * @return array<int,array<string,mixed>> SessionSummary[]
     * @throws SessionValidationException
     */
    public function execute(string $fromDate, string $toDate, ?int $companyId = null): array
    {
        if (!CalendarValidator::isValidDate($fromDate) || !CalendarValidator::isValidDate($toDate)) {
            throw new SessionValidationException('A valid from and to date (YYYY-MM-DD) are required.');
        }
        if ($toDate < $fromDate) {
            throw new SessionValidationException('The to date must be on or after the from date.');
        }

        if ($companyId !== null) {
            $this->policy->assertCanAccessCompany($companyId);
            $companyIds = [$companyId];
        } else {
            $companyIds = $this->policy->accessibleCompanyIds();
        }

        $rows = $this->repo->listUpcoming($this->policy->tenantId(), $companyIds, $fromDate, $toDate);

        $out = [];
        foreach ($rows as $row) {
            $out[] = SessionMapper::toSummaryArray($row, SessionRepository::eventFromRow($row));
        }
        return $out;
    }
}
