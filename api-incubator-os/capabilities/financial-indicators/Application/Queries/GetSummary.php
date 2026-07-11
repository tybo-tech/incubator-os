<?php
declare(strict_types=1);

final class GetSummary
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private FinancialIndicatorCalculator $calc,
    ) {}

    public function execute(int $companyId): FinancialIndicatorSummaryResponse
    {
        $latest = $this->repo->getLatest($companyId);
        if (!$latest) {
            return new FinancialIndicatorSummaryResponse();
        }

        $data = $latest['data'];
        $meta = $data['meta'] ?? [];
        $income = $data['incomeStatement'] ?? $data['income_statement'] ?? [];

        $sales = (float)($income['sales'] ?? 0);
        $costOfSales = (float)($income['costOfSales'] ?? $income['cost_of_sales'] ?? 0);
        $operatingExpenses = (float)($income['operatingExpenses'] ?? $income['operating_expenses'] ?? 0);

        $gp = $this->calc->grossProfit($sales, $costOfSales);
        $np = $this->calc->netProfit($sales, $costOfSales, $operatingExpenses);
        $gpp = $this->calc->grossProfitPercentage($sales, $costOfSales);
        $npp = $this->calc->netProfitPercentage($sales, $costOfSales, $operatingExpenses);

        return new FinancialIndicatorSummaryResponse(
            latestMonth: (int)($meta['month'] ?? null),
            latestFinancialYear: (int)($meta['financialYear'] ?? $meta['financial_year'] ?? null),
            latestNetProfit: $np,
            latestGrossProfit: $gp,
            latestSales: $sales,
            latestExpenses: $operatingExpenses,
            grossMargin: $gpp,
            netMargin: $npp,
        );
    }
}
