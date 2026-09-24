<?php
declare(strict_types=1);

/**
 * Soft-delete a calendar event.
 *
 * Distinct from cancellation: cancel keeps the event visible with
 * `status = 'cancelled'`, whereas delete sets `deleted_at` and removes it from
 * every listing. Authorization and optimistic concurrency are enforced the same
 * way as update.
 *
 * SESSION_LINKED: when the event is linked to a Session, deletion is refused with
 * `409 SESSION_LINKED` (the caller should cancel the Session instead). The guard
 * is optional so a calendar-only deployment is unaffected.
 *
 * PROJECTION HOOK: a soft-deleted event that had been published to a projection
 * (Google) is best-effort removed AFTER commit. A projection failure never fails
 * the local delete.
 */
final class DeleteCalendarEvent
{
    public function __construct(
        private CalendarEventRepository $repo,
        private CalendarAccessPolicy $policy,
        private TransactionManager $tx,
        private ?CalendarSessionGuard $sessionGuard = null,
        private ?GoogleEventSyncHook $projectionHook = null,
    ) {}

    public function execute(int $id, ?int $expectedVersion = null): CommandResult
    {
        $existing = $this->repo->findById($id, $this->policy->tenantId());
        if (!$existing) {
            throw new CalendarNotFoundException("Calendar event $id was not found.");
        }
        $this->policy->assertCanModifyEvent($existing);

        // A linked Session owns the event: refuse deletion rather than orphaning it.
        $this->sessionGuard?->assertEventNotLinked($id);

        $version = $expectedVersion ?? (int)$existing['version'];

        $result = $this->tx->execute(function () use ($id, $version) {
            $affected = $this->repo->softDelete($id, $this->policy->tenantId(), $this->policy->actorId(), $version);
            if ($affected === 0) {
                throw new CalendarConflictException(
                    'This event was changed by someone else. Reload it and try again.'
                );
            }
            return new CommandResult(
                success: true,
                message: 'Calendar event deleted',
                data: ['id' => $id],
            );
        });

        // AFTER commit: best-effort projection removal. The row is soft-deleted, so
        // pass the pre-delete row (a cancelled projection treats this as removal).
        $this->notifyProjection($existing);

        return $result;
    }

    /**
     * @param array<string,mixed> $eventRow
     */
    private function notifyProjection(array $eventRow): void
    {
        if ($this->projectionHook === null) {
            return;
        }
        try {
            $this->projectionHook->onEventCancelled($eventRow);
        } catch (Throwable) {
            // A projection failure never fails the local delete.
        }
    }
}
