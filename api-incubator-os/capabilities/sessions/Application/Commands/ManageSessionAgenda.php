<?php
declare(strict_types=1);

/**
 * Agenda item lifecycle: add | update | reorder | delete.
 *
 * Frozen Sessions reject every action; the check is made once here rather than in
 * each branch.
 */
final class ManageSessionAgenda
{
    public function __construct(
        private SessionRepository $repo,
        private SessionValidator $validator,
        private SessionAccessPolicy $policy,
        private TransactionManager $tx,
    ) {}

    /**
     * @param array<string,mixed> $payload
     * @throws SessionNotFoundException|SessionForbiddenException|SessionValidationException|SessionStateException|SessionConflictException
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
                case 'add':
                    $this->validator->validateAgendaItem($payload);
                    $this->repo->addAgendaItem($sessionId, [
                        'topic' => trim((string)$payload['topic']),
                        'description' => $this->nullable($payload['description'] ?? null),
                        'status' => (string)($payload['status'] ?? AgendaItemStatus::PENDING),
                        'presenterUserId' => $this->intOrNull($payload['presenterUserId'] ?? null),
                        'presenterLabel' => $this->nullable($payload['presenterLabel'] ?? null),
                        'created_by' => $this->policy->actorId(),
                    ]);
                    $this->log($sessionId, $companyId, 'agenda.added', 'Agenda item added');
                    break;

                case 'update':
                    $item = $this->requireItem($sessionId, $payload);
                    $this->validator->validateAgendaItem($payload);
                    $this->repo->updateAgendaItem((int)$item['id'], $sessionId, [
                        'topic' => trim((string)$payload['topic']),
                        'description' => $this->nullable($payload['description'] ?? null),
                        'status' => (string)($payload['status'] ?? $item['status']),
                        'presenterUserId' => $this->intOrNull($payload['presenterUserId'] ?? null),
                        'presenterLabel' => $this->nullable($payload['presenterLabel'] ?? null),
                    ]);
                    $this->log($sessionId, $companyId, 'agenda.updated', 'Agenda item updated');
                    break;

                case 'reorder':
                    $ids = $payload['orderedIds'] ?? ($payload['ids'] ?? []);
                    if (!is_array($ids) || !$ids) {
                        throw new SessionValidationException(json_encode([
                            'orderedIds' => 'An ordered list of agenda item ids is required.',
                        ]) ?: 'An ordered list of agenda item ids is required.');
                    }
                    $this->repo->reorderAgenda($sessionId, $ids);
                    $this->log($sessionId, $companyId, 'agenda.reordered', 'Agenda reordered');
                    break;

                case 'delete':
                    $item = $this->requireItem($sessionId, $payload);
                    $this->repo->removeAgendaItem((int)$item['id'], $sessionId);
                    $this->log($sessionId, $companyId, 'agenda.deleted', 'Agenda item removed');
                    break;

                default:
                    throw new SessionValidationException('Unknown agenda action: ' . $action);
            }

            $row = $this->repo->findById($sessionId, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Agenda updated',
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
    private function requireItem(int $sessionId, array $payload): array
    {
        $id = (int)($payload['id'] ?? 0);
        if ($id <= 0) {
            throw new SessionValidationException(json_encode(['id' => 'An agenda item id is required.']) ?: 'An agenda item id is required.');
        }
        $item = $this->repo->findAgendaItem($id, $sessionId);
        if (!$item) {
            throw new SessionNotFoundException("Agenda item $id was not found on this Session.");
        }
        return $item;
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

    private function intOrNull(mixed $v): ?int
    {
        if ($v === null || $v === '') return null;
        return (int)$v;
    }
}
