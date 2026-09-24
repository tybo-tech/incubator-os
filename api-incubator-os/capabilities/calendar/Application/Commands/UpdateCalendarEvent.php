<?php
declare(strict_types=1);

/**
 * Update a calendar event.
 *
 * Authorization is repeated: the persisted event's company is the authority.
 * Optimistic concurrency: when `expectedVersion` is supplied and no longer
 * matches, the write is rejected (CalendarConflictException -> 409).
 *
 * PROJECTION HOOK: when a `GoogleEventSyncHook` is injected, it is invoked AFTER
 * the local transaction commits. A projection failure must never roll back the
 * authoritative local change, so the hook is best-effort and is never allowed to
 * surface an exception to the caller.
 */
final class UpdateCalendarEvent
{
    public function __construct(
        private CalendarEventRepository $repo,
        private CalendarEventWriter $writer,
        private CalendarValidator $validator,
        private CalendarAccessPolicy $policy,
        private TransactionManager $tx,
        private ?GoogleEventSyncHook $projectionHook = null,
    ) {}

    public function execute(int $id, CalendarEventRequest $input): CommandResult
    {
        $this->validator->validate($input);

        $existing = $this->repo->findById($id, $this->policy->tenantId());
        if (!$existing) {
            throw new CalendarNotFoundException("Calendar event $id was not found.");
        }
        // Must be allowed to touch the event as it currently stands...
        $this->policy->assertCanModifyEvent($existing);
        // ...and to move it to whatever company is requested.
        if ($input->companyId === null) {
            $this->policy->assertCanAuthorSystemWide();
        } else {
            $this->policy->assertCanAccessCompany($input->companyId);
        }

        $links = $this->writer->validateLinks($input);

        $expectedVersion = $input->expectedVersion ?? (int)$existing['version'];

        $result = $this->tx->execute(function () use ($id, $input, $links, $expectedVersion) {
            // `created_by`/`client_token` are ignored by the repository's update().
            $row = $this->writer->toRow($input, $this->policy->tenantId(), $this->policy->actorId());

            $affected = $this->repo->update($id, $this->policy->tenantId(), $expectedVersion, $row);
            if ($affected === 0) {
                throw new CalendarConflictException(
                    'This event was changed by someone else. Reload it and try again.'
                );
            }

            $this->repo->replaceLinks($id, $links, $this->policy->actorId());

            $updated = $this->repo->findById($id, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Calendar event updated',
                data: CalendarEventMapper::toResponse($updated ?? [], $this->repo->linksForEvent($id)),
            );
        });

        // AFTER commit: best-effort projection.
        $this->notifyProjection($id);

        return $result;
    }

    /** Best-effort, post-commit projection notification (never throws). */
    private function notifyProjection(int $id): void
    {
        if ($this->projectionHook === null) {
            return;
        }
        try {
            $row = $this->repo->findById($id, $this->policy->tenantId());
            if ($row === null) {
                return;
            }
            if ((string)($row['status'] ?? '') === CalendarStatus::CANCELLED) {
                $this->projectionHook->onEventCancelled($row);
            } else {
                $this->projectionHook->onEventChanged($row);
            }
        } catch (Throwable) {
            // A projection failure never fails the local update.
        }
    }
}
