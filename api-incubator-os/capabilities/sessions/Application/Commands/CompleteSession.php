<?php
declare(strict_types=1);

/**
 * Complete a Session: IN_PROGRESS -> COMPLETED, storing the closing summary.
 *
 * Once COMPLETED the Session is frozen: agenda, notes, decisions, links,
 * participants, attendance and preparation fields become read-only.
 */
final class CompleteSession
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
        private TransactionManager $tx,
    ) {}

    public function execute(int $id, ?string $closingSummary, ?int $expectedVersion = null): CommandResult
    {
        $existing = $this->repo->findById($id, $this->policy->tenantId());
        if (!$existing) {
            throw new SessionNotFoundException("Session $id was not found.");
        }
        $this->policy->assertCanModifySession($existing);

        SessionStateMachine::assertTransition((string)$existing['status'], SessionStatus::COMPLETED);

        if ($closingSummary !== null && mb_strlen($closingSummary) > SessionValidator::MAX_TEXT) {
            throw new SessionValidationException(json_encode([
                'closingSummary' => 'The closing summary is too long.',
            ]) ?: 'The closing summary is too long.');
        }

        $version = $expectedVersion ?? (int)$existing['version'];

        return $this->tx->execute(function () use ($id, $existing, $version, $closingSummary) {
            $affected = $this->repo->markCompleted(
                $id,
                $this->policy->tenantId(),
                $version,
                $this->policy->actorId(),
                $closingSummary
            );
            if ($affected === 0) {
                throw new SessionConflictException('This Session was changed by someone else. Reload and try again.');
            }
            $this->repo->logActivity(
                $id,
                (int)$existing['company_id'],
                $this->policy->actorId(),
                $this->policy->actorName(),
                'completed',
                'Session completed'
            );
            $row = $this->repo->findById($id, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Session completed',
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
