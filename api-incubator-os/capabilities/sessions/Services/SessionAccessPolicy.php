<?php
declare(strict_types=1);

/**
 * Session authorization policy.
 *
 * Wraps the repository's real auth helpers (helpers/AuthGuard.php) so the rules
 * live in one place. Roles are Director / System Administrator / Coordinator /
 * Judge — there is NO "Coach" role, so none is invented. "Authorized coach"
 * therefore maps to the administrative roles, which are tenant-wide; a Director
 * may manage Sessions for their own company only.
 *
 * Server-derived values (never accepted from the browser):
 *  - `actorId`  — the authenticated user id.
 *  - `tenantId` — the platform tenant. Single-tenant in practice; this is the one
 *                 place that decides, so a future multi-tenant map changes here.
 *
 * Visibility:
 *  - `incubator` notes are visible ONLY to administrative roles. A company user
 *    (Director / Judge) must never receive them on any endpoint.
 *  - Session access never grants access to a linked entity: the existing domain
 *    permissions still govern those records.
 */
final class SessionAccessPolicy
{
    public const DEFAULT_TENANT = 1;

    /**
     * @param array<string,mixed> $actor Authenticated user row (from the session).
     */
    public function __construct(private array $actor) {}

    public function actorId(): int
    {
        return (int)($this->actor['id'] ?? 0);
    }

    public function actorName(): ?string
    {
        $name = trim((string)($this->actor['full_name'] ?? ''));
        return $name !== '' ? $name : null;
    }

    public function tenantId(): int
    {
        return self::DEFAULT_TENANT;
    }

    public function isAdmin(): bool
    {
        return auth_is_admin($this->actor);
    }

    public function isSystemAdministrator(): bool
    {
        return auth_is_system_administrator($this->actor);
    }

    /** The actor's own company, or 0 when unassigned. */
    public function homeCompanyId(): int
    {
        return (int)($this->actor['company_id'] ?? 0);
    }

    /**
     * Company ids the actor may filter a listing by.
     * `null` = no restriction (tenant-wide administrator).
     *
     * @return int[]|null
     */
    public function accessibleCompanyIds(): ?array
    {
        if ($this->isAdmin()) {
            return null;
        }
        $home = $this->homeCompanyId();
        return $home > 0 ? [$home] : [];
    }

    /**
     * @throws SessionForbiddenException
     */
    public function assertCanAccessCompany(int $companyId): void
    {
        if ($companyId <= 0) {
            throw new SessionValidationException('A company is required.');
        }
        if ($this->isAdmin()) {
            return;
        }
        if ($this->homeCompanyId() !== $companyId) {
            throw new SessionForbiddenException('You do not have access to this company.');
        }
    }

    /**
     * @param array<string,mixed> $sessionRow
     * @throws SessionForbiddenException
     */
    public function assertCanViewSession(array $sessionRow): void
    {
        $this->assertCanAccessCompany((int)$sessionRow['company_id']);
    }

    /**
     * Same authority as viewing: you may only change a Session in a company you
     * can access. (Admins are tenant-wide.)
     *
     * @param array<string,mixed> $sessionRow
     * @throws SessionForbiddenException
     */
    public function assertCanModifySession(array $sessionRow): void
    {
        $this->assertCanAccessCompany((int)$sessionRow['company_id']);
    }

    /**
     * Incubator-only notes are never exposed to a company user.
     */
    public function canViewIncubatorNotes(): bool
    {
        return $this->isAdmin();
    }

    /**
     * @throws SessionForbiddenException
     */
    public function assertCanViewIncubatorNotes(): void
    {
        if (!$this->canViewIncubatorNotes()) {
            throw new SessionForbiddenException('Incubator-only notes are not available to you.');
        }
    }

    /**
     * Only administrative roles may author an incubator-only note.
     *
     * @throws SessionForbiddenException
     */
    public function assertCanWriteIncubatorNote(): void
    {
        if (!$this->canViewIncubatorNotes()) {
            throw new SessionForbiddenException('Only the Incubator team may write incubator-only notes.');
        }
    }

    /**
     * A company user may edit a shared note they authored; an admin may edit any.
     *
     * @param array<string,mixed> $noteRow
     * @throws SessionForbiddenException
     */
    public function assertCanEditNote(array $noteRow): void
    {
        if ($this->isAdmin()) {
            return;
        }
        if ((int)($noteRow['author_user_id'] ?? 0) !== $this->actorId()) {
            throw new SessionForbiddenException('You may only edit notes you authored.');
        }
    }
}
