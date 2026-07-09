<?php
declare(strict_types=1);

final class PublicSubmit
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private FinancialIndicatorLinkRepository $linkRepo,
        private FinancialIndicatorCalculator $calc,
        private TransactionManager $tx,
    ) {}

    public function execute(PublicSubmitRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($input) {
            $request = $this->linkRepo->getByToken($input->token);
            if (!$request) {
                throw new InvalidArgumentException('Invalid token');
            }

            $requestData = $request['data'];

            if (($requestData['status'] ?? '') === 'completed') {
                throw new InvalidArgumentException('This submission link has already been used');
            }

            $expiresAt = $requestData['expires_at'] ?? '';
            if ($expiresAt && strtotime($expiresAt) < time()) {
                throw new InvalidArgumentException('This submission link has expired');
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

            $node = $this->repo->create(
                (int)$requestData['company_id'],
                $data,
                null
            );

            $this->linkRepo->markCompleted((int)$request['id']);

            $response = FinancialIndicatorResponse::fromNode($node, $this->calc);

            return new CommandResult(
                success: true,
                message: 'Financial indicators submitted successfully',
                data: $response,
            );
        });
    }
}
