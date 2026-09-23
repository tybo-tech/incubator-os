<?php
declare(strict_types=1);

/**
 * Update a Session's preparation fields (subject, purpose, type, facilitator,
 * preparation/closing summary) with optimistic concurrency.
 *
 * Frozen (COMPLETED / CANCELLED) Sessions cannot be edited.
 */
final class UpdateSession
{
    public function __construct(
        private SessionRepository $repo,
        private SessionValidator $validator,
        private SessionAccessPolicy $policy,
        private TransactionManager $tx,
    ) {}

    public function execute(int $id, SessionRequest $input): CommandResult
    {
        $this->validator->validateSession($input, creating: false);

        $existing = $this->repo->findById($id, $this->policy->tenantId());
        if (!$existing) {
            throw new SessionNotFoundException("Session $id was not found.");
        }
        $this->policy->assertCanModifySession($existing);
        SessionStateMachine::assertMutable((string)$existing['status']);

        $expectedVersion = $input->expectedVersion ?? (int)$existing['version'];

        return $this->tx->execute(function () use ($id, $input, $existing, $expectedVersion) {
            $subject = $input->subject !== '' ? $input->subject : (string)$existing['subject'];
            $affected = $this->repo->updatePreparation($id, $this->policy->tenantId(), $expectedVersion, [
                'session_type' => $input->sessionType,
                'subject' => $subject,
                'purpose' => $input->purpose,
                'preparation_summary' => $input->preparationSummary,
                'closing_summary' => $input->closingSummary,
                'facilitator_user_id' => $input->facilitatorUserId,
                'facilitator_label' => $input->facilitatorLabel,
                'updated_by' => $this->policy->actorId(),
            ]);
            if ($affected === 0) {
                throw new SessionConflictException('This Session was changed by someone else. Reload and try again.');
            }

            $this->repo->logActivity(
                $id,
                (int)$existing['company_id'],
                $this->policy->actorId(),
                $this->policy->actorName(),
                'updated',
                'Preparation details updated'
            );

            $row = $this->repo->findById($id, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Session updated',
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
