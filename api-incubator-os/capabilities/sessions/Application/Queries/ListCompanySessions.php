<?php
declare(strict_types=1);

/**
 * List Sessions for a company (timeline).
 *
 * A company is required: Sessions have no global scope (a Session belongs to
 * exactly one company). The actor must have company access.
 */
final class ListCompanySessions
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
    ) {}

    /**
     * @return array<int,array<string,mixed>> SessionSummary[]
     * @throws SessionValidationException|SessionForbiddenException
     */
    public function execute(
        int $companyId,
        ?string $status = null,
        ?string $sessionType = null,
        ?int $facilitatorUserId = null,
        ?string $search = null,
    ): array {
        $this->policy->assertCanAccessCompany($companyId);

        if ($status !== null && !SessionStatus::isValid($status)) {
            throw new SessionValidationException('Unknown status: ' . $status);
        }
        if ($sessionType !== null && !SessionType::isValid($sessionType)) {
            throw new SessionValidationException('Unknown session type: ' . $sessionType);
        }

        $rows = $this->repo->listByCompany($this->policy->tenantId(), [
            'companyId' => $companyId,
            'status' => $status,
            'sessionType' => $sessionType,
            'facilitatorUserId' => $facilitatorUserId,
            'search' => $search,
        ]);

        $out = [];
        foreach ($rows as $row) {
            $out[] = SessionMapper::toSummaryArray($row, SessionRepository::eventFromRow($row));
        }
        return $out;
    }
}
