<?php
declare(strict_types=1);

/**
 * Participant + attendance lifecycle: add | update | remove | attendance.
 *
 * An internal participant must reference a real user in the Session's company; an
 * external attendee is a name/email snapshot and needs no Incubator OS account.
 */
final class ManageSessionParticipants
{
    public function __construct(
        private SessionRepository $repo,
        private SessionValidator $validator,
        private SessionAccessPolicy $policy,
        private TransactionManager $tx,
    ) {}

    /**
     * @param array<string,mixed> $payload
     */
    public function execute(int $sessionId, string $action, array $payload): CommandResult
    {
        $session = $this->repo->findById($sessionId, $this->policy->tenantId());
        if (!$session) {
            throw new SessionNotFoundException("Session $sessionId was not found.");
        }
        $this->policy->assertCanModifySession($session);
        SessionStateMachine::assertMutable((string)$session['status']);

        return $this->tx->execute(function () use ($sessionId, $session, $action, $payload) {
            $companyId = (int)$session['company_id'];

            // `attendance` is a focused action: update only the attendance state.
            if ($action === 'attendance') {
                $participant = $this->requireParticipant($sessionId, $payload);
                $attendance = (string)($payload['attendance'] ?? AttendanceState::INVITED);
                if (!AttendanceState::isValid($attendance)) {
                    throw new SessionValidationException(json_encode([
                        'attendance' => 'Unknown attendance state: ' . $attendance,
                    ]) ?: 'Unknown attendance state.');
                }
                $this->repo->updateParticipant((int)$participant['id'], $sessionId, [
                    'participantType' => (string)$participant['participant_type'],
                    'userId' => $participant['user_id'] !== null ? (int)$participant['user_id'] : null,
                    'name' => (string)$participant['name'],
                    'email' => $participant['email'],
                    'role' => $participant['role'],
                    'attendance' => $attendance,
                ]);
                $this->log($sessionId, $companyId, 'attendance.recorded', 'Attendance recorded as ' . $attendance);
            } else {
                switch ($action) {
                    case 'add':
                        $data = $this->normalise($payload);
                        $this->validator->validateParticipant($data);
                        $this->assertInternalUserBelongs($data, $companyId);
                        $this->repo->addParticipant($sessionId, $data + ['created_by' => $this->policy->actorId()]);
                        $this->log($sessionId, $companyId, 'participant.added', 'Participant added');
                        break;

                    case 'update':
                        $participant = $this->requireParticipant($sessionId, $payload);
                        $data = $this->normalise($payload, $participant);
                        $this->validator->validateParticipant($data);
                        $this->assertInternalUserBelongs($data, $companyId);
                        $this->repo->updateParticipant((int)$participant['id'], $sessionId, $data);
                        $this->log($sessionId, $companyId, 'participant.updated', 'Participant updated');
                        break;

                    case 'remove':
                        $participant = $this->requireParticipant($sessionId, $payload);
                        $this->repo->removeParticipant((int)$participant['id'], $sessionId);
                        $this->log($sessionId, $companyId, 'participant.removed', 'Participant removed');
                        break;

                    default:
                        throw new SessionValidationException('Unknown participant action: ' . $action);
                }
            }

            $row = $this->repo->findById($sessionId, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Participants updated',
                data: SessionMapper::toResponse(
                    $row ?? [],
                    $row ? SessionRepository::eventFromRow($row) : null,
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

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed>|null $fallback
     * @return array<string,mixed>
     */
    private function normalise(array $payload, ?array $fallback = null): array
    {
        $type = (string)($payload['participantType'] ?? $fallback['participant_type'] ?? ParticipantType::EXTERNAL);
        $userId = $payload['userId'] ?? ($fallback['user_id'] ?? null);

        return [
            'participantType' => $type,
            'userId' => $userId !== null && $userId !== '' ? (int)$userId : null,
            'name' => trim((string)($payload['name'] ?? $fallback['name'] ?? '')),
            'email' => $this->nullable($payload['email'] ?? ($fallback['email'] ?? null)),
            'role' => $this->nullable($payload['role'] ?? ($fallback['role'] ?? null)),
            'attendance' => (string)($payload['attendance'] ?? $fallback['attendance'] ?? AttendanceState::INVITED),
        ];
    }

    /**
     * An internal participant must be a user in the Session's company (admins are
     * tenant-wide, so any existing user is acceptable for them; company users can
     * only add their own company's users).
     *
     * @param array<string,mixed> $data
     */
    private function assertInternalUserBelongs(array $data, int $companyId): void
    {
        if ($data['participantType'] !== ParticipantType::INTERNAL || $data['userId'] === null) {
            return;
        }
        $stmt = $this->repo->userCompanyLookup((int)$data['userId']);
        if ($stmt === null) {
            throw new SessionNotFoundException('Participant user was not found.');
        }
        if ($stmt !== $companyId && !$this->policy->isAdmin()) {
            throw new SessionForbiddenException('That user does not belong to this company.');
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function requireParticipant(int $sessionId, array $payload): array
    {
        $id = (int)($payload['id'] ?? 0);
        if ($id <= 0) {
            throw new SessionValidationException(json_encode(['id' => 'A participant id is required.']) ?: 'A participant id is required.');
        }
        $participant = $this->repo->findParticipant($id, $sessionId);
        if (!$participant) {
            throw new SessionNotFoundException("Participant $id was not found on this Session.");
        }
        return $participant;
    }

    private function log(int $sessionId, int $companyId, string $action, string $detail): void
    {
        $this->repo->logActivity($sessionId, $companyId, $this->policy->actorId(), $this->policy->actorName(), $action, $detail);
    }

    private function nullable(mixed $v): ?string
    {
        if ($v === null) return null;
        $t = trim((string)$v);
        return $t === '' ? null : $t;
    }
}
