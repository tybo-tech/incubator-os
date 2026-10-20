<?php
declare(strict_types=1);

final class UpdateDirector
{
    public function __construct(
        private UserRepository $userRepo,
        private CompanyRepository $companyRepo,
        private TransactionManager $tx,
    ) {}

    public function execute(int $companyId, UpdateDirectorRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($companyId, $input) {
            $user = $this->userRepo->getById($input->directorId);
            if (!$user) {
                throw new InvalidArgumentException("Director not found: {$input->directorId}");
            }
            if ((int)$user['company_id'] !== $companyId) {
                throw new InvalidArgumentException("Director {$input->directorId} does not belong to company $companyId");
            }

            $fullName = trim($input->fullName);
            if ($fullName === '') {
                throw new InvalidArgumentException('Full name is required');
            }

            $updated = $this->userRepo->update($input->directorId, [
                'full_name' => $fullName,
                'email' => $input->email,
                'phone' => $input->phone,
                'gender' => $input->gender,
                'race' => $input->race,
                'id_number' => $input->idNumber ?? '',
                'id_type' => 'RSA_ID',
            ]);

            // Race, gender and ID number all feed the ownership flags
            $this->companyRepo->recalculateOwnership($companyId);

            return new CommandResult(
                success: true,
                message: 'Director updated successfully',
                data: $updated ? DirectorSummary::fromUser($updated) : null,
            );
        });
    }
}
