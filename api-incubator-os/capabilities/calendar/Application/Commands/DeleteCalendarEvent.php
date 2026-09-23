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
 */
final class DeleteCalendarEvent
{
    public function __construct(
        private CalendarEventRepository $repo,
        private CalendarAccessPolicy $policy,
        private TransactionManager $tx,
        private ?CalendarSessionGuard $sessionGuard = null,
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

        return $this->tx->execute(function () use ($id, $version) {
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
    }
}
