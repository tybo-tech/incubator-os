<?php
declare(strict_types=1);

/**
 * Calendar authorization policy.
 *
 * Wraps the repository's real auth helpers (helpers/AuthGuard.php) so the rules
 * live in one place. Roles in this system are Director / System Administrator /
 * Coordinator / Judge — there is NO "Coach" role, so none is invented; company
 * scoping reuses `auth_require_company_access`.
 *
 * Server-derived values (never accepted from the browser):
 *  - `actorId`  — the authenticated user id.
 *  - `tenantId` — the platform tenant. The platform is single-tenant in practice
 *                 (every financial table carries `tenant_id` default 1 and no
 *                 PHP resolves it per user); this is the one place that decides,
 *                 so a future multi-tenant mapping changes only this method.
 *
 * Company access:
 *  - Administrators (System Administrator / Coordinator) are tenant-wide.
 *  - Everyone else is limited to their own `users.company_id`.
 *  - `company_id = NULL` (system-wide) is NOT an access bypass: reads include it,
 *    but only administrators may create/update it.
 */
final class CalendarAccessPolicy
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
     * Company ids the actor may *filter* a global listing by.
     * `null` means "no restriction" (tenant-wide administrator).
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
     * @throws CalendarForbiddenException
     */
    public function assertCanAccessCompany(?int $companyId): void
    {
        // A company-scoped event always requires access to that company.
        if ($companyId === null) {
            return;
        }
        if ($this->isAdmin()) {
            return;
        }
        if ($this->homeCompanyId() !== $companyId) {
            throw new CalendarForbiddenException('You do not have access to this company.');
        }
    }

    /**
     * Only administrators may author a system-wide event.
     *
     * @throws CalendarForbiddenException
     */
    public function assertCanAuthorSystemWide(): void
    {
        if (!$this->isAdmin()) {
            throw new CalendarForbiddenException('Only administrators may create system-wide events.');
        }
    }

    /**
     * The event's company is the authority for every write: you may only modify
     * an event you can see by company, and system-wide events are admin-only.
     *
     * @param array<string,mixed> $eventRow
     * @throws CalendarForbiddenException
     */
    public function assertCanModifyEvent(array $eventRow): void
    {
        $companyId = $eventRow['company_id'];
        if ($companyId === null) {
            $this->assertCanAuthorSystemWide();
            return;
        }
        $this->assertCanAccessCompany((int)$companyId);
    }
}
