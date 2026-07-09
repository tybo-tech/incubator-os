<?php
declare(strict_types=1);

final class RegisterDirector
{
    public function __construct(
        private UserRepository $userRepo,
        private TransactionManager $tx,
    ) {}

    public function execute(int $companyId, RegisterDirectorRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($companyId, $input) {
            $username = $input->email;
            if (!$username) {
                $base = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($input->fullName));
                $username = $base;
                for ($i = 0; $i < 10; $i++) {
                    if (!$this->userRepo->getByUsername($username)) break;
                    $username = $base . '_' . bin2hex(random_bytes(2));
                }
            } else {
                if ($this->userRepo->getByUsername($username)) {
                    $base = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($input->fullName));
                    $username = $base;
                    for ($i = 0; $i < 10; $i++) {
                        if (!$this->userRepo->getByUsername($username)) break;
                        $username = $base . '_' . bin2hex(random_bytes(2));
                    }
                }
            }

            $user = $this->userRepo->create([
                'company_id' => $companyId,
                'full_name' => $input->fullName,
                'email' => $input->email,
                'phone' => $input->phone,
                'username' => $username,
                'role' => 'Director',
                'gender' => $input->gender,
                'id_number' => $input->idNumber,
                'status' => 'active',
            ]);

            return new CommandResult(
                success: true,
                message: 'Director registered successfully',
                data: DirectorSummary::fromUser($user),
            );
        });
    }
}