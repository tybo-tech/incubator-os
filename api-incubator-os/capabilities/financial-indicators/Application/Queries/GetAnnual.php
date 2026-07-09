<?php
declare(strict_types=1);

final class GetAnnual
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
    ) {}

    public function execute(int $companyId, int $year): AnnualReportResponse
    {
        $monthlyData = $this->repo->getAnnual($companyId, $year);
        return AnnualReportResponse::fromData($year, $monthlyData);
    }
}
