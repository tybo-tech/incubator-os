<?php
declare(strict_types=1);

/**
 * Issued snapshot metadata for a site visit (`visit-versions.php`).
 */
final class ListVisitVersions
{
    public function __construct(private VisitReportService $visits) {}

    /**
     * @return array<int,array<string,mixed>>
     */
    public function execute(int $sessionId): array
    {
        return $this->visits->listVersions($sessionId);
    }
}
