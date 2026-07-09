<?php
declare(strict_types=1);

final class UpdateIndicator
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private FinancialIndicatorCalculator $calc,
        private TransactionManager $tx,
    ) {}

    public function execute(int $id, UpdateIndicatorRequest $input, ?int $updatedBy = null): CommandResult
    {
        return $this->tx->execute(function () use ($id, $input, $updatedBy) {
            $existing = $this->repo->getById($id);
            if (!$existing) {
                throw new InvalidArgumentException("Financial indicator not found: $id");
            }

            $data = $input->data;
            $income = $data['income_statement'] ?? [];
            $balance = $data['balance_sheet'] ?? [];

            $sales = (float)($income['sales'] ?? 0);
            $costOfSales = (float)($income['cost_of_sales'] ?? 0);
            $operatingExpenses = (float)($income['operating_expenses'] ?? 0);

            if ($sales < 0) throw new InvalidArgumentException('Sales must be >= 0');
            if ($costOfSales < 0) throw new InvalidArgumentException('Cost of Sales must be >= 0');
            if ($operatingExpenses < 0) throw new InvalidArgumentException('Operating Expenses must be >= 0');

            foreach (['cash','cash_equivalents','short_term_investments','current_receivables','total_current_assets','total_assets','total_current_liabilities','total_liabilities','total_equity'] as $field) {
                if (isset($balance[$field]) && (float)$balance[$field] < 0) {
                    throw new InvalidArgumentException("$field must be >= 0");
                }
            }

            $node = $this->repo->update($id, $data, $updatedBy);
            $response = FinancialIndicatorResponse::fromNode($node, $this->calc);

            return new CommandResult(
                success: true,
                message: 'Financial indicators updated',
                data: $response,
            );
        });
    }
}
