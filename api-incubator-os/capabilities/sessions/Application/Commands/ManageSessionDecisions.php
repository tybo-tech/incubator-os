<?php
declare(strict_types=1);

/**
 * Decision lifecycle: record | update | delete.
 *
 * A decision is an EVENT, not an Achievement: it is stored here and never counted
 * as or converted into an achievement.
 */
final class ManageSessionDecisions
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
            switch ($action) {
                case 'record':
                    $this->validator->validateDecision($payload);
                    $this->repo->addDecision($sessionId, [
                        'decisionText' => trim((string)$payload['decisionText']),
                        'decisionDate' => (string)$payload['decisionDate'],
                        'rationale' => $this->nullable($payload['rationale'] ?? null),
                        'recorded_by' => $this->policy->actorId(),
                        'recorded_by_label' => $this->policy->actorName(),
                    ]);
                    $this->log($sessionId, $companyId, 'decision.recorded', 'Decision recorded');
                    break;

                case 'update':
                    $decision = $this->requireDecision($sessionId, $payload);
                    $this->validator->validateDecision($payload);
                    $expected = (int)($payload['version'] ?? $decision['version']);
                    $affected = $this->repo->updateDecision((int)$decision['id'], $sessionId, $expected, [
                        'decisionText' => trim((string)$payload['decisionText']),
                        'decisionDate' => (string)$payload['decisionDate'],
                        'rationale' => $this->nullable($payload['rationale'] ?? null),
                    ]);
                    if ($affected === 0) {
                        throw new SessionConflictException('This decision was changed by someone else. Reload and try again.');
                    }
                    $this->log($sessionId, $companyId, 'decision.updated', 'Decision updated');
                    break;

                case 'delete':
                    $decision = $this->requireDecision($sessionId, $payload);
                    $this->repo->removeDecision((int)$decision['id'], $sessionId);
                    $this->log($sessionId, $companyId, 'decision.deleted', 'Decision removed');
                    break;

                default:
                    throw new SessionValidationException('Unknown decision action: ' . $action);
            }

            $row = $this->repo->findById($sessionId, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Decisions updated',
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
     * @return array<string,mixed>
     */
    private function requireDecision(int $sessionId, array $payload): array
    {
        $id = (int)($payload['id'] ?? 0);
        if ($id <= 0) {
            throw new SessionValidationException(json_encode(['id' => 'A decision id is required.']) ?: 'A decision id is required.');
        }
        $decision = $this->repo->findDecision($id, $sessionId);
        if (!$decision) {
            throw new SessionNotFoundException("Decision $id was not found on this Session.");
        }
        return $decision;
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
