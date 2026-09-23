<?php
declare(strict_types=1);

/**
 * Note lifecycle: add | update | delete.
 *
 * VISIBILITY RULES (the reason this command needs the policy):
 *   - `incubator` notes may only be authored/edited by administrative roles.
 *   - A company user may only edit a shared note they authored.
 *   - A company user can never see or mutate an incubator-only note.
 */
final class ManageSessionNotes
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
                case 'add':
                    $this->validator->validateNote($payload);
                    $visibility = (string)($payload['visibility'] ?? SessionNoteVisibility::SHARED);
                    if ($visibility === SessionNoteVisibility::INCUBATOR) {
                        $this->policy->assertCanWriteIncubatorNote();
                    }
                    $this->repo->addNote($sessionId, [
                        'visibility' => $visibility,
                        'content' => trim((string)$payload['content']),
                        'author_user_id' => $this->policy->actorId(),
                        'author_label' => $this->policy->actorName(),
                    ]);
                    $this->log($sessionId, $companyId, 'note.added', $visibility === SessionNoteVisibility::INCUBATOR ? 'Incubator note added' : 'Shared note added');
                    break;

                case 'update':
                    $note = $this->requireNote($sessionId, $payload);
                    $this->policy->assertCanEditNote($note);
                    $this->validator->validateNote($payload);
                    $visibility = (string)($payload['visibility'] ?? $note['visibility']);
                    // A non-admin may never promote a note to incubator-only.
                    if ($visibility === SessionNoteVisibility::INCUBATOR) {
                        $this->policy->assertCanWriteIncubatorNote();
                    }
                    $expected = (int)($payload['version'] ?? $note['version']);
                    $affected = $this->repo->updateNote((int)$note['id'], $sessionId, $expected, [
                        'content' => trim((string)$payload['content']),
                        'visibility' => $visibility,
                    ]);
                    if ($affected === 0) {
                        throw new SessionConflictException('This note was changed by someone else. Reload and try again.');
                    }
                    $this->log($sessionId, $companyId, 'note.updated', 'Note updated');
                    break;

                case 'delete':
                    $note = $this->requireNote($sessionId, $payload);
                    $this->policy->assertCanEditNote($note);
                    $this->repo->removeNote((int)$note['id'], $sessionId);
                    $this->log($sessionId, $companyId, 'note.deleted', 'Note removed');
                    break;

                default:
                    throw new SessionValidationException('Unknown note action: ' . $action);
            }

            $row = $this->repo->findById($sessionId, $this->policy->tenantId());
            return new CommandResult(
                success: true,
                message: 'Notes updated',
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
    private function requireNote(int $sessionId, array $payload): array
    {
        $id = (int)($payload['id'] ?? 0);
        if ($id <= 0) {
            throw new SessionValidationException(json_encode(['id' => 'A note id is required.']) ?: 'A note id is required.');
        }
        $note = $this->repo->findNote($id, $sessionId);
        if (!$note) {
            throw new SessionNotFoundException("Note $id was not found on this Session.");
        }
        // A company user must not be able to act on an incubator note at all.
        if ((string)$note['visibility'] === SessionNoteVisibility::INCUBATOR) {
            $this->policy->assertCanViewIncubatorNotes();
        }
        return $note;
    }

    private function log(int $sessionId, int $companyId, string $action, string $detail): void
    {
        $this->repo->logActivity($sessionId, $companyId, $this->policy->actorId(), $this->policy->actorName(), $action, $detail);
    }
}
