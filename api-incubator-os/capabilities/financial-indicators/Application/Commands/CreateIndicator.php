<?php
declare(strict_types=1);

final class CreateIndicator
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private FinancialIndicatorCalculator $calc,
        private TransactionManager $tx,
    ) {}

    public function execute(CreateIndicatorRequest $input, ?int $createdBy = null): CommandResult
    {
        return $this->tx->execute(function () use ($input, $createdBy) {
            $data = $input->data;
            $meta = $data['meta'] ?? [];
            $income = $data['incomeStatement'] ?? $data['income_statement'] ?? [];
            $balance = $data['balanceSheet'] ?? $data['balance_sheet'] ?? [];

            $sales = (float)($income['sales'] ?? 0);
            $costOfSales = (float)($income['costOfSales'] ?? $income['cost_of_sales'] ?? 0);
            $operatingExpenses = (float)($income['operatingExpenses'] ?? $income['operating_expenses'] ?? 0);

            if ($sales < 0) throw new InvalidArgumentException('Sales must be >= 0');
            if ($costOfSales < 0) throw new InvalidArgumentException('Cost of Sales must be >= 0');
            if ($operatingExpenses < 0) throw new InvalidArgumentException('Operating Expenses must be >= 0');

            foreach (['cash','cashEquivalents','cash_equivalents','shortTermInvestments','short_term_investments','currentReceivables','current_receivables','totalCurrentAssets','total_current_assets','totalAssets','total_assets','totalCurrentLiabilities','total_current_liabilities','totalLiabilities','total_liabilities','totalEquity','total_equity'] as $field) {
                if (isset($balance[$field]) && (float)$balance[$field] < 0) {
                    throw new InvalidArgumentException("$field must be >= 0");
                }
            }

            $existing = $this->repo->findByMonth(
                $input->companyId,
                (int)($meta['financialYear'] ?? $meta['financial_year'] ?? 0),
                (int)($meta['month'] ?? 0)
            );
            if ($existing) {
                throw new InvalidArgumentException('A record already exists for this company, financial year, and month');
            }

            $node = $this->repo->create($input->companyId, $data, $createdBy);

            $calculated = $this->calc->calculateAll($sales, $costOfSales, $operatingExpenses);

            $response = FinancialIndicatorResponse::fromNode($node, $this->calc);

            return new CommandResult(
                success: true,
                message: 'Financial indicators created',
                data: $response,
            );
        });
    }
}
