<?php
declare(strict_types=1);

final class CompanyOverviewResponse
{
    public function __construct(
        public readonly array $company,
        public readonly array $directors,
        public readonly ?FinancialSummary $financialSummary = null,
    ) {}
}