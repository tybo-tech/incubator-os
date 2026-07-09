<?php
declare(strict_types=1);

final class DeleteIndicator
{
    public function __construct(
        private FinancialIndicatorRepository $repo,
        private TransactionManager $tx,
    ) {}

    public function execute(int $id): CommandResult
    {
        return $this->tx->execute(function () use ($id) {
            $existing = $this->repo->getById($id);
            if (!$existing) {
                throw new InvalidArgumentException("Financial indicator not found: $id");
            }

            $this->repo->delete($id);

            return new CommandResult(
                success: true,
                message: 'Financial indicator deleted',
            );
        });
    }
}
