<?php
declare(strict_types=1);

final class DeactivateDirector
{
    public function __construct(
        private UserRepository $userRepo,
        private TransactionManager $tx,
    ) {}

    public function execute(int $companyId, DeactivateDirectorRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($companyId, $input) {
            $user = $this->userRepo->getById($input->directorId);
            if (!$user) {
                throw new InvalidArgumentException("Director not found: {$input->directorId}");
            }
            if ((int)$user['company_id'] !== $companyId) {
                throw new InvalidArgumentException("Director {$input->directorId} does not belong to company $companyId");
            }

            $this->userRepo->delete($input->directorId);

            return new CommandResult(
                success: true,
                message: 'Director deactivated successfully',
            );
        });
    }
}