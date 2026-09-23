<?php
declare(strict_types=1);

/**
 * Convert an existing eligible calendar meeting event into a Session workspace.
 *
 * Idempotent: if the event already has a Session, the existing Session is
 * returned with a "already converted" message rather than creating a duplicate
 * or failing (a retry after a network blip must be safe).
 */
final class ConvertCalendarEventToSession
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

        if ($input->calendarEventId === null) {
            throw new SessionValidationException(json_encode([
                'calendarEventId' => 'Choose a calendar event to convert.',
            ]) ?: 'Choose a calendar event to convert.');
        }

        // Idempotent retry: return the Session already created for this event.
        // A Session in a DIFFERENT company is a cross-company mismatch, not a
        // retry — it must be rejected rather than silently returned.
        $existing = $this->repo->findByCalendarEvent($input->calendarEventId, $this->policy->tenantId());
        if ($existing) {
            if ((int)$existing['company_id'] !== $companyId) {
                throw new SessionForbiddenException('That event belongs to a different company.');
            }
            return new CommandResult(
                success: true,
                message: 'This event already has a Session',
                data: SessionMapper::toResponse(
                    $existing,
                    SessionRepository::eventFromRow($existing),
                    $this->repo->participants((int)$existing['id']),
                    $this->repo->agenda((int)$existing['id']),
                    $this->repo->notes((int)$existing['id'], $this->policy->canViewIncubatorNotes()),
                    $this->repo->decisions((int)$existing['id']),
                    $this->repo->links((int)$existing['id']),
                    $this->repo->activity((int)$existing['id']),
                ),
            );
        }

        $this->calendar->assertEligibleForSession(
            $input->calendarEventId,
            $this->policy->tenantId(),
            $companyId,
            $this->policy->actorId()
        );

        return $this->tx->execute(function () use ($input, $companyId) {
            $tenantId = $this->policy->tenantId();
            $actorId = $this->policy->actorId();

            $sessionId = $this->repo->create([
                'tenant_id' => $tenantId,
                'company_id' => $companyId,
                'calendar_event_id' => $input->calendarEventId,
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
                'converted',
                'Session workspace created from calendar event',
                ['calendarEventId' => $input->calendarEventId]
            );

            $row = $this->repo->findById($sessionId, $tenantId);
            if (!$row) {
                throw new SessionNotFoundException("Session $sessionId was not found.");
            }
            return new CommandResult(
                success: true,
                message: 'Session created from calendar event',
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
        });
    }
}
