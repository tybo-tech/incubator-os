<?php
declare(strict_types=1);

/**
 * Backlinks: which Sessions link a given business record.
 *
 * Authorization is applied to the VIEWER, not the record: a user only sees
 * Sessions in companies they can access, even if the entity is referenced
 * elsewhere.
 */
final class ListSessionBacklinks
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
    ) {}

    /**
     * @return array<int,array<string,mixed>> SessionSummary[]
     * @throws SessionValidationException
     */
    public function execute(string $entityType, int $entityId): array
    {
        if (!SessionLinkEntityType::isValid($entityType)) {
            throw new SessionValidationException('Unknown link type: ' . $entityType);
        }
        if ($entityId <= 0) {
            throw new SessionValidationException('A positive entity id is required.');
        }

        $rows = $this->repo->listByEntityLink(
            $this->policy->tenantId(),
            $entityType,
            $entityId,
            $this->policy->accessibleCompanyIds()
        );

        $out = [];
        foreach ($rows as $row) {
            $out[] = SessionMapper::toSummaryArray($row, SessionRepository::eventFromRow($row));
        }
        return $out;
    }
}
