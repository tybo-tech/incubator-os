<?php
declare(strict_types=1);

/**
 * Company site-visit list (read-only).
 *
 * A company is required: a visit is a company Session. The policy enforces
 * company access before any row is read.
 */
final class ListCompanySiteVisits
{
    public function __construct(
        private VisitReportService $visits,
    ) {}

    /**
     * @return array<int,array<string,mixed>> VisitReportSummaryResponse[]
     * @throws SessionValidationException|SessionForbiddenException
     */
    public function execute(
        int $companyId,
        ?string $reportStatus = null,
        ?string $visitKind = null,
        ?string $from = null,
        ?string $to = null,
        ?string $search = null,
    ): array {
        if ($companyId <= 0) {
            throw new SessionValidationException(json_encode(['companyId' => 'A company is required.']) ?: 'A company is required.');
        }
        if ($reportStatus !== null && $reportStatus !== 'none' && !VisitReportStatus::isValid($reportStatus)) {
            throw new SessionValidationException('Unknown report status: ' . $reportStatus);
        }
        if ($visitKind !== null && !VisitKind::isValid($visitKind)) {
            throw new SessionValidationException('Unknown visit kind: ' . $visitKind);
        }

        return $this->visits->listByCompany($companyId, [
            'reportStatus' => $reportStatus,
            'visitKind' => $visitKind,
            'from' => $from,
            'to' => $to,
            'search' => $search,
        ]);
    }
}
