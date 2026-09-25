<?php
declare(strict_types=1);

/**
 * Full site-visit report for a site_visit Session.
 *
 * Returns the empty draft shape when no report row exists yet, so the editor can
 * always render from one call. Incubator-visible notes are never part of the
 * report and this query never reads them.
 */
final class GetVisitReport
{
    public function __construct(private VisitReportService $visits) {}

    public function execute(int $sessionId): VisitReportResponse
    {
        return $this->visits->getBySession($sessionId);
    }
}
