<?php
declare(strict_types=1);

final class ListByCompany
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private FinancialIndicatorCalculator $calc,
    ) {}

    public function execute(int $companyId): array
    {
        $nodes = $this->repo->listByCompany($companyId);
        return array_map(function (array $node) {
            $data = $node['data'];
            $meta = $data['meta'] ?? [];
            $income = $data['income_statement'] ?? [];
            $sales = (float)($income['sales'] ?? 0);
            $costOfSales = (float)($income['cost_of_sales'] ?? 0);
            $operatingExpenses = (float)($income['operating_expenses'] ?? 0);

            $gp = $this->calc->grossProfit($sales, $costOfSales);
            $np = $this->calc->netProfit($sales, $costOfSales, $operatingExpenses);

            return new FinancialIndicatorSummary(
                id: (int)$node['id'],
                financialYear: (int)($meta['financial_year'] ?? 0),
                month: (int)($meta['month'] ?? 0),
                netProfit: $np,
                grossProfit: $gp,
                status: 'active',
                createdAt: $node['created_at'],
            );
        }, $nodes);
    }
}
