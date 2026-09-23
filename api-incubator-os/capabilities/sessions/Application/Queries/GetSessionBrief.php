<?php
declare(strict_types=1);

/**
 * Preparation brief for a Session — read-only, server-built, reusing the existing
 * read models. Nothing here is stored on the Session.
 */
final class GetSessionBrief
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
        private SessionBriefReadModel $readModel,
    ) {}

    /**
     * @return array<string,mixed>
     * @throws SessionNotFoundException|SessionForbiddenException
     */
    public function execute(int $id): array
    {
        $row = $this->repo->findById($id, $this->policy->tenantId());
        if (!$row) {
            throw new SessionNotFoundException("Session $id was not found.");
        }
        $this->policy->assertCanViewSession($row);

        $previous = $this->repo->findLatestCompleted((int)$row['company_id'], $this->policy->tenantId(), $id);

        return $this->readModel->build($row, $previous, $this->repo);
    }
}
