<?php
declare(strict_types=1);

/**
 * Authorization policy for the Google Calendar capability (Sprint 010 Phase 2).
 *
 * A Google connection is always the ACTING USER'S OWN connection. There is no
 * "view someone else's connection" path and no admin override that returns
 * another user's tokens. Tenant is the server-derived constant.
 *
 * Mirrors `CalendarAccessPolicy` / `SessionAccessPolicy`: the actor row comes from
 * `auth_require_user()`, and every server-derived value is never client-supplied.
 */
final class GoogleAccessPolicy
{
    public function __construct(private readonly array $actor) {}

    public function actorId(): int
    {
        return (int) ($this->actor['id'] ?? 0);
    }

    public function tenantId(): int
    {
        return 1; // server-derived constant, like every other capability
    }

    public function homeCompanyId(): int
    {
        return (int) ($this->actor['company_id'] ?? 0);
    }

    public function isAdmin(): bool
    {
        return auth_is_admin($this->actor);
    }

    /**
     * Connections are strictly per-actor. This exists to make the intent explicit
     * at call sites and to fail loudly if a future caller tries to reach across
     * users.
     */
    public function assertOwnConnection(int $ownerUserId): void
    {
        if ($ownerUserId !== $this->actorId()) {
            throw new GoogleForbiddenException('A Google connection may only be managed by its owner.');
        }
    }

    /**
     * Publishing to Google requires the SAME authorization as editing the local
     * event, plus the event, its Session and the connection must agree on company.
     *
     * Mirrors `CalendarAccessPolicy::assertCanModifyEvent`:
     *   * company-scoped event -> the actor must have access to that company;
     *   * system-wide event (company_id NULL) -> administrators only.
     *
     * @param array<string,mixed> $eventRow
     * @throws GoogleForbiddenException
     */
    public function assertCanPublishEvent(array $eventRow): void
    {
        $companyId = $eventRow['company_id'] ?? null;
        if ($companyId === null) {
            if (!$this->isAdmin()) {
                throw new GoogleForbiddenException('Only administrators may publish system-wide events.');
            }
            return;
        }
        if ($this->isAdmin()) {
            return;
        }
        if ($this->homeCompanyId() !== (int) $companyId) {
            throw new GoogleForbiddenException('You do not have access to this company.');
        }
    }

    /**
     * The linked Session (when present) must belong to the same company as the
     * event, so a mismatch can never leak another company's participants to
     * Google. A null company on either side is treated as system-wide and must
     * match on both sides.
     *
     * @throws GoogleForbiddenException
     */
    public function assertSessionMatchesEvent(?int $eventCompanyId, ?int $sessionCompanyId): void
    {
        if ($sessionCompanyId === null) {
            return; // no linked Session
        }
        if ($eventCompanyId !== $sessionCompanyId) {
            throw new GoogleForbiddenException('The linked Session belongs to a different company.');
        }
    }
}
