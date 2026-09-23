<?php
declare(strict_types=1);

/**
 * Full Session detail.
 *
 * VISIBILITY: incubator-only notes are stripped for a company user — the filter is
 * applied in the repository query, so an internal note can never reach a company
 * user through this endpoint.
 */
final class GetSession
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
    ) {}

    /**
     * @return SessionResponse
     * @throws SessionNotFoundException|SessionForbiddenException
     */
    public function execute(int $id): SessionResponse
    {
        $row = $this->repo->findById($id, $this->policy->tenantId());
        if (!$row) {
            throw new SessionNotFoundException("Session $id was not found.");
        }
        $this->policy->assertCanViewSession($row);

        $event = SessionRepository::eventFromRow($row);

        return SessionMapper::toResponse(
            $row,
            $event,
            $this->repo->participants($id),
            $this->repo->agenda($id),
            $this->repo->notes($id, $this->policy->canViewIncubatorNotes()),
            $this->repo->decisions($id),
            $this->repo->links($id),
            $this->repo->activity($id),
        );
    }
}
