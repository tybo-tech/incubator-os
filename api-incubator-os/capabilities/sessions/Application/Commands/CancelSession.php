<?php
declare(strict_types=1);

/**
 * Cancel a Session (reason required) and CANCEL ITS LINKED CALENDAR EVENT.
 *
 * Both writes happen in one transaction: if the calendar update fails the
 * cancellation rolls back, so the Session and its event never disagree about
 * whether the meeting is happening.
 *
 * PROJECTION HOOK: the Google cancel is invoked AFTER that transaction commits,
 * so a remote failure can never roll back the atomic local cancellation. The hook
 * is best-effort and never throws.
 *
 * The cancellation REASON is internal and is never sent to the projection.
 */
final class CancelSession
{
    public function __construct(
        private SessionRepository $repo,
        private SessionAccessPolicy $policy,
        private SessionCalendarGateway $calendar,
        private TransactionManager $tx,
        private ?GoogleEventSyncHook $projectionHook = null,
    ) {}

    public function execute(int $id, string $reason, ?int $expectedVersion = null): CommandResult
    {
        $existing = $this->repo->findById($id, $this->policy->tenantId());
        if (!$existing) {
            throw new SessionNotFoundException("Session $id was not found.");
        }
        $this->policy->assertCanModifySession($existing);

        SessionStateMachine::assertTransition((string)$existing['status'], SessionStatus::CANCELLED);
        SessionStateMachine::assertCancellationReason($reason);

        $version = $expectedVersion ?? (int)$existing['version'];

        $committedEvent = null;
        $result = $this->tx->execute(function () use ($id, $existing, $version, $reason, &$committedEvent) {
            $tenantId = $this->policy->tenantId();

            $affected = $this->repo->markCancelled($id, $tenantId, $version, $this->policy->actorId(), trim($reason));
            if ($affected === 0) {
                throw new SessionConflictException('This Session was changed by someone else. Reload and try again.');
            }

            // Cancel the linked calendar event (no-op when there is none).
            if ($existing['calendar_event_id'] !== null) {
                $committedEvent = $this->calendar->cancelLinkedEvent((int)$existing['calendar_event_id'], $tenantId, $this->policy->actorId());
            }

            $this->repo->logActivity(
                $id,
                (int)$existing['company_id'],
                $this->policy->actorId(),
                $this->policy->actorName(),
                'cancelled',
                'Session cancelled',
                ['reason' => trim($reason)]
            );

            $row = $this->repo->findById($id, $tenantId);
            return new CommandResult(
                success: true,
                message: 'Session cancelled',
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

        // AFTER commit: best-effort projection cancel with NO reason content.
        $this->notifyProjection($committedEvent);

        return $result;
    }

    /**
     * Best-effort, post-commit projection cancel. Never throws; the reason text is
     * deliberately not passed on.
     *
     * @param array<string,mixed>|null $eventRow
     */
    private function notifyProjection(?array $eventRow): void
    {
        if ($this->projectionHook === null || $eventRow === null) {
            return;
        }
        try {
            $this->projectionHook->onEventCancelled($eventRow);
        } catch (Throwable) {
            // A projection failure never fails the local cancellation.
        }
    }
}
