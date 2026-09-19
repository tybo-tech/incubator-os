<?php
declare(strict_types=1);

/**
 * Create a calendar event.
 *
 * - Tenant, creator and accessible-company scope are server-derived.
 * - A system-wide event (companyId = NULL) requires an administrative role.
 * - `clientToken` makes a retried create idempotent: the existing event is
 *   returned instead of creating a duplicate.
 */
final class CreateCalendarEvent
{
    public function __construct(
        private CalendarEventRepository $repo,
        private CalendarEventWriter $writer,
        private CalendarValidator $validator,
        private CalendarAccessPolicy $policy,
        private TransactionManager $tx,
    ) {}

    public function execute(CalendarEventRequest $input): CommandResult
    {
        $this->validator->validate($input);

        // System-wide authorship is admin-only; company events need company access.
        if ($input->companyId === null) {
            $this->policy->assertCanAuthorSystemWide();
        } else {
            $this->policy->assertCanAccessCompany($input->companyId);
        }

        // Idempotent retry: return the event created for this token, if any.
        if ($input->clientToken !== null) {
            $existing = $this->repo->findByClientToken(
                $this->policy->actorId(),
                $input->clientToken,
                $this->policy->tenantId()
            );
            if ($existing) {
                return new CommandResult(
                    success: true,
                    message: 'Calendar event already created',
                    data: CalendarEventMapper::toResponse(
                        $existing,
                        $this->repo->linksForEvent((int)$existing['id'])
                    ),
                );
            }
        }

        $links = $this->writer->validateLinks($input);

        return $this->tx->execute(function () use ($input, $links) {
            $row = $this->writer->toRow($input, $this->policy->tenantId(), $this->policy->actorId());
            $id = $this->repo->create($row);

            if ($links) {
                $this->repo->replaceLinks($id, $links, $this->policy->actorId());
            }

            $created = $this->repo->findById($id, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Calendar event created',
                data: CalendarEventMapper::toResponse($created ?? [], $this->repo->linksForEvent($id)),
            );
        });
    }
}
