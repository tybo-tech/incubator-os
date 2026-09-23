<?php
declare(strict_types=1);

/**
 * Start a Session: PREPARING -> IN_PROGRESS. Enforced by the state machine.
 */
final class StartSession
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
        private TransactionManager $tx,
    ) {}

    public function execute(int $id, ?int $expectedVersion = null): CommandResult
    {
        $existing = $this->repo->findById($id, $this->policy->tenantId());
        if (!$existing) {
            throw new SessionNotFoundException("Session $id was not found.");
        }
        $this->policy->assertCanModifySession($existing);

        SessionStateMachine::assertTransition((string)$existing['status'], SessionStatus::IN_PROGRESS);

        $version = $expectedVersion ?? (int)$existing['version'];

        return $this->tx->execute(function () use ($id, $existing, $version) {
            $affected = $this->repo->markStarted($id, $this->policy->tenantId(), $version, $this->policy->actorId());
            if ($affected === 0) {
                throw new SessionConflictException('This Session was changed by someone else. Reload and try again.');
            }
            $this->repo->logActivity(
                $id,
                (int)$existing['company_id'],
                $this->policy->actorId(),
                $this->policy->actorName(),
                'started',
                'Session started'
            );
            $row = $this->repo->findById($id, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Session started',
                data: SessionMapper::toResponse(
                    $row ?? [],
                    $row ? SessionRepository::eventFromRow($row) : null,
                    $this->repo->participants($id),
                    $this->repo->agenda($id),
                    $this->repo->notes($id, $this->policy->canViewIncubatorNotes()),
                    $this->repo->decisions($id),
                    $this->repo->links($id),
                    $this->repo->activity($id),
                ),
            );
        });
    }
}
