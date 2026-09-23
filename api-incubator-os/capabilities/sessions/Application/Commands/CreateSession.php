<?php
declare(strict_types=1);

/**
 * Create a Session.
 *
 * ATOMICITY: creating a scheduled Session also creates its company `meeting`
 * calendar event in the SAME transaction. A failure on either side rolls back
 * both records, so a Session never exists without its event and an event created
 * for a Session is never orphaned.
 *
 * Two shapes:
 *  - `calendarEventId` supplied  -> attach an EXISTING eligible event (validated).
 *  - `calendarEventId` omitted   -> build a new company meeting event from the
 *                                    `event*` fields.
 */
final class CreateSession
{
    public function __construct(
        private SessionRepository $repo,
        private SessionValidator $validator,
        private SessionAccessPolicy $policy,
        private SessionCalendarGateway $calendar,
        private TransactionManager $tx,
    ) {}

    public function execute(SessionRequest $input): CommandResult
    {
        $this->validator->validateSession($input, creating: true);

        $companyId = (int)$input->companyId;
        $this->policy->assertCanAccessCompany($companyId);

        // An explicit event id must already be eligible and reachable.
        if ($input->calendarEventId !== null) {
            $existing = $this->repo->findByCalendarEvent($input->calendarEventId, $this->policy->tenantId());
            if ($existing) {
                throw new SessionConflictException('That event already has a Session.');
            }
            $this->calendar->assertEligibleForSession(
                $input->calendarEventId,
                $this->policy->tenantId(),
                $companyId,
                $this->policy->actorId()
            );
        }

        return $this->tx->execute(function () use ($input, $companyId) {
            $tenantId = $this->policy->tenantId();
            $actorId = $this->policy->actorId();

            $eventId = $input->calendarEventId;
            $converted = false;
            if ($eventId === null) {
                $eventId = $this->calendar->createMeetingEvent($input, $tenantId, $actorId, $companyId);
            } else {
                $converted = true;
            }

            $sessionId = $this->repo->create([
                'tenant_id' => $tenantId,
                'company_id' => $companyId,
                'calendar_event_id' => $eventId,
                'session_type' => $input->sessionType,
                'subject' => $input->subject,
                'purpose' => $input->purpose,
                'status' => SessionStatus::PREPARING,
                'preparation_summary' => $input->preparationSummary,
                'closing_summary' => $input->closingSummary,
                'facilitator_user_id' => $input->facilitatorUserId,
                'facilitator_label' => $input->facilitatorLabel,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]);

            $this->repo->logActivity(
                $sessionId,
                $companyId,
                $actorId,
                $this->policy->actorName(),
                $converted ? 'converted' : 'created',
                $converted ? 'Session created from an existing calendar event' : 'Session created',
                ['calendarEventId' => $eventId]
            );

            return $this->render($sessionId);
        });
    }

    private function render(int $sessionId): CommandResult
    {
        $row = $this->repo->findById($sessionId, $this->policy->tenantId());
        if (!$row) {
            throw new SessionNotFoundException("Session $sessionId was not found.");
        }
        return new CommandResult(
            success: true,
            message: 'Session created',
            data: SessionMapper::toResponse(
                $row,
                SessionRepository::eventFromRow($row),
                $this->repo->participants($sessionId),
                $this->repo->agenda($sessionId),
                $this->repo->notes($sessionId, $this->policy->canViewIncubatorNotes()),
                $this->repo->decisions($sessionId),
                $this->repo->links($sessionId),
                $this->repo->activity($sessionId),
            ),
        );
    }
}
