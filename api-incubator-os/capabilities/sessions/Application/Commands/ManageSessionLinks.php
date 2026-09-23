<?php
declare(strict_types=1);

/**
 * Business-entity link lifecycle: add | remove.
 *
 * Every link is verified through the SAME resolver the Calendar capability uses:
 * the record must exist, belong to the Session's company, belong to the tenant,
 * and be reachable by the actor. A cross-company link is rejected and nothing is
 * written.
 *
 * This does NOT create or mutate the linked record — it only references it.
 */
final class ManageSessionLinks
{
    public function __construct(
        private SessionRepository $repo,
        private SessionValidator $validator,
        private SessionAccessPolicy $policy,
        private CalendarLinkResolver $resolver,
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
                case 'add':
                    $this->validator->validateLink($payload);
                    $type = (string)$payload['entityType'];
                    $entityId = (int)$payload['entityId'];
                    $relationship = (string)($payload['relationship'] ?? SessionRelationship::DISCUSSED);

                    // Resolves existence + owning company in one canonical place.
                    $owner = $this->resolver->resolveCompanyId($type, $entityId);
                    if ($owner !== $companyId) {
                        throw new SessionForbiddenException("Linked $type $entityId belongs to a different company.");
                    }

                    if ($this->repo->hasLink($sessionId, $type, $entityId, $relationship)) {
                        throw new SessionConflictException('That record is already linked with this relationship.');
                    }

                    $label = $this->nullable($payload['label'] ?? null) ?? $this->resolver->resolveLabel($type, $entityId);
                    $this->repo->addLink($sessionId, [
                        'entityType' => $type,
                        'entityId' => $entityId,
                        'relationship' => $relationship,
                        'label' => $label,
                        'created_by' => $this->policy->actorId(),
                    ]);
                    $this->log($sessionId, $companyId, 'link.added', "Linked $type #$entityId");
                    break;

                case 'remove':
                    $id = (int)($payload['id'] ?? 0);
                    if ($id <= 0) {
                        throw new SessionValidationException(json_encode(['id' => 'A link id is required.']) ?: 'A link id is required.');
                    }
                    $link = $this->repo->findLink($id, $sessionId);
                    if (!$link) {
                        throw new SessionNotFoundException("Link $id was not found on this Session.");
                    }
                    $this->repo->removeLink($id, $sessionId);
                    $this->log($sessionId, $companyId, 'link.removed', 'Link removed');
                    break;

                default:
                    throw new SessionValidationException('Unknown link action: ' . $action);
            }

            $row = $this->repo->findById($sessionId, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Links updated',
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
