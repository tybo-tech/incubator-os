<?php
declare(strict_types=1);

final class GetIndicator
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private FinancialIndicatorCalculator $calc,
    ) {}

    public function execute(int $id): FinancialIndicatorResponse
    {
        $node = $this->repo->getById($id);
        if (!$node) {
            throw new InvalidArgumentException("Financial indicator not found: $id");
        }
        return FinancialIndicatorResponse::fromNode($node, $this->calc);
    }
}
